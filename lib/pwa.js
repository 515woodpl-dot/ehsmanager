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
