const MEASUREMENT_ID = 'G-65W15WY07V'

function gtagSafe(...args) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  try {
    window.gtag(...args)
  } catch (e) {
    console.debug('analytics call failed', e)
  }
}

export function trackPageView(path, title) {
  gtagSafe('event', 'page_view', {
    page_path: path,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    page_title: title || (typeof document !== 'undefined' ? document.title : undefined),
    send_to: MEASUREMENT_ID,
  })
}

export function trackEvent(name, params = {}) {
  gtagSafe('event', name, { ...params, send_to: MEASUREMENT_ID })
}

function toGaItem(item) {
  return {
    item_id: item.id,
    item_name: item.name,
    price: Number(item.price) || 0,
    quantity: item.quantity || 1,
    item_variant: item.size || undefined,
    item_category: item.category || undefined,
  }
}

export function trackAddToCart(product, size, quantity = 1) {
  trackEvent('add_to_cart', {
    currency: 'USD',
    value: (Number(product.price) || 0) * quantity,
    items: [toGaItem({ ...product, size, quantity })],
  })
}

export function trackBeginCheckout(items, total) {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: Number(total) || 0,
    items: items.map(toGaItem),
  })
}

export function trackPurchase(order) {
  if (!order?.id) return

  const key = `rossi-purchase-tracked-${order.id}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    // private mode; fall through and accept a possible duplicate
  }

  const items = Array.isArray(order.items) ? order.items : []

  trackEvent('purchase', {
    transaction_id: order.id,
    currency: 'USD',
    value: (Number(order.total_cents) || 0) / 100,
    items: items.map(toGaItem),
  })
}
