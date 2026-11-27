import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { ProposalBody } from '../../lib/proposalMarkdown'
import { pibase } from '../../lib/pibase'
import s from '../../styles/Proposal.module.css'

const VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content'
const TEXT = {
  es: {
    proposal: 'Propuesta', preparedFor: 'Preparada para', by: 'por', accept: 'Aceptar propuesta', acceptTitle: 'Aceptar la propuesta',
    acceptIntro: 'Complete sus datos y lo contactamos para el siguiente paso: la cotización y el contrato. No se cobra nada ahora.',
    name: 'Su nombre', business: 'Nombre del negocio', email: 'Correo electrónico', phone: 'Teléfono', address: 'Dirección', city: 'Ciudad y estado',
    website: 'Página web actual (si tiene)', message: '¿Algo que quiera contarnos? (opcional)', agree: 'Leí la propuesta y la acepto. Entiendo que el siguiente paso es recibir la cotización y el contrato.',
    send: 'Aceptar propuesta', sending: 'Enviando…', thanks: '¡Gracias! Propuesta aceptada', thanksBody: n => `Gracias${n ? `, ${n}` : ''}. Recibimos sus datos y lo contactaremos muy pronto para coordinar los siguientes pasos.`,
    accepted: (who, date) => `Esta propuesta fue aceptada${who ? ` por ${who}` : ''}${date ? ` el ${date}` : ''}.`, questions: '¿Preguntas?', required: 'obligatorio',
    loading: 'Cargando la propuesta…', invalid: 'Este enlace no es válido o la propuesta ya no está disponible.', locale: 'es-US',
    validUntil: d => `Válida hasta el ${d}`, expiredTitle: 'Esta propuesta venció', expiredBody: d => `Era válida hasta el ${d}. Escríbanos y con gusto se la actualizamos.`,
    decline: 'No, gracias', declineTitle: '¿No es para usted?', declineBody: 'Nos ayuda mucho saber por qué. (Opcional)', declinePlaceholder: 'Por ejemplo: el momento no es el adecuado, el precio, ya tengo a alguien…',
    declineSend: 'Rechazar propuesta', declineCancel: 'Volver', declinedTitle: 'Gracias por avisarnos', declinedBody: 'Registramos que no desea seguir adelante por ahora. Si cambia de opinión, puede aceptar la propuesta abajo mientras siga vigente, o escribirnos.',
    changedMind: '¿Cambió de opinión? Acepte la propuesta:',
  },
  en: {
    proposal: 'Proposal', preparedFor: 'Prepared for', by: 'by', accept: 'Accept proposal', acceptTitle: 'Accept the proposal',
    acceptIntro: "Fill in your details and we'll contact you for the next step: the quote and the contract. Nothing is charged now.",
    name: 'Your name', business: 'Business name', email: 'Email', phone: 'Phone', address: 'Address', city: 'City and state',
    website: 'Current website (if any)', message: 'Anything you want to tell us? (optional)', agree: "I've read the proposal and accept it. I understand the next step is receiving the quote and the contract.",
    send: 'Accept proposal', sending: 'Sending…', thanks: 'Thank you! Proposal accepted', thanksBody: n => `Thank you${n ? `, ${n}` : ''}. We've received your details and will contact you very soon to plan the next steps.`,
    accepted: (who, date) => `This proposal was accepted${who ? ` by ${who}` : ''}${date ? ` on ${date}` : ''}.`, questions: 'Questions?', required: 'required',
    loading: 'Loading the proposal…', invalid: 'This link is not valid or the proposal is no longer available.', locale: 'en-US',
    validUntil: d => `Valid until ${d}`, expiredTitle: 'This proposal has expired', expiredBody: d => `It was valid until ${d}. Contact us and we'll gladly update it.`,
    decline: 'No, thanks', declineTitle: 'Not for you?', declineBody: 'It really helps us to know why. (Optional)', declinePlaceholder: "For example: the timing isn't right, the price, I already have someone…",
    declineSend: 'Decline proposal', declineCancel: 'Back', declinedTitle: 'Thanks for letting us know', declinedBody: "We've noted that you don't want to go ahead for now. If you change your mind, you can still accept below while the proposal is valid, or write to us.",
    changedMind: 'Changed your mind? Accept the proposal:',
  },
}

