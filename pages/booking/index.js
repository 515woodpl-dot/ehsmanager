import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { durationLabel, money, publicBookingBase, safeImageUrl } from '../../lib/booking'
import { ClockIcon, FacebookIcon, InstagramIcon, MailIcon, PriceIcon } from '../../components/BookingIcons'
import s from '../../styles/Booking.module.css'

const VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content'
export const DEFAULT_STUDIO = { name: "Ellie's Heartstrings", welcome: '', email: 'hello@elliesheartstrings.com', instagram: '', facebook: '', logoUrl: '' }

export function SessionMeta({ item }) {
  return <div className={s.meta}>
    <span><ClockIcon />{durationLabel(item.durationMinutes)}</span>
    <span><PriceIcon />{money(item.price)}</span>
  </div>
}

export default function BookingLanding() {
  const [sessionTypes, setSessionTypes] = useState([])
  const [studio, setStudio] = useState(DEFAULT_STUDIO)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    fetch('/api/public-booking').then(async response => {
      if (!response.ok) throw new Error('Booking catalog unavailable')
      return response.json()
    }).then(payload => { setSessionTypes(payload.sessionTypes || []); if (payload.studio) setStudio(payload.studio) })
      .catch(() => { setSessionTypes([]); setUnavailable(true) })
      .finally(() => setLoading(false))
  }, [])
  const base = publicBookingBase()
  return <div className={s.shell}>
    <Head>
      <title>{`Book a Session | ${studio.name}`}</title>
      <meta name="description" content={`Book a portrait, maternity, milestone or family photography session with ${studio.name}.`} />
      <meta name="viewport" content={VIEWPORT} />
      {studio.logoUrl && <link rel="icon" href={studio.logoUrl} />}
    </Head>
    <div className={s.wrap}>
      <div className={s.social}>
        {studio.facebook && <a href={studio.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookIcon /></a>}
        {studio.instagram && <a href={studio.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramIcon /></a>}
      </div>
      <header className={s.hero}>
        {studio.logoUrl && <img className={s.logo} src={studio.logoUrl} alt={`${studio.name} logo`} />}
        <h1 className={s.brandName}>{studio.name}</h1>
        {studio.welcome && <p className={s.welcome}>{studio.welcome}</p>}
        {studio.email && <a className={s.contact} href={`mailto:${studio.email}`}><MailIcon />{studio.email}</a>}
      </header>
      {unavailable && <div className={s.notice}>Booking is temporarily unavailable. Please try again shortly{studio.email ? ` or email ${studio.email}` : ''}.</div>}
      <main>
        {loading ? <div className={s.empty}>Loading sessions…</div>
          : sessionTypes.length ? <div className={s.grid}>{sessionTypes.map(item => (
            <Link key={item.id} href={`${base}/${item.slug}`} className={s.card}>
              <div className={s.cardArt} style={{ '--tone': item.color || '#e8d7cf' }}>{safeImageUrl(item.imageUrl) ? <img src={safeImageUrl(item.imageUrl)} alt="" loading="lazy" /> : <span>{item.category}</span>}</div>
              <div className={s.cardBody}>
                <h2>{item.name}</h2>
                <p>{item.description || 'A photography experience made for this moment.'}</p>
                <SessionMeta item={item} />
              </div>
            </Link>
          ))}</div>
          : !unavailable && <div className={s.empty}>New sessions are coming soon.{studio.email ? <> Get in touch at <a href={`mailto:${studio.email}`}>{studio.email}</a> to plan yours.</> : ''}</div>}
      </main>
    </div>
    <footer className={s.footer}>{studio.name}</footer>
  </div>
}
