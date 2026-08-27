import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/analytics'

const TITLES = {
  '/': 'Home',
  '/shop': 'Shop',
  '/about': 'About',
  '/gallery': 'Gallery',
  '/visit': 'Visit',
  '/order/success': 'Order Confirmation',
  '/checkout/success': 'Checkout Success',
}

export default function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return

    const title = TITLES[location.pathname] || location.pathname
    document.title = `${title} — ROSSI MISSION SF`
    trackPageView(location.pathname + location.search, title)
  }, [location.pathname, location.search])

  return null
}
