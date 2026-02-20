import { useState, useRef, useEffect } from 'react'
import Reveal from './Reveal'
import './Newsletter.css'

// REPLACE THIS with your Google Apps Script Web App URL after deploying
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-lFz7BwY9sszfb1DzNksQBcIZD5dKv5ujN_TTuSZprPhhIyx81GMWK4-PBc1xg1oa/exec'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const formTimeRef = useRef(null)

  useEffect(() => {
    formTimeRef.current = Date.now()
  }, [])

  const sanitize = (str) => str.replace(/<[^>]*>/g, '').trim()

  const isValidEmail = (val) => {
    if (val.length > 254) return false
    return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(val)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (honeypot) return

    const cleanEmail = sanitize(email)

    if (!cleanEmail) {
      setStatus('error')
      setMessage('Please enter your email.')
      return
    }

    if (!isValidEmail(cleanEmail)) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          email: cleanEmail,
          website: honeypot,
          _t: formTimeRef.current,
        }),
      })

      const data = await res.json()

      if (data.result === 'success') {
        setStatus('success')
        setMessage(data.message || 'Welcome to the movement!')
        setEmail('')
      } else if (data.result === 'duplicate') {
        setStatus('duplicate')
        setMessage(data.message || "You're already subscribed!")
      } else {
        setStatus('error')
        setMessage(data.message || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      setStatus('error')
      setMessage('Connection error. Please try again.')
    }
  }

  return (
    <Reveal className="newsletter">
      <p className="section-label">Stay Connected</p>
      <h2 className="section-title">Join the<br />Movement</h2>
      <p className="newsletter-desc">
        Get early access to drops, exhibition openings, and exclusive releases.
      </p>

      {status === 'success' || status === 'duplicate' ? (
        <div className={`newsletter-status ${status}`}>
          <p>{message}</p>
        </div>
      ) : (
        <div className="newsletter-input">
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-9999px',
              opacity: 0,
              height: 0,
              width: 0,
              overflow: 'hidden',
            }}
          />
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
            disabled={status === 'loading'}
            maxLength={254}
            autoComplete="email"
          />
          <button onClick={handleSubmit} disabled={status === 'loading'}>
            {status === 'loading' ? '...' : 'Subscribe'}
          </button>
          {status === 'error' && (
            <p className="newsletter-error">{message}</p>
          )}
        </div>
      )}
    </Reveal>
  )
}