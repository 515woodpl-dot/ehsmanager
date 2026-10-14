/* EHS Studio Manager service worker.
 *
 * - App pages ("/", "/login"): network first, last good copy or the
 *   offline page when there's no connection.
 * - Build assets (/_next/static, /icons, fonts): cache first — their
 *   file names change on every deploy, so cached copies never go stale.
 * - Everything else (API, client links like /invoice, /chat, /sign,
 *   /quote, /questionnaire, /booking, /contact): straight to the network,
 *   never cached, so private client data is never stored on the device.
 *
 * Bump VERSION to drop old caches.
 */
const VERSION = 'ehs-v1'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest']
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

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
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
