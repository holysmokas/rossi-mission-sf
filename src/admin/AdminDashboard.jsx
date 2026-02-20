import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductForm from './ProductForm'
import BulkUpload from './BulkUpload'
import './Admin.css'

const CATEGORIES = {
  art: 'Art',
  clothing: 'Clothing',
  accessories: 'Accessories',
  footwear: 'Footwear',
  limited_editions: 'Limited Editions',
}

export default function AdminDashboard() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [stats, setStats] = useState({ total: 0, active: 0, featured: 0, soldOut: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts()
  }, [filter])

  async function fetchProducts() {
    setLoading(true)
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('category', filter)
    }

    const { data, error } = await query
    if (!error) {
      setProducts(data || [])
      // Calc stats from all products
      if (filter === 'all') {
        setStats({
          total: data.length,
          active: data.filter(p => p.active).length,
          featured: data.filter(p => p.featured).length,
          soldOut: data.filter(p => p.stock_status === 'sold_out').length,
        })
      }
    }
    setLoading(false)
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

    // Delete image from storage if exists
    if (product.image_url && product.image_url.includes('supabase')) {
      const path = product.image_url.split('/product-images/')[1]
      if (path) {
        await supabase.storage.from('product-images').remove([path])
      }
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

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

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-title">ROSSI ADMIN</h1>
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-view-site">View Site →</a>
        </div>
        <button onClick={handleLogout} className="admin-btn ghost">Sign Out</button>
      </header>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-val">{stats.total}</span>
          <span className="stat-lbl">Total Products</span>
        </div>
        <div className="stat-card">
          <span className="stat-val">{stats.active}</span>
          <span className="stat-lbl">Active</span>
        </div>
        <div className="stat-card">
          <span className="stat-val">{stats.featured}</span>
          <span className="stat-lbl">Featured</span>
        </div>
        <div className="stat-card">
          <span className="stat-val">{stats.soldOut}</span>
          <span className="stat-lbl">Sold Out</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filters">
          <button className={`admin-filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <button key={key} className={`admin-filter-btn${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
        <div className="admin-toolbar-actions">
          <button className="admin-btn ghost" onClick={() => setShowBulk(true)}>
            ↑ Bulk Upload CSV
          </button>
          <button className="admin-btn primary" onClick={() => { setEditProduct(null); setShowForm(true) }}>
            + Add Product
          </button>
        </div>
      </div>

      {showForm && (
        <ProductForm
          product={editProduct}
          onClose={handleFormClose}
        />
      )}

      {showBulk && (
        <BulkUpload
          onClose={() => setShowBulk(false)}
          onComplete={() => { setShowBulk(false); fetchProducts() }}
        />
      )}

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
                <th>Stock</th>
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
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} />
                      ) : (
                        <span className="admin-thumb-placeholder">📷</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                    {p.artist && <span className="admin-artist">by {p.artist}</span>}
                  </td>
                  <td><span className="admin-cat-badge">{CATEGORIES[p.category] || p.category}</span></td>
                  <td>${Number(p.price).toFixed(2)}</td>
                  <td>
                    <span className={`stock-badge ${p.stock_status}`}>
                      {p.stock_status.replace('_', ' ')}
                    </span>
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
    </div>
  )
}
