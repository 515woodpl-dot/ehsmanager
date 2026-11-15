import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { durationLabel, money, publicBookingBase, safeImageUrl } from '../../lib/booking'
import { businessTerms } from '../../lib/businessTypes'
import s from '../../styles/Booking.module.css'

// `business` is { name, type } from /api/public-booking. Until it loads the
// header shows no name rather than someone else's.
export function BookingHeader({ business }) {
  const terms = businessTerms(business?.type)
  return <header className={s.top}>
    <Link className={s.brand} href="/booking">{(business?.name || '').toUpperCase() || '\u00a0'}<span>{business ? terms.descriptor.toUpperCase() : '\u00a0'}</span></Link>
    <nav className={s.topnav}><Link href="/booking#collections">{terms.booking.nav}</Link><Link href="/booking#how-it-works">How it works</Link><Link className={s.navButton} href="/contact">Get in touch</Link></nav>
  </header>
}

export function BookingFooter({ business }) {
  const terms = businessTerms(business?.type)
  return <footer className={s.footer}><p>{terms.booking.footer}</p><span>{[business?.name, terms.descriptor].filter(Boolean).join(' · ').toUpperCase()}</span></footer>
}

export default function BookingLanding() {
  const [sessionTypes, setSessionTypes] = useState([])
  const [category, setCategory] = useState('')
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    fetch('/api/public-booking').then(async response => {
      if (!response.ok) throw new Error('Booking catalog unavailable')
      return response.json()
    }).then(payload => { setSessionTypes(payload.sessionTypes || []); setBusiness(payload.business || null) })
      .catch(() => { setSessionTypes([]); setPreview(true) })
      .finally(() => setLoading(false))
  }, [])
  const terms = businessTerms(business?.type)
  const copy = terms.booking
  const name = business?.name || ''
  const categories = useMemo(() => ['', ...new Set(sessionTypes.map(item => item.category).filter(Boolean))], [sessionTypes])
  const visible = sessionTypes.filter(item => !category || item.category === category)
  const base = publicBookingBase()
  return <div className={s.shell}>
    <Head><title>{[copy.title, name].filter(Boolean).join(' | ')}</title><meta name="description" content={copy.description(name || 'us')} /><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <BookingHeader business={business} />
    {preview && <div className={s.notice}>Booking is temporarily unavailable. Please try again shortly.</div>}
    <main>
      <section className={s.hero}>
        <div><div className={s.eyebrow}>{copy.eyebrow}</div><h1>{copy.headline}</h1><p>{copy.intro}</p><a href="#collections" className={s.navButton} style={{ display: 'inline-block', marginTop: 20, background: '#1fb89c', color: '#fff', textDecoration: 'none', padding: '15px 25px', fontSize: 12, fontWeight: 700, letterSpacing: '.06em' }}>{copy.cta}</a></div>
        <div className={s.heroArt} aria-hidden="true" data-caption={copy.heroCaption}><span className={s.star}>✳</span></div>
      </section>
      <section id="collections" className={s.section}><div className={s.inner}>
        <div className={s.sectionHead}><div><div className={s.eyebrow}>{copy.sectionEyebrow}</div><h2>{copy.sectionTitle}</h2></div><p>{copy.sectionIntro}</p></div>
        <div className={s.filters}>{categories.map(label => <button key={label || 'all'} type="button" className={`${s.filter} ${category === label ? s.filterActive : ''}`} onClick={() => setCategory(label)}>{label || copy.all}</button>)}</div>
        {loading ? <div className={s.empty}>Loading…</div> : visible.length ? <div className={s.grid}>{visible.map(item => <Link key={item.id} href={`${base}/${item.slug}`} className={s.card}>
          <div className={s.cardArt} style={{ '--tone': item.color || '#bfd6cb' }}>{safeImageUrl(item.imageUrl) ? <img src={safeImageUrl(item.imageUrl)} alt="" /> : <span>{item.category}</span>}</div>
          <div className={s.cardBody}><div className={s.category}>{item.category}</div><h3>{item.name}</h3><p>{item.description || copy.cardFallback}</p><div className={s.cardFoot}><div><small>{durationLabel(item.durationMinutes)} · {copy.cardMeta}</small><strong>{item.price > 0 ? money(item.price) : 'Free'}</strong></div><b>VIEW DETAILS ↗</b></div></div>
        </Link>)}</div> : <div className={s.empty}>{copy.empty}</div>}
      </div></section>
      <section id="how-it-works" className={s.steps}><div className={s.inner}>{copy.steps.map(([number,title,body]) => <div key={number}><div className={s.stepIndex}>{number}</div><h3>{title}</h3><p>{body}</p></div>)}</div></section>
    </main><BookingFooter business={business} />
  </div>
}
