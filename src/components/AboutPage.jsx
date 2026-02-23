import GraffitiBackground from './GraffitiBackground'
import Navbar from './Navbar'
import Footer from './Footer'
import CartDrawer from './CartDrawer'
import Reveal from './Reveal'
import './AboutPage.css'

export default function AboutPage() {
  return (
    <div className="about-page">
      <GraffitiBackground />
      <div className="grain" />
      <div className="content">
        <Navbar />

        <div className="about-page-content">
          <Reveal>
            <p className="section-label">Est. Mission District</p>
          </Reveal>

          <div className="about-body">
            <Reveal>
              <p>Rossi Mission SF is more than a store — it's a cultural hub in the heart of San Francisco's Mission District. We curate urban art, limited-edition streetwear, and original works from local and international artists who live and breathe street culture.</p>
            </Reveal>
            <Reveal>
              <p>From hand-pulled screen prints to one-of-a-kind canvases, from underground labels to custom drops — if it belongs on the walls or on your back, you'll find it here.</p>
            </Reveal>
          </div>

          <div className="about-stats-row">
            <Reveal>
              <div className="about-stat">
                <div className="about-stat-number">791</div>
                <div className="about-stat-label">Valencia St</div>
              </div>
            </Reveal>
            <Reveal>
              <div className="about-stat">
                <div className="about-stat-number">SF</div>
                <div className="about-stat-label">Mission District</div>
              </div>
            </Reveal>
          </div>
        </div>

        <Footer />
      </div>
      <CartDrawer />
    </div>
  )
}
