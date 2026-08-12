// rossi-cron worker
// Runs at 14:00 UTC daily (7am PDT, 6am PST).
// Queries admin_users for each admin's frequency preference, computes whether
// they should receive an email today, queries orders for the period, sends via
// Resend.
//
// Also exposes a manual HTTP trigger for testing:
//   GET /?secret=<MANUAL_TRIGGER_SECRET>&period=daily|weekly|monthly&to=<email>

export default {
    async scheduled(controller, env, ctx) {
        ctx.waitUntil(runDailyCheck(env))
    },

    async fetch(request, env) {
        const url = new URL(request.url)
        const secret = url.searchParams.get('secret')
        if (!env.MANUAL_TRIGGER_SECRET || secret !== env.MANUAL_TRIGGER_SECRET) {
            return new Response('forbidden', { status: 403 })
        }

        if (url.searchParams.get('auto') === '1') {
      await runDailyCheck(env)
      return new Response('ok\n')
    }

    const period = url.searchParams.get('period') || 'daily'
        if (!['daily', 'weekly', 'monthly'].includes(period)) {
            return new Response('invalid period', { status: 400 })
        }

        const targetEmail = url.searchParams.get('to')
        try {
            const result = await runManual(env, period, targetEmail)
            return Response.json(result)
        } catch (err) {
            return Response.json({ error: err.message }, { status: 500 })
        }
    },
}

async function runDailyCheck(env) {
    const now = new Date()
    const isFirstOfMonth = now.getUTCDate() === 1
    const isSunday = now.getUTCDay() === 0
    console.log(`cron: utc_day=${now.getUTCDate()} dow=${now.getUTCDay()} sunday=${isSunday} first=${isFirstOfMonth}`)

    const admins = await env.DB.prepare(
        `SELECT id, email, full_name, report_frequency
       FROM admin_users
      WHERE report_frequency != 'none'`
    ).all()

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const admin of admins.results || []) {
        const freq = admin.report_frequency
        let period = null
        if (freq === 'daily') period = 'daily'
        else if (freq === 'weekly' && isSunday) period = 'weekly'
        else if (freq === 'monthly' && isFirstOfMonth) period = 'monthly'

        if (!period) {
            skipped++
            continue
        }

        try {
            await sendReport(env, admin, period)
            sent++
            console.log(`cron: sent ${period} report to ${admin.email}`)
        } catch (err) {
            failed++
            console.error(`cron: failed for ${admin.email}: ${err.message}`)
        }
    }

    console.log(`cron: complete. sent=${sent} skipped=${skipped} failed=${failed}`)
}

async function runManual(env, period, targetEmail) {
    let admins
    if (targetEmail) {
        const row = await env.DB.prepare(
            `SELECT id, email, full_name, report_frequency FROM admin_users WHERE email = ?`
        ).bind(targetEmail.toLowerCase()).first()
        if (!row) throw new Error(`no admin found for ${targetEmail}`)
        admins = [row]
    } else {
        const r = await env.DB.prepare(
            `SELECT id, email, full_name, report_frequency FROM admin_users`
        ).all()
        admins = r.results || []
    }

    const results = []
    for (const admin of admins) {
        try {
            await sendReport(env, admin, period)
            results.push({ email: admin.email, sent: true })
        } catch (err) {
            results.push({ email: admin.email, sent: false, error: err.message })
        }
    }
    return { period, results }
}

async function sendReport(env, admin, period) {
    const now = Math.floor(Date.now() / 1000)
    let from
    if (period === 'daily') from = now - 86400
    else if (period === 'weekly') from = now - 7 * 86400
    else from = now - 30 * 86400

    const rows = await env.DB.prepare(
        `SELECT id, source, total_cents, customer_name, customer_email,
            paid_at, items, square_receipt_url
       FROM orders
      WHERE status = 'paid'
        AND paid_at >= ?
      ORDER BY paid_at DESC`
    ).bind(from).all()

    const orders = (rows.results || []).map(r => {
        let items = []
        try { items = JSON.parse(r.items || '[]') } catch { }
        return { ...r, items }
    })

    const totals = computeTotals(orders)
    const html = renderHtml(admin, period, orders, totals, from, now, env.SITE_URL)
    const subject = subjectLine(period, totals)

    const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: `Rossi Mission SF <${env.FROM_EMAIL}>`,
            to: [admin.email],
            subject,
            html,
        }),
    })

    if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`resend ${resp.status}: ${text.slice(0, 300)}`)
    }
}

function computeTotals(orders) {
    const t = {
        online: { count: 0, revenue: 0 },
        in_store: { count: 0, revenue: 0 },
        all: { count: 0, revenue: 0, avg: 0 },
    }
    for (const o of orders) {
        const src = o.source === 'in_store' ? 'in_store' : 'online'
        t[src].count += 1
        t[src].revenue += o.total_cents || 0
        t.all.count += 1
        t.all.revenue += o.total_cents || 0
    }
    t.all.avg = t.all.count > 0 ? Math.round(t.all.revenue / t.all.count) : 0
    return t
}

