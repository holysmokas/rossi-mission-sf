import { useState } from 'react'
import { useCart } from '../context/CartContext'
import './Cart.css'

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, clearCart, itemCount, total } = useCart()
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    if (items.length === 0) return
    setCheckingOut(true)
    setError('')

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ items }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to create checkout. Please try again.')
        setCheckingOut(false)
      }
    } catch (err) {
      setError('Connection error. Please try again.')
      setCheckingOut(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className={`cart-overlay${isOpen ? ' open' : ''}`} onClick={() => setIsOpen(false)} />

      {/* Drawer */}
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
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} />
                    ) : (
                      <span>🎨</span>
                    )}
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
              {error && <p className="cart-error">{error}</p>}
              <button
                className="cart-checkout-btn"
                onClick={handleCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? 'Redirecting to checkout...' : 'Checkout'}
              </button>
              <p className="cart-secure-note">Secure payment via Square</p>
            </div>
          </>
        )}
      </div>
    </>
  )
}
