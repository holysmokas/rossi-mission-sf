import './Marquee.css'

const words = ['ART', 'CLOTHING', 'GRAFFITI', 'STREETWEAR', 'MURALS', 'PRINTS', 'LOCAL ARTISTS', 'MISSION DISTRICT']

export default function Marquee() {
  const doubled = [...words, ...words]
  return (
    <div className="marquee-strip">
      <div className="marquee-track">
        {doubled.map((w, i) => (
          <span key={i}>{w} &bull;</span>
        ))}
      </div>
    </div>
  )
}
