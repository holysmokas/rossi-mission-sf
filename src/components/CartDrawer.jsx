import { useState } from 'react'
import { useCart } from '../context/CartContext'
import './Cart.css'

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, clearCart, itemCount, total } = useCart()
  const [showOrderInfo, setShowOrderInfo] = useState(false)

  function buildOrderSummary() {
    const lines = items.map((i) =>
      `• ${i.name}${i.size ? ` (${i.size})` : ''} × ${i.quantity} — $${(i.price * i.quantity).toFixed(2)}`
    ).join('\n')
    return `Hi Rossi Mission SF — I'd like to order:\n\n${lines}\n\nTotal: $${total.toFixed(2)}\n\nName:\nShipping address:\nPhone:`
  }

  function mailtoLink() {
    const subject = encodeURIComponent(`Order request — $${total.toFixed(2)}`)
    const body = encodeURIComponent(buildOrderSummary())
    return `mailto:info@rossimissionsf.com?subject=${subject}&body=${body}`
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
              <button className="cart-clear" onClick={clearCart}>Clear Cart</button>
              <div className="cart-total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {!showOrderInfo ? (
                <button className="cart-checkout-btn" onClick={() => setShowOrderInfo(true)}>
                  Place Order
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--gray-light)', lineHeight: 1.6, letterSpacing: '1px' }}>
                    Online checkout is briefly offline while we move infrastructure. To place this order, message us — we'll confirm availability and send a secure payment link.
                  </p>
                  <a
                    href={mailtoLink()}
                    className="cart-checkout-btn"
                    style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}
                  >
                    Email Order Details
                  </a>
                  <a
                    href="https://instagram.com/rossimissionsf"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '12px',
                      border: '1px solid var(--gray-mid)',
                      color: 'var(--gray-light)',
                      textDecoration: 'none',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '0.65rem',
                      letterSpacing: '3px',
                      textTransform: 'uppercase',
                    }}
                  >
                    DM on Instagram
                  </a>
                  <p style={{ textAlign: 'center', fontSize: '0.55rem', color: 'var(--gray-mid)', letterSpacing: '1px' }}>
                    Or call (510) 883-4757
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
