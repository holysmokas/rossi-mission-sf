import SocialIcons from './SocialIcons'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-left">
          <p className="footer-copy">&copy; {year} Rossi Mission SF. All rights reserved.</p>
        </div>
        <div className="footer-right">
          <SocialIcons />
        </div>
      </div>
    </footer>
  )
}
