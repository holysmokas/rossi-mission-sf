import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import './Admin.css'

const REQUIRED_COLS = ['name', 'price', 'category']
const VALID_CATEGORIES = ['art', 'clothing', 'accessories', 'footwear', 'limited_editions']
const VALID_STOCK = ['in_stock', 'low_stock', 'sold_out']

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [], error: 'CSV must have a header row and at least one data row.' }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const missing = REQUIRED_COLS.filter(c => !headers.includes(c))
  if (missing.length) return { headers: [], rows: [], error: `Missing required columns: ${missing.join(', ')}` }

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = []
    let current = ''
    let inQuotes = false

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })
    rows.push(row)
  }

  return { headers, rows, error: null }
}

function validateRow(row, index) {
  const errors = []
  if (!row.name?.trim()) errors.push(`Row ${index + 1}: name is required`)
  if (!row.price || isNaN(Number(row.price)) || Number(row.price) <= 0) errors.push(`Row ${index + 1}: valid price is required`)
  if (!VALID_CATEGORIES.includes(row.category?.toLowerCase())) {
    errors.push(`Row ${index + 1}: category must be one of: ${VALID_CATEGORIES.join(', ')}`)
  }
  if (row.stock_status && !VALID_STOCK.includes(row.stock_status?.toLowerCase())) {
    errors.push(`Row ${index + 1}: stock_status must be one of: ${VALID_STOCK.join(', ')}`)
  }
  return errors
}

function rowToProduct(row) {
  return {
    name: row.name?.trim(),
    description: row.description?.trim() || null,
    price: Number(row.price),
    category: row.category?.toLowerCase().trim(),
    subcategory: row.subcategory?.trim() || null,
    artist: row.artist?.trim() || null,
    image_url: row.image_url?.trim() || null,
    stock_status: row.stock_status?.toLowerCase().trim() || 'in_stock',
    featured: ['true', 'yes', '1'].includes(row.featured?.toLowerCase().trim()) || false,
    active: row.active ? ['true', 'yes', '1'].includes(row.active?.toLowerCase().trim()) : true,
    sizes: row.sizes ? row.sizes.split('|').map(s => s.trim()).filter(Boolean) : [],
    tags: row.tags ? row.tags.split('|').map(t => t.trim()).filter(Boolean) : [],
  }
}

export default function BulkUpload({ onClose, onComplete }) {
  const fileRef = useRef(null)
  const [parsed, setParsed] = useState(null)
  const [errors, setErrors] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return

    setErrors([])
    setResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const { headers, rows, error } = parseCSV(evt.target.result)
      if (error) {
        setErrors([error])
        setParsed(null)
        return
      }

      // Validate all rows
      const allErrors = []
      rows.forEach((row, i) => {
        allErrors.push(...validateRow(row, i))
      })

      if (allErrors.length) {
        setErrors(allErrors)
        setParsed({ headers, rows })
      } else {
        setErrors([])
        setParsed({ headers, rows })
      }
    }
    reader.readAsText(file)
  }

  async function handleUpload() {
    if (!parsed || errors.length) return

    setUploading(true)
    const products = parsed.rows.map(rowToProduct)
    setProgress({ done: 0, total: products.length })

    // Batch insert in chunks of 20
    let successCount = 0
    let failCount = 0
    const batchSize = 20

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      const { error } = await supabase.from('products').insert(batch)

      if (error) {
        failCount += batch.length
        console.error('Batch insert error:', error)
      } else {
        successCount += batch.length
      }
      setProgress({ done: i + batch.length, total: products.length })
    }

    setUploading(false)
    setResult({ success: successCount, failed: failCount })

    if (successCount > 0) {
      setTimeout(() => onComplete(), 1500)
    }
  }

  function downloadTemplate() {
    const template = `name,price,category,subcategory,description,artist,image_url,sizes,tags,stock_status,featured,active
"Mission Walls Canvas",280.00,art,canvas,"Original spray paint on canvas",REVS,,,,in_stock,true,true
"Rossi Tag Tee - Black",48.00,clothing,tees,"Heavyweight cotton tee",,,"S|M|L|XL","streetwear|logo",in_stock,true,true
"Spray Can Snapback",38.00,accessories,caps,"Embroidered snapback cap",,,"One Size","headwear",in_stock,false,true`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rossi-products-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bulk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bulk Upload Products</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="bulk-info">
          <p>Upload a CSV file to add multiple products at once.</p>
          <div className="bulk-requirements">
            <p><strong>Required columns:</strong> name, price, category</p>
            <p><strong>Optional columns:</strong> subcategory, description, artist, image_url, sizes, tags, stock_status, featured, active</p>
            <p><strong>Categories:</strong> art, clothing, accessories, footwear, limited_editions</p>
            <p><strong>Multi-values:</strong> use <code>|</code> to separate sizes and tags (e.g. <code>S|M|L|XL</code>)</p>
          </div>
          <button className="admin-btn small" onClick={downloadTemplate}>
            ↓ Download CSV Template
          </button>
        </div>

        <div className="bulk-upload-area" onClick={() => fileRef.current?.click()}>
          <span>📄</span>
          <p>Click to select CSV file</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </div>

        {errors.length > 0 && (
          <div className="bulk-errors">
            <p className="bulk-errors-title">Validation Errors ({errors.length})</p>
            <ul>
              {errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
              {errors.length > 10 && <li>...and {errors.length - 10} more errors</li>}
            </ul>
          </div>
        )}

        {parsed && errors.length === 0 && !result && (
          <div className="bulk-preview">
            <p className="bulk-preview-title">Ready to upload {parsed.rows.length} products</p>
            <div className="bulk-preview-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Subcategory</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 20).map((row, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{row.name}</td>
                      <td>${Number(row.price).toFixed(2)}</td>
                      <td><span className="admin-cat-badge">{row.category}</span></td>
                      <td>{row.subcategory || '—'}</td>
                    </tr>
                  ))}
                  {parsed.rows.length > 20 && (
                    <tr><td colSpan="5" className="admin-empty">...and {parsed.rows.length - 20} more rows</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {uploading && (
          <div className="bulk-progress">
            <div className="bulk-progress-bar">
              <div className="bulk-progress-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p>Uploading {progress.done} of {progress.total} products...</p>
          </div>
        )}

        {result && (
          <div className="bulk-result">
            {result.success > 0 && <p className="admin-success">✓ Successfully added {result.success} products</p>}
            {result.failed > 0 && <p className="admin-error">✗ Failed to add {result.failed} products</p>}
          </div>
        )}

        <div className="form-actions">
          <button className="admin-btn ghost" onClick={onClose}>Cancel</button>
          <button
            className="admin-btn primary"
            onClick={handleUpload}
            disabled={!parsed || errors.length > 0 || uploading || result}
          >
            {uploading ? 'Uploading...' : `Upload ${parsed?.rows.length || 0} Products`}
          </button>
        </div>
      </div>
    </div>
  )
}
