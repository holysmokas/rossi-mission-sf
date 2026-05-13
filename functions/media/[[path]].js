// functions/media/[[path]].js
// GET /media/<key>
// Proxies R2 objects through the Pages app, so we don't need a custom
// domain on the bucket (Wix DNS makes that impractical). Same origin as
// the site, edge-cached, no CORS.

export async function onRequestGet({ params, env, request }) {
  const key = Array.isArray(params.path) ? params.path.join('/') : params.path
  if (!key) return new Response('Not found', { status: 404 })

  // Honor conditional requests so cached clients don't re-download
  const ifNoneMatch = request.headers.get('if-none-match') || undefined
  const obj = await env.MEDIA.get(key, ifNoneMatch ? { onlyIf: { etagDoesNotMatch: ifNoneMatch } } : undefined)
  if (!obj) {
    // .get returns null both for "not found" and "etag matched"
    const head = await env.MEDIA.head(key)
    if (head) {
      const h304 = new Headers()
      head.writeHttpMetadata(h304)
      h304.set('etag', head.httpEtag)
      return new Response(null, { status: 304, headers: h304 })
    }
    return new Response('Not found', { status: 404 })
  }

  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(obj.body, { headers })
}