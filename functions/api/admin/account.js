import { hashPassword } from '../../_lib/auth.js'

export async function onRequestPut({ request, env, data }) {
    const user = data.user
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

    let body
    try { body = await request.json() } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 })
    }

    const updates = []
    const binds = []

    if (body.email) {
        updates.push('email = ?')
        binds.push(body.email.trim().toLowerCase())
    }

    if (body.new_password) {
        if (body.new_password.length < 6) {
            return Response.json({ error: 'password must be at least 6 characters' }, { status: 400 })
        }
        updates.push('password_hash = ?')
        binds.push(await hashPassword(body.new_password))
    }

    if (body.data && typeof body.data === 'object') {
        if ('full_name' in body.data) {
            updates.push('full_name = ?')
            binds.push(String(body.data.full_name || '').slice(0, 100))
        }
        if ('phone' in body.data) {
            updates.push('phone = ?')
            binds.push(String(body.data.phone || '').slice(0, 20))
        }
    }

    if (updates.length === 0) {
        return Response.json({ error: 'nothing to update' }, { status: 400 })
    }

    binds.push(user.sub)
    try {
        await env.DB.prepare(
            `UPDATE admin_users SET ${updates.join(', ')}, updated_at = unixepoch() WHERE id = ?`
        ).bind(...binds).run()
    } catch (err) {
        return Response.json({ error: err.message }, { status: 400 })
    }

    return Response.json({ ok: true })
}