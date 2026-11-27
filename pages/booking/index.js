import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { durationLabel, money, publicBookingBase, safeImageUrl } from '../../lib/booking'
import s from '../../styles/Booking.module.css'

export function BookingHeader() {
  return <header className={s.top}>
    <Link className={s.brand} href="/booking">515STUDIO<span>STRATEGY · WEB · MARKETING · SEO</span></Link>
    <nav className={s.topnav}><Link href="/booking#collections">Collections</Link><Link href="/booking#how-it-works">How it works</Link><Link className={s.navButton} href="/contact">Get in touch</Link></nav>
  </header>
}

export default function BookingLanding() {
  const [sessionTypes, setSessionTypes] = useState([])
  const [category, setCategory] = useState('All services')
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    fetch('/api/public-booking').then(async response => {
      if (!response.ok) throw new Error('Booking catalog unavailable')
      return response.json()
    }).then(payload => setSessionTypes(payload.sessionTypes || []))
      .catch(() => { setSessionTypes([]); setPreview(true) })
      .finally(() => setLoading(false))
  }, [])
  const categories = useMemo(() => ['All services', ...new Set(sessionTypes.map(item => item.category).filter(Boolean))], [sessionTypes])
  const visible = sessionTypes.filter(item => category === 'All services' || item.category === category)
  const base = publicBookingBase()
  return <div className={s.shell}>
    <Head><title>Book a Call | 515Studio</title><meta name="description" content="Book a discovery call or consultation with 515Studio: strategy, web development, digital marketing and SEO." /><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <BookingHeader />
    {preview && <div className={s.notice}>Booking is temporarily unavailable. Please try again shortly.</div>}
    <main>
      <section className={s.hero}>
        <div><div className={s.eyebrow}>Let's talk about your project</div><h1>Book a call with 515Studio.</h1><p>Pick the kind of conversation you need, choose a time that works for you, and we will come prepared with ideas for your strategy, website, marketing or search growth.</p><a href="#collections" className={s.navButton} style={{ display: 'inline-block', marginTop: 20, background: '#1fb89c', color: '#fff', textDecoration: 'none', padding: '15px 25px', fontSize: 12, fontWeight: 700, letterSpacing: '.06em' }}>CHOOSE A CALL ↓</a></div>
        <div className={s.heroArt} aria-hidden="true"><span className={s.star}>✳</span></div>
      </section>
      <section id="collections" className={s.section}><div className={s.inner}>
        <div className={s.sectionHead}><div><div className={s.eyebrow}>Strategy to launch</div><h2>Choose a conversation</h2></div><p>From first idea to launch, pick the call that fits where your project is today.</p></div>
        <div className={s.filters}>{categories.map(label => <button key={label} type="button" className={`${s.filter} ${category === label ? s.filterActive : ''}`} onClick={() => setCategory(label)}>{label}</button>)}</div>
        {loading ? <div className={s.empty}>Loading…</div> : visible.length ? <div className={s.grid}>{visible.map(item => <Link key={item.id} href={`${base}/${item.slug}`} className={s.card}>
          <div className={s.cardArt} style={{ '--tone': item.color || '#bfd6cb' }}>{safeImageUrl(item.imageUrl) ? <img src={safeImageUrl(item.imageUrl)} alt="" /> : <span>{item.category}</span>}</div>
          <div className={s.cardBody}><div className={s.category}>{item.category}</div><h3>{item.name}</h3><p>{item.description || 'A focused conversation about your goals and next steps.'}</p><div className={s.cardFoot}><div><small>{durationLabel(item.durationMinutes)} · Video call</small><strong>{money(item.price)}</strong></div><b>VIEW DETAILS ↗</b></div></div>
        </Link>)}</div> : <div className={s.empty}>Booking is opening soon. In the meantime, get in touch at 515studio.net and we will set up a time.</div>}
      </div></section>
      <section id="how-it-works" className={s.steps}><div className={s.inner}>{[
        ['01','Choose a call','Browse the options and pick the conversation that fits your project.'],
        ['02','Pick a time','See available dates and request a time that works for you.'],
        ['03','Make it yours','We will confirm the details and prepare for the conversation.'],
      ].map(([number,title,body]) => <div key={number}><div className={s.stepIndex}>{number}</div><h3>{title}</h3><p>{body}</p></div>)}</div></section>
    </main><footer className={s.footer}><p>Let's build something that works.</p><span>515STUDIO · STRATEGY · WEB · MARKETING · SEO</span></footer>
  </div>
}
