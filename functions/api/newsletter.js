// functions/api/newsletter.js
// POST /api/newsletter   body: { email } or [{ email }]

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return err(400, 'Invalid JSON') }

  const row = Array.isArray(body) ? body[0] : body
  if (!row?.email) return err(400, 'email required')

  const email = String(row.email).trim().toLowerCase()
  if (email.length > 254 || !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email)) {
    return err(400, 'invalid email')
  }

  try {
    await env.DB.prepare(
      'INSERT INTO newsletter (email, source) VALUES (?, ?)'
    ).bind(email, row.source || 'website').run()
    return Response.json({ data: [{ email }], error: null })
  } catch (e) {
    const msg = String(e.message || '')
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      // mirror Postgres unique_violation so Newsletter.jsx's existing error.code check still works
      return Response.json(
        { data: null, error: { code: '23505', message: 'already subscribed' } },
        { status: 409 }
      )
    }
    return err(500, msg)
  }
}

function err(status, message) {
  return Response.json({ data: null, error: { message, code: String(status) } }, { status })
}
