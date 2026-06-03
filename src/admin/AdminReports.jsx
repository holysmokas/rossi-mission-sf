import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Admin.css'

function formatMoney(cents) {
    return `$${((cents || 0) / 100).toFixed(2)}`
}

function formatDate(unixSecs) {
    if (!unixSecs) return '—'
    const d = new Date(unixSecs * 1000)
    return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    })
}

function unixDaysAgo(days) {
    return Math.floor(Date.now() / 1000) - days * 86400
}

function toDateInputValue(unixSecs) {
    const d = new Date(unixSecs * 1000)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function fromDateInputValue(str, endOfDay = false) {
    if (!str) return null
    const [y, m, d] = str.split('-').map(Number)
    const date = endOfDay
        ? new Date(y, m - 1, d, 23, 59, 59)
        : new Date(y, m - 1, d, 0, 0, 0)
    return Math.floor(date.getTime() / 1000)
}

const PRESETS = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Year to date', days: null, ytd: true },
]

export default function AdminReports() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [from, setFrom] = useState(unixDaysAgo(30))
    const [to, setTo] = useState(Math.floor(Date.now() / 1000))
    const [activePreset, setActivePreset] = useState('Last 30 days')
    const [report, setReport] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadReport(from, to)
    }, [from, to])

    async function loadReport(fromTs, toTs) {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/admin/reports?from=${fromTs}&to=${toTs}`, {
                credentials: 'include',
            })
            const body = await res.json()
            if (!res.ok) {
                setError(body.error || 'Failed to load report')
                setReport(null)
            } else {
                setReport(body.data)
            }
        } catch (err) {
            setError(err.message)
        }
        setLoading(false)
    }

    function applyPreset(preset) {
        setActivePreset(preset.label)
        const now = Math.floor(Date.now() / 1000)
        if (preset.ytd) {
            const ytdStart = new Date(new Date().getFullYear(), 0, 1)
            setFrom(Math.floor(ytdStart.getTime() / 1000))
        } else {
            setFrom(unixDaysAgo(preset.days))
        }
        setTo(now)
    }

    function applyCustomRange(fromStr, toStr) {
        const f = fromDateInputValue(fromStr, false)
        const t = fromDateInputValue(toStr, true)
        if (f && t) {
            setActivePreset('Custom')
            setFrom(f)
            setTo(t)
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate('/admin')
    }

    const totals = report?.totals
    const orders = report?.orders || []

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div className="admin-header-left">
                    <h1 className="admin-title">ROSSI ADMIN</h1>
                    <Link to="/admin/dashboard" className="admin-view-site">← Dashboard</Link>
                    <a href="/" target="_blank" rel="noopener noreferrer" className="admin-view-site">View Site →</a>
                </div>
                <button onClick={handleLogout} className="admin-btn ghost">Sign Out</button>
            </header>

            <div className="account-card" style={{ marginBottom: 20 }}>
                <h2 className="account-card-title">Sales Reports</h2>
                <p className="account-card-subtitle">
                    Online and in-store sales captured via Square. In-store sales appear here automatically when payments process at the gallery.
                </p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, marginBottom: 16 }}>
                    {PRESETS.map((p) => (
                        <button
                            key={p.label}
                            onClick={() => applyPreset(p)}
                            className={activePreset === p.label ? 'admin-btn primary' : 'admin-btn ghost'}
                            style={{ padding: '6px 14px', fontSize: '0.75rem', letterSpacing: 2 }}
                        >
                            {p.label.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
                    <div className="admin-field" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                        <label>From</label>
                        <input
                            type="date"
                            value={toDateInputValue(from)}
                            onChange={(e) => applyCustomRange(e.target.value, toDateInputValue(to))}
                        />
                    </div>
                    <div className="admin-field" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                        <label>To</label>
                        <input
                            type="date"
                            value={toDateInputValue(to)}
                            onChange={(e) => applyCustomRange(toDateInputValue(from), e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {error && <p className="admin-error" style={{ padding: 16 }}>{error}</p>}

            {loading && <p style={{ padding: 16, color: '#888', fontSize: '0.85rem' }}>Loading…</p>}

            {!loading && totals && (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: 12,
                        marginBottom: 20,
                    }}>
                        <StatCard label="Total Revenue" value={formatMoney(totals.all.revenue_cents)} />
                        <StatCard label="Total Orders" value={totals.all.count.toString()} />
                        <StatCard label="Avg Order" value={formatMoney(totals.all.avg_order_cents)} />
                        <StatCard label="Online" value={`${formatMoney(totals.online.revenue_cents)} · ${totals.online.count}`} />
                        <StatCard label="In-Store" value={`${formatMoney(totals.in_store.revenue_cents)} · ${totals.in_store.count}`} />
                    </div>

                    <div className="account-card">
                        <h2 className="account-card-title" style={{ marginBottom: 16 }}>
                            Orders ({orders.length})
                        </h2>
                        {orders.length === 0 ? (
                            <p style={{ color: '#888', fontSize: '0.85rem' }}>No paid orders in this range.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #1a1a1a', textAlign: 'left' }}>
                                            <th style={{ padding: '10px 8px', fontWeight: 600, letterSpacing: 1 }}>DATE</th>
                                            <th style={{ padding: '10px 8px', fontWeight: 600, letterSpacing: 1 }}>SOURCE</th>
                                            <th style={{ padding: '10px 8px', fontWeight: 600, letterSpacing: 1 }}>CUSTOMER</th>
                                            <th style={{ padding: '10px 8px', fontWeight: 600, letterSpacing: 1, textAlign: 'right' }}>AMOUNT</th>
                                            <th style={{ padding: '10px 8px', fontWeight: 600, letterSpacing: 1 }}>RECEIPT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((o) => (
                                            <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '10px 8px' }}>{formatDate(o.paid_at)}</td>
                                                <td style={{ padding: '10px 8px' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        fontSize: '0.7rem',
                                                        letterSpacing: 1,
                                                        border: '1px solid #ccc',
                                                        background: o.source === 'in_store' ? '#f4f0e8' : '#e8f0f4',
                                                    }}>{o.source === 'in_store' ? 'IN-STORE' : 'ONLINE'}</span>
                                                </td>
                                                <td style={{ padding: '10px 8px', color: o.customer_name ? '#222' : '#999' }}>
                                                    {o.customer_name || '—'}
                                                    {o.customer_email && (
                                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{o.customer_email}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace" }}>
                                                    {formatMoney(o.total_cents)}
                                                </td>
                                                <td style={{ padding: '10px 8px' }}>
                                                    {o.square_receipt_url ? (
                                                        <a href={o.square_receipt_url} target="_blank" rel="noopener noreferrer"
                                                            style={{ fontSize: '0.75rem', color: '#888' }}>view →</a>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

function StatCard({ label, value }) {
    return (
        <div style={{
            padding: '16px 18px',
            border: '1px solid #d0d0d0',
            background: '#fff',
        }}>
            <div style={{ fontSize: '0.65rem', letterSpacing: 2, color: '#888', textTransform: 'uppercase' }}>
                {label}
            </div>
            <div style={{
                fontSize: '1.4rem',
                fontFamily: "'Space Mono', monospace",
                marginTop: 6,
                color: '#1a1a1a',
            }}>{value}</div>
        </div>
    )
}