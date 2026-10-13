// Fixed-window, in-memory rate limiter for the public endpoints. The app runs
// as a single PM2 process, so process memory is a sufficient shared store.
const buckets = new Map()

// Behind nginx, X-Real-IP is set by the proxy. Otherwise trust only the
// right-most X-Forwarded-For hop (the one our proxy appended), never the
// client-supplied left-most entry.
export function clientIp(req) {
  const real = req.headers['x-real-ip']
  if (real) return String(real).trim()
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(part => part.trim()).filter(Boolean)
  return forwarded[forwarded.length - 1] || req.socket?.remoteAddress || 'unknown'
}

export function rateLimit(req, res, { key, limit, windowMs }) {
  const now = Date.now()
  if (buckets.size > 5000) for (const [id, bucket] of buckets) if (bucket.reset <= now) buckets.delete(id)
  const id = `${key}:${clientIp(req)}`
  let bucket = buckets.get(id)
  if (!bucket || bucket.reset <= now) {
    bucket = { count: 0, reset: now + windowMs }
    buckets.set(id, bucket)
  }
  bucket.count += 1
  if (bucket.count <= limit) return true
  res.setHeader('Retry-After', Math.ceil((bucket.reset - now) / 1000))
  res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' })
  return false
}
