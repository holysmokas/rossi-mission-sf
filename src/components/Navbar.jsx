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

  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <Link to="/" className="nav-logo">
        <img src={`${import.meta.env.BASE_URL}logo-192.jpeg`} alt="Rossi Mission SF" className="nav-logo-img" />
      </Link>
      <ul className={`nav-links${menuOpen ? ' open' : ''}`}>
        <li><Link to="/about" onClick={() => setMenuOpen(false)}>About</Link></li>
        <li><Link to="/shop" onClick={() => setMenuOpen(false)}>Shop</Link></li>
        <li><Link to="/gallery" onClick={() => setMenuOpen(false)}>Gallery</Link></li>
        <li><Link to="/visit" onClick={() => setMenuOpen(false)}>Visit</Link></li>
        <li className="nav-social-item">
          <SocialIcons className="nav-socials" />
        </li>
      </ul>
      <div className="nav-right">
        <CartButton />
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
      </div>
    </nav>
  )
}
