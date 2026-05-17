import { hashPassword, verifyPassword } from '../../_lib/auth.js'

export async function onRequestPut({ request, env, data }) {
    const user = data.user
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

    let body
    try { body = await request.json() } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 })
    }

    if (!body.current_password) {
        return Response.json({ error: 'current password required' }, { status: 400 })
    }

    const dbUser = await env.DB.prepare(
        `SELECT password_hash FROM admin_users WHERE id = ?`
    ).bind(user.sub).first()

    if (!dbUser) return Response.json({ error: 'user not found' }, { status: 404 })

    const valid = await verifyPassword(body.current_password, dbUser.password_hash)
    if (!valid) return Response.json({ error: 'current password incorrect' }, { status: 401 })

    const updates = []
    const binds = []

    if (body.email) {
        updates.push('email = ?')
        binds.push(body.email.trim().toLowerCase())
    }

    if (body.new_password) {
        if (body.new_password.length < 8) {
            return Response.json({ error: 'password must be at least 8 characters' }, { status: 400 })
        }
        updates.push('password_hash = ?')
        binds.push(await hashPassword(body.new_password))
    }

    if (updates.length === 0) {
        return Response.json({ error: 'nothing to update' }, { status: 400 })
    }

    binds.push(user.sub)
    await env.DB.prepare(
        `UPDATE admin_users SET ${updates.join(', ')}, updated_at = unixepoch() WHERE id = ?`
    ).bind(...binds).run()

    return Response.json({ ok: true })
}