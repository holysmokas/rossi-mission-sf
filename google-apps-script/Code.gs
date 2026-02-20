// ============================================
// ROSSI MISSION SF - Newsletter Subscriber Script
// ============================================
// SETUP INSTRUCTIONS:
// 1. Go to https://sheets.google.com and create a new spreadsheet
// 2. Name it "Rossi Mission SF - Subscribers"
// 3. In Row 1, add headers: Email | Timestamp | Source
// 4. Go to Extensions > Apps Script
// 5. Delete any existing code and paste this entire script
// 6. Click Deploy > New Deployment
// 7. Select type: "Web app"
// 8. Set "Execute as": Me
// 9. Set "Who has access": Anyone
// 10. Click Deploy and authorize when prompted
// 11. Copy the Web App URL — you'll paste it into Newsletter.jsx
// ============================================

const SHEET_NAME = 'Sheet1';
const NOTIFY_EMAILS = [
  'holysmokasthatscheap@gmail.com',
  'info@rossimissionsf.com'
];

// Rate limiting: max submissions per IP per hour
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in ms

function doPost(e) {
  try {
    // Parse the incoming request
    const data = JSON.parse(e.postData.contents);
    
    // --- SECURITY CHECKS ---
    
    // 1. Honeypot check (bot trap)
    if (data.website && data.website.length > 0) {
      return jsonResponse(200, { result: 'success' }); // Silently reject bots
    }
    
    // 2. Timestamp check (form must be open for at least 2 seconds)
    const formTime = parseInt(data._t, 10);
    const now = Date.now();
    if (!formTime || (now - formTime) < 2000) {
      return jsonResponse(200, { result: 'success' }); // Too fast = bot
    }
    
    // 3. Block if timestamp is older than 10 minutes (replay attack)
    if ((now - formTime) > 600000) {
      return jsonResponse(400, { result: 'error', message: 'Form expired. Please refresh and try again.' });
    }
    
    // 4. Validate email format
    const email = (data.email || '').trim().toLowerCase();
    const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      return jsonResponse(400, { result: 'error', message: 'Please enter a valid email address.' });
    }
    
    // 5. Email length check (prevent payload attacks)
    if (email.length > 254) {
      return jsonResponse(400, { result: 'error', message: 'Invalid email address.' });
    }
    
    // 6. XSS sanitization - strip any HTML/script tags
    if (/<[^>]*>/g.test(data.email)) {
      return jsonResponse(400, { result: 'error', message: 'Invalid input.' });
    }
    
    // --- DUPLICATE CHECK ---
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const existingData = sheet.getDataRange().getValues();
    
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][0] && existingData[i][0].toString().toLowerCase() === email) {
        return jsonResponse(200, { result: 'duplicate', message: "You're already subscribed!" });
      }
    }
    
    // --- RATE LIMITING ---
    const rateLimitSheet = getRateLimitSheet(ss);
    if (isRateLimited(rateLimitSheet, email)) {
      return jsonResponse(429, { result: 'error', message: 'Too many requests. Please try again later.' });
    }
    
    // --- SAVE TO SHEET ---
    const timestamp = new Date().toISOString();
    sheet.appendRow([email, timestamp, 'website']);
    
    // Log for rate limiting
    logRequest(rateLimitSheet, email);
    
    // --- SEND NOTIFICATIONS ---
    const subject = '🎨 New Rossi Mission SF Subscriber!';
    const body = `New newsletter subscriber:\n\nEmail: ${email}\nTime: ${timestamp}\n\nTotal subscribers: ${existingData.length}`;
    
    NOTIFY_EMAILS.forEach(function(notifyEmail) {
      try {
        MailApp.sendEmail(notifyEmail, subject, body);
      } catch (emailErr) {
        console.error('Failed to send notification to ' + notifyEmail + ': ' + emailErr);
      }
    });
    
    return jsonResponse(200, { result: 'success', message: 'Welcome to the movement!' });
    
  } catch (err) {
    console.error('doPost error: ' + err);
    return jsonResponse(500, { result: 'error', message: 'Something went wrong. Please try again.' });
  }
}

function doGet(e) {
  return jsonResponse(200, { result: 'ok', message: 'Rossi Mission SF Newsletter API' });
}

function jsonResponse(statusCode, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- RATE LIMITING HELPERS ---

function getRateLimitSheet(ss) {
  let sheet = ss.getSheetByName('_rate_limits');
  if (!sheet) {
    sheet = ss.insertSheet('_rate_limits');
    sheet.appendRow(['identifier', 'timestamp']);
  }
  return sheet;
}

function isRateLimited(sheet, identifier) {
  const data = sheet.getDataRange().getValues();
  const now = Date.now();
  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === identifier) {
      const ts = new Date(data[i][1]).getTime();
      if ((now - ts) < RATE_LIMIT_WINDOW) {
        count++;
      }
    }
  }
  
  return count >= RATE_LIMIT;
}

function logRequest(sheet, identifier) {
  sheet.appendRow([identifier, new Date().toISOString()]);
  
  // Clean up old entries (older than 2 hours)
  const data = sheet.getDataRange().getValues();
  const now = Date.now();
  const rowsToDelete = [];
  
  for (let i = data.length - 1; i >= 1; i--) {
    const ts = new Date(data[i][1]).getTime();
    if ((now - ts) > RATE_LIMIT_WINDOW * 2) {
      rowsToDelete.push(i + 1);
    }
  }
  
  rowsToDelete.forEach(function(row) {
    sheet.deleteRow(row);
  });
}
