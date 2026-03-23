import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import './Admin.css'

const STATUS_LABELS = {
    paid: { label: 'Paid', cls: 'restock' },
    pending: { label: 'Pending', cls: 'initial' },
    processing: { label: 'Processing', cls: 'adjustment' },
    refunded: { label: 'Refunded', cls: 'sale' },
}

function startOfDay(d) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r }
function startOfWeek(d) { const r = startOfDay(d); r.setDate(r.getDate() - r.getDay()); return r }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1) }

function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatAddress(addr) {
    if (!addr || !addr.line1) return ''
    const parts = [addr.line1]
    if (addr.line2) parts.push(addr.line2)
    parts.push(`${addr.city}, ${addr.state} ${addr.zip}`)
    return parts.join(', ')
}

function OrderRow({ order, expanded, onExpand }) {
    const total = ((order.total_cents || 0) / 100).toFixed(2)
    const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending
    const items = order.items || []

    return (
        <>
            <tr onClick={() => onExpand(expanded ? null : order.id)} style={{ cursor: 'pointer' }}>
                <td>{formatDate(order.paid_at || order.created_at)}</td>
                <td>
                    <strong>{order.customer_name || 'Anonymous'}</strong>
                    {order.customer_email && (
                        <span style={{ display: 'block', fontSize: '0.6rem', color: '#888', marginTop: 2 }}>
                            {order.customer_email}
                        </span>
                    )}
                </td>
                <td>
                    {items.length > 0
                        ? items.map((it, i) => (
                            <span key={i} style={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.6 }}>
                                {it.name}{it.size ? ` (${it.size})` : ''} × {it.quantity || 1}
                            </span>
                        ))
                        : <span style={{ color: '#aaa', fontSize: '0.65rem' }}>{order.item_count || 0} item{order.item_count !== 1 ? 's' : ''}</span>
                    }
                </td>
                <td style={{ fontWeight: 700 }}>${total}</td>
                <td>
                    <span className={`log-type-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                </td>
                <td style={{ textAlign: 'center', fontSize: '0.8rem', color: '#aaa' }}>{expanded ? '▾' : '▸'}</td>
            </tr>

            {expanded && (
                <tr>
                    <td colSpan="6" style={{ padding: '16px 24px', background: '#f9f9f9', borderBottom: '2px solid #e0e0e0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                            <div>
                                <div style={{ fontSize: '0.55rem', letterSpacing: 2, textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>Shipping Address</div>
                                {order.shipping_address && order.shipping_address.line1 ? (
                                    <div style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                                        <div>{order.shipping_address.line1}</div>
                                        {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
                                        <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}</div>
                                        {order.shipping_address.country && order.shipping_address.country !== 'US' && (
                                            <div>{order.shipping_address.country}</div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.7rem', color: '#aaa', fontStyle: 'italic' }}>Not available</div>
                                )}
                            </div>

                            <div>
                                <div style={{ fontSize: '0.55rem', letterSpacing: 2, textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>Order Details</div>
                                <div style={{ fontSize: '0.7rem', lineHeight: 1.8, color: '#555' }}>
                                    <div>Square Order: <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem' }}>{order.square_order_id || '—'}</span></div>
                                    <div>Payment: <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem' }}>{order.square_payment_id || '—'}</span></div>
                                    <div>Created: {formatDate(order.created_at)}</div>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '0.55rem', letterSpacing: 2, textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>Actions</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {order.square_receipt_url && (
                                        <a href={order.square_receipt_url} target="_blank" rel="noopener noreferrer" className="admin-btn small" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                                            View Receipt ↗
                                        </a>
                                    )}
                                    <a href="https://squareup.com/dashboard/sales/transactions" target="_blank" rel="noopener noreferrer" className="admin-btn small ghost" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                                        Square Dashboard ↗
                                    </a>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

export default function AdminOrders() {
    const [allOrders, setAllOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [timeFilter, setTimeFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')

    useEffect(() => { fetchOrders() }, [])

    async function fetchOrders() {
        setLoading(true)
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500)

        if (!error) setAllOrders(data || [])
        setLoading(false)
    }

    // ── All filtering is client-side for instant response ──
    const filtered = useMemo(() => {
        const now = new Date()
        let result = allOrders

        // Status
        if (statusFilter !== 'all') {
            result = result.filter(o => o.status === statusFilter)
        }

        // Time
        if (timeFilter === 'today') {
            const start = startOfDay(now)
            result = result.filter(o => new Date(o.paid_at || o.created_at) >= start)
        } else if (timeFilter === 'week') {
            const start = startOfWeek(now)
            result = result.filter(o => new Date(o.paid_at || o.created_at) >= start)
        } else if (timeFilter === 'month') {
            const start = startOfMonth(now)
            result = result.filter(o => new Date(o.paid_at || o.created_at) >= start)
        } else if (timeFilter === 'custom' && customFrom) {
            const from = new Date(customFrom)
            const to = customTo ? new Date(customTo + 'T23:59:59') : now
            result = result.filter(o => {
                const d = new Date(o.paid_at || o.created_at)
                return d >= from && d <= to
            })
        }

        // Search
        if (search.trim()) {
            const q = search.toLowerCase().trim()
            result = result.filter(o =>
                (o.customer_name || '').toLowerCase().includes(q) ||
                (o.customer_email || '').toLowerCase().includes(q) ||
                (o.square_order_id || '').toLowerCase().includes(q) ||
                (o.items || []).some(it => (it.name || '').toLowerCase().includes(q))
            )
        }

        return result
    }, [allOrders, statusFilter, timeFilter, search, customFrom, customTo])

    // ── Stats react to filters ──
    const stats = useMemo(() => {
        const paid = filtered.filter(o => o.status === 'paid')
        const revenue = paid.reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100
        const avg = paid.length > 0 ? revenue / paid.length : 0
        return {
            total: filtered.length,
            paid: paid.length,
            pending: filtered.filter(o => o.status === 'pending').length,
            revenue,
            avg,
        }
    }, [filtered])

    const periodLabel = {
        all: 'All Time',
        today: 'Today',
        week: 'This Week',
        month: 'This Month',
        custom: customFrom ? `${customFrom}${customTo ? ' → ' + customTo : ' → now'}` : 'Custom Range',
    }

    function exportCSV() {
        const rows = [
            ['Date', 'Customer', 'Email', 'Items', 'Total', 'Shipping Address', 'Square Order ID', 'Receipt URL'].join(','),
            ...filtered.map(o => {
                const items = (o.items || []).map(i => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity || 1}`).join('; ')
                const addr = formatAddress(o.shipping_address)
                const total = ((o.total_cents || 0) / 100).toFixed(2)
                const date = (o.paid_at || o.created_at) ? new Date(o.paid_at || o.created_at).toISOString().split('T')[0] : ''
                return [
                    date,
                    `"${(o.customer_name || '').replace(/"/g, '""')}"`,
                    o.customer_email || '',
                    `"${items.replace(/"/g, '""')}"`,
                    total,
                    `"${addr.replace(/"/g, '""')}"`,
                    o.square_order_id || '',
                    o.square_receipt_url || '',
                ].join(',')
            }),
        ]

        const label = timeFilter === 'all' ? 'all' : timeFilter === 'custom' ? `${customFrom || 'start'}_${customTo || 'now'}` : timeFilter
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rossi-orders-${label}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <>
            {/* ── Stats (react to filters) ── */}
            <div className="admin-stats" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                    <span className="stat-val">{stats.total}</span>
                    <span className="stat-lbl">Orders</span>
                </div>
                <div className="stat-card">
                    <span className="stat-val" style={{ fontSize: stats.revenue >= 10000 ? '1.6rem' : undefined }}>${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span className="stat-lbl">Revenue</span>
                </div>
                <div className="stat-card">
                    <span className="stat-val">${stats.avg.toFixed(2)}</span>
                    <span className="stat-lbl">Avg Order</span>
                </div>
                <div className="stat-card">
                    <span className="stat-val stat-warn">{stats.pending}</span>
                    <span className="stat-lbl">Pending</span>
                </div>
            </div>

            {/* ── Time Filters ── */}
            <div className="admin-toolbar" style={{ marginBottom: 12 }}>
                <div className="admin-filters">
                    {[
                        { key: 'today', label: 'Today' },
                        { key: 'week', label: 'This Week' },
                        { key: 'month', label: 'This Month' },
                        { key: 'all', label: 'All Time' },
                        { key: 'custom', label: 'Custom' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            className={`admin-filter-btn${timeFilter === key ? ' active' : ''}`}
                            onClick={() => setTimeFilter(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Custom Date Picker ── */}
            {timeFilter === 'custom' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                    <div className="admin-field" style={{ gap: 3 }}>
                        <label style={{ fontSize: '0.5rem' }}>From</label>
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            style={{ padding: '6px 10px', border: '1px solid #d0d0d0', fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', background: '#fff' }}
                        />
                    </div>
                    <div className="admin-field" style={{ gap: 3 }}>
                        <label style={{ fontSize: '0.5rem' }}>To</label>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            style={{ padding: '6px 10px', border: '1px solid #d0d0d0', fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', background: '#fff' }}
                        />
                    </div>
                    {customFrom && (
                        <button className="admin-btn small ghost" onClick={() => { setCustomFrom(''); setCustomTo('') }} style={{ marginTop: 14 }}>Clear</button>
                    )}
                </div>
            )}

            {/* ── Status + Search + Export ── */}
            <div className="admin-toolbar" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="admin-filters">
                        <button className={`admin-filter-btn${statusFilter === 'all' ? ' active' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
                        <button className={`admin-filter-btn${statusFilter === 'paid' ? ' active' : ''}`} onClick={() => setStatusFilter('paid')}>Paid</button>
                        <button className={`admin-filter-btn${statusFilter === 'pending' ? ' active' : ''}`} onClick={() => setStatusFilter('pending')}>Pending</button>
                    </div>
                    <input
                        type="text"
                        placeholder="Search customer, email, item..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            padding: '8px 14px',
                            border: '1px solid #d0d0d0',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '0.65rem',
                            outline: 'none',
                            background: '#fff',
                            minWidth: 220,
                            letterSpacing: 1,
                        }}
                    />
                </div>
                <div className="admin-toolbar-actions">
                    <button className="admin-btn ghost small" onClick={fetchOrders}>Refresh</button>
                    <button className="admin-btn small" onClick={exportCSV} disabled={filtered.length === 0}>
                        ↓ Export CSV ({filtered.length})
                    </button>
                </div>
            </div>

            {/* ── Context Label ── */}
            <p className="inventory-log-hint" style={{ marginBottom: 12 }}>
                Showing {filtered.length} order{filtered.length !== 1 ? 's' : ''} — {periodLabel[timeFilter]}
                {search && ` — matching "${search}"`}
            </p>

            {/* ── Table ── */}
            {loading ? (
                <div className="admin-loading"><p>Loading orders...</p></div>
            ) : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((order) => (
                                <OrderRow
                                    key={order.id}
                                    order={order}
                                    expanded={expanded === order.id}
                                    onExpand={setExpanded}
                                />
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan="6" className="admin-empty">
                                    {search ? `No orders matching "${search}"` : 'No orders for this period.'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    )
}