import { verifyPassword, signJWT, sessionCookie } from '../../_lib/auth.js'

export async function onRequestPost({ request, env }) {
    let body
    try { body = await request.json() } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 })
    }

    const email = (body.email || '').trim().toLowerCase()
    const password = body.password || ''
    if (!email || !password) {
        return Response.json({ error: 'email and password required' }, { status: 400 })
    }

    const user = await env.DB.prepare(
        `SELECT id, email, password_hash FROM admin_users WHERE email = ? LIMIT 1`
    ).bind(email).first()

    if (!user) {
        return Response.json({ error: 'invalid credentials' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
        return Response.json({ error: 'invalid credentials' }, { status: 401 })
    }

    const token = await signJWT(
        { sub: user.id, email: user.email },
        env.ADMIN_JWT_SECRET,
        86400
    )

    return new Response(JSON.stringify({
        user: { id: user.id, email: user.email },
    }), {
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': sessionCookie(token),
        },
    })
}