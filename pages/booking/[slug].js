import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { BookingHeader } from './index'
import { durationLabel, money, safeImageUrl, todayInZone } from '../../lib/booking'
import s from '../../styles/Booking.module.css'

const addDays = (date, days) => new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10)
const displayTime = value => new Date(`2000-01-01T${value}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export default function BookingDetail() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
  const [sessionType, setSessionType] = useState(null)
  const [timezone, setTimezone] = useState('America/New_York')
  const [bookingWindow, setBookingWindow] = useState({ noticeDays: 1, horizonDays: 90 })
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [time, setTime] = useState('')
  const [person, setPerson] = useState({ name: '', email: '', phone: '' })
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!slug) return
    fetch(`/api/public-booking?slug=${encodeURIComponent(slug)}`).then(async response => {
      if (!response.ok) throw new Error('This session is unavailable.')
      return response.json()
    }).then(payload => { setSessionType(payload.sessionType); setTimezone(payload.timezone); setBookingWindow(payload.bookingWindow || { noticeDays: 1, horizonDays: 90 }) })
      .catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [slug])
  useEffect(() => {
    if (!slug || !date) return
    let ignore = false
    setChecking(true); setTime(''); setDiscount(null); setCouponError('')
    fetch(`/api/public-booking?slug=${encodeURIComponent(slug)}&date=${encodeURIComponent(date)}`).then(async response => {
      if (!response.ok) throw new Error('Could not load times.')
      return response.json()
    }).then(payload => { if (!ignore) setSlots(payload.slots || []) }).catch(e => { if (!ignore) { setSlots([]); setError(e.message) } }).finally(() => { if (!ignore) setChecking(false) })
    return () => { ignore = true }
  }, [slug, date])
  const today = useMemo(() => todayInZone(timezone), [timezone])
  const minDate = addDays(today, Math.max(0, Number(bookingWindow.noticeDays) || 0))
  const maxDate = addDays(today, Math.min(365, Number(bookingWindow.horizonDays) || 90))
  const applyCode = async () => {
    setCouponError(''); setDiscount(null)
    if (!code.trim() || !date) { setCouponError('Choose a date and enter a code first.'); return }
    try {
      const response = await fetch('/api/public-booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'quote', slug, date, code: code.trim() }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Code could not be applied')
      setDiscount(payload.discountAmount)
    } catch (e) { setCouponError(e.message) }
  }
  const submit = async event => {
    event.preventDefault(); setError('')
    if (!date || !time) { setError('Choose a date and time.'); return }
    setSending(true)
    try {
      const response = await fetch('/api/public-booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, date, time, ...person, code: discount == null ? '' : code }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to request this session')
      setDone(true)
    } catch (e) { setError(e.message) } finally { setSending(false) }
  }
  return <div className={s.shell}>
    <Head><title>{sessionType ? `${sessionType.name} | Ellie's Heartstrings` : 'Book a Session | Ellie\'s Heartstrings'}</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <BookingHeader />
    <main className={s.detail}>
      <Link href="/booking" className={s.back}>← All sessions</Link>
      {done ? <div className={s.success}><div className={s.successMark}>✓</div><h1>Your request is in.</h1><p>Thanks, {person.name}. Your {sessionType?.name} request for {date} at {displayTime(time)} has been saved.<br />We will be in touch to confirm the details. No payment was collected.</p><Link href="/booking">Explore more sessions</Link></div> : loading ? <div className={s.empty}>Loading session…</div> : !sessionType ? <div className={s.empty}>{error || 'Session not found.'}</div> : <div className={s.detailGrid}>
        <div className={s.detailCopy}><div className={s.detailArt} style={{ '--tone': sessionType.color || '#bfd6cb' }}>{safeImageUrl(sessionType.imageUrl) ? <img src={safeImageUrl(sessionType.imageUrl)} alt="" /> : <span>{sessionType.category}</span>}</div><div className={s.eyebrow} style={{ marginTop: 35 }}>{sessionType.category} · Photography session</div><h1>{sessionType.name}</h1><p>{sessionType.description || 'A session designed around the moments that matter to you.'}</p><div className={s.facts}><span>◷ &nbsp; {durationLabel(sessionType.durationMinutes)}</span><span>⌁ &nbsp; {sessionType.location || 'Location shared after booking'}</span><strong>{money(sessionType.price)}</strong></div><p>Choose a date and time to send your request. We will confirm your session details with you. No payment is collected on this page.</p></div>
        <form className={s.bookingCard} onSubmit={submit}><h2>Request your session</h2><p>Pick a time and tell us how to reach you.</p>
          <div className={s.field}><label htmlFor="booking-date">Date</label><input id="booking-date" type="date" min={minDate} max={maxDate} value={date} onChange={e => { setDate(e.target.value); setError('') }} required /></div>
          {date && <><div className={s.subhead}>Available times · {timezone.replaceAll('_', ' ')}</div>{checking ? <p className={s.hint}>Checking times…</p> : slots.length ? <div className={s.slots}>{slots.map(slot => <button type="button" key={slot} className={`${s.slot} ${time === slot ? s.slotActive : ''}`} onClick={() => setTime(slot)}>{displayTime(slot)}</button>)}</div> : <p className={s.hint}>No times are available on this date. Try another day.</p>}</>}
          <div className={s.subhead}>Your information</div><div className={s.field}><label htmlFor="booking-name">Full name</label><input id="booking-name" value={person.name} maxLength={120} onChange={e => setPerson({ ...person, name: e.target.value })} required /></div><div className={s.fieldrow}><div className={s.field}><label htmlFor="booking-email">Email</label><input id="booking-email" type="email" value={person.email} onChange={e => setPerson({ ...person, email: e.target.value })} required /></div><div className={s.field}><label htmlFor="booking-phone">Phone</label><input id="booking-phone" type="tel" value={person.phone} onChange={e => setPerson({ ...person, phone: e.target.value })} /></div></div>
          <div className={s.subhead}>Discount or gift card</div><div className={`${s.field} ${s.coupon}`}><input aria-label="Discount code" placeholder="Enter code" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setDiscount(null); setCouponError('') }} /><button type="button" onClick={applyCode}>Apply</button></div>{couponError && <div className={s.error}>{couponError}</div>}
          <div className={s.priceLine}><span>Session price</span><span>{money(sessionType.price)}</span></div>{discount != null && <div className={s.priceLine}><span>Discount applied</span><span>−{money(discount)}</span></div>}<div className={s.priceTotal}><span>Estimated total</span><strong>{money(sessionType.price - (discount || 0))}</strong></div><p className={s.hint}>Your booking request reserves this time. Payment arrangements are confirmed separately.</p>
          {error && <div className={s.error} role="alert">{error}</div>}<button className={s.submit} type="submit" disabled={!time || sending}>{sending ? 'Submitting…' : 'Request session →'}</button>
        </form>
      </div>}
    </main><footer className={s.footer}><p>Let's make something beautiful.</p><span>ELLIE'S HEARTSTRINGS · PHOTOGRAPHY</span></footer>
  </div>
}
