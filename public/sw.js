/* EHS Studio Manager service worker.
 *
 * - App pages ("/", "/login"): network first, last good copy or the
 *   offline page when there's no connection.
 * - Build assets (/_next/static, /icons, fonts) and logo app icons
 *   (/api/app-icon/…?v=…): cache first — their URLs change whenever their
 *   content does, so cached copies never go stale.
 * - Everything else (API, client links like /invoice, /chat, /sign,
 *   /quote, /questionnaire, /booking, /contact): straight to the network,
 *   never cached, so private client data is never stored on the device.
 *
 * Bump VERSION to drop old caches.
 */
const VERSION = 'ehs-v3'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png']
const APP_PAGES = new Set(['/', '/login'])
const MAX_ASSETS = 200

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(PRECACHE)))
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => !key.startsWith(VERSION)).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})

// The page asks a waiting worker to take over after the user taps "Reload".
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

async function trim(cacheName) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key)
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Google Fonts: cache first.
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request))
    return
  }
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    if (!APP_PAGES.has(url.pathname)) return
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) (await caches.open(SHELL)).put(url.pathname, response.clone())
        return response
      } catch {
        return (await caches.match(url.pathname)) || (await caches.match('/offline.html'))
      }
    })())
    return
  }

  // App icons made from the logo carry a version in their URL.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || (url.pathname.startsWith('/api/app-icon/') && url.searchParams.has('v'))) {
    event.respondWith(cacheFirst(request))
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(ASSETS)
    cache.put(request, response.clone())
    trim(ASSETS)
  }
  return response
}

// ── Push notifications ───────────────────────────────────────────
// The server sends { title, body, url, tag, icon }. Tapping opens (or
// focuses) the app on that page.
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() } }
  event.waitUntil(self.registration.showNotification(data.title || 'EHS Studio', {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag,
    renotify: !!data.tag,
    data: { url: data.url || '/' },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const app = windows.find(client => new URL(client.url).origin === self.location.origin)
    if (app) {
      await app.focus()
      app.postMessage({ type: 'OPEN_URL', url: target })
      return
    }
    await self.clients.openWindow(target)
  })())
})
