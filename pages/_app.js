import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import { pibase } from '../lib/pibase'
import { AppHead, PwaManager } from '../components/AppShell'

const PUBLIC_ROUTES = ['/login', '/contact', '/booking', '/sign', '/invoice', '/quote', '/questionnaire', '/chat', '/proposal']

export default function App({ Component, pageProps }) {
  const router = useRouter()
  // The manager itself is the installable app; client-facing pages
  // (booking, contact, invoice/quote/chat links…) are not.
  const appPage = router.pathname === '/' || router.pathname === '/login'
  const publicRoute = PUBLIC_ROUTES.some(route => router.pathname.startsWith(route))
  const [ready, setReady] = useState(!pibase || publicRoute) // public pages never wait on an auth request
  const [authError, setAuthError] = useState('')

  const isPublicRoute = () => PUBLIC_ROUTES.some(r => router.pathname.startsWith(r))

  // Phones: keep the field being typed in visible above the keyboard
  // (login, forms, and fields inside pop-up windows).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia?.('(pointer: coarse)').matches) return
    const typing = el => el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color'].includes(el.type)))
    const reveal = () => { const el = document.activeElement; if (typing(el)) el.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
    let timer = null
    const onFocus = e => { if (typing(e.target)) { clearTimeout(timer); timer = setTimeout(reveal, 350) } }
    document.addEventListener('focusin', onFocus)
    window.visualViewport?.addEventListener('resize', reveal)
    return () => { clearTimeout(timer); document.removeEventListener('focusin', onFocus); window.visualViewport?.removeEventListener('resize', reveal) }
  }, [])

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

  if (!ready) return <>{appPage && <AppHead />}<main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'sans-serif', color: '#222' }}>Loading 515Studio Manager…</main></>

  if (authError && !isPublicRoute()) {
    return (
      <main style={{ maxWidth: 520, margin: '12vh auto', padding: 24, fontFamily: 'sans-serif' }}>
        <h1>515Studio Manager</h1>
        <p>We couldn’t verify your PiBase session.</p>
        <p style={{ color: '#666', fontSize: 14 }}>{authError}</p>
        <a href="/login">Return to sign in</a>
      </main>
    )
  }

  return <>
    {appPage && <AppHead />}
    <Component {...pageProps} />
    {appPage && <PwaManager />}
  </>
}
