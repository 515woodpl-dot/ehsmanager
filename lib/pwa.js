// Install + update state for the installable app (PWA), shared by the
// install banner and the Settings page.
let deferredPrompt = null
const listeners = new Set()
const notify = () => listeners.forEach(fn => fn())

export const isStandalone = () => typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)
export const isIOS = () => typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }
export const canPromptInstall = () => !!deferredPrompt

export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable'
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null; notify()
  return outcome
}

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event; notify() })
  window.addEventListener('appinstalled', () => { deferredPrompt = null; notify() })
}

// ── Push notifications ───────────────────────────────────────────
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const toKey = base64 => {
  const padded = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

export function deviceName() {
  const ua = navigator.userAgent
  const os = /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iPad' : /android/i.test(ua) ? 'Android' : /mac/i.test(ua) ? 'Mac' : /windows/i.test(ua) ? 'Windows' : 'Computer'
  const browser = /edg\//i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Browser'
  return `${os} · ${browser}${isStandalone() ? ' (app)' : ''}`
}

export async function currentSubscription() {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

// Asks permission and subscribes this device; returns the subscription.
export async function subscribePush(publicKey) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Notifications are blocked for this site. Allow them in your browser or phone settings, then try again.' : 'Notifications were not allowed')
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) })
}
