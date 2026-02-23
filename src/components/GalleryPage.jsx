import GraffitiBackground from './GraffitiBackground'
import Navbar from './Navbar'
import Footer from './Footer'
import CartDrawer from './CartDrawer'
import Reveal from './Reveal'
import './GalleryPage.css'

const PLACEHOLDERS = Array.from({ length: 8 }, (_, i) => i)

export default function GalleryPage() {
  return (
    <div className="gallery-page">
      <GraffitiBackground />
      <div className="grain" />
      <div className="content">
        <Navbar />

        <div className="gallery-page-content">
          <Reveal>
            <p className="section-label">The Gallery</p>
            <h2 className="section-title">Street to<br />Studio</h2>
          </Reveal>

          <div className="gallery-grid-page">
            {PLACEHOLDERS.map((_, i) => (
              <Reveal key={i}>
                <div className={`gallery-cell${i === 0 ? ' gallery-cell-large' : ''}`}>
                  <span className="gallery-cell-icon">
                    {['◼', '◻', '▲', '●', '◆', '✕', '◼', '●'][i]}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Footer />
      </div>
      <CartDrawer />
    </div>
  )
}
