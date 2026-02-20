import SocialIcons from './SocialIcons'
import './Footer.css'

export default function Footer() {
  return (
    <footer>
      <div className="footer-logo">ROSSI MISSION SF</div>
      <div className="footer-center">
        <div className="footer-links">
          <a href="mailto:info@rossimissionsf.com">Email</a>
          <a href="tel:+15108834757">Phone</a>
          <a href="https://maps.google.com/?q=799+Valencia+Street+San+Francisco" target="_blank" rel="noopener noreferrer">Map</a>
        </div>
        <SocialIcons className="footer-socials" />
      </div>
      <div className="footer-bottom">
        <div className="footer-copy">&copy; {new Date().getFullYear()} ROSSI MISSION SF</div>
        <div className="footer-credit">Design by <a href="https://www.milanilabs.com" target="_blank" rel="noopener noreferrer">Milani Labs</a></div>
      </div>
    </footer>
  )
}
