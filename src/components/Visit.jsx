import Reveal from './Reveal'
import './Visit.css'

export default function Visit() {
  return (
    <section id="visit">
      <div className="visit-section">
        <Reveal><p className="section-label">Find Us</p></Reveal>
        <Reveal><h2 className="section-title">Visit<br />The Shop</h2></Reveal>
        <div className="visit-grid">
          <Reveal className="visit-info">
            <h3>Location</h3>
            <p>799 Valencia Street<br />San Francisco, CA<br />Mission District</p>

            <h3 style={{ marginTop: 32 }}>Contact</h3>
            <p>
              <a href="mailto:info@rossimissionsf.com">info@rossimissionsf.com</a><br />
              <a href="tel:+15108834757">(510) 883-4757</a>
            </p>

            <h3 style={{ marginTop: 32 }}>Hours</h3>
            <div className="hours-grid">
              <div className="hours-row"><span>Monday — Friday</span><span>11:00 — 19:00</span></div>
              <div className="hours-row"><span>Saturday</span><span>10:00 — 20:00</span></div>
              <div className="hours-row"><span>Sunday</span><span>11:00 — 18:00</span></div>
            </div>
          </Reveal>
          <Reveal className="visit-map">
            <div className="map-text">799 Valencia St<br />Mission District</div>
            <a
              href="https://maps.google.com/?q=799+Valencia+Street+San+Francisco"
              target="_blank"
              rel="noopener noreferrer"
              className="map-link"
            >
              Open in Maps →
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
