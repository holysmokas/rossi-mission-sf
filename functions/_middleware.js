// functions/_middleware.js
// Applies to every request. Adds CORS for /api/* and traps unhandled errors.

export const onRequest = [withCORS, withErrors]

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
