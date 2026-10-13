import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { DEMO_SESSION_CATALOG } from '../../lib/data'
import { durationLabel, money, publicBookingBase, safeImageUrl } from '../../lib/booking'
import s from '../../styles/Booking.module.css'

export function BookingHeader() {
  return <header className={s.top}>
    <Link className={s.brand} href="/booking">ELLIE'S HEARTSTRINGS<span>PHOTOGRAPHY</span></Link>
    <nav className={s.topnav}><Link href="/booking#collections">Collections</Link><Link href="/booking#how-it-works">How it works</Link><Link className={s.navButton} href="/contact">Get in touch</Link></nav>
  </header>
}

export default function BookingLanding() {
  const [sessionTypes, setSessionTypes] = useState([])
  const [category, setCategory] = useState('All sessions')
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    fetch('/api/public-booking').then(async response => {
      if (!response.ok) throw new Error('Booking catalog unavailable')
      return response.json()
    }).then(payload => setSessionTypes(payload.sessionTypes || []))
      .catch(() => { setSessionTypes(process.env.NEXT_PUBLIC_SUPABASE_URL ? [] : DEMO_SESSION_CATALOG); setPreview(true) })
      .finally(() => setLoading(false))
  }, [])
  const categories = useMemo(() => ['All sessions', ...new Set(sessionTypes.map(item => item.category).filter(Boolean))], [sessionTypes])
  const visible = sessionTypes.filter(item => category === 'All sessions' || item.category === category)
  const base = publicBookingBase()
  return <div className={s.shell}>
    <Head><title>Book a Photography Session | Ellie's Heartstrings</title><meta name="description" content="Explore portrait, maternity, milestone and family photography sessions with Ellie's Heartstrings." /><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <BookingHeader />
    {preview && <div className={s.notice}>{process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Booking is temporarily unavailable. Please try again shortly.' : 'Preview catalog · Connect PIBASE and publish session types to accept bookings.'}</div>}
    <main>
      <section className={s.hero}>
        <div><div className={s.eyebrow}>Photography sessions made personal</div><h1>Hold on to the moments that matter.</h1><p>Every season deserves to be remembered. Explore a collection of thoughtful portrait experiences, choose the one that feels like you, and request a time that fits your life.</p><a href="#collections" className={s.navButton} style={{ display: 'inline-block', marginTop: 20, background: '#1fb89c', color: '#fff', textDecoration: 'none', padding: '15px 25px', fontSize: 12, fontWeight: 700, letterSpacing: '.06em' }}>EXPLORE SESSIONS ↓</a></div>
        <div className={s.heroArt} aria-hidden="true"><span className={s.star}>✳</span></div>
      </section>
      <section id="collections" className={s.section}><div className={s.inner}>
        <div className={s.sectionHead}><div><div className={s.eyebrow}>Your story, beautifully told</div><h2>Choose your experience</h2></div><p>From the first hello to every little milestone, find a session that makes room for what matters most.</p></div>
        <div className={s.filters}>{categories.map(label => <button key={label} type="button" className={`${s.filter} ${category === label ? s.filterActive : ''}`} onClick={() => setCategory(label)}>{label}</button>)}</div>
        {loading ? <div className={s.empty}>Loading sessions…</div> : visible.length ? <div className={s.grid}>{visible.map(item => <Link key={item.id} href={`${base}/${item.slug}`} className={s.card}>
          <div className={s.cardArt} style={{ '--tone': item.color || '#bfd6cb' }}>{safeImageUrl(item.imageUrl) ? <img src={safeImageUrl(item.imageUrl)} alt="" /> : <span>{item.category}</span>}</div>
          <div className={s.cardBody}><div className={s.category}>{item.category}</div><h3>{item.name}</h3><p>{item.description || 'A photography experience made for this moment.'}</p><div className={s.cardFoot}><div><small>{durationLabel(item.durationMinutes)} · Full session</small><strong>{money(item.price)}</strong></div><b>VIEW DETAILS ↗</b></div></div>
        </Link>)}</div> : <div className={s.empty}>New collections are coming soon. Check back shortly or get in touch to plan your session.</div>}
      </div></section>
      <section id="how-it-works" className={s.steps}><div className={s.inner}>{[
        ['01','Find your session','Browse the collections and choose the experience that fits your story.'],
        ['02','Pick a time','See available dates and request a time that works for you.'],
        ['03','Make it yours','We will confirm the details and get ready to create something lovely.'],
      ].map(([number,title,body]) => <div key={number}><div className={s.stepIndex}>{number}</div><h3>{title}</h3><p>{body}</p></div>)}</div></section>
    </main><footer className={s.footer}><p>Let's make something beautiful.</p><span>ELLIE'S HEARTSTRINGS · PHOTOGRAPHY</span></footer>
  </div>
}
