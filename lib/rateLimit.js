// A small per-connection limit for public forms (contact, booking), to slow
// down spam. Counts live in this server process, so a restart resets them;
// that's enough for one server. Returns true when the caller is over the limit.
const hits = new Map()

function clientKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return forwarded || req.socket?.remoteAddress || 'unknown'
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
