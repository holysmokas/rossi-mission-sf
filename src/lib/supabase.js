// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────
// Cloudflare backend shim. Drop-in replacement for the Supabase
// client. Keeps the same import name so no other component file
// needs to change.
//
// Phase 1 scope:
//   - storefront reads:   products, gallery_images, showcase_images
//   - storefront writes:  newsletter, contact_messages
//   - auth + storage:     stubbed (admin/uploads return cleanly,
//                         pages render a maintenance message)
//
// Phase 3 will expand auth + admin writes once Cloudflare Access
// is wired up on /admin/*.
// ─────────────────────────────────────────────────────────────

const API_BASE = '' // same origin as the Pages site

class Query {
  constructor(table) {
    this.table = table
    this.filters = []
    this.orders = []
    this.limitVal = null
    this.action = 'select'
    this.payload = null
    this.singleVal = false
  }
  select(/* cols */) { return this }
  eq(col, val) { this.filters.push([col, val]); return this }
  order(col, opts = {}) { this.orders.push({ col, asc: opts.ascending !== false }); return this }
  limit(n) { this.limitVal = n; return this }
  single() { this.singleVal = true; return this }

  insert(rows) { this.action = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this }
  update(values) { this.action = 'update'; this.payload = values; return this }
  delete() { this.action = 'delete'; return this }

  async _exec() {
    try {
      const endpoint = `${API_BASE}/api/${this.table}`

      if (this.action === 'select') {
        const params = new URLSearchParams()
        for (const [col, val] of this.filters) params.append(col, String(val))
        for (const o of this.orders) params.append('order', `${o.col}.${o.asc ? 'asc' : 'desc'}`)
        if (this.limitVal != null) params.set('limit', String(this.limitVal))
        const res = await fetch(`${endpoint}?${params}`)
        return this._finish(res)
      }

      if (this.action === 'insert') {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.payload),
        })
        return this._finish(res)
      }

      // update/delete are admin-only; phase 1 returns a clean error
      return {
        data: null,
        error: { code: 'MAINTENANCE', message: 'Admin temporarily unavailable during migration.' },
      }
    } catch (err) {
      return { data: null, error: { code: 'NETWORK', message: err.message } }
    }
  }

  async _finish(res) {
    let body = {}
    try { body = await res.json() } catch {}
    if (!res.ok) {
      return { data: null, error: body.error || { code: String(res.status), message: res.statusText } }
    }
    let data = body.data ?? body
    if (this.singleVal && Array.isArray(data)) data = data[0] || null
    return { data, error: null }
  }

  then(resolve, reject) { return this._exec().then(resolve, reject) }
}

// ── Auth: stubbed. Admin pages will render a maintenance state. ──
const MAINT = { message: 'Admin temporarily unavailable during migration.', code: 'MAINTENANCE' }
const auth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser:    async () => ({ data: { user: null }, error: null }),
  signInWithPassword: async () => ({ data: null, error: MAINT }),
  signUp:             async () => ({ data: null, error: MAINT }),
  signOut:            async () => ({ error: null }),
  updateUser:         async () => ({ data: null, error: MAINT }),
  resetPasswordForEmail: async () => ({ data: null, error: MAINT }),
  onAuthStateChange: () => ({
    data: { subscription: { unsubscribe() {} } },
  }),
}

// ── Storage: stubbed. Uploads come back in phase 3. ──
const storage = {
  from(_bucket) {
    return {
      upload:        async () => ({ data: null, error: MAINT }),
      remove:        async () => ({ data: null, error: null }),
      getPublicUrl: (path) => ({ data: { publicUrl: path || '' } }),
    }
  },
}

export const supabase = {
  from: (table) => new Query(table),
  auth,
  storage,
}
