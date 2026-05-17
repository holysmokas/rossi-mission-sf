// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────
// Cloudflare backend shim. Drop-in replacement for the Supabase
// client. Keeps the same import name so no other component file
// needs to change.
//
// Phase 3a: auth methods now route through /api/admin/ endpoints
//           (login/logout/me/account). Admin writes still TBD in 3b.
// ─────────────────────────────────────────────────────────────

const API_BASE = ''

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

      return {
        data: null,
        error: { code: 'NOT_IMPLEMENTED', message: 'Admin writes not yet wired (phase 3b).' },
      }
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

// ─────────── Auth: real implementation via /api/admin/* ────────────

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
  } catch {
    return null
  }
}

const auth = {
  async getSession() {
    const user = await fetchMe()
    return {
      data: { session: user ? { user } : null },
      error: null,
    }
  },

  async getUser() {
    const user = await fetchMe()
    return {
      data: { user },
      error: user ? null : { code: 'NO_SESSION', message: 'not authenticated' },
    }
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
    try {
      await fetch(`${API_BASE}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch { }
    notifyAuthChange('SIGNED_OUT', null)
    return { error: null }
  },

  async updateUser({ email, password, currentPassword }) {
    try {
      const body = { current_password: currentPassword }
      if (email) body.email = email
      if (password) body.new_password = password

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
    return { data: null, error: { code: 'DISABLED', message: 'Self-signup disabled. Contact admin.' } }
  },
  async resetPasswordForEmail() {
    return { data: null, error: { code: 'DISABLED', message: 'Use the admin account page after logging in.' } }
  },

  onAuthStateChange(callback) {
    authListeners.add(callback)
    return {
      data: {
        subscription: {
          unsubscribe: () => authListeners.delete(callback),
        },
      },
    }
  },
}

// ── Storage: still stubbed; comes in phase 3c. ──
const MAINT = { message: 'Image upload not yet wired (phase 3c).', code: 'PENDING' }
const storage = {
  from(_bucket) {
    return {
      upload: async () => ({ data: null, error: MAINT }),
      remove: async () => ({ data: null, error: null }),
      getPublicUrl: (path) => ({ data: { publicUrl: path || '' } }),
    }
  },
}

export const supabase = {
  from: (table) => new Query(table),
  auth,
  storage,
}