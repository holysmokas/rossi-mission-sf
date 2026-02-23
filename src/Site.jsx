import GraffitiBackground from './components/GraffitiBackground'
import Navbar from './components/Navbar'
import ReelsSection from './components/ReelsSection'
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
        <ReelsSection />
        <Newsletter />
        <Footer />
      </div>
      <CartDrawer />
    </>
  )
}
