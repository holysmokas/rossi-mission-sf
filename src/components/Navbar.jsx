import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SocialIcons from './SocialIcons'
import CartButton from './CartButton'
import './Navbar.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      <nav className={scrolled ? 'scrolled' : ''}>
        <Link to="/" className="nav-logo">
          <img src={`${import.meta.env.BASE_URL}logo-192.jpeg`} alt="Rossi Mission SF" className="nav-logo-img" />
        </Link>

        {/* Desktop links only */}
        <ul className="nav-links-desktop">
          <li><Link to="/about">About</Link></li>
          <li><Link to="/shop">Shop</Link></li>
          <li><Link to="/gallery">Gallery</Link></li>
          <li><Link to="/visit">Visit</Link></li>
          <li className="nav-social-item">
            <SocialIcons className="nav-socials" />
          </li>
        </ul>

        <div className="nav-right">
          <CartButton />
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={menuOpen ? 'bar bar1 open' : 'bar bar1'} />
            <span className={menuOpen ? 'bar bar2 open' : 'bar bar2'} />
            <span className={menuOpen ? 'bar bar3 open' : 'bar bar3'} />
          </button>
        </div>
      </nav>

      {/* Mobile fullscreen menu — rendered OUTSIDE nav to avoid stacking context issues */}
      <div className={`mobile-menu-overlay${menuOpen ? ' open' : ''}`}>
        <div className="mobile-menu-content">
          <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
          <Link to="/shop" onClick={() => setMenuOpen(false)}>Shop</Link>
          <Link to="/gallery" onClick={() => setMenuOpen(false)}>Gallery</Link>
          <Link to="/visit" onClick={() => setMenuOpen(false)}>Visit</Link>
          <div className="mobile-menu-social">
            <SocialIcons />
          </div>
        </div>
      </div>
    </>
  )
}