export const ALLOWED_TABLES = new Set([
    'products',
    'gallery_images',
    'showcase_images',
    'inventory_log',
    'orders',
])

const TABLE_META = {
    products: {
        jsonCols: ['images', 'tags', 'sizes'],
        boolCols: ['active', 'featured'],
        pkType: 'text',
    },
    gallery_images: {
        jsonCols: [],
        boolCols: ['active'],
        pkType: 'autoincrement',
    },
    showcase_images: {
        jsonCols: [],
        boolCols: ['active'],
        pkType: 'autoincrement',
    },
    inventory_log: {
        jsonCols: [],
        boolCols: [],
        pkType: 'autoincrement',
    },
    orders: {
        jsonCols: ['items', 'shipping_address'],
        boolCols: ['notified'],
        pkType: 'text',
    },
}

const FILTER_COLS = {
    products: new Set(['id', 'category', 'subcategory', 'stock_status', 'artist', 'active', 'featured']),
    gallery_images: new Set(['id', 'active', 'artist']),
    showcase_images: new Set(['id', 'active']),
    inventory_log: new Set(['id', 'product_id', 'order_id', 'change_type']),
    orders: new Set(['id', 'status', 'square_order_id', 'customer_email']),
}

const ORDER_COLS = {
    products: new Set(['created_at', 'updated_at', 'featured', 'price', 'name', 'quantity']),
    gallery_images: new Set(['created_at', 'sort_order', 'id']),
    showcase_images: new Set(['created_at', 'sort_order', 'id']),
    inventory_log: new Set(['created_at', 'id']),
    orders: new Set(['created_at', 'paid_at', 'total_cents']),
}

export function tableMeta(table) {
    return TABLE_META[table] || { jsonCols: [], boolCols: [], pkType: 'autoincrement' }
}

export function isFilterCol(table, col) {
    return FILTER_COLS[table]?.has(col) || false
}

export function isOrderCol(table, col) {
    return ORDER_COLS[table]?.has(col) || false
}

export function validIdent(name) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

export function encodeRow(table, row) {
    const meta = tableMeta(table)
    const out = {}
    for (const [k, v] of Object.entries(row)) {
        if (v === undefined) continue
        if (meta.jsonCols.includes(k) && (Array.isArray(v) || (typeof v === 'object' && v !== null))) {
            out[k] = JSON.stringify(v)
        } else if (meta.boolCols.includes(k) && typeof v === 'boolean') {
            out[k] = v ? 1 : 0
        } else {
            out[k] = v
        }
    }
    return out
}

export function decodeRow(table, row) {
    if (!row) return row
    const meta = tableMeta(table)
    const out = {}
    for (const [k, v] of Object.entries(row)) {
        if (meta.jsonCols.includes(k) && typeof v === 'string') {
            try { out[k] = JSON.parse(v) } catch { out[k] = v }
        } else if (meta.boolCols.includes(k) && typeof v === 'number') {
            out[k] = v === 1
        } else {
            out[k] = v
        }
    }
    return out
}