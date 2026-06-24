import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { T, C } from '../lib/tokens'

export default function Login() {
  const router = useRouter()
  const [tab, setTab]       = useState('login')  // login | signup
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [name, setName]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [success, setSuccess] = useState(null)

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/')
  }

  const handleSignup = async () => {
    if (!email || !password || !name) { setError('All fields required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess('Account created! Check your email to confirm, then log in.')
    setTab('login')
  }

  const handleKey = e => { if (e.key === 'Enter') tab === 'login' ? handleLogin() : handleSignup() }

  return (
    <>
      <Head>
        <title>EHS Studio Manager</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, color: C.text, letterSpacing: '-0.5px' }}>EHS Studio</div>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, color: C.text, letterSpacing: '-0.5px', marginTop: -4 }}>Manager</div>
            <div style={{ fontSize: 12, color: C.faint, marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Photography CRM</div>
          </div>

          {/* Card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: 28, background: C.surface2, borderRadius: 10, padding: 3 }}>
              {[['login', 'Log in'], ['signup', 'Create account']].map(([t, l]) => (
                <button key={t} onClick={() => { setTab(t); setError(null); setSuccess(null) }}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: tab === t ? C.surface : 'transparent', color: C.text, fontWeight: tab === t ? 500 : 400, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                  {l}
                </button>
              ))}
            </div>

            {success && (
              <div style={{ background: '#F0FFF4', border: '1px solid #C6F6D5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13.5, color: '#276749' }}>
                {success}
              </div>
            )}

            {error && (
              <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13.5, color: '#C53030' }}>
                {error}
              </div>
            )}

            {tab === 'signup' && (
              <div style={T.formGroup}>
                <label style={T.formLabel}>Full name</label>
                <input style={T.formInput} placeholder="Ellie Heartstrings" value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKey} autoFocus />
              </div>
            )}

            <div style={T.formGroup}>
              <label style={T.formLabel}>Email</label>
              <input style={T.formInput} type="email" placeholder="ellie@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey} autoFocus={tab === 'login'} />
            </div>

            <div style={{ ...T.formGroup, marginBottom: 24 }}>
              <label style={T.formLabel}>Password</label>
              <input style={T.formInput} type="password" placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'} value={password} onChange={e => setPass(e.target.value)} onKeyDown={handleKey} />
            </div>

            <button
              onClick={tab === 'login' ? handleLogin : handleSignup}
              disabled={loading}
              style={{ ...T.btnPrimary, width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 14.5, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Please wait...' : tab === 'login' ? 'Log in' : 'Create account'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: C.faint }}>
            Ellie&apos;s Heartstrings Photography
          </div>
        </div>
      </div>
    </>
  )
}
