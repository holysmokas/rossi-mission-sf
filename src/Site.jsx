import GraffitiBackground from './components/GraffitiBackground'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import About from './components/About'
import VideoSection from './components/VideoSection'
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
        <VideoSection />
        <Gallery />
        <Visit />
        <Newsletter />
        <Footer />
      </div>
      <CartDrawer />
    </>
  )
}
