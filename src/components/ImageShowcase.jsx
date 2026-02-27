import Reveal from './Reveal'
import './ImageShowcase.css'

// ── ADD YOUR IMAGES HERE ──
// Drop image files into public/images/ and list them below.
// Supports any number of images.
const IMAGES = [
    // { src: '/images/photo-1.jpg', alt: 'Description' },
    // { src: '/images/photo-2.jpg', alt: 'Description' },
    // { src: '/images/photo-3.jpg', alt: 'Description' },
]

export default function ImageShowcase() {
    if (IMAGES.length === 0) {
        return null // Don't render anything until images are added
    }

    return (
        <section className="showcase-section">
            <div className="showcase-inner">
                <div className={`showcase-grid count-${Math.min(IMAGES.length, 6)}`}>
                    {IMAGES.map((img, i) => (
                        <Reveal key={i}>
                            <div className={`showcase-item${i === 0 && IMAGES.length > 2 ? ' showcase-item-large' : ''}`}>
                                <img src={img.src} alt={img.alt || 'Rossi Mission SF'} loading="lazy" />
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    )
}