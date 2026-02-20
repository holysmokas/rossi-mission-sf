import { useCart } from '../context/CartContext'
import './Cart.css'

export default function CartButton() {
  const { itemCount, setIsOpen } = useCart()

  return (
    <button className="cart-btn" onClick={() => setIsOpen(true)} aria-label="Open cart">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
    </button>
  )
}
