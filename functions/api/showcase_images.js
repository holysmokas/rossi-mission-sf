// functions/api/showcase_images.js
// GET /api/showcase_images?active=true&order=sort_order.asc

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const active = url.searchParams.get('active')

  let sql = 'SELECT * FROM showcase_images WHERE 1=1'
  if (active === 'true') sql += ' AND active = 1'
  sql += ' ORDER BY sort_order ASC'

  const result = await env.DB.prepare(sql).all()
  const rows = (result.results || []).map((r) => ({ ...r, active: !!r.active }))

  return Response.json(
    { data: rows, error: null },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  )
}
