// supabase/functions/square-webhook/index.ts
// Deploy with: supabase functions deploy square-webhook
//
// Secrets needed:
//   SQUARE_ACCESS_TOKEN
//   SQUARE_ENVIRONMENT (production or sandbox)
//   SQUARE_WEBHOOK_SIGNATURE_KEY (from Square Dashboard → Webhooks)
//   RESEND_API_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NOTIFY_EMAILS = [
  'holysmokasthatscheap@gmail.com',
  'info@rossimissionsf.com',
]

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.text()
    const event = JSON.parse(body)

    // ── Verify Square webhook signature (optional but recommended) ──
    const signatureKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY')
    if (signatureKey) {
      const signature = req.headers.get('x-square-hmacsha256-signature')
      if (signature) {
        const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/square-webhook`
        const payload = notificationUrl + body
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(signatureKey),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
        const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))

        if (signature !== expected) {
          console.error('Invalid webhook signature')
          return new Response('Invalid signature', { status: 403 })
        }
      }
    }

    // ── Only handle payment.updated events ──
    const eventType = event.type
    if (eventType !== 'payment.updated') {
      return new Response(JSON.stringify({ received: true, skipped: eventType }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const payment = event.data?.object?.payment
    if (!payment) {
      return new Response('No payment data', { status: 400 })
    }

    // ── Only proceed if payment status is COMPLETED ──
    if (payment.status !== 'COMPLETED') {
      return new Response(JSON.stringify({ received: true, skipped: `status: ${payment.status}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const squareOrderId = payment.order_id
    const squarePaymentId = payment.id
    const receiptUrl = payment.receipt_url
    const amountCents = payment.amount_money?.amount || 0
    const currency = payment.amount_money?.currency || 'USD'

    // ── Check if we already notified for this order (prevent duplicates) ──
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (supabaseUrl && supabaseKey) {
      const sb = createClient(supabaseUrl, supabaseKey)
      const { data: existingOrder } = await sb
        .from('orders')
        .select('notified')
        .eq('square_order_id', squareOrderId)
        .single()

      if (existingOrder?.notified) {
        return new Response(JSON.stringify({ received: true, skipped: 'already notified' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // ── Fetch full order from Square (includes line items + shipping) ──
    const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const SQUARE_ENV = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox'
    const baseUrl = SQUARE_ENV === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    let orderDetails = null
    let customerName = ''
    let customerEmail = ''
    let shippingAddress = null
    let lineItems = []

    if (squareOrderId && SQUARE_ACCESS_TOKEN) {
      try {
        const orderRes = await fetch(`${baseUrl}/v2/orders/${squareOrderId}`, {
          headers: {
            'Square-Version': '2026-01-22',
            'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          },
        })
        const orderData = await orderRes.json()
        orderDetails = orderData.order

        if (orderDetails) {
          // Extract line items
          lineItems = (orderDetails.line_items || []).map((li) => ({
            name: li.name,
            quantity: parseInt(li.quantity, 10),
            price: (li.base_price_money?.amount || 0) / 100,
          }))

          // Extract shipping/fulfillment info
          const fulfillment = orderDetails.fulfillments?.[0]
          if (fulfillment?.shipment_details?.recipient) {
            const recipient = fulfillment.shipment_details.recipient
            customerName = recipient.display_name || ''
            customerEmail = recipient.email_address || ''
            if (recipient.address) {
              shippingAddress = {
                line1: recipient.address.address_line_1 || '',
                line2: recipient.address.address_line_2 || '',
                city: recipient.address.locality || '',
                state: recipient.address.administrative_district_level_1 || '',
                zip: recipient.address.postal_code || '',
                country: recipient.address.country || '',
              }
            }
          }

          // Also check buyer email from payment if not in fulfillment
          if (!customerEmail && payment.buyer_email_address) {
            customerEmail = payment.buyer_email_address
          }
        }
      } catch (fetchErr) {
        console.error('Failed to fetch Square order:', fetchErr)
      }
    }

    // ── Update order in Supabase ──
    let savedItems = lineItems

    if (supabaseUrl && supabaseKey) {
      const sb = createClient(supabaseUrl, supabaseKey)

      // Try to get saved items from pending order (has sizes/images)
      const { data: existingOrder } = await sb
        .from('orders')
        .select('items')
        .eq('square_order_id', squareOrderId)
        .single()

      if (existingOrder?.items && existingOrder.items.length > 0) {
        savedItems = existingOrder.items
      }

      const { error: updateErr } = await sb
        .from('orders')
        .upsert({
          square_order_id: squareOrderId,
          square_payment_id: squarePaymentId,
          status: 'paid',
          items: savedItems.length > 0 ? savedItems : lineItems,
          item_count: lineItems.reduce((sum, li) => sum + li.quantity, 0) || savedItems.length,
          total_cents: amountCents,
          currency: currency,
          customer_name: customerName || null,
          customer_email: customerEmail || null,
          shipping_address: shippingAddress,
          square_receipt_url: receiptUrl || null,
          notified: false,
          paid_at: new Date().toISOString(),
        }, {
          onConflict: 'square_order_id',
        })

      if (updateErr) {
        console.error('Failed to update order in Supabase:', updateErr)
      }
    }

    // ── Send email notification via Resend ──
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (RESEND_API_KEY) {
      const totalDollars = (amountCents / 100).toFixed(2)

      // Build items list for email
      const itemsList = (savedItems.length > 0 ? savedItems : lineItems)
        .map((item) => {
          const size = item.size ? ` (${item.size})` : ''
          const qty = item.quantity || 1
          const price = item.price ? ` — $${Number(item.price).toFixed(2)}` : ''
          return `• ${item.name}${size} x ${qty}${price}`
        })
        .join('\n')

      // Build shipping block
      let shippingBlock = 'Not provided — check Square Dashboard'
      if (shippingAddress && shippingAddress.line1) {
        shippingBlock = [
          shippingAddress.line1,
          shippingAddress.line2,
          `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`,
          shippingAddress.country,
        ].filter(Boolean).join('\n')
      }

      const emailBody = `
New order on Rossi Mission SF!

━━━━━━━━━━━━━━━━━━━━━━━━━━
CUSTOMER
━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${customerName || 'Not available'}
Email: ${customerEmail || 'Not available'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIPPING ADDRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━
${shippingBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━
ORDER ITEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━
${itemsList || 'See Square Dashboard for details'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: $${totalDollars} ${currency}
━━━━━━━━━━━━━━━━━━━━━━━━━━

${receiptUrl ? `Square Receipt: ${receiptUrl}` : ''}
View full details: https://squareup.com/dashboard/sales/transactions
`.trim()

      // Send to all notify emails
      for (const toEmail of NOTIFY_EMAILS) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Rossi Mission SF <orders@rossimissionsf.com>',
              to: [toEmail],
              subject: `New Order — $${totalDollars} — ${customerName || 'Customer'}`,
              text: emailBody,
            }),
          })
        } catch (emailErr) {
          console.error(`Failed to send notification to ${toEmail}:`, emailErr)
        }
      }

      // Mark as notified in Supabase
      if (supabaseUrl && supabaseKey) {
        const sb = createClient(supabaseUrl, supabaseKey)
        await sb
          .from('orders')
          .update({ notified: true })
          .eq('square_order_id', squareOrderId)
      }
    }

    return new Response(
      JSON.stringify({ received: true, order_id: squareOrderId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})