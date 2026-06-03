export async function onRequestGet({ request, env }) {
    const url = new URL(request.url)
    const sp = url.searchParams

    const now = Math.floor(Date.now() / 1000)
    const defaultFrom = now - 30 * 86400
    const from = parseInt(sp.get('from') || defaultFrom, 10)
    const to = parseInt(sp.get('to') || now, 10)

    const rows = await env.DB.prepare(
        `SELECT id, square_order_id, status, source, total_cents, items,
            customer_name, customer_email, paid_at, created_at, square_receipt_url
       FROM orders
      WHERE status = 'paid'
        AND paid_at >= ?
        AND paid_at <= ?
      ORDER BY paid_at DESC`
    ).bind(from, to).all()

    const orders = (rows.results || []).map((r) => {
        let items = []
        try { items = JSON.parse(r.items || '[]') } catch { }
        return { ...r, items }
    })

    const totals = {
        online: { count: 0, revenue_cents: 0 },
        in_store: { count: 0, revenue_cents: 0 },
        all: { count: 0, revenue_cents: 0 },
    }

    for (const o of orders) {
        const src = o.source === 'in_store' ? 'in_store' : 'online'
        totals[src].count += 1
        totals[src].revenue_cents += o.total_cents || 0
        totals.all.count += 1
        totals.all.revenue_cents += o.total_cents || 0
    }

    totals.all.avg_order_cents = totals.all.count > 0
        ? Math.round(totals.all.revenue_cents / totals.all.count)
        : 0

    return Response.json({
        data: {
            from,
            to,
            totals,
            orders,
        },
        error: null,
    })
}