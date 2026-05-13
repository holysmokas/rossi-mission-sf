import { Link } from 'react-router-dom'

export default function AdminLogin() {
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
      <div style={{
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

        <div style={{
          padding: 20,
          border: '1px solid #d0d0d0',
          background: '#fafafa',
          marginBottom: 24,
        }}>
          <p style={{
            fontSize: '0.75rem',
            lineHeight: 1.7,
            color: '#1a1a1a',
            letterSpacing: 1,
            margin: 0,
          }}>
            Admin temporarily offline while we migrate to a new backend. The storefront is live and accepting order requests.
          </p>
          <p style={{
            fontSize: '0.65rem',
            lineHeight: 1.7,
            color: '#888',
            letterSpacing: 1,
            marginTop: 12,
            marginBottom: 0,
          }}>
            Estimated back online: within a few days.
          </p>
        </div>

        <Link to="/" style={{
          display: 'block',
          textAlign: 'center',
          fontSize: '0.7rem',
          color: '#888',
          textDecoration: 'none',
          letterSpacing: 1,
        }}>← Back to site</Link>
      </div>
    </div>
  )
}