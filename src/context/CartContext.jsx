import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export function useCart() {
  return useContext(CartContext)
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  // Persist cart in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('rossi-cart')
    if (saved) {
      try { setItems(JSON.parse(saved)) } catch {}
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem('rossi-cart', JSON.stringify(items))
  }, [items])

  function addItem(product, size = null) {
    setItems(prev => {
      const key = `${product.id}-${size || 'default'}`
      const existing = prev.find(i => i.key === key)

      if (existing) {
        return prev.map(i =>
          i.key === key ? { ...i, quantity: i.quantity + 1 } : i
        )
      }

      return [...prev, {
        key,
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image_url: product.image_url,
        size,
        quantity: 1,
      }]
    })
    setIsOpen(true)
  }

  function removeItem(key) {
    setItems(prev => prev.filter(i => i.key !== key))
  }

  function updateQuantity(key, quantity) {
    if (quantity <= 0) {
      removeItem(key)
      return
    }
    setItems(prev =>
      prev.map(i => i.key === key ? { ...i, quantity } : i)
    )
  }

  function clearCart() {
    setItems([])
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0)

  return (
    <CartContext.Provider value={{
      items,
      isOpen,
      setIsOpen,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      total,
    }}>
      {children}
    </CartContext.Provider>
  )
}
