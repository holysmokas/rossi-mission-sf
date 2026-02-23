import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GraffitiBackground from './GraffitiBackground'
import Navbar from './Navbar'
import Footer from './Footer'
import CartDrawer from './CartDrawer'
import Reveal from './Reveal'
import './VisitPage.css'

// ── SECURITY CONFIG ──
// Whitelisted email domains (add more as needed)
const ALLOWED_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'aol.com', 'protonmail.com', 'proton.me',
  'live.com', 'msn.com', 'comcast.net', 'att.net',
  'me.com', 'mac.com', 'mail.com', 'zoho.com',
  'rossimissionsf.com',
]

// Rate limit: max submissions per session
const MAX_SUBMISSIONS = 3
const RATE_WINDOW_MS = 600000 // 10 minutes

function sanitize(str) {
  return str
    .replace(/[<>]/g, '')           // strip angle brackets
    .replace(/javascript:/gi, '')   // strip js protocol
    .replace(/on\w+=/gi, '')        // strip event handlers
    .trim()
}

function isValidEmail(email) {
  const regex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
  if (!regex.test(email)) return false
  if (email.length > 254) return false
  const domain = email.split('@')[1]?.toLowerCase()
  return ALLOWED_DOMAINS.includes(domain)
}

export default function VisitPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' })
  const [status, setStatus] = useState(null) // null | 'sending' | 'success' | 'error' | 'ratelimit' | 'domain'
  const [errorMsg, setErrorMsg] = useState('')
  const formOpenedAt = useRef(Date.now())
  const submissionLog = useRef([])

  // Reset form timestamp on mount
  useEffect(() => {
    formOpenedAt.current = Date.now()
  }, [])

  function isRateLimited() {
    const now = Date.now()
    // Clean old entries
    submissionLog.current = submissionLog.current.filter(t => (now - t) < RATE_WINDOW_MS)
    return submissionLog.current.length >= MAX_SUBMISSIONS
  }

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    setErrorMsg('')

    // ── SECURITY CHECKS ──

    // 1. Honeypot: bots fill hidden fields
    if (form.website.length > 0) {
      // Fake success so bot thinks it worked
      setStatus('success')
      return
    }

    // 2. Timing check: form filled too fast = bot
    const elapsed = Date.now() - formOpenedAt.current
    if (elapsed < 2000) {
      setStatus('success') // silent reject
      return
    }

    // 3. Rate limiting
    if (isRateLimited()) {
      setStatus('ratelimit')
      return
    }

    // 4. Input validation
    const name = sanitize(form.name)
    const email = sanitize(form.email).toLowerCase()
    const message = sanitize(form.message)

    if (!name || name.length < 2) {
      setErrorMsg('Please enter your name.')
      setStatus('error')
      return
    }

    if (name.length > 100) {
      setErrorMsg('Name is too long.')
      setStatus('error')
      return
    }

    if (!email) {
      setErrorMsg('Please enter your email.')
      setStatus('error')
      return
    }

    if (!isValidEmail(email)) {
      setStatus('domain')
      return
    }

    if (!message || message.length < 10) {
      setErrorMsg('Please write a message (at least 10 characters).')
      setStatus('error')
      return
    }

    if (message.length > 2000) {
      setErrorMsg('Message is too long (max 2000 characters).')
      setStatus('error')
      return
    }

    // 5. URL detection in message (spam signal)
    const urlPattern = /https?:\/\/|www\./i
    if (urlPattern.test(message)) {
      setErrorMsg('Links are not allowed in messages.')
      setStatus('error')
      return
    }

    // ── SUBMIT ──
    setStatus('sending')

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([{
          name,
          email,
          message,
          submitted_at: new Date().toISOString(),
        }])

      if (error) throw error

      submissionLog.current.push(Date.now())
      setStatus('success')
      setForm({ name: '', email: '', message: '', website: '' })
      formOpenedAt.current = Date.now()
    } catch (err) {
      console.error('Contact form error:', err)
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="visit-page">
      <GraffitiBackground />
      <div className="grain" />
      <div className="content">
        <Navbar />

        <div className="visit-page-content">
          <Reveal>
            <p className="section-label">Find Us</p>
            <h2 className="section-title">Visit<br />The Shop</h2>
          </Reveal>

          <div className="visit-grid">
            {/* LEFT: Info + Map */}
            <div className="visit-left">
              <Reveal>
                <div className="visit-info-card">
                  <h3>Location</h3>
                  <p>791 Valencia Street<br />San Francisco, CA 94110<br />Mission District</p>

                  <h3>Contact</h3>
                  <p>
                    <a href="mailto:info@rossimissionsf.com">info@rossimissionsf.com</a><br />
                    <a href="tel:+15108834757">(510) 883-4757</a>
                  </p>

                  <h3>Hours</h3>
                  <div className="hours-grid">
                    <div className="hours-row"><span>Tuesday — Friday</span><span>11:00 — 19:00</span></div>
                    <div className="hours-row"><span>Saturday</span><span>11:00 — 20:00</span></div>
                    <div className="hours-row"><span>Sunday</span><span>11:00 — 18:00</span></div>
                    <div className="hours-row closed"><span>Monday</span><span>Closed</span></div>
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div className="visit-map-wrap">
                  <iframe
                    title="Rossi Mission SF Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.6!2d-122.4213!3d37.7599!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808f7e3e5b0d6b7d%3A0x0!2s791+Valencia+St%2C+San+Francisco%2C+CA+94110!5e0!3m2!1sen!2sus!4v1700000000000"
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <a
                    href="https://maps.google.com/?q=791+Valencia+Street+San+Francisco+CA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-directions-link"
                  >
                    Get Directions →
                  </a>
                </div>
              </Reveal>
            </div>

            {/* RIGHT: Contact Form */}
            <div className="visit-right">
              <Reveal>
                <div className="contact-card">
                  <h3>Send a Message</h3>
                  <p className="contact-subtitle">Questions, collabs, or just say what's up.</p>

                  <form className="contact-form" onSubmit={handleSubmit} noValidate>
                    {/* Honeypot — hidden from humans, bots fill it */}
                    <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                      <label htmlFor="website">Website</label>
                      <input
                        type="text"
                        id="website"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={form.website}
                        onChange={(e) => updateField('website', e.target.value)}
                      />
                    </div>

                    <div className="contact-field">
                      <label htmlFor="contact-name">Name</label>
                      <input
                        type="text"
                        id="contact-name"
                        placeholder="Your name"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        maxLength={100}
                        required
                        disabled={status === 'sending'}
                      />
                    </div>

                    <div className="contact-field">
                      <label htmlFor="contact-email">Email</label>
                      <input
                        type="email"
                        id="contact-email"
                        placeholder="your@email.com"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        maxLength={254}
                        required
                        disabled={status === 'sending'}
                      />
                    </div>

                    <div className="contact-field">
                      <label htmlFor="contact-message">Message</label>
                      <textarea
                        id="contact-message"
                        placeholder="What's on your mind?"
                        value={form.message}
                        onChange={(e) => updateField('message', e.target.value)}
                        rows={5}
                        maxLength={2000}
                        required
                        disabled={status === 'sending'}
                      />
                      <span className="char-count">{form.message.length}/2000</span>
                    </div>

                    <button
                      type="submit"
                      className="contact-submit"
                      disabled={status === 'sending' || status === 'success'}
                    >
                      {status === 'sending' ? 'Sending...' : 'Send Message'}
                    </button>

                    {status === 'success' && (
                      <p className="contact-msg success">Message sent! We'll get back to you soon.</p>
                    )}
                    {status === 'error' && (
                      <p className="contact-msg error">{errorMsg}</p>
                    )}
                    {status === 'domain' && (
                      <p className="contact-msg error">Please use a valid personal or business email address.</p>
                    )}
                    {status === 'ratelimit' && (
                      <p className="contact-msg error">Too many messages. Please try again later.</p>
                    )}
                  </form>
                </div>
              </Reveal>
            </div>
          </div>
        </div>

        <Footer />
      </div>
      <CartDrawer />
    </div>
  )
}
