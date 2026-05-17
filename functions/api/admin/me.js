export async function onRequestGet({ data }) {
    const user = data.user
    if (!user) {
        return Response.json({ user: null }, { status: 401 })
    }
    return Response.json({
        user: { id: user.sub, email: user.email },
    })
}