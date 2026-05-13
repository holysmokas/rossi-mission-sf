// scripts/seed-from-csv.mjs
// Read the Shopify product CSV and emit a D1-ready seed.sql.
// Re-run any time the CSV is updated.
//
//   node scripts/seed-from-csv.mjs ./product_template.csv > seed.sql
//   wrangler d1 execute rossi --remote --file=./seed.sql

import { readFileSync } from 'node:fs'
import { argv } from 'node:process'

const CSV_PATH = argv[2] || './product_template.csv'

// ── tiny CSV parser (handles quoted fields with commas) ──
function parseCSV(text) {
  const rows = []
  let cur = ['']
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur[cur.length - 1] += '"'; i++ }
      else if (c === '"') inQ = false
      else cur[cur.length - 1] += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') cur.push('')
      else if (c === '\r') {}
      else if (c === '\n') { rows.push(cur); cur = [''] }
      else cur[cur.length - 1] += c
    }
  }
  if (cur.length > 1 || cur[0] !== '') rows.push(cur)
  return rows
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const esc = (s) => s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'"
const bool = (b) => b ? '1' : '0'

// Map Shopify Type/Title to our category enum
function mapCategory(type, title) {
  const t = (type || '').toLowerCase()
  const all = (title + ' ' + type).toLowerCase()
  if (all.includes('limited') || all.includes('one of a kind') || all.includes('handmade')) return 'limited_editions'
  if (t.includes('hoodie') || t.includes('tee') || t.includes('shirt') || t.includes('jacket') || t.includes('vest') || t.includes('pants')) return 'clothing'
  if (t.includes('cap') || t.includes('hat') || t.includes('bag') || t.includes('pin')) return 'accessories'
  if (t.includes('shoe') || t.includes('sneaker') || t.includes('boot')) return 'footwear'
  if (t.includes('art') || t.includes('print') || t.includes('canvas')) return 'art'
  return 'clothing'
}
function mapSubcategory(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('hoodie')) return 'hoodies'
  if (t.includes('jacket') || t.includes('vest')) return 'jackets'
  if (t.includes('tee') || t.includes('shirt')) return 'tees'
  return null
}

const text = readFileSync(CSV_PATH, 'utf8')
const rows = parseCSV(text)
const header = rows[0].map(h => h.trim())
const col = (name) => header.indexOf(name)

const idx = {
  title: col('Title'),
  desc: col('Description'),
  vendor: col('Vendor'),
  type: col('Type'),
  tags: col('Tags'),
  status: col('Status'),
  size: col('Option1 value'),
  price: col('Price'),
  qty: col('Inventory quantity'),
  image: col('Product image URL'),
  imgPos: col('Image position'),
}

// Group variants by Title (CSV is one row per variant)
const byTitle = new Map()
for (let i = 1; i < rows.length; i++) {
  const r = rows[i]
  if (!r || !r[idx.title]) continue
  const title = r[idx.title].trim()
  if (!title) continue
  if (!byTitle.has(title)) byTitle.set(title, { rows: [], sizes: new Set(), images: new Map() })
  const g = byTitle.get(title)
  g.rows.push(r)
  const sz = (r[idx.size] || '').trim()
  if (sz) g.sizes.add(sz)
  const img = (r[idx.image] || '').trim()
  if (img) {
    const pos = parseInt(r[idx.imgPos] || '0', 10) || g.images.size + 1
    if (!g.images.has(pos)) g.images.set(pos, img)
  }
}

// Note: NO `BEGIN TRANSACTION` / `COMMIT` here — D1's `wrangler d1 execute --file`
// wraps the whole file in its own transaction and rejects explicit ones.
console.log(`-- Generated ${new Date().toISOString()} from ${CSV_PATH}`)
console.log(`-- Products: ${byTitle.size}`)
console.log('DELETE FROM products;')

let n = 0
const sizeOrder = ['XS','Small','S','Medium','M','Large','L','XL','XXL','One Size']
for (const [title, g] of byTitle) {
  const r0 = g.rows[0]
  const id = slug(title)
  const description = (r0[idx.desc] || '').trim()
  const vendor = (r0[idx.vendor] || '').trim()
  const artist = vendor === 'Rossi' ? 'Guez' : (vendor || null)
  const price = parseFloat(r0[idx.price] || '0') || 0
  const tags = (r0[idx.tags] || '').split(',').map(t => t.trim()).filter(Boolean)
  const status = (r0[idx.status] || 'active').toLowerCase()
  const type = r0[idx.type] || ''
  const category = mapCategory(type, title)
  const subcategory = mapSubcategory(type)
  const sizes = [...g.sizes].sort((a, b) => {
    const ai = sizeOrder.indexOf(a), bi = sizeOrder.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  const qty = g.rows.reduce((sum, row) => sum + (parseInt(row[idx.qty] || '0', 10) || 0), 0)
  const stockStatus = qty <= 0 ? 'sold_out' : qty <= 5 ? 'low_stock' : 'in_stock'
  const imagesArr = [...g.images.entries()].sort((a, b) => a[0] - b[0]).map(([, u]) => u)
  const imageUrl = imagesArr[0] || null
  const featured = category === 'limited_editions' ? 1 : 0
  const active = status === 'active' ? 1 : 0

  console.log(
    `INSERT INTO products (id, name, description, price, category, subcategory, image_url, images, featured, active, quantity, stock_status, tags, artist, sizes) VALUES (` +
    `${esc(id)}, ${esc(title)}, ${esc(description)}, ${price}, ${esc(category)}, ${esc(subcategory)}, ${esc(imageUrl)}, ` +
    `${esc(JSON.stringify(imagesArr))}, ${bool(featured)}, ${bool(active)}, ${qty}, ${esc(stockStatus)}, ` +
    `${esc(JSON.stringify(tags))}, ${esc(artist)}, ${esc(JSON.stringify(sizes))});`
  )
  n++
}

console.error(`Wrote ${n} products to seed.sql`)
