// functions/api/orders/[id].js
// GET /api/orders/:id  →  current order status (public-safe subset)
// Used by the OrderSuccess page to poll until the webhook flips status to 'paid'.

export async function onRequestGet({ params, env }) {
    const id = params?.id
    if (!id) return Response.json({ error: 'missing id' }, { status: 400 })

    const row = await env.DB.prepare(
        `SELECT id, status, total_cents, currency, item_count, created_at, paid_at
       FROM orders WHERE id = ?`
    ).bind(id).first()

    if (!row) return Response.json({ error: 'not found' }, { status: 404 })

    return Response.json(
        { data: row, error: null },
        { headers: { 'Cache-Control': 'no-store' } }
    )
}