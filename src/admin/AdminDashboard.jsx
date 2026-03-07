import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductForm from './ProductForm'
import BulkUpload from './BulkUpload'
import AdminShowcase from './AdminShowcase'
import './Admin.css'

const CATEGORIES = {
  art: 'Art',
  clothing: 'Clothing',
  accessories: 'Accessories',
  footwear: 'Footwear',
  limited_editions: 'Limited Editions',
}

function StockBadge({ status, quantity }) {
  return (
    <span className={`stock-badge ${status}`}>
      {quantity} — {status.replace('_', ' ')}
    </span>
  )
}

function QuickQtyEditor({ product, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState(product.quantity)
  const [saving, setSaving] = useState(false)

  async function save() {
    const newQty = parseInt(qty, 10)
    if (isNaN(newQty) || newQty < 0) return
    if (newQty === product.quantity) { setEditing(false); return }

    setSaving(true)

    // Log the change
    await supabase.from('inventory_log').insert({
      product_id: product.id,
      product_name: product.name,
      change_type: newQty > product.quantity ? 'restock' : 'adjustment',
      quantity_before: product.quantity,
      quantity_after: newQty,
      change_amount: newQty - product.quantity,
      note: newQty > product.quantity ? 'Manual restock' : 'Manual adjustment',
    })

    // Update product
    await supabase.from('products').update({ quantity: newQty }).eq('id', product.id)

    setSaving(false)
    setEditing(false)
    onUpdate()
  }

  if (editing) {
    return (
      <div className="inline-qty-edit">
        <input
          type="number"
          min="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="inline-qty-input"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
        <button className="admin-btn small primary" onClick={save} disabled={saving}>
          {saving ? '...' : '✓'}
        </button>
        <button className="admin-btn small" onClick={() => { setQty(product.quantity); setEditing(false) }}>✕</button>
      </div>
    )
  }

  return (
    <button className="qty-click" onClick={() => setEditing(true)} title="Click to edit quantity">
      <StockBadge status={product.stock_status} quantity={product.quantity} />
    </button>
  )
}

export default function AdminDashboard() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [activeTab, setActiveTab] = useState('products') // 'products' | 'inventory' | 'showcase'
  const [inventoryLog, setInventoryLog] = useState([])
  const [logLoading, setLogLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, active: 0, lowStock: 0, soldOut: 0, totalUnits: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts()
  }, [filter])

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventoryLog()
    }
  }, [activeTab])

  async function fetchProducts() {
    setLoading(true)
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      if (filter === 'low_stock') {
        query = query.eq('stock_status', 'low_stock')
      } else if (filter === 'sold_out') {
        query = query.eq('stock_status', 'sold_out')
      } else {
        query = query.eq('category', filter)
      }
    }

    const { data, error } = await query
    if (!error) {
      setProducts(data || [])
      if (filter === 'all' || filter === 'low_stock' || filter === 'sold_out') {
        const allData = filter === 'all' ? data : null
        if (allData) {
          setStats({
            total: allData.length,
            active: allData.filter(p => p.active).length,
            lowStock: allData.filter(p => p.stock_status === 'low_stock').length,
            soldOut: allData.filter(p => p.stock_status === 'sold_out').length,
            totalUnits: allData.reduce((sum, p) => sum + (p.quantity || 0), 0),
          })
        }
      }
    }
    setLoading(false)
  }

  async function fetchInventoryLog() {
    setLogLoading(true)
    const { data, error } = await supabase
      .from('inventory_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error) {
      setInventoryLog(data || [])
    }
    setLogLoading(false)
  }

  async function toggleActive(product) {
    const { error } = await supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', product.id)
    if (!error) fetchProducts()
  }

  async function toggleFeatured(product) {
    const { error } = await supabase
      .from('products')
      .update({ featured: !product.featured })
      .eq('id', product.id)
    if (!error) fetchProducts()
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    if (product.image_url && product.image_url.includes('supabase')) {
      const path = product.image_url.split('/product-images/')[1]
      if (path) {
        await supabase.storage.from('product-images').remove([path])
      }
    }
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (!error) fetchProducts()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  function handleEdit(product) {
    setEditProduct(product)
    setShowForm(true)
  }

  function handleFormClose() {
    setShowForm(false)
    setEditProduct(null)
    fetchProducts()
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-title">ROSSI ADMIN</h1>
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-view-site">View Site →</a>
        </div>
        <div className="admin-header-actions">
          <Link to="/admin/account" className="admin-btn ghost small">Account</Link>
          <button onClick={handleLogout} className="admin-btn ghost small">Sign Out</button>
        </div>
      </header>

      {/* ── Stats ── */}
      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-val">{stats.total}</span>
          <span className="stat-lbl">Products</span>
        </div>
        <div className="stat-card">
          <span className="stat-val">{stats.totalUnits}</span>
          <span className="stat-lbl">Total Units</span>
        </div>
        <div className="stat-card clickable" onClick={() => { setFilter('low_stock'); setActiveTab('products') }}>
          <span className="stat-val stat-warn">{stats.lowStock}</span>
          <span className="stat-lbl">Low Stock</span>
        </div>
        <div className="stat-card clickable" onClick={() => { setFilter('sold_out'); setActiveTab('products') }}>
          <span className="stat-val stat-danger">{stats.soldOut}</span>
          <span className="stat-lbl">Sold Out</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === 'products' ? ' active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button
          className={`admin-tab${activeTab === 'inventory' ? ' active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory Log
        </button>
        <button
          className={`admin-tab${activeTab === 'showcase' ? ' active' : ''}`}
          onClick={() => setActiveTab('showcase')}
        >
          Showcase
        </button>
      </div>

      {/* ══════════ PRODUCTS TAB ══════════ */}
      {activeTab === 'products' && (
        <>
          <div className="admin-toolbar">
            <div className="admin-filters">
              <button className={`admin-filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <button key={key} className={`admin-filter-btn${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>{label}</button>
              ))}
              <button className={`admin-filter-btn${filter === 'low_stock' ? ' active' : ''}`} onClick={() => setFilter('low_stock')}>⚠ Low Stock</button>
              <button className={`admin-filter-btn${filter === 'sold_out' ? ' active' : ''}`} onClick={() => setFilter('sold_out')}>✕ Sold Out</button>
            </div>
            <div className="admin-toolbar-actions">
              <button className="admin-btn ghost" onClick={() => setShowBulk(true)}>↑ Bulk CSV</button>
              <button className="admin-btn primary" onClick={() => { setEditProduct(null); setShowForm(true) }}>+ Add Product</button>
            </div>
          </div>

          {showForm && <ProductForm product={editProduct} onClose={handleFormClose} />}
          {showBulk && <BulkUpload onClose={() => setShowBulk(false)} onComplete={() => { setShowBulk(false); fetchProducts() }} />}

          {loading ? (
            <div className="admin-loading"><p>Loading products...</p></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Inventory</th>
                    <th>Active</th>
                    <th>Featured</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className={!p.active ? 'inactive-row' : ''}>
                      <td>
                        <div className="admin-thumb">
                          {p.image_url ? <img src={p.image_url} alt={p.name} /> : <span className="admin-thumb-placeholder">📷</span>}
                        </div>
                      </td>
                      <td>
                        <strong>{p.name}</strong>
                        {p.artist && <span className="admin-artist">by {p.artist}</span>}
                      </td>
                      <td><span className="admin-cat-badge">{CATEGORIES[p.category] || p.category}</span></td>
                      <td>${Number(p.price).toFixed(2)}</td>
                      <td>
                        <QuickQtyEditor product={p} onUpdate={fetchProducts} />
                      </td>
                      <td>
                        <button className={`toggle-btn ${p.active ? 'on' : 'off'}`} onClick={() => toggleActive(p)}>
                          {p.active ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td>
                        <button className={`toggle-btn ${p.featured ? 'on' : 'off'}`} onClick={() => toggleFeatured(p)}>
                          {p.featured ? '★' : '☆'}
                        </button>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button className="admin-btn small" onClick={() => handleEdit(p)}>Edit</button>
                          <button className="admin-btn small danger" onClick={() => deleteProduct(p)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan="8" className="admin-empty">No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══════════ INVENTORY LOG TAB ══════════ */}
      {activeTab === 'inventory' && (
        <>
          <div className="admin-toolbar">
            <p className="inventory-log-hint">Recent inventory changes across all products.</p>
            <button className="admin-btn ghost small" onClick={fetchInventoryLog}>Refresh</button>
          </div>

          {logLoading ? (
            <div className="admin-loading"><p>Loading inventory log...</p></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Change</th>
                    <th>Before</th>
                    <th>After</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryLog.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDate(log.created_at)}</td>
                      <td><strong>{log.product_name}</strong></td>
                      <td>
                        <span className={`log-type-badge ${log.change_type}`}>
                          {log.change_type}
                        </span>
                      </td>
                      <td>
                        <span className={log.change_amount > 0 ? 'log-change-pos' : 'log-change-neg'}>
                          {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                        </span>
                      </td>
                      <td>{log.quantity_before}</td>
                      <td>{log.quantity_after}</td>
                      <td className="log-note">
                        {log.order_id ? `Order: ${log.order_id.slice(0, 8)}...` : (log.note || '—')}
                      </td>
                    </tr>
                  ))}
                  {inventoryLog.length === 0 && (
                    <tr><td colSpan="7" className="admin-empty">No inventory changes recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══════════ SHOWCASE TAB ══════════ */}
      {activeTab === 'showcase' && (
        <AdminShowcase />
      )}
    </div>
  )
}