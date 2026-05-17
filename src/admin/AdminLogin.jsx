import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      setError(error.message || 'Login failed')
      return
    }
    navigate('/admin/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fafafa',
      fontFamily: "'Space Mono', monospace",
      padding: 20,
      boxSizing: 'border-box',
    }}>
      <form onSubmit={handleSubmit} style={{
        maxWidth: 420,
        width: '100%',
        padding: '48px 32px',
        border: '1px solid #d0d0d0',
        background: '#fff',
        boxSizing: 'border-box',
      }}>
        <h1 style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: '2.4rem',
          letterSpacing: 4,
          color: '#1a1a1a',
          textAlign: 'center',
          margin: 0,
        }}>ROSSI</h1>
        <p style={{
          fontSize: '0.65rem',
          letterSpacing: 4,
          color: '#888',
          textAlign: 'center',
          marginTop: 8,
          marginBottom: 32,
          textTransform: 'uppercase',
        }}>Admin Panel</p>

        <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: 2, color: '#666', marginBottom: 6 }}>
          EMAIL
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d0d0d0',
            background: '#fff',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            marginBottom: 18,
            boxSizing: 'border-box',
          }}
        />

        <label style={{ display: 'block', fontSize: '0.65rem', letterSpacing: 2, color: '#666', marginBottom: 6 }}>
          PASSWORD
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d0d0d0',
            background: '#fff',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            marginBottom: 22,
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{
            color: '#c62828',
            fontSize: '0.7rem',
            letterSpacing: 1,
            margin: '0 0 16px 0',
          }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '12px',
            background: '#1a1a1a',
            color: '#fff',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: '0.75rem',
            letterSpacing: 3,
            cursor: submitting ? 'wait' : 'pointer',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'SIGNING IN…' : 'SIGN IN'}
        </button>

        <p style={{
          fontSize: '0.65rem',
          letterSpacing: 1,
          color: '#999',
          textAlign: 'center',
          marginTop: 24,
          marginBottom: 0,
        }}>
          <a href="/" style={{ color: '#999', textDecoration: 'none' }}>← Back to site</a>
        </p>
      </form>
    </div>
  )
}