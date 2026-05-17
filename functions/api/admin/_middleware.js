import { verifyJWT, parseCookie } from '../../_lib/auth.js'

export const onRequest = async (context) => {
    const { request, env, next, data } = context
    const url = new URL(request.url)

    if (url.pathname === '/api/admin/login') {
        return next()
    }

    const token = parseCookie(request.headers.get('Cookie'), 'admin_session')
    if (!token) {
        return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    const payload = await verifyJWT(token, env.ADMIN_JWT_SECRET)
    if (!payload) {
        return Response.json({ error: 'invalid session' }, { status: 401 })
    }

    data.user = payload
    return next()
}