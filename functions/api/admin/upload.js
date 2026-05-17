const ALLOWED_BUCKETS = new Set(['product-images', 'gallery', 'showcase'])

function safePath(p) {
    if (typeof p !== 'string') return null
    if (p.includes('..') || p.startsWith('/')) return null
    if (p.length === 0 || p.length > 512) return null
    return p
}

export async function onRequestPost({ request, env }) {
    const ct = request.headers.get('Content-Type') || ''
    if (!ct.startsWith('multipart/form-data')) {
        return Response.json({ error: 'use multipart/form-data' }, { status: 400 })
    }

    let formData
    try { formData = await request.formData() } catch {
        return Response.json({ error: 'invalid form data' }, { status: 400 })
    }

    const file = formData.get('file')
    const bucket = formData.get('bucket')
    const rawPath = formData.get('path')

    if (!file || typeof file === 'string') {
        return Response.json({ error: 'file required' }, { status: 400 })
    }
    if (!ALLOWED_BUCKETS.has(bucket)) {
        return Response.json({ error: 'invalid bucket' }, { status: 400 })
    }
    const path = safePath(rawPath)
    if (!path) {
        return Response.json({ error: 'invalid path' }, { status: 400 })
    }

    const key = `${bucket}/${path}`
    try {
        await env.MEDIA.put(key, await file.arrayBuffer(), {
            httpMetadata: { contentType: file.type || 'application/octet-stream' },
        })
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 })
    }

    return Response.json({
        data: {
            bucket,
            path,
            key,
            publicUrl: `/media/${key}`,
        },
        error: null,
    })
}

export async function onRequestDelete({ request, env }) {
    let body
    try { body = await request.json() } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 })
    }

    const bucket = body.bucket
    const paths = Array.isArray(body.paths) ? body.paths : []
    if (!ALLOWED_BUCKETS.has(bucket)) {
        return Response.json({ error: 'invalid bucket' }, { status: 400 })
    }

    let deleted = 0
    for (const raw of paths) {
        const path = safePath(raw)
        if (!path) continue
        try {
            await env.MEDIA.delete(`${bucket}/${path}`)
            deleted++
        } catch {
        }
    }

    return Response.json({ data: { deleted }, error: null })
}