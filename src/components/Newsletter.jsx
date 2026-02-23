import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Reveal from './Reveal'
import './Newsletter.css'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return

    setStatus('sending')

    const { error } = await supabase
      .from('newsletter')
      .insert([{ email }])

    if (error) {
      if (error.code === '23505') {
        setStatus('exists')
      } else {
        setStatus('error')
      }
    } else {
      setStatus('success')
      setEmail('')
    }
  }

  return (
    <section id="newsletter" className="newsletter-section">
      <div className="newsletter-inner">
        <Reveal>
          <p className="section-label">Stay Connected</p>
        </Reveal>
        <Reveal>
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Subscribe'}
            </button>
          </form>
          {status === 'success' && (
            <p className="newsletter-msg success">You're in. Welcome to the crew.</p>
          )}
          {status === 'exists' && (
            <p className="newsletter-msg">Already on the list. We got you.</p>
          )}
          {status === 'error' && (
            <p className="newsletter-msg error">Something went wrong. Try again.</p>
          )}
        </Reveal>
      </div>
    </section>
  )
}
