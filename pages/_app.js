import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import { pibase } from '../lib/pibase'

const PUBLIC_ROUTES = ['/login', '/contact', '/booking', '/sign', '/invoice', '/quote', '/questionnaire', '/chat']

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const publicRoute = PUBLIC_ROUTES.some(route => router.pathname.startsWith(route))
  const [ready, setReady] = useState(!pibase || publicRoute) // public pages never wait on an auth request
  const [authError, setAuthError] = useState('')

  const isPublicRoute = () => PUBLIC_ROUTES.some(r => router.pathname.startsWith(r))

  useEffect(() => {
    if (!pibase) return
    if (isPublicRoute()) setReady(true)

    // Check initial session
    pibase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) throw error
      if (!session && !isPublicRoute()) {
        router.push('/login')
      } else {
        setReady(true)
      }
    }).catch(error => {
      console.error('[auth] session check failed', error)
      setAuthError(error?.message || 'Unable to verify your session.')
      setReady(true)
    })

    // Listen for auth changes
    const { data: { subscription } } = pibase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !isPublicRoute()) {
        router.push('/login')
      }
      if (event === 'SIGNED_IN') {
        setAuthError('')
        setReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [router.pathname])

  if (!ready) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'sans-serif', color: '#222' }}>Loading EHS Studio Manager…</main>

  if (authError && !isPublicRoute()) {
    return (
      <main style={{ maxWidth: 520, margin: '12vh auto', padding: 24, fontFamily: 'sans-serif' }}>
        <h1>EHS Studio Manager</h1>
        <p>We couldn’t verify your PiBase session.</p>
        <p style={{ color: '#666', fontSize: 14 }}>{authError}</p>
        <a href="/login">Return to sign in</a>
      </main>
    )
  }

  return <Component {...pageProps} />
}
