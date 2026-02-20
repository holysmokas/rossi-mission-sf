import { useEffect } from 'react'
import { useCart } from '../context/CartContext'
import './CheckoutSuccess.css'

export default function CheckoutSuccess() {
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
  }, [])

  return (
    <div className="success-page">
      <div className="success-box">
        <div className="success-icon">✓</div>
        <h1>Order Confirmed</h1>
        <p>Thank you for your purchase! You'll receive a confirmation email shortly.</p>
        <a href="/" className="success-btn">Back to Shop</a>
      </div>
    </div>
  )
}
