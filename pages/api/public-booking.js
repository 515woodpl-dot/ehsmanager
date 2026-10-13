import { createServiceClient } from '../../lib/pibase'
import { availableSlots, discountAmount, safeImageUrl, validDate } from '../../lib/booking'
import { rateLimit } from '../../lib/rateLimit'

const publicType = row => ({
  id: row.id, name: row.name, slug: row.slug, category: row.category,
  description: row.description || '', imageUrl: safeImageUrl(row.image_url),
  durationMinutes: row.duration_minutes, price: Number(row.price),
  location: row.location || '', color: row.color || '#17bda5', sortOrder: row.sort_order || 0,
})
const clean = (value, length) => typeof value === 'string' ? value.trim().slice(0, length) : ''

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })
  // Code quotes are throttled so coupon and gift-card codes can't be brute-forced.
  if (req.method === 'POST' && req.body?.action === 'quote' && !rateLimit(req, res, { key: 'booking-quote', limit: 15, windowMs: 10 * 60 * 1000 })) return
  if (req.method === 'POST' && req.body?.action !== 'quote' && !rateLimit(req, res, { key: 'booking-create', limit: 5, windowMs: 10 * 60 * 1000 })) return
  const ownerId = process.env.STUDIO_OWNER_USER_ID
  const db = createServiceClient()
  if (!ownerId || !db) return res.status(503).json({ error: 'Booking is not configured yet' })
  try {
    const { data: settings, error: settingsError } = await db.from('studio_settings').select('availability').eq('user_id', ownerId).single()
    if (settingsError || !settings) return res.status(503).json({ error: 'Booking settings are unavailable' })
    const availability = settings.availability
    if (req.method === 'POST' && req.body?.action === 'quote') {
      const slug = clean(req.body.slug, 120), date = clean(req.body.date, 10)
      const code = clean(req.body.code, 40).toUpperCase()
      if (!slug || !validDate(date) || !code) return res.status(400).json({ error: 'Choose a session, date and code' })
      const [{ data: type }, { data: discount }] = await Promise.all([
        db.from('session_catalog').select('price').eq('user_id', ownerId).eq('slug', slug).eq('public', true).single(),
        db.from('discount_codes').select('*').eq('user_id', ownerId).eq('code', code).single(),
      ])
      if (!type) return res.status(404).json({ error: 'Session type not found' })
      const amount = discountAmount({ ...discount, startsOn: discount?.starts_on, endsOn: discount?.ends_on, maxUses: discount?.max_uses }, Number(type.price), date)
      if (amount == null) return res.status(400).json({ error: 'Discount code is invalid or expired' })
      return res.status(200).json({ discountAmount: amount, total: Math.max(0, Number(type.price) - amount) })
    }
    if (req.method === 'GET') {
      const slug = clean(req.query.slug, 120)
      const date = clean(req.query.date, 10)
      const query = db.from('session_catalog').select('*').eq('user_id', ownerId).eq('public', true).order('sort_order', { ascending: true })
      const { data: rows, error } = slug ? await query.eq('slug', slug) : await query
      if (error) throw error
      const sessionTypes = (rows || []).map(publicType)
      const bookingWindow = { noticeDays: availability?.noticeDays ?? 1, horizonDays: availability?.horizonDays ?? 90 }
      if (!slug) return res.status(200).json({ sessionTypes, timezone: availability?.timezone || 'America/New_York', bookingWindow })
      if (!sessionTypes.length) return res.status(404).json({ error: 'Session type not found' })
      if (!date) return res.status(200).json({ sessionType: sessionTypes[0], timezone: availability?.timezone || 'America/New_York', bookingWindow })
      if (!validDate(date)) return res.status(400).json({ error: 'Invalid date' })
      const { data: bookings, error: bookingsError } = await db.from('bookings').select('date,time,duration_minutes,status').eq('user_id', ownerId).eq('date', date)
      if (bookingsError) throw bookingsError
      return res.status(200).json({ sessionType: sessionTypes[0], slots: availableSlots(date, sessionTypes[0], availability, (bookings || []).map(row => ({ ...row, durationMinutes: row.duration_minutes }))), timezone: availability?.timezone || 'America/New_York', bookingWindow })
    }

    const { slug, date, time, name, email, phone, code } = req.body || {}
    const safeSlug = clean(slug, 120), safeDate = clean(date, 10), safeTime = clean(time, 5)
    const safeName = clean(name, 120), safeEmail = clean(email, 254).toLowerCase(), safePhone = clean(phone, 40)
    const safeCode = clean(code, 40).toUpperCase()
    if (!safeSlug || !validDate(safeDate) || !safeTime || !safeName || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(safeEmail)) return res.status(400).json({ error: 'Complete the session, date, time, name and email fields' })
    const { data: row, error: typeError } = await db.from('session_catalog').select('*').eq('user_id', ownerId).eq('slug', safeSlug).eq('public', true).single()
    if (typeError || !row) return res.status(404).json({ error: 'Session type not found' })
    const type = publicType(row)
    const { data: bookings, error: bookingsError } = await db.from('bookings').select('date,time,duration_minutes,status').eq('user_id', ownerId).eq('date', safeDate)
    if (bookingsError) throw bookingsError
    const slots = availableSlots(safeDate, type, availability, (bookings || []).map(item => ({ ...item, durationMinutes: item.duration_minutes })))
    if (!slots.includes(safeTime)) return res.status(409).json({ error: 'That time is no longer available' })
    if (safeCode) {
      const { data: discount, error: discountError } = await db.from('discount_codes').select('*').eq('user_id', ownerId).eq('code', safeCode).single()
      if (discountError || discountAmount({ ...discount, startsOn: discount?.starts_on, endsOn: discount?.ends_on, maxUses: discount?.max_uses, balance: discount?.balance }, type.price, safeDate) == null) return res.status(400).json({ error: 'Discount code is invalid or expired' })
    }
    const { data: bookingId, error: bookingError } = await db.rpc('create_public_booking', {
      p_user_id: ownerId, p_session_id: type.id, p_date: safeDate, p_time: safeTime,
      p_name: safeName, p_email: safeEmail, p_phone: safePhone, p_discount_code: safeCode || null,
    })
    if (bookingError) {
      if (bookingError.code === '23505') return res.status(409).json({ error: 'That time was just booked. Choose another.' })
      console.error('[public-booking] reservation failed', bookingError)
      if (/discount|gift card/i.test(bookingError.message || '')) return res.status(409).json({ error: 'That discount is no longer available. Review your total and try again.' })
      return res.status(500).json({ error: 'Unable to reserve this session right now' })
    }
    return res.status(201).json({ ok: true, bookingId })
  } catch (error) {
    console.error('[public-booking]', error)
    return res.status(500).json({ error: 'Booking is temporarily unavailable' })
  }
}
