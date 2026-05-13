import { Link } from 'react-router-dom'
import './Admin.css'

export default function AdminLogin() {
  return (
    <div className="admin-login-page">
      <div className="admin-login-box">
        <div className="admin-login-header">
          <h1>ROSSI</h1>
          <p>Admin Panel</p>
        </div>

        <div style={{
          padding: '20px',
          border: '1px solid #d0d0d0',
          background: '#fafafa',
          marginBottom: 20,
        }}>
          <p style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.7rem',
            lineHeight: 1.7,
            color: '#1a1a1a',
            letterSpacing: '1px',
          }}>
            Admin temporarily offline while we migrate to a new backend. The storefront is live and accepting order requests.
          </p>
          <p style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.6rem',
            lineHeight: 1.7,
            color: '#888',
            letterSpacing: '1px',
            marginTop: 12,
          }}>
            Estimated back online: within a few days.
          </p>
        </div>

        <Link to="/" className="admin-back-link">← Back to site</Link>
      </div>
    </div>
  )
}
