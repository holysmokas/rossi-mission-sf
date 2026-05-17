import {
    ALLOWED_TABLES,
    validIdent,
    encodeRow,
    decodeRow,
} from '../../../_lib/admin-tables.js'

export async function onRequestGet({ params, env }) {
    const { table, id } = params
    if (!ALLOWED_TABLES.has(table)) {
        return Response.json({ error: 'unknown table' }, { status: 404 })
    }
    const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first()
    if (!row) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json({ data: decodeRow(table, row), error: null })
}

export async function onRequestPatch({ params, request, env }) {
    const { table, id } = params
    if (!ALLOWED_TABLES.has(table)) {
        return Response.json({ error: 'unknown table' }, { status: 404 })
    }

    let body
    try { body = await request.json() } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 })
    }

    const encoded = encodeRow(table, body)
    const cols = Object.keys(encoded).filter((c) => validIdent(c) && c !== 'id')
    if (cols.length === 0) {
        return Response.json({ error: 'no valid columns to update' }, { status: 400 })
    }

    const setClause = cols.map((c) => `${c} = ?`).join(', ')
    const values = cols.map((c) => encoded[c])
    values.push(id)

    try {
        const result = await env.DB.prepare(
            `UPDATE ${table} SET ${setClause} WHERE id = ? RETURNING *`
        ).bind(...values).first()
        if (!result) return Response.json({ error: 'not found' }, { status: 404 })
        return Response.json({ data: decodeRow(table, result), error: null })
    } catch (err) {
        return Response.json({ error: err.message }, { status: 400 })
    }
}

export async function onRequestDelete({ params, env }) {
    const { table, id } = params
    if (!ALLOWED_TABLES.has(table)) {
        return Response.json({ error: 'unknown table' }, { status: 404 })
    }
    const result = await env.DB.prepare(
        `DELETE FROM ${table} WHERE id = ? RETURNING *`
    ).bind(id).first()
    if (!result) return Response.json({ error: 'not found' }, { status: 404 })
    return Response.json({ data: decodeRow(table, result), error: null })
}