// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────
// Cloudflare backend shim. Drop-in for the Supabase client.
//
// Phase 3b/3c scope:
//   - Storefront reads:  /api/{table}      (public, cached)
//   - Storefront writes: /api/{table}      (newsletter, contact_messages)
//   - Admin reads:       /api/admin/{table}      (auth required, all rows)
//   - Admin inserts:     /api/admin/{table}      (POST)
//   - Admin updates:     /api/admin/{table}/{id} (PATCH)
//   - Admin deletes:     /api/admin/{table}/{id} (DELETE)
//   - Admin uploads:     /api/admin/upload       (multipart POST)
//   - Admin removes:     /api/admin/upload       (DELETE w/ JSON body)
//
// Admin vs public is decided by window.location.pathname.
// If the calling page lives under /admin/*, all DB ops are routed
// through the authenticated admin endpoints.
// ─────────────────────────────────────────────────────────────

const API_BASE = ''

function isAdminContext() {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/admin')
}

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
      const admin = isAdminContext()
      const base = admin ? `${API_BASE}/api/admin/${this.table}` : `${API_BASE}/api/${this.table}`
      const credOpts = admin ? { credentials: 'include' } : {}

      if (this.action === 'select') {
        const params = new URLSearchParams()
        for (const [col, val] of this.filters) params.append(col, String(val))
        for (const o of this.orders) params.append('order', `${o.col}.${o.asc ? 'asc' : 'desc'}`)
        if (this.limitVal != null) params.set('limit', String(this.limitVal))
        const qs = params.toString()
        const res = await fetch(qs ? `${base}?${qs}` : base, credOpts)
        return this._finish(res)
      }

      if (this.action === 'insert') {
        const payload = this.payload.length === 1 ? this.payload[0] : this.payload
        const res = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: admin ? 'include' : 'same-origin',
          body: JSON.stringify(payload),
        })
        return this._finish(res)
      }

      if (this.action === 'update' || this.action === 'delete') {
        if (!admin) {
          return { data: null, error: { code: 'FORBIDDEN', message: 'write requires admin context' } }
        }
        const idFilter = this.filters.find(([col]) => col === 'id')
        if (!idFilter) {
          return { data: null, error: { code: 'INVALID', message: 'update/delete requires .eq("id", ...)' } }
        }
        const endpoint = `${base}/${encodeURIComponent(idFilter[1])}`

        if (this.action === 'update') {
          const res = await fetch(endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(this.payload),
          })
          return this._finish(res)
        }

        const res = await fetch(endpoint, {
          method: 'DELETE',
          credentials: 'include',
        })
        return this._finish(res)
      }

      return { data: null, error: { code: 'UNKNOWN_ACTION', message: this.action } }
    } catch (err) {
      return { data: null, error: { code: 'NETWORK', message: err.message } }
    }
  }

  async _finish(res) {
    let body = {}
    try { body = await res.json() } catch { }
    if (!res.ok) {
      return { data: null, error: body.error || { code: String(res.status), message: res.statusText } }
    }
    let data = body.data ?? body
    if (this.singleVal && Array.isArray(data)) data = data[0] || null
    return { data, error: null }
  }

  then(resolve, reject) { return this._exec().then(resolve, reject) }
}

// ─────────── Auth (phase 3a) ────────────

const authListeners = new Set()
function notifyAuthChange(event, session) {
  for (const cb of authListeners) {
    try { cb(event, session) } catch (e) { console.error('auth listener error', e) }
  }
}

async function fetchMe() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/me`, { credentials: 'include' })
    if (!res.ok) return null
    const body = await res.json()
    return body.user || null
  } catch { return null }
}

const auth = {
  async getSession() {
    const user = await fetchMe()
    return { data: { session: user ? { user } : null }, error: null }
  },
  async getUser() {
    const user = await fetchMe()
    return { data: { user }, error: user ? null : { code: 'NO_SESSION', message: 'not authenticated' } }
  },
  async signInWithPassword({ email, password }) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { data: null, error: { code: 'INVALID', message: body.error || 'login failed' } }
      }
      notifyAuthChange('SIGNED_IN', { user: body.user })
      return { data: { user: body.user, session: { user: body.user } }, error: null }
    } catch (err) {
      return { data: null, error: { code: 'NETWORK', message: err.message } }
    }
  },
  async signOut() {
    try { await fetch(`${API_BASE}/api/admin/logout`, { method: 'POST', credentials: 'include' }) } catch { }
    notifyAuthChange('SIGNED_OUT', null)
    return { error: null }
  },
  async updateUser({ email, password, data }) {
    try {
      const body = {}
      if (email) body.email = email
      if (password) body.new_password = password
      if (data) body.data = data
      const res = await fetch(`${API_BASE}/api/admin/account`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const respBody = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { data: null, error: { code: 'UPDATE_FAILED', message: respBody.error || 'update failed' } }
      }
      return { data: { user: { email } }, error: null }
    } catch (err) {
      return { data: null, error: { code: 'NETWORK', message: err.message } }
    }
  },
  async signUp() {
    return { data: null, error: { code: 'DISABLED', message: 'Self-signup disabled.' } }
  },
  async resetPasswordForEmail() {
    return { data: null, error: { code: 'DISABLED', message: 'Use the admin account page after logging in.' } }
  },
  onAuthStateChange(callback) {
    authListeners.add(callback)
    return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } }
  },
}

// ─────────── Storage (phase 3c) ────────────

const storage = {
  from(bucket) {
    return {
      async upload(path, file) {
        try {
          const formData = new FormData()
          formData.append('bucket', bucket)
          formData.append('path', path)
          formData.append('file', file)
          const res = await fetch(`${API_BASE}/api/admin/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          })
          const body = await res.json().catch(() => ({}))
          if (!res.ok) {
            return { data: null, error: body.error || { code: String(res.status), message: 'upload failed' } }
          }
          return { data: { path, fullPath: body.data.key }, error: null }
        } catch (err) {
          return { data: null, error: { code: 'NETWORK', message: err.message } }
        }
      },
      async remove(paths) {
        const arr = Array.isArray(paths) ? paths : [paths]
        try {
          const res = await fetch(`${API_BASE}/api/admin/upload`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ bucket, paths: arr }),
          })
          const body = await res.json().catch(() => ({}))
          if (!res.ok) {
            return { data: null, error: body.error || { code: String(res.status), message: 'remove failed' } }
          }
          return { data: body.data, error: null }
        } catch (err) {
          return { data: null, error: { code: 'NETWORK', message: err.message } }
        }
      },
      getPublicUrl(path) {
        return { data: { publicUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/media/${bucket}/${path}` } }
      },
    }
  },
}

export const supabase = {
  from: (table) => new Query(table),
  auth,
  storage,
}