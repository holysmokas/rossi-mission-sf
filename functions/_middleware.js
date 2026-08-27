// functions/_middleware.js
// Applies to every request. Bot shield, CORS for /api/*, unhandled error trap.

export const onRequest = [withBotShield, withCORS, withErrors]

const DATACENTER_ASNS = new Set([
  14618, 16509,
  15169, 396982,
  8075,
  14061,
  16276,
  24940,
  63949,
  20473,
  51167,
  9009,
  60781,
  50673,
  45102, 37963,
  132203,
  135377,
  4134, 4837,
  53667,
  62240,
  212238,
])

function isDatacenter(request) {
  const asn = request.cf?.asn
  return typeof asn === 'number' && DATACENTER_ASNS.has(asn)
}

class StripAnalytics {
  element(el) {
    el.remove()
  }
}

async function withBotShield(ctx) {
  const { request, next } = ctx
  const url = new URL(request.url)

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) {
    return next()
  }

  if (!isDatacenter(request)) return next()

  const res = await next()
  const type = res.headers.get('content-type') || ''
  if (!type.includes('text/html')) return res

  console.log(`BOT_SHIELD asn=${request.cf?.asn} country=${request.cf?.country} path=${url.pathname}`)

  const stripped = new HTMLRewriter()
    .on('script[data-analytics]', new StripAnalytics())
    .transform(res)

  const headers = new Headers(stripped.headers)
  headers.set('x-bot-shield', 'stripped')
  return new Response(stripped.body, { status: stripped.status, headers })
}

async function withCORS(ctx) {
  const { request, next } = ctx
  const url = new URL(request.url)
  const isApi = url.pathname.startsWith('/api/')

  if (isApi && request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const res = await next()
  if (isApi) {
    const h = new Headers(res.headers)
    for (const [k, v] of Object.entries(corsHeaders())) h.set(k, v)
    return new Response(res.body, { status: res.status, headers: h })
  }
  return res
}

async function withErrors(ctx) {
  try {
    return await ctx.next()
  } catch (err) {
    console.error('Unhandled function error:', err)
    return Response.json(
      { data: null, error: { message: err.message || 'Internal error', code: 'INTERNAL' } },
      { status: 500 }
    )
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}
