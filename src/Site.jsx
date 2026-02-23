import GraffitiBackground from './components/GraffitiBackground'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
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
        <Hero />
        <ReelsSection />
        <Newsletter />
        <Footer />
      </div>
      <CartDrawer />
    </>
  )
}