function fmt(cents) {
    return `$${((cents || 0) / 100).toFixed(2)}`
}

function fmtDate(unix) {
    return new Date(unix * 1000).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
        timeZone: 'America/Los_Angeles',
    })
}

function fmtDateShort(unix) {
    return new Date(unix * 1000).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        timeZone: 'America/Los_Angeles',
    })
}

function subjectLine(period, totals) {
    const label = period === 'daily' ? 'Yesterday' : period === 'weekly' ? 'This past week' : 'Last 30 days'
    return `${label}: ${fmt(totals.all.revenue)} · ${totals.all.count} orders — Rossi Mission SF`
}

function periodLabel(period) {
    return period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly'
}

function renderHtml(admin, period, orders, totals, from, to, siteUrl) {
    const orderRows = orders.length === 0
        ? `<tr><td colspan="4" style="padding:24px;text-align:center;color:#999;font-size:13px;">No paid orders in this period.</td></tr>`
        : orders.slice(0, 50).map(o => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;font-size:13px;">${fmtDate(o.paid_at)}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;font-size:13px;">
            <span style="padding:2px 8px;font-size:10px;letter-spacing:1px;border:1px solid #ccc;background:${o.source === 'in_store' ? '#f4f0e8' : '#e8f0f4'};">${o.source === 'in_store' ? 'IN-STORE' : 'ONLINE'}</span>
          </td>
          <td style="padding:10px;border-bottom:1px solid #eee;font-size:13px;color:${o.customer_name ? '#222' : '#999'};">${escapeHtml(o.customer_name || '—')}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;font-size:13px;text-align:right;font-family:monospace;">${fmt(o.total_cents)}</td>
        </tr>
      `).join('')

    const overflow = orders.length > 50
        ? `<p style="text-align:center;color:#888;font-size:12px;margin-top:12px;">Showing 50 of ${orders.length}. <a href="${siteUrl}/admin/reports" style="color:#888;">View full list →</a></p>`
        : ''

    return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;background:#fafafa;color:#222;">
<div style="max-width:640px;margin:0 auto;padding:32px 24px;">
  <h1 style="font-weight:600;letter-spacing:3px;margin:0 0 4px;font-size:14px;text-transform:uppercase;color:#888;">Rossi Mission SF — ${periodLabel(period)} Report</h1>
  <p style="color:#888;font-size:12px;margin:0 0 28px;">${fmtDateShort(from)} → ${fmtDateShort(to)}</p>

  <h2 style="font-weight:300;font-size:36px;margin:0 0 4px;font-family:monospace;letter-spacing:-1px;">${fmt(totals.all.revenue)}</h2>
  <p style="color:#666;font-size:13px;margin:0 0 32px;">${totals.all.count} orders · avg ${fmt(totals.all.avg)}</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;background:#fff;border:1px solid #eee;">
    <tr>
      <td style="padding:16px;border-right:1px solid #eee;width:50%;">
        <div style="font-size:10px;letter-spacing:2px;color:#888;margin-bottom:6px;">ONLINE</div>
        <div style="font-family:monospace;font-size:18px;">${fmt(totals.online.revenue)}</div>
        <div style="font-size:12px;color:#666;margin-top:2px;">${totals.online.count} orders</div>
      </td>
      <td style="padding:16px;width:50%;">
        <div style="font-size:10px;letter-spacing:2px;color:#888;margin-bottom:6px;">IN-STORE</div>
        <div style="font-family:monospace;font-size:18px;">${fmt(totals.in_store.revenue)}</div>
        <div style="font-size:12px;color:#666;margin-top:2px;">${totals.in_store.count} orders</div>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;">
    <thead><tr>
      <th style="padding:10px;text-align:left;font-size:10px;letter-spacing:2px;color:#888;border-bottom:2px solid #222;">DATE</th>
      <th style="padding:10px;text-align:left;font-size:10px;letter-spacing:2px;color:#888;border-bottom:2px solid #222;">SOURCE</th>
      <th style="padding:10px;text-align:left;font-size:10px;letter-spacing:2px;color:#888;border-bottom:2px solid #222;">CUSTOMER</th>
      <th style="padding:10px;text-align:right;font-size:10px;letter-spacing:2px;color:#888;border-bottom:2px solid #222;">AMOUNT</th>
    </tr></thead>
    <tbody>${orderRows}</tbody>
  </table>
  ${overflow}

  <p style="margin-top:32px;text-align:center;font-size:12px;color:#888;">
    <a href="${siteUrl}/admin/reports" style="color:#888;text-decoration:underline;">View full reports →</a>
  </p>
  <p style="margin-top:8px;text-align:center;font-size:11px;color:#aaa;">
    You're receiving this because your report frequency is set to ${admin.report_frequency || 'weekly'}.
    Change in <a href="${siteUrl}/admin/account" style="color:#888;">Account settings</a>.
  </p>
</div>
</body></html>`
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]))
}