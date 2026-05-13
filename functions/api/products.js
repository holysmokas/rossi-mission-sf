// functions/api/products.js
// GET /api/products?active=true&category=art&featured=true&limit=10&order=featured.desc&order=created_at.desc

const FILTER_COLS = new Set(['id', 'category', 'subcategory', 'stock_status', 'artist'])
const BOOL_COLS = new Set(['active', 'featured'])
const ORDER_COLS = new Set(['created_at', 'updated_at', 'featured', 'price', 'name', 'quantity'])

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const params = url.searchParams

  let sql = 'SELECT * FROM products WHERE 1=1'
  const args = []

  for (const [key, val] of params) {
    if (key === 'limit' || key === 'order') continue
    if (BOOL_COLS.has(key)) {
      sql += ` AND ${key} = ?`
      args.push(val === 'true' ? 1 : 0)
    } else if (FILTER_COLS.has(key)) {
      sql += ` AND ${key} = ?`
      args.push(val)
    }
  }

  const orders = params.getAll('order')
  if (orders.length) {
    const parts = []
    for (const o of orders) {
      const [col, dir] = o.split('.')
      if (!ORDER_COLS.has(col)) continue
      parts.push(`${col} ${dir === 'asc' ? 'ASC' : 'DESC'}`)
    }
    if (parts.length) sql += ` ORDER BY ${parts.join(', ')}`
  } else {
    sql += ' ORDER BY created_at DESC'
  }

  const limit = parseInt(params.get('limit') || '0', 10)
  if (limit > 0) sql += ` LIMIT ${Math.min(limit, 500)}`

  const result = await env.DB.prepare(sql).bind(...args).all()
  const rows = (result.results || []).map(hydrate)

  return Response.json(
    { data: rows, error: null },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
  )
}

function hydrate(row) {
  return {
    ...row,
    featured: !!row.featured,
    active: !!row.active,
    images: safeJson(row.images, []),
    tags: safeJson(row.tags, []),
    sizes: safeJson(row.sizes, []),
  }
}
function safeJson(s, fallback) {
  if (!s) return fallback
  try { return JSON.parse(s) } catch { return fallback }
}
