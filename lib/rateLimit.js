// A small per-connection limit for public forms (contact, booking), to slow
// down spam. Counts live in this server process, so a restart resets them;
// that's enough for one server. Returns true when the caller is over the limit.
const hits = new Map()

// The visitor's address. X-Forwarded-For is only believed when the request
// comes from this machine (the HTTPS proxy, Caddy, in front of the app), and
// then only its last entry, which the proxy adds itself: entries a visitor
// writes into the header come before it and are ignored.
function clientKey(req) {
  const remote = String(req.socket?.remoteAddress || '').replace(/^::ffff:/, '')
  const local = remote === '127.0.0.1' || remote === '::1'
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(part => part.trim()).filter(Boolean)
  return (local && forwarded.length ? forwarded[forwarded.length - 1] : remote) || 'unknown'
}

export function tooMany(req, bucket, limit, windowMs) {
  const now = Date.now()
  const key = `${bucket}:${clientKey(req)}`
  const recent = (hits.get(key) || []).filter(at => now - at < windowMs)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) for (const [k, list] of hits) if (!list.some(at => now - at < windowMs)) hits.delete(k)
  return recent.length > limit
}
