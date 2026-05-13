// functions/api/contact_messages.js
// POST /api/contact_messages   body: { name, email, message, submitted_at? }

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return err(400, 'Invalid JSON') }

  const row = Array.isArray(body) ? body[0] : body
  if (!row?.name || !row?.email || !row?.message) return err(400, 'name, email, message required')

  const name = String(row.name).trim().slice(0, 100)
  const email = String(row.email).trim().toLowerCase().slice(0, 254)
  const message = String(row.message).trim().slice(0, 2000)

  if (name.length < 2) return err(400, 'name too short')
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email)) return err(400, 'invalid email')
  if (message.length < 10) return err(400, 'message too short')

  await env.DB.prepare(
    'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)'
  ).bind(name, email, message).run()

  return Response.json({ data: [{ name, email }], error: null })
}

function err(status, message) {
  return Response.json({ data: null, error: { message, code: String(status) } }, { status })
}
