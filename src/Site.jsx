import GraffitiBackground from './components/GraffitiBackground'
import Navbar from './components/Navbar'
import ImageShowcase from './components/ImageShowcase'
import Newsletter from './components/Newsletter'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'

export default function Site() {
  return (
    <>
      <GraffitiBackground />
      <div className="grain" />
      <div className="content">
        <Navbar />
        <ImageShowcase />
        <Newsletter />
        <Footer />
      </div>
      <CartDrawer />
    </>
  )
}