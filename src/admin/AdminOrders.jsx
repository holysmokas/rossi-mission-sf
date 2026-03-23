import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Admin.css'

const STATUS_LABELS = {
    paid: { label: 'Paid', cls: 'restock' },
    pending: { label: 'Pending', cls: 'initial' },
    processing: { label: 'Processing', cls: 'adjustment' },
    refunded: { label: 'Refunded', cls: 'sale' },
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatAddress(addr) {
    if (!addr || !addr.line1) return null
    const parts = [addr.line1]
    if (addr.line2) parts.push(addr.line2)
    parts.push(`${addr.city}, ${addr.state} ${addr.zip}`)
    return parts.join(', ')
}

function OrderRow({ order, onExpand, expanded }) {
    const total = ((order.total_cents || 0) / 100).toFixed(2)
    const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending
    const items = order.items || []

    return (
        <>
            <tr
                onClick={() => onExpand(expanded ? null : order.id)}
                style={{ cursor: 'pointer' }}
                className={expanded ? '' : ''}
            >
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
                <td style={{ fontSize: '0.65rem', color: '#888' }}>
                    {order.square_order_id ? order.square_order_id.slice(0, 12) + '...' : '—'}
                </td>
                <td style={{ textAlign: 'center' }}>{expanded ? '▾' : '▸'}</td>
            </tr>

            {expanded && (
                <tr>
                    <td colSpan="7" style={{ padding: '16px 24px', background: '#f9f9f9', borderBottom: '2px solid #e0e0e0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                            {/* Shipping */}
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

                            {/* Order details */}
                            <div>
                                <div style={{ fontSize: '0.55rem', letterSpacing: 2, textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>Order Details</div>
                                <div style={{ fontSize: '0.7rem', lineHeight: 1.8, color: '#555' }}>
                                    <div>Square Order: <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem' }}>{order.square_order_id || '—'}</span></div>
                                    <div>Payment ID: <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem' }}>{order.square_payment_id || '—'}</span></div>
                                    <div>Currency: {order.currency || 'USD'}</div>
                                    <div>Created: {formatDate(order.created_at)}</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div>
                                <div style={{ fontSize: '0.55rem', letterSpacing: 2, textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>Actions</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {order.square_receipt_url && (
                                        <a
                                            href={order.square_receipt_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="admin-btn small"
                                            style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}
                                        >
                                            View Receipt ↗
                                        </a>
                                    )}
                                    <a
                                        href="https://squareup.com/dashboard/sales/transactions"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="admin-btn small ghost"
                                        style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}
                                    >
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
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [expanded, setExpanded] = useState(null)
    const [stats, setStats] = useState({ total: 0, revenue: 0, paid: 0, pending: 0 })

    useEffect(() => { fetchOrders() }, [filter])

    async function fetchOrders() {
        setLoading(true)
        let query = supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)

        if (filter !== 'all') {
            query = query.eq('status', filter)
        }

        const { data, error } = await query
        if (!error) {
            setOrders(data || [])

            // Compute stats from all orders (not filtered)
            if (filter === 'all') {
                const paid = data.filter(o => o.status === 'paid')
                setStats({
                    total: data.length,
                    revenue: paid.reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100,
                    paid: paid.length,
                    pending: data.filter(o => o.status === 'pending').length,
                })
            }
        }
        setLoading(false)
    }

    async function exportCSV() {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'paid')
            .order('paid_at', { ascending: false })

        if (error || !data) { alert('Failed to fetch orders for export.'); return }

        const rows = [
            ['Date', 'Customer', 'Email', 'Items', 'Total', 'Shipping Address', 'Square Order ID', 'Receipt URL'].join(','),
            ...data.map(o => {
                const items = (o.items || []).map(i => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity || 1}`).join('; ')
                const addr = formatAddress(o.shipping_address) || ''
                const total = ((o.total_cents || 0) / 100).toFixed(2)
                const date = o.paid_at ? new Date(o.paid_at).toISOString().split('T')[0] : ''
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

        const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rossi-orders-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <>
            {/* Order Stats */}
            <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                <div className="stat-card">
                    <span className="stat-val">{stats.total}</span>
                    <span className="stat-lbl">Total Orders</span>
                </div>
                <div className="stat-card">
                    <span className="stat-val">{stats.paid}</span>
                    <span className="stat-lbl">Paid</span>
                </div>
                <div className="stat-card">
                    <span className="stat-val stat-warn">{stats.pending}</span>
                    <span className="stat-lbl">Pending</span>
                </div>
                <div className="stat-card">
                    <span className="stat-val" style={{ fontSize: '1.8rem' }}>${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <span className="stat-lbl">Revenue</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="admin-toolbar">
                <div className="admin-filters">
                    <button className={`admin-filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
                    <button className={`admin-filter-btn${filter === 'paid' ? ' active' : ''}`} onClick={() => setFilter('paid')}>Paid</button>
                    <button className={`admin-filter-btn${filter === 'pending' ? ' active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
                </div>
                <div className="admin-toolbar-actions">
                    <button className="admin-btn ghost small" onClick={fetchOrders}>Refresh</button>
                    <button className="admin-btn small" onClick={exportCSV}>↓ Export CSV</button>
                </div>
            </div>

            {/* Table */}
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
                                <th>Order ID</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <OrderRow
                                    key={order.id}
                                    order={order}
                                    expanded={expanded === order.id}
                                    onExpand={setExpanded}
                                />
                            ))}
                            {orders.length === 0 && (
                                <tr><td colSpan="7" className="admin-empty">No orders found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    )
}