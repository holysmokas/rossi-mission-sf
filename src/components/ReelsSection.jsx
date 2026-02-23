import { useEffect } from 'react'
import Reveal from './Reveal'
import './ReelsSection.css'

/*
  HOW TO ADD REELS:
  1. Go to the Instagram reel on desktop
  2. Click the three dots (...) → Embed
  3. Copy the URL (e.g. https://www.instagram.com/reel/ABC123/)
  4. Add it to the REELS array below
*/
const REELS = [
  // Replace these with real Rossi Mission SF reel URLs:
  // 'https://www.instagram.com/reel/XXXXXXXXXXX/',
  // 'https://www.instagram.com/reel/YYYYYYYYYYY/',
  // 'https://www.instagram.com/reel/ZZZZZZZZZZZ/',
]

function ReelEmbed({ url }) {
  return (
    <div className="reel-embed">
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: '#FFF',
          border: 0,
          borderRadius: '3px',
          boxShadow: 'none',
          margin: '0',
          maxWidth: '540px',
          minWidth: '326px',
          padding: 0,
          width: '100%',
        }}
      />
    </div>
  )
}

export default function ReelsSection() {
  useEffect(() => {
    if (REELS.length > 0 && !document.getElementById('ig-embed-script')) {
      const script = document.createElement('script')
      script.id = 'ig-embed-script'
      script.src = 'https://www.instagram.com/embed.js'
      script.async = true
      document.body.appendChild(script)
    }

    if (window.instgrm) {
      window.instgrm.Embeds.process()
    }
  }, [])

  return (
    <section id="video" className="reels-section-wrap">
      <div className="reels-section">
        {REELS.length > 0 ? (
          <Reveal>
            <div className="reels-grid">
              {REELS.map((url, i) => (
                <ReelEmbed key={i} url={url} />
              ))}
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <div className="reels-placeholder">
              <div className="reel-card-placeholder">
                <span>▶</span>
                <p>Reels Coming Soon</p>
              </div>
              <div className="reel-card-placeholder">
                <span>▶</span>
                <p>Reels Coming Soon</p>
              </div>
              <div className="reel-card-placeholder">
                <span>▶</span>
                <p>Reels Coming Soon</p>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
