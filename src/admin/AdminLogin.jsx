import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Admin.css'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/admin/dashboard')
    })

    // Listen for auth changes (handles email confirmation redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/admin/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (isSignUp) {
      // Get the site origin for redirect
      const redirectUrl = `${window.location.origin}/admin`

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
      } else if (data?.user?.identities?.length === 0) {
        // User already exists but hasn't confirmed
        setError('An account with this email already exists. Check your inbox for a confirmation link.')
      } else if (data?.user && !data?.session) {
        // Signup successful, email confirmation required
        setMessage('Account created! Check your email and click the confirmation link to activate your account. Then come back here to sign in.')
        setEmail('')
        setPassword('')
        setIsSignUp(false) // Switch to sign-in view so they can log in after confirming
      } else if (data?.session) {
        // No email confirmation required — auto signed in
        navigate('/admin/dashboard')
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          setError('Your email is not confirmed yet. Check your inbox for a confirmation link.')
        } else {
          setError(authError.message)
        }
      } else {
        navigate('/admin/dashboard')
      }
    }

    setLoading(false)
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-box">
        <div className="admin-login-header">
          <h1>ROSSI</h1>
          <p>{isSignUp ? 'Create Admin Account' : 'Admin Panel'}</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@rossimissionsf.com"
              required
            />
          </div>
          <div className="admin-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          {error && <p className="admin-error">{error}</p>}
          {message && <p className="admin-success">{message}</p>}
          <button type="submit" className="admin-btn primary" disabled={loading}>
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <button
          className="admin-toggle-auth"
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>

        <a href="/" className="admin-back-link">← Back to site</a>
      </div>
    </div>
  )
}