export default function ProposalPage() {
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', business: '', email: '', phone: '', address: '', city: '', website: '', message: '', agree: false, company_website_hp: '' })
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [declined, setDeclined] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    if (!token) return
    const studioCheck = async () => { try { return !!(await pibase?.auth.getSession())?.data?.session } catch { return false } }
    ;(async () => (new URLSearchParams(window.location.search).get('preview') || await studioCheck()) ? '&preview=1' : '')().then(preview =>
    fetch(`/api/public-proposal?token=${encodeURIComponent(token)}${preview}`)).then(async r => {
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'invalid')
      setData(body)
      const p = body.proposal
      setForm(f => ({ ...f, name: p.contactName || '', business: p.prospect || '', email: p.contactEmail || '', phone: p.contactPhone || '' }))
    }).catch(e => setError(e.message))
  }, [token])

  const lang = data?.proposal?.language === 'en' ? 'en' : 'es'
  const t = TEXT[lang]
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString(t.locale, { month: 'long', day: 'numeric', year: 'numeric' }) : ''
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const submit = async e => {
    e.preventDefault(); setFormError('')
    if (!form.agree) { setFormError(t.agree); return }
    setSending(true)
    try {
      const r = await fetch('/api/public-proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, ...form }) })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'Error')
      setDone(true)
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    } catch (err) { setFormError(err.message) }
    setSending(false)
  }

  const decline = async () => {
    setFormError(''); setSending(true)
    try {
      const r = await fetch('/api/public-proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action: 'decline', reason }) })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'Error')
      setDeclined(true); setDeclining(false)
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (err) { setFormError(err.message) }
    setSending(false)
  }

  if (error) return <div className={s.shell}><Head><title>515Studio</title><meta name="viewport" content={VIEWPORT} /></Head><div className={s.center}>{TEXT.es.invalid}<br /><span>{TEXT.en.invalid}</span></div></div>
  if (!data) return <div className={s.shell}><Head><title>515Studio</title><meta name="viewport" content={VIEWPORT} /></Head><div className={s.center}>…</div></div>

  const { proposal: p, studio } = data
  const accepted = p.status === 'accepted' || done
  const expired = p.expired && !accepted
  const wasDeclined = !accepted && (declined || p.status === 'declined')
  return <div className={s.shell} lang={lang}>
    <Head>
      <title>{`${p.title} | ${studio.name}`}</title>
      <meta name="viewport" content={VIEWPORT} />
      <meta name="robots" content="noindex" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&display=swap" rel="stylesheet" />
    </Head>

    <header className={s.top}>
      <a href={studio.website} target="_blank" rel="noreferrer" className={s.brand}><img src={studio.logoUrl} alt={studio.name} /></a>
      {!accepted && !expired && <a href="#accept" className={s.topCta}>{t.accept}</a>}
    </header>

    <section className={s.hero}>
      <div className={s.inner}>
        <div className={s.eyebrow}>{t.proposal}{p.number ? ` · ${p.number}` : ''}</div>
        <h1>{p.title}</h1>
        <div className={s.meta}>
          {p.prospect && <span>{t.preparedFor} <strong>{p.prospect}</strong></span>}
          <span>{fmtDate(p.date)}</span>
          <span>{t.by} {studio.name}</span>
          {p.validUntil && !accepted && <span className={expired ? s.expiredTag : undefined}>{t.validUntil(fmtDate(p.validUntil + 'T12:00:00'))}</span>}
        </div>
      </div>
    </section>

    <main className={s.inner}>
      {accepted && !done && <div className={s.acceptedBanner}>✓ {t.accepted(p.acceptedBy, fmtDate(p.acceptedAt))}</div>}
      <ProposalBody source={p.body} className={s.body} />

      <section id="accept" className={s.acceptCard} ref={formRef}>
        {accepted ? <div className={s.thanks}>
          <div className={s.check}>✓</div>
          <h2>{done ? t.thanks : t.accepted(p.acceptedBy, fmtDate(p.acceptedAt))}</h2>
          {done && <p>{t.thanksBody(form.name.split(' ')[0])}</p>}
          <p className={s.contactLine}>{t.questions} <a href={`mailto:${studio.email}`}>{studio.email}</a>{studio.phone ? <> · <a href={`tel:${studio.phone}`}>{studio.phone}</a></> : null}</p>
        </div> : expired ? <div className={s.thanks}>
          <h2>{t.expiredTitle}</h2>
          <p>{t.expiredBody(fmtDate(p.validUntil + 'T12:00:00'))}</p>
          <p className={s.contactLine}><a href={`mailto:${studio.email}`}>{studio.email}</a>{studio.phone ? <> · <a href={`tel:${studio.phone}`}>{studio.phone}</a></> : null}</p>
        </div> : declining ? <div>
          <h2>{t.declineTitle}</h2>
          <p className={s.formIntro}>{t.declineBody}</p>
          <label className={s.field}><textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} placeholder={t.declinePlaceholder} /></label>
          {formError && <div className={s.error} role="alert">{formError}</div>}
          <div className={s.declineRow}><button type="button" className={s.secondary} onClick={() => setDeclining(false)}>{t.declineCancel}</button><button type="button" className={s.submitDark} disabled={sending} onClick={decline}>{sending ? t.sending : t.declineSend}</button></div>
        </div> : <form onSubmit={submit} noValidate>
          {wasDeclined && <div className={s.declinedNote}><strong>{t.declinedTitle}</strong><p>{t.declinedBody}</p></div>}
          <h2>{wasDeclined ? t.changedMind : t.acceptTitle}</h2>
          <p className={s.formIntro}>{t.acceptIntro}</p>
          <div className={s.grid2}>
            <label className={s.field}><span>{t.name} *</span><input value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" required maxLength={120} /></label>
            <label className={s.field}><span>{t.business}</span><input value={form.business} onChange={e => set('business', e.target.value)} autoComplete="organization" maxLength={160} /></label>
            <label className={s.field}><span>{t.email} *</span><input type="email" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" required maxLength={254} /></label>
            <label className={s.field}><span>{t.phone} *</span><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" required maxLength={40} /></label>
            <label className={s.field}><span>{t.address}</span><input value={form.address} onChange={e => set('address', e.target.value)} autoComplete="street-address" maxLength={200} /></label>
            <label className={s.field}><span>{t.city}</span><input value={form.city} onChange={e => set('city', e.target.value)} autoComplete="address-level2" maxLength={120} /></label>
          </div>
          <label className={s.field}><span>{t.website}</span><input value={form.website} onChange={e => set('website', e.target.value)} inputMode="url" maxLength={200} /></label>
          <label className={s.field}><span>{t.message}</span><textarea rows={3} value={form.message} onChange={e => set('message', e.target.value)} maxLength={2000} /></label>
          <input className={s.hp} tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company_website_hp} onChange={e => set('company_website_hp', e.target.value)} />
          <label className={s.agree}><input type="checkbox" checked={form.agree} onChange={e => set('agree', e.target.checked)} /><span>{t.agree}</span></label>
          {formError && <div className={s.error} role="alert">{formError}</div>}
          <button className={s.submit} disabled={sending}>{sending ? t.sending : t.send}</button>
          {!wasDeclined && <button type="button" className={s.declineLink} onClick={() => { setFormError(''); setDeclining(true) }}>{t.decline}</button>}
          <p className={s.contactLine}>{t.questions} <a href={`mailto:${studio.email}`}>{studio.email}</a>{studio.phone ? <> · <a href={`tel:${studio.phone}`}>{studio.phone}</a></> : null}</p>
        </form>}
      </section>
    </main>

    <footer className={s.footer}>
      <img src={studio.logoUrl} alt="" />
      <div>{studio.name}{studio.owner && studio.owner !== studio.name ? ` · ${studio.owner}` : ''}</div>
      <a href={studio.website} target="_blank" rel="noreferrer">{studio.website.replace(/^https:\/\//, '')}</a>
    </footer>
  </div>
}
