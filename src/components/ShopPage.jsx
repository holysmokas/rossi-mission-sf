import { useState } from 'react'
import { Link } from 'react-router-dom'
import useProducts from '../hooks/useProducts'
import { useCart } from '../context/CartContext'
import CartDrawer from './CartDrawer'
import CartButton from './CartButton'
import SocialIcons from './SocialIcons'
import './Shop.css'
import './ShopPage.css'

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'art', label: 'Art' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'footwear', label: 'Footwear' },
  { key: 'limited_editions', label: 'Limited Editions' },
]

const CATEGORY_ICONS = {
  art: '🖼️',
  clothing: '👕',
  accessories: '🧢',
  footwear: '👟',
  limited_editions: '🔥',
}

function ProductCard({ product }) {
  const { addItem } = useCart()
  const [selectedSize, setSelectedSize] = useState(null)
  const [showSizes, setShowSizes] = useState(false)
  const hasImage = product.image_url && product.image_url.length > 0
  const hasSizes = product.sizes && product.sizes.length > 0
  const isSoldOut = product.stock_status === 'sold_out'

  function handleAddToCart() {
    if (isSoldOut) return
    if (hasSizes && !selectedSize) {
      setShowSizes(true)
      return
    }
    addItem(product, selectedSize)
    setShowSizes(false)
    setSelectedSize(null)
  }

  return (
    <div className="product-card">
      <div className="product-img">
        {hasImage ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <span className="product-img-icon">
            {CATEGORY_ICONS[product.category] || '🎨'}
          </span>
        )}
        {isSoldOut && <div className="product-badge sold-out">Sold Out</div>}
        {product.stock_status === 'low_stock' && <div className="product-badge low-stock">Low Stock</div>}
      </div>
      <div className="product-overlay">
        <p className="product-category">
          {product.subcategory || product.category.replace('_', ' ')}
        </p>
        <h3 className="product-name">{product.name}</h3>
        <div className="product-meta">
          <span className="product-price">${Number(product.price).toFixed(0)}</span>
          {product.artist && <span className="product-artist">by {product.artist}</span>}
        </div>

        {showSizes && hasSizes && (
          <div className="product-size-select">
            {product.sizes.map((s) => (
              <button
                key={s}
                className={`size-btn${selectedSize === s ? ' selected' : ''}`}
                onClick={(e) => { e.stopPropagation(); setSelectedSize(s) }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <button
          className={`add-to-cart-btn${isSoldOut ? ' disabled' : ''}`}
          onClick={handleAddToCart}
        >
          {isSoldOut ? 'Sold Out' : (showSizes && !selectedSize ? 'Select Size' : 'Add to Cart')}
        </button>
      </div>
    </div>
  )
}

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const { products, loading, error } = useProducts(
    activeCategory === 'all' ? {} : { category: activeCategory }
  )

  return (
    <div className="shop-page">
      <header className="shop-page-header">
        <Link to="/" className="shop-back-link">← Back to Site</Link>
        <div className="shop-page-title">
          <h1>ROSSI</h1>
          <span>Shop</span>
        </div>
        <div className="shop-header-right">
          <CartButton />
        </div>
      </header>

      <div className="shop-page-content">
        <div className="category-filter">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={`filter-btn${activeCategory === cat.key ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading && <div className="shop-loading"><p>Loading collection...</p></div>}
        {error && <div className="shop-error"><p>Unable to load products. Please try again later.</p></div>}
        {!loading && !error && products.length === 0 && (
          <div className="shop-empty"><p>No products in this category yet. Check back soon.</p></div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <CartDrawer />
    </div>
  )
}
