import { useEffect, useState } from 'react'
import Head from 'next/head'
import { canPromptInstall, initInstallPrompt, isIOS, isStandalone, promptInstall, subscribe } from '../lib/pwa'

const DISMISS_KEY = 'ehs-install-dismissed-at'
const DISMISS_DAYS = 30

// Tags that make the manager installable ("Add to Home Screen").
export function AppHead() {
  return (
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="theme-color" content="#ffffff" />
      <meta name="application-name" content="EHS Studio" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="EHS Studio" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <link rel="manifest" href="/api/manifest" />
      <link rel="icon" type="image/png" sizes="32x32" href="/api/app-icon/favicon-32.png" />
      <link rel="apple-touch-icon" href="/api/app-icon/apple-touch-icon.png" />
    </Head>
  )
}

// Registers the service worker and shows the small bars the app needs:
// install offer, "new version" reload, and offline notice.
export function PwaManager() {
  const [installable, setInstallable] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const [waiting, setWaiting] = useState(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const dismissed = () => { try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_DAYS * 864e5 } catch { return false } }
    initInstallPrompt()
    const unsubscribe = subscribe(() => setInstallable(canPromptInstall() && !dismissed()))
    if (isIOS() && !isStandalone() && !dismissed()) setIosHint(true)

    const updateOnline = () => setOffline(!navigator.onLine)
    updateOnline()
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)

    // Service worker: production only, so development builds never serve stale code.
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(registration => {
        const watch = worker => worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker)
        })
        if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting)
        registration.addEventListener('updatefound', () => watch(registration.installing))
        // Check for a new version whenever the app comes back to the foreground.
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') registration.update().catch(() => {}) })
      }).catch(error => console.error('[pwa] service worker', error))
      // A tapped notification asks the open app to show a page.
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type !== 'OPEN_URL') return
        const target = new URL(event.data.url, window.location.origin)
        const view = target.searchParams.get('view')
        if (target.pathname === window.location.pathname && view) window.dispatchEvent(new CustomEvent('ehs:navigate', { detail: view }))
        else window.location.assign(target.href)
      })
      let reloading = false
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; window.location.reload() } })
    }
    return () => { unsubscribe(); window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline) }
  }, [])

  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {} setInstallable(false); setIosHint(false) }

  return (
    <>
      {offline && <div className="pwa-offline" role="status">You're offline. Changes will save when you reconnect.</div>}
      {waiting && (
        <div className="pwa-bar" role="status">
          <span>A new version of EHS Studio is ready.</span>
          <button className="pwa-primary" onClick={() => waiting.postMessage('SKIP_WAITING')}>Reload</button>
        </div>
      )}
      {!waiting && installable && (
        <div className="pwa-bar" role="dialog" aria-label="Install app">
          <img src="/api/app-icon/icon-192.png" alt="" />
          <span><strong>Install EHS Studio</strong><br />Open it from your home screen like an app.</span>
          <button onClick={dismiss}>Not now</button>
          <button className="pwa-primary" onClick={async () => { const outcome = await promptInstall(); if (outcome !== 'accepted') dismiss() }}>Install</button>
        </div>
      )}
      {!waiting && !installable && iosHint && (
        <div className="pwa-bar" role="dialog" aria-label="Install app">
          <img src="/api/app-icon/icon-192.png" alt="" />
          <span><strong>Install EHS Studio</strong><br />Tap <b>Share</b> <span aria-hidden="true">⎋</span> then <b>Add to Home Screen</b>.</span>
          <button onClick={dismiss}>Got it</button>
        </div>
      )}
    </>
  )
}
