import {
    ALLOWED_TABLES,
    tableMeta,
    isFilterCol,
    isOrderCol,
    validIdent,
    encodeRow,
    decodeRow,
} from '../../_lib/admin-tables.js'

export async function onRequestGet({ params, request, env }) {
    const table = params.table
    if (!ALLOWED_TABLES.has(table)) {
        return Response.json({ error: 'unknown table' }, { status: 404 })
    }

    const url = new URL(request.url)
    const sp = url.searchParams
    const meta = tableMeta(table)

    let sql = `SELECT * FROM ${table} WHERE 1=1`
    const binds = []

    for (const [key, val] of sp) {
        if (key === 'limit' || key === 'order') continue
        if (!isFilterCol(table, key)) continue
        if (meta.boolCols.includes(key)) {
            sql += ` AND ${key} = ?`
            binds.push(val === 'true' ? 1 : 0)
        } else {
            sql += ` AND ${key} = ?`
            binds.push(val)
        }
    }

    const orders = sp.getAll('order')
    const orderParts = []
    for (const o of orders) {
        const [col, dir] = o.split('.')
        if (!isOrderCol(table, col)) continue
        orderParts.push(`${col} ${dir === 'asc' ? 'ASC' : 'DESC'}`)
    }
    if (orderParts.length) {
        sql += ` ORDER BY ${orderParts.join(', ')}`
    } else {
        sql += ' ORDER BY created_at DESC'
    }

    const limit = parseInt(sp.get('limit') || '0', 10)
    if (limit > 0) sql += ` LIMIT ${Math.min(limit, 1000)}`

    const result = await env.DB.prepare(sql).bind(...binds).all()
    const rows = (result.results || []).map((r) => decodeRow(table, r))
    return Response.json({ data: rows, error: null })
}

export async function onRequestPost({ params, request, env }) {
    const table = params.table
    if (!ALLOWED_TABLES.has(table)) {
        return Response.json({ error: 'unknown table' }, { status: 404 })
    }

    let body
    try { body = await request.json() } catch {
        return Response.json({ error: 'invalid JSON' }, { status: 400 })
    }

    const rows = Array.isArray(body) ? body : [body]
    const meta = tableMeta(table)
    const inserted = []

    for (const row of rows) {
        const encoded = encodeRow(table, row)
        if (meta.pkType === 'text' && !encoded.id) {
            encoded.id = crypto.randomUUID()
        }
        if (meta.pkType === 'autoincrement') {
            delete encoded.id
        }

        const cols = Object.keys(encoded).filter(validIdent)
        if (cols.length === 0) {
            return Response.json({ error: 'no valid columns' }, { status: 400 })
        }
        const placeholders = cols.map(() => '?').join(',')
        const values = cols.map((c) => encoded[c])

        try {
            const result = await env.DB.prepare(
                `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`
            ).bind(...values).first()
            inserted.push(decodeRow(table, result))
        } catch (err) {
            return Response.json({ error: err.message }, { status: 400 })
        }
    }

    return Response.json({
        data: Array.isArray(body) ? inserted : inserted[0],
        error: null,
    })
}