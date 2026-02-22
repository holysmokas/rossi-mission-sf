import Reveal from './Reveal'
import './VideoSection.css'

export default function VideoSection() {
  return (
    <section id="video">
      <div className="video-section">
        <Reveal><p className="section-label">The Culture</p></Reveal>
        <Reveal><h2 className="section-title">See It<br />Live</h2></Reveal>
        <Reveal>
          <div className="video-container">
            <div className="video-placeholder">
              <span className="video-play-icon">▶</span>
              <p>Video Coming Soon</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
