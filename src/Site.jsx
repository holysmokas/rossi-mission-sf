import GraffitiBackground from './components/GraffitiBackground'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import About from './components/About'
import Shop from './components/Shop'
import Gallery from './components/Gallery'
import Visit from './components/Visit'
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
        <Marquee />
        <About />
        <Shop />
        <Gallery />
        <Visit />
        <Newsletter />
        <Footer />
      </div>
      <CartDrawer />
    </>
  )
}
