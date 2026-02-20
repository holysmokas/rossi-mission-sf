import Reveal from './Reveal'
import './Gallery.css'

const icons = ['◼', '◻', '▲', '●', '◆', '✕', '◼']

export default function Gallery() {
  return (
    <section id="gallery">
      <div className="gallery-section">
        <Reveal><p className="section-label">The Gallery</p></Reveal>
        <Reveal><h2 className="section-title">Street to<br />Studio</h2></Reveal>
        <div className="gallery-grid">
          {icons.map((icon, i) => (
            <Reveal key={i} className="gallery-item">
              <span className="gallery-icon">{icon}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
