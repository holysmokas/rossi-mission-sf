import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import GraffitiBackground from './GraffitiBackground'
import Navbar from './Navbar'
import Footer from './Footer'
import CartDrawer from './CartDrawer'
import Reveal from './Reveal'
import './GalleryPage.css'

export default function GalleryPage() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    fetchGallery()
  }, [])

  async function fetchGallery() {
    const { data, error } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (!error) setImages(data || [])
    setLoading(false)
  }

  function openLightbox(index) {
    setLightbox(index)
    document.body.style.overflow = 'hidden'
  }

  function closeLightbox() {
    setLightbox(null)
    document.body.style.overflow = ''
  }

  function navLightbox(dir) {
    if (lightbox === null) return
    const next = lightbox + dir
    if (next < 0) setLightbox(images.length - 1)
    else if (next >= images.length) setLightbox(0)
    else setLightbox(next)
  }

  // Keyboard navigation
  useEffect(() => {
    if (lightbox === null) return
    function handleKey(e) {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') navLightbox(-1)
      if (e.key === 'ArrowRight') navLightbox(1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightbox])

  return (
    <div className="gallery-page">
      <GraffitiBackground />
      <div className="grain" />
      <div className="content">
        <Navbar />

        <div className="gallery-page-content">
          <Reveal>
            <p className="section-label">The Gallery</p>
          </Reveal>

          {loading ? (
            <div className="shop-loading"><p>Loading gallery...</p></div>
          ) : images.length === 0 ? (
            <div className="shop-empty"><p>Gallery coming soon. Check back later.</p></div>
          ) : (
            <div className="gallery-grid-page">
              {images.map((img, i) => (
                <Reveal key={img.id}>
                  <div
                    className={`gallery-cell${i === 0 ? ' gallery-cell-large' : ''}`}
                    onClick={() => openLightbox(i)}
                  >
                    <img src={img.image_url} alt={img.title || 'Gallery'} loading="lazy" />
                    {(img.title || img.artist) && (
                      <div className="gallery-cell-info">
                        {img.title && <span className="gallery-cell-title">{img.title}</span>}
                        {img.artist && <span className="gallery-cell-artist">by {img.artist}</span>}
                      </div>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>

        <Footer />
      </div>
      <CartDrawer />

      {/* ── Lightbox ── */}
      {lightbox !== null && images[lightbox] && (
        <div className="gallery-lightbox" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}>✕</button>
          <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); navLightbox(-1) }}>‹</button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={images[lightbox].image_url} alt={images[lightbox].title || 'Gallery'} />
            {(images[lightbox].title || images[lightbox].artist) && (
              <div className="lightbox-info">
                {images[lightbox].title && <span className="lightbox-title">{images[lightbox].title}</span>}
                {images[lightbox].artist && <span className="lightbox-artist">by {images[lightbox].artist}</span>}
              </div>
            )}
          </div>
          <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); navLightbox(1) }}>›</button>
          <div className="lightbox-counter">{lightbox + 1} / {images.length}</div>
        </div>
      )}
    </div>
  )
}