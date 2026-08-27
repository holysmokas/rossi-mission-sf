import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import Site from './Site'
import ShopPage from './components/ShopPage'
import AboutPage from './components/AboutPage'
import GalleryPage from './components/GalleryPage'
import VisitPage from './components/VisitPage'
import CheckoutSuccess from './components/CheckoutSuccess'
import AdminLogin from './admin/AdminLogin'
import AdminDashboard from './admin/AdminDashboard'
import AdminAccount from './admin/AdminAccount'
import AdminReports from './admin/AdminReports'
import AdminRoute from './admin/AdminRoute'
import OrderSuccess from './pages/OrderSuccess'
import RouteTracker from './components/RouteTracker'

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <RouteTracker />
        <Routes>
          <Route path="/" element={<Site />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/visit" element={<VisitPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/order/success" element={<OrderSuccess />} />
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/account" element={
            <AdminRoute>
              <AdminAccount />
            </AdminRoute>
          } />
          <Route path="/admin/reports" element={
            <AdminRoute>
              <AdminReports />
            </AdminRoute>
          } />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}