import { useEffect, useMemo } from 'react'
import Reveal from './Reveal'
import './ReelsSection.css'

// ── ALL 6 REELS ──
// Rotates automatically every Sunday. Week 0 = reel 1, Week 1 = reel 2, etc.
// To add more reels, just append URLs to this array.
const REELS = [
  'https://www.instagram.com/reel/CmPBAiJpFGC/',
  'https://www.instagram.com/reel/Cx8YN5dxK2R/',
  'https://www.instagram.com/reel/DG_1ignyB4x/',
  'https://www.instagram.com/reel/DH6k71ry1Wd/',
  'https://www.instagram.com/reel/DJQDmTASNK3/',
  'https://www.instagram.com/reel/DLYChl2hYxC/',
]

// Returns the ISO week number (rotates on Sunday)
function getWeekIndex() {
  const now = new Date()
  // Get the Thursday of the current week to determine week number
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const daysSinceJan1 = Math.floor((now - jan1) / 86400000)
  const weekNumber = Math.floor(daysSinceJan1 / 7)
  return weekNumber % REELS.length
}

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
          margin: '0 auto',
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
  const currentReelUrl = useMemo(() => REELS[getWeekIndex()], [])

  useEffect(() => {
    // Load Instagram embed script
    if (!document.getElementById('ig-embed-script')) {
      const script = document.createElement('script')
      script.id = 'ig-embed-script'
      script.src = 'https://www.instagram.com/embed.js'
      script.async = true
      document.body.appendChild(script)
    } else if (window.instgrm) {
      window.instgrm.Embeds.process()
    }
  }, [currentReelUrl])

  return (
    <section id="video" className="reels-section-wrap">
      <div className="reels-section">
        <Reveal>
          <div className="reel-single">
            <ReelEmbed url={currentReelUrl} />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
