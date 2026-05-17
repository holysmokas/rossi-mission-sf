export async function onRequestGet({ data, env }) {
    const user = data.user
    if (!user) return Response.json({ user: null }, { status: 401 })

    const row = await env.DB.prepare(
        `SELECT id, email, full_name, phone FROM admin_users WHERE id = ?`
    ).bind(user.sub).first()

    if (!row) return Response.json({ user: null }, { status: 401 })

    return Response.json({
        user: {
            id: row.id,
            email: row.email,
            user_metadata: {
                full_name: row.full_name || '',
                phone: row.phone || '',
            },
        },
    })
}