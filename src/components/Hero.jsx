import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <p className="hero-tag">Mission District &mdash; San Francisco</p>
        <h1 className="hero-title">
          ROSSI
          <span className="line2">Mission SF</span>
        </h1>
        <p className="hero-subtitle">Urban Art &bull; Streetwear &bull; Culture</p>
        <div className="hero-cta">
          <a href="#shop">Explore the Collection</a>
        </div>
      </div>
      <div className="scroll-indicator"><span></span></div>
    </section>
  )
}
