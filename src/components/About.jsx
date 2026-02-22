import Reveal from './Reveal'
import './About.css'

export default function About() {
  return (
    <section id="about">
      <div className="about">
        <Reveal className="about-text">
          <p className="section-label">Est. Mission District</p>
          <h2 className="section-title">Where the<br />Walls Speak</h2>
          <p>Rossi Mission SF is more than a store — it's a cultural hub in the heart of San Francisco's Mission District. We curate urban art, limited-edition streetwear, and original works from local and international artists who live and breathe street culture.</p>
          <p>From hand-pulled screen prints to one-of-a-kind canvases, from underground labels to custom drops — if it belongs on the walls or on your back, you'll find it here.</p>
          <div className="about-stats">
            <div className="stat">
              <div className="stat-number">791</div>
              <div className="stat-label">Valencia St</div>
            </div>
            <div className="stat">
              <div className="stat-number">SF</div>
              <div className="stat-label">Mission District</div>
            </div>
          </div>
        </Reveal>
        <Reveal className="about-visual">
          <div className="frame frame-1">
            <div className="frame-inner">🎨</div>
            <span className="frame-tag">Original Art</span>
          </div>
          <div className="frame frame-2">
            <div className="frame-inner">👕</div>
            <span className="frame-tag">Streetwear</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
