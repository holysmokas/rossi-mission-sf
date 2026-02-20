import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './Admin.css'

const CATEGORIES = [
  { value: 'art', label: 'Art' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'footwear', label: 'Footwear' },
  { value: 'limited_editions', label: 'Limited Editions' },
]

const SUBCATEGORIES = {
  art: ['canvas', 'prints', 'originals', 'stencil', 'mixed-media'],
  clothing: ['tees', 'hoodies', 'jackets', 'pants', 'shorts'],
  accessories: ['caps', 'bags', 'pins', 'jewelry', 'stickers'],
  footwear: ['sneakers', 'customs', 'boots'],
  limited_editions: ['jackets', 'tees', 'art', 'collabs'],
}

const STOCK_OPTIONS = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'sold_out', label: 'Sold Out' },
]

export default function ProductForm({ product, onClose }) {
  const isEdit = !!product
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    category: product?.category || 'art',
    subcategory: product?.subcategory || '',
    artist: product?.artist || '',
    stock_status: product?.stock_status || 'in_stock',
    featured: product?.featured || false,
    active: product?.active ?? true,
    sizes: product?.sizes?.join(', ') || '',
    tags: product?.tags?.join(', ') || '',
    image_url: product?.image_url || '',
  })

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState(product?.image_url || '')

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    // Validate
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.')
      return
    }

    setUploading(true)
    setError('')

    // Create unique filename
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = `${form.category}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file)

    if (uploadError) {
      setError('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    updateField('image_url', publicUrl)
    setImagePreview(publicUrl)
    setUploading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) { setError('Product name is required.'); return }
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) { setError('Valid price is required.'); return }

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category,
      subcategory: form.subcategory.trim() || null,
      artist: form.artist.trim() || null,
      stock_status: form.stock_status,
      featured: form.featured,
      active: form.active,
      sizes: form.sizes ? form.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      image_url: form.image_url || null,
    }

    let result
    if (isEdit) {
      result = await supabase
        .from('products')
        .update(payload)
        .eq('id', product.id)
    } else {
      result = await supabase
        .from('products')
        .insert([payload])
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
    } else {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-grid">
            <div className="form-col">
              <div className="admin-field">
                <label>Product Name *</label>
                <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. Mission Walls Canvas" />
              </div>

              <div className="admin-field">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Product description..." rows={3} />
              </div>

              <div className="form-row">
                <div className="admin-field">
                  <label>Price *</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => updateField('price', e.target.value)} placeholder="0.00" />
                </div>
                <div className="admin-field">
                  <label>Stock Status</label>
                  <select value={form.stock_status} onChange={(e) => updateField('stock_status', e.target.value)}>
                    {STOCK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="admin-field">
                  <label>Category *</label>
                  <select value={form.category} onChange={(e) => { updateField('category', e.target.value); updateField('subcategory', '') }}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Subcategory</label>
                  <select value={form.subcategory} onChange={(e) => updateField('subcategory', e.target.value)}>
                    <option value="">Select...</option>
                    {(SUBCATEGORIES[form.category] || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="admin-field">
                <label>Artist</label>
                <input type="text" value={form.artist} onChange={(e) => updateField('artist', e.target.value)} placeholder="Artist name (for art pieces)" />
              </div>

              <div className="admin-field">
                <label>Sizes (comma separated)</label>
                <input type="text" value={form.sizes} onChange={(e) => updateField('sizes', e.target.value)} placeholder="S, M, L, XL" />
              </div>

              <div className="admin-field">
                <label>Tags (comma separated)</label>
                <input type="text" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="streetwear, limited, spray-paint" />
              </div>

              <div className="form-row">
                <label className="admin-checkbox">
                  <input type="checkbox" checked={form.active} onChange={(e) => updateField('active', e.target.checked)} />
                  Active (visible on site)
                </label>
                <label className="admin-checkbox">
                  <input type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} />
                  Featured product
                </label>
              </div>
            </div>

            <div className="form-col image-col">
              <div className="admin-field">
                <label>Product Image</label>
                <div className="image-upload-area" onClick={() => fileRef.current?.click()}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                  ) : (
                    <div className="image-placeholder">
                      <span>📷</span>
                      <p>Click to upload</p>
                      <p className="image-hint">Max 5MB · JPG, PNG, WebP</p>
                    </div>
                  )}
                  {uploading && <div className="upload-overlay">Uploading...</div>}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                {imagePreview && (
                  <button type="button" className="admin-btn small" style={{ marginTop: 8 }} onClick={() => { setImagePreview(''); updateField('image_url', '') }}>
                    Remove Image
                  </button>
                )}
              </div>

              <div className="admin-field">
                <label>Or paste image URL</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => { updateField('image_url', e.target.value); setImagePreview(e.target.value) }}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {error && <p className="admin-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="admin-btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn primary" disabled={saving}>
              {saving ? 'Saving...' : (isEdit ? 'Update Product' : 'Add Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
