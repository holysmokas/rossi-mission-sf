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
      <a href="#" className="nav-logo">
        <img src={`${import.meta.env.BASE_URL}logo-192.png`} alt="Rossi Mission SF" className="nav-logo-img" />
      </a>
      <ul className={`nav-links${menuOpen ? ' open' : ''}`}>
        <li><a href="#about" onClick={() => setMenuOpen(false)}>About</a></li>
        <li><Link to="/shop" onClick={() => setMenuOpen(false)}>Shop</Link></li>
        <li><a href="#gallery" onClick={() => setMenuOpen(false)}>Gallery</a></li>
        <li><a href="#visit" onClick={() => setMenuOpen(false)}>Visit</a></li>
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
