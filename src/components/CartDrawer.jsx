import { useState } from 'react'
import { useCart } from '../context/CartContext'
import './Cart.css'

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, clearCart, itemCount, total } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleCheckout() {
    if (!items.length) return
    setSubmitting(true)
    setError(null)
    try {
      const resp = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            id: i.id,
            size: i.size || null,
            quantity: i.quantity,
          })),
        }),
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.error || `Checkout failed (HTTP ${resp.status})`)
      }
      const { checkout_url } = await resp.json()
      if (!checkout_url) throw new Error('No checkout URL returned')
      // Hand off to Square's hosted checkout
      window.location.href = checkout_url
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className={`cart-overlay${isOpen ? ' open' : ''}`} onClick={() => setIsOpen(false)} />

      <div className={`cart-drawer${isOpen ? ' open' : ''}`}>
        <div className="cart-header">
          <h3>Your Cart ({itemCount})</h3>
          <button className="cart-close" onClick={() => setIsOpen(false)}>✕</button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <p>Your cart is empty</p>
            <button className="cart-continue-btn" onClick={() => setIsOpen(false)}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div key={item.key} className="cart-item">
                  <div className="cart-item-img">
                    {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span>🎨</span>}
                  </div>
                  <div className="cart-item-info">
                    <p className="cart-item-name">{item.name}</p>
                    {item.size && <p className="cart-item-size">Size: {item.size}</p>}
                    <p className="cart-item-price">${item.price.toFixed(2)}</p>
                    <div className="cart-item-qty">
                      <button onClick={() => updateQuantity(item.key, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.key, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                  <button className="cart-item-remove" onClick={() => removeItem(item.key)}>✕</button>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <button className="cart-clear" onClick={clearCart} disabled={submitting}>Clear Cart</button>
              <div className="cart-total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {error && (
                <p style={{
                  color: '#c62828',
                  fontSize: '0.7rem',
                  letterSpacing: '1px',
                  padding: '8px 0',
                  margin: 0,
                }}>
                  {error}
                </p>
              )}

              <button
                className="cart-checkout-btn"
                onClick={handleCheckout}
                disabled={submitting}
                style={submitting ? { opacity: 0.6, cursor: 'wait' } : undefined}
              >
                {submitting ? 'Redirecting to Checkout…' : 'Checkout'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}