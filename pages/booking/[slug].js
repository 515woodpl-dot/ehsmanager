import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { DEFAULT_STUDIO, SessionMeta } from './index'
import { money, safeImageUrl, todayInZone } from '../../lib/booking'
import { PinIcon } from '../../components/BookingIcons'
import s from '../../styles/Booking.module.css'

const VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
const addDays = (date, days) => new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10)
const displayTime = value => new Date(`2000-01-01T${value}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const displayDate = value => new Date(value + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
const monthKey = date => date.slice(0, 7)
const shiftMonth = (key, n) => { const [y, m] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` }

// Month calendar: only days inside the booking window, on open weekdays and
// not blocked can be picked. Times for a day are checked when it's chosen.
function Calendar({ value, onChange, minDate, maxDate, openWeekdays, blockedDates }) {
  const [month, setMonth] = useState(monthKey(value || minDate))
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)]
  const open = date => date >= minDate && date <= maxDate && (!openWeekdays || openWeekdays.includes(new Date(date + 'T12:00:00Z').getUTCDay())) && !(blockedDates || []).includes(date)
  return <div>
    <div className={s.calHead}>
      <button type="button" aria-label="Previous month" disabled={month <= monthKey(minDate)} onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
      <span>{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
      <button type="button" aria-label="Next month" disabled={month >= monthKey(maxDate)} onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
    </div>
    <div className={s.cal}>
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <small key={i}>{d}</small>)}
      {cells.map((date, i) => date
        ? <button key={date} type="button" className={`${s.day} ${value === date ? s.dayActive : ''}`} disabled={!open(date)} onClick={() => onChange(date)} aria-label={displayDate(date)} aria-pressed={value === date}>{Number(date.slice(8))}</button>
        : <span key={`b${i}`} />)}
    </div>
  </div>
}

export default function BookingDetail() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
  const [studio, setStudio] = useState(DEFAULT_STUDIO)
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
      if (!response.ok) throw new Error('This service is unavailable.')
      return response.json()
    }).then(payload => {
      setSessionType(payload.sessionType); setTimezone(payload.timezone)
      setBookingWindow(payload.bookingWindow || { noticeDays: 1, horizonDays: 90 })
      if (payload.studio) setStudio(payload.studio)
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [slug])
  useEffect(() => {
    if (!slug || !date) return
    let ignore = false
    setChecking(true); setTime(''); setDiscount(null); setCouponError(''); setError('')
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
      setDone(true); window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) { setError(e.message) } finally { setSending(false) }
  }

  return <div className={s.shell}>
    <Head>
      <title>{sessionType ? `${sessionType.name} | ${studio.name}` : `Book a Meeting | ${studio.name}`}</title>
      <meta name="viewport" content={VIEWPORT} />
      {sessionType?.description && <meta name="description" content={sessionType.description.slice(0, 160)} />}
      {studio.logoUrl && <link rel="icon" href={studio.logoUrl} />}
    </Head>
    <div className={s.wrap}>
      <div className={s.topbar}>
        <Link href="/booking" className={s.topbrand}>{studio.logoUrl && <img src={studio.logoUrl} alt="" />}{studio.name}</Link>
        <Link href="/booking" className={s.back}>← All services</Link>
      </div>
      {done ? <div className={s.success}>
        <div className={s.successMark}>✓</div>
        <h1>Your request is in</h1>
        <p>Thank you, {person.name.split(' ')[0]}! Your <strong>{sessionType?.name}</strong> request for {displayDate(date)} at {displayTime(time)} has been received. We'll be in touch at {person.email} to confirm the details. No payment was collected.</p>
        <p><Link href="/booking">See all services</Link></p>
      </div>
        : loading ? <div className={s.empty}>Loading…</div>
        : !sessionType ? <div className={s.empty}>{error || 'This service is unavailable.'} <Link href="/booking">See all services</Link></div>
        : <div className={s.detail}>
          <div className={s.detailCopy}>
            <div className={s.detailArt} style={{ '--tone': sessionType.color || '#e8d7cf' }}>{safeImageUrl(sessionType.imageUrl) && <img src={safeImageUrl(sessionType.imageUrl)} alt="" />}</div>
            <h1>{sessionType.name}</h1>
            <SessionMeta item={sessionType} />
            {sessionType.location && <div className={s.meta} style={{ marginTop: -14, marginBottom: 26 }}><span><PinIcon />{sessionType.location}</span></div>}
            <div className={s.description}>{sessionType.description}</div>
          </div>
          <form className={s.bookingCard} onSubmit={submit}>
            <h2>Book this meeting</h2>
            <p>Pick a day and time, then tell us how to reach you.</p>
            <div className={s.step}>1 · Choose a date</div>
            <Calendar value={date} onChange={setDate} minDate={minDate} maxDate={maxDate} openWeekdays={bookingWindow.openWeekdays} blockedDates={bookingWindow.blockedDates} />
            {date && <>
              <div className={s.step}>2 · Choose a time · {displayDate(date)}</div>
              {checking ? <p className={s.hint}>Checking times…</p>
                : slots.length ? <div className={s.slots}>{slots.map(slot => <button type="button" key={slot} className={`${s.slot} ${time === slot ? s.slotActive : ''}`} onClick={() => setTime(slot)}>{displayTime(slot)}</button>)}</div>
                : <p className={s.hint}>No times left on this day. Please choose another date.</p>}
              <p className={s.hint}>Times are in {timezone.replace('America/New_York', 'Eastern time').replaceAll('_', ' ')}.</p>
            </>}
            <div className={s.step}>{date ? '3' : '2'} · Your information</div>
            <div className={s.field}><label htmlFor="booking-name">Full name</label><input id="booking-name" autoComplete="name" value={person.name} maxLength={120} onChange={e => setPerson({ ...person, name: e.target.value })} required /></div>
            <div className={s.fieldrow}>
              <div className={s.field}><label htmlFor="booking-email">Email</label><input id="booking-email" type="email" autoComplete="email" value={person.email} maxLength={254} onChange={e => setPerson({ ...person, email: e.target.value })} required /></div>
              <div className={s.field}><label htmlFor="booking-phone">Phone</label><input id="booking-phone" type="tel" autoComplete="tel" value={person.phone} maxLength={40} onChange={e => setPerson({ ...person, phone: e.target.value })} /></div>
            </div>
            <div className={s.step}>Discount or gift card</div>
            <div className={s.coupon}><input aria-label="Discount code" placeholder="Enter code" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setDiscount(null); setCouponError('') }} /><button type="button" onClick={applyCode}>Apply</button></div>
            {couponError && <div className={s.error}>{couponError}</div>}
            <div className={s.priceLine} style={{ marginTop: 18 }}><span>Price</span><span>{money(sessionType.price)}</span></div>
            {discount != null && <div className={s.priceLine}><span>Discount</span><span>−{money(discount)}</span></div>}
            <div className={s.priceTotal}><span>Total</span><span>{money(sessionType.price - (discount || 0))}</span></div>
            <p className={s.hint}>This sends a booking request. We'll confirm the time by email — nothing is charged now.</p>
            {error && <div className={s.error} role="alert">{error}</div>}
            <button className={s.submit} type="submit" disabled={!time || sending}>{sending ? 'Sending…' : time ? `Request ${displayTime(time)}` : 'Choose a date and time'}</button>
          </form>
        </div>}
    </div>
    <footer className={s.footer}>{studio.name}</footer>
  </div>
}
