import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Admin.css'

export default function AdminAccount() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [user, setUser] = useState(null)

    // Profile fields
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [currentEmail, setCurrentEmail] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })

    // Password fields
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

    // Email change fields
    const [emailMsg, setEmailMsg] = useState({ type: '', text: '' })
    const [changingEmail, setChangingEmail] = useState(false)

    useEffect(() => {
        loadUser()
    }, [])

    async function loadUser() {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
            navigate('/admin')
            return
        }
        setUser(user)
        setCurrentEmail(user.email || '')
        setFullName(user.user_metadata?.full_name || '')
        setPhone(user.user_metadata?.phone || '')
        setLoading(false)
    }

    async function handleProfileSave(e) {
        e.preventDefault()
        setSaving(true)
        setProfileMsg({ type: '', text: '' })

        const { error } = await supabase.auth.updateUser({
            data: {
                full_name: fullName.trim(),
                phone: phone.trim(),
            },
        })

        if (error) {
            setProfileMsg({ type: 'error', text: error.message })
        } else {
            setProfileMsg({ type: 'success', text: 'Profile updated.' })
        }
        setSaving(false)
    }

    async function handleEmailChange(e) {
        e.preventDefault()
        setEmailMsg({ type: '', text: '' })

        const trimmed = newEmail.trim().toLowerCase()
        if (!trimmed) {
            setEmailMsg({ type: 'error', text: 'Please enter a new email.' })
            return
        }
        if (trimmed === currentEmail) {
            setEmailMsg({ type: 'error', text: 'That\'s already your current email.' })
            return
        }

        setChangingEmail(true)

        const { error } = await supabase.auth.updateUser({
            email: trimmed,
        })

        if (error) {
            setEmailMsg({ type: 'error', text: error.message })
        } else {
            setEmailMsg({
                type: 'success',
                text: 'Confirmation sent to both your old and new email. Click the links in both to complete the change.',
            })
            setNewEmail('')
        }
        setChangingEmail(false)
    }

    async function handlePasswordChange(e) {
        e.preventDefault()
        setPasswordMsg({ type: '', text: '' })

        if (newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
            return
        }

        setSaving(true)

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        })

        if (error) {
            setPasswordMsg({ type: 'error', text: error.message })
        } else {
            setPasswordMsg({ type: 'success', text: 'Password updated.' })
            setNewPassword('')
            setConfirmPassword('')
        }
        setSaving(false)
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate('/admin')
    }

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-loading"><p>Loading...</p></div>
            </div>
        )
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <div className="admin-header-left">
                    <h1 className="admin-title">ROSSI ADMIN</h1>
                    <Link to="/admin/dashboard" className="admin-view-site">← Dashboard</Link>
                    <a href="/" target="_blank" rel="noopener noreferrer" className="admin-view-site">View Site →</a>
                </div>
                <button onClick={handleLogout} className="admin-btn ghost">Sign Out</button>
            </header>

            <div className="account-page-grid">
                {/* ── PROFILE INFO ── */}
                <div className="account-card">
                    <h2 className="account-card-title">Profile</h2>
                    <p className="account-card-subtitle">Update your name and phone number.</p>

                    <form onSubmit={handleProfileSave} className="account-form">
                        <div className="admin-field">
                            <label>Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your name"
                                maxLength={100}
                            />
                        </div>

                        <div className="admin-field">
                            <label>Phone</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(555) 123-4567"
                                maxLength={20}
                            />
                        </div>

                        <div className="admin-field">
                            <label>Current Email</label>
                            <input
                                type="email"
                                value={currentEmail}
                                disabled
                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            />
                        </div>

                        {profileMsg.text && (
                            <p className={profileMsg.type === 'success' ? 'admin-success' : 'admin-error'}>
                                {profileMsg.text}
                            </p>
                        )}

                        <button type="submit" className="admin-btn primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                </div>

                {/* ── CHANGE EMAIL ── */}
                <div className="account-card">
                    <h2 className="account-card-title">Change Email</h2>
                    <p className="account-card-subtitle">A confirmation will be sent to both your old and new email.</p>

                    <form onSubmit={handleEmailChange} className="account-form">
                        <div className="admin-field">
                            <label>New Email Address</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="new@email.com"
                                required
                            />
                        </div>

                        {emailMsg.text && (
                            <p className={emailMsg.type === 'success' ? 'admin-success' : 'admin-error'}>
                                {emailMsg.text}
                            </p>
                        )}

                        <button type="submit" className="admin-btn primary" disabled={changingEmail}>
                            {changingEmail ? 'Sending...' : 'Update Email'}
                        </button>
                    </form>
                </div>

                {/* ── CHANGE PASSWORD ── */}
                <div className="account-card">
                    <h2 className="account-card-title">Change Password</h2>
                    <p className="account-card-subtitle">Must be at least 6 characters.</p>

                    <form onSubmit={handlePasswordChange} className="account-form">
                        <div className="admin-field">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                                required
                            />
                        </div>

                        <div className="admin-field">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                                required
                            />
                        </div>

                        {passwordMsg.text && (
                            <p className={passwordMsg.type === 'success' ? 'admin-success' : 'admin-error'}>
                                {passwordMsg.text}
                            </p>
                        )}

                        <button type="submit" className="admin-btn primary" disabled={saving}>
                            {saving ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}