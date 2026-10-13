import { DEFAULT_AVAILABILITY } from './data'

export const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0)
export const durationLabel = minutes => minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `${minutes} minutes`
export const safeImageUrl = value => {
  const url = String(value || '').trim()
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try { return new URL(url).protocol === 'https:' ? url : '' } catch { return '' }
}
export const publicBookingBase = () => {
  const configured = process.env.NEXT_PUBLIC_BOOKING_URL?.replace(/\/$/, '')
  if (configured) return `${configured}/booking`
  return typeof window === 'undefined' ? '/booking' : `${window.location.origin}/booking`
}

export function availabilitySettings(value) {
  const source = value && typeof value === 'object' ? value : {}
  return { ...DEFAULT_AVAILABILITY, ...source, weekdays: { ...DEFAULT_AVAILABILITY.weekdays, ...(source.weekdays || {}) }, blockedDates: Array.isArray(source.blockedDates) ? source.blockedDates : [], blockedTimes: Array.isArray(source.blockedTimes) ? source.blockedTimes : [] }
}

export function todayInZone(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
    const part = name => parts.find(item => item.type === name)?.value
    return `${part('year')}-${part('month')}-${part('day')}`
  } catch { return new Date().toISOString().slice(0, 10) }
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false
  const date = new Date(value + 'T12:00:00Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const minutes = value => {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''))
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN
}
const hhmm = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`

export function availableSlots(date, session, availability, bookings = []) {
  const settings = availabilitySettings(availability)
  if (!validDate(date) || !session?.durationMinutes) return []
  const today = todayInZone(settings.timezone)
  const dayNumber = Date.parse(date + 'T12:00:00Z')
  const offset = Math.round((dayNumber - Date.parse(today + 'T12:00:00Z')) / 86400000)
  if (offset < Math.max(0, Number(settings.noticeDays) || 0) || offset > Math.min(365, Number(settings.horizonDays) || 90)) return []
  if (settings.blockedDates.some(item => (typeof item === 'string' ? item : item.date) === date)) return []
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay()
  const ranges = settings.weekdays?.[weekday] || []
  const duration = Number(session.durationMinutes)
  const buffer = Math.max(0, Math.min(120, Number(settings.bufferMinutes) || 0))
  const occupied = bookings.filter(booking => booking.date === date && booking.status !== 'canceled' && booking.time)
    .map(booking => ({ start: minutes(booking.time), end: minutes(booking.time) + (Number(booking.durationMinutes) || 60) + buffer }))
  for (const block of settings.blockedTimes) if (block.date === date && Number.isFinite(minutes(block.start)) && Number.isFinite(minutes(block.end))) occupied.push({ start: minutes(block.start), end: minutes(block.end) })
  let currentMinute = -1
  if (date === today) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
      currentMinute = Number(parts.find(part => part.type === 'hour')?.value) * 60 + Number(parts.find(part => part.type === 'minute')?.value)
    } catch { currentMinute = new Date().getHours() * 60 + new Date().getMinutes() }
  }
  const slots = []
  for (const range of ranges) {
    const start = minutes(range.start), end = minutes(range.end)
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    for (let slot = start; slot + duration <= end; slot += 30) {
      if (slot > currentMinute && !occupied.some(busy => slot < busy.end && slot + duration + buffer > busy.start)) slots.push(hhmm(slot))
    }
  }
  return [...new Set(slots)]
}

export function discountAmount(discount, price, date) {
  if (!discount || !discount.active || !validDate(date)) return null
  if (discount.startsOn && discount.startsOn > date) return null
  if (discount.endsOn && discount.endsOn < date) return null
  if (discount.maxUses != null && discount.uses >= discount.maxUses) return null
  if (discount.kind === 'gift_card') {
    if (!(Number(discount.balance) > 0)) return null
    return Math.min(Number(price), Number(discount.balance))
  }
  const amount = discount.mode === 'percent' ? Math.round(Number(price) * Number(discount.amount)) / 100 : Number(discount.amount)
  return Math.min(Number(price), Math.max(0, amount))
}
