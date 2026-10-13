import fs from 'fs'
import path from 'path'
import { useState } from 'react'
import Head from 'next/head'
import { createServiceClient } from '../../lib/pibase'
import { verifyContractToken } from '../../lib/signingTokens'
import { safeImageUrl } from '../../lib/booking'
import ContractDocument, { parseContract } from '../../components/ContractDocument'
import SignaturePad from '../../components/SignaturePad'

const PrintIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" /><path d="M6 14h12v7H6z" /></svg>
const DownloadIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3v13m0 0-5-5m5 5 5-5M4 21h16" /></svg>

export default function SignContractPage({ token, contract, brand }) {
  const { meta } = parseContract(contract.body)
  const [mode, setMode] = useState('draw')
  const [signature, setSignature] = useState('')
  const [signerName, setSignerName] = useState(contract.signedBy || contract.client || '')
  const [signerEmail, setSignerEmail] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [status, setStatus] = useState(contract.status === 'signed' ? 'signed' : 'idle')
  const [signedBy, setSignedBy] = useState(contract.signedBy || '')
  const [signedAt, setSignedAt] = useState(contract.signedAt || '')
  const [signatureImage, setSignatureImage] = useState(contract.signatureImage || '')
  const [error, setError] = useState('')
  const signed = status === 'signed'
  const studio = meta.from || brand.studioName || 'Studio'
  const clientName = meta.to || contract.client || 'there'

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (!signerName.trim()) return setError('Please enter your full legal name.')
    if (mode === 'draw' && !signature) return setError('Please draw your signature, or switch to typing it.')
    if (!accepted) return setError('Please confirm you reviewed and agree to the contract.')
    setStatus('sending')
    const res = await fetch('/api/sign-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, signerName, signerEmail, signatureImage: mode === 'draw' ? signature : '' }),
    }).catch(() => null)
    const data = await res?.json().catch(() => ({})) || {}
    if (!res?.ok) {
      setError(data.error || 'Unable to sign contract.')
      setStatus('idle')
      return
    }
    setStatus('signed')
    setSignedBy(signerName.trim())
    setSignedAt(data.signedAt || '')
    setSignatureImage(mode === 'draw' ? signature : '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const signForm = (
    <form className="sc-sign" onSubmit={submit} id="sign">
      <div className="sc-tabs" role="tablist">
        {[['draw', 'Draw'], ['type', 'Type']].map(([value, label]) => <button type="button" role="tab" aria-selected={mode === value} key={value} className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>{label}</button>)}
      </div>
      {mode === 'draw'
        ? <SignaturePad onChange={setSignature} disabled={status === 'sending'} />
        : <div className="sc-typed">{signerName.trim() || 'Your name'}</div>}
      <div className="sc-fields">
        <label><span>Full legal name</span><input value={signerName} onChange={e => setSignerName(e.target.value)} autoComplete="name" required /></label>
        <label><span>Email</span><input type="email" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} autoComplete="email" /></label>
      </div>
      <label className="sc-check"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>I have reviewed this contract and agree to its terms. My signature above is my electronic signature.</span></label>
      {error && <p className="sc-error" role="alert">{error}</p>}
      <button type="submit" className="sc-button" disabled={status === 'sending'}>{status === 'sending' ? 'Signing…' : 'Sign contract'}</button>
    </form>
  )

  return (
    <>
      <Head>
        <title>{`${studio} - Contract`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=Mrs+Saint+Delafield&display=swap" rel="stylesheet" />
      </Head>
      <main className="sc-page">
        <section className="sc-hero" style={brand.coverUrl ? { backgroundImage: `url(${JSON.stringify(brand.coverUrl)})` } : undefined}>
          <div className="sc-hero-inner">
            {brand.logoUrl ? <img className="sc-logo" src={brand.logoUrl} alt="" /> : <div className="sc-logo sc-monogram">{studio.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('')}</div>}
            <div className="sc-studio">{studio}</div>
            <h1>Hi {clientName},<br /><span>{signed ? `This contract was completed on ${signedAt}.` : 'Please review and sign your contract below.'}</span></h1>
          </div>
        </section>

        <section className="sc-card sc-summary">
          <div className="sc-summary-head">
            <h2>{meta.documentName || `${clientName} Contract`}</h2>
            <span className={`sc-pill${signed ? ' done' : ''}`}>{signed ? 'Completed' : 'Awaiting signature'}</span>
            <div className="sc-tools">
              <button type="button" onClick={() => window.print()} aria-label="Print contract"><PrintIcon /></button>
              <button type="button" onClick={() => window.print()} aria-label="Download contract as PDF"><DownloadIcon /></button>
            </div>
          </div>
          <dl>
            <div><dt>From</dt><dd>{meta.from || studio}</dd></div>
            <div><dt>To</dt><dd>{meta.to || contract.client}</dd></div>
            <div><dt>Issue date</dt><dd>{meta.issueDate || contract.sent}</dd></div>
          </dl>
          {signed
            ? <button type="button" className="sc-button" onClick={() => window.print()}>Download contract</button>
            : <a className="sc-button" href="#sign">Review &amp; sign</a>}
        </section>

        <section className="sc-card sc-contract">
          <ContractDocument body={contract.body} signedBy={signed ? signedBy : ''} signedAt={signedAt} signatureImage={signatureImage} showSummary={false} clientSignatureSlot={signed ? null : signForm} />
        </section>

        <footer className="sc-footer">{studio}</footer>
      </main>
      <style jsx global>{`
        body { background: #fff; margin: 0; color: #1f1f1f; font-family: 'Figtree', 'Helvetica Neue', Arial, sans-serif; }
        .sc-page { --accent: #cc00c0; min-height: 100vh; padding-bottom: 48px; }
        .sc-hero { position: relative; min-height: 600px; padding: 56px 20px 150px; box-sizing: border-box; background: radial-gradient(circle at 30% 20%, #f6d9ef, transparent 55%), linear-gradient(135deg, #b9a7b5, #6d5a68); background-size: cover; background-position: center; color: #fff; text-align: center; }
        .sc-hero::before { content: ''; position: absolute; inset: 0; background: rgba(20, 16, 20, .38); }
        .sc-hero-inner { position: relative; max-width: 760px; margin: 0 auto; }
        .sc-logo { width: 72px; height: 72px; border-radius: 16px; object-fit: cover; display: block; margin: 0 auto; }
        .sc-monogram { background: var(--accent); display: grid; place-items: center; font: 500 26px Georgia, serif; border-radius: 50%; }
        .sc-studio { margin-top: 16px; font-size: 13px; letter-spacing: .24em; text-transform: uppercase; font-weight: 500; }
        .sc-hero h1 { margin: 64px 0 0; font-size: clamp(24px, 4vw, 34px); line-height: 1.6; font-weight: 600; }
        .sc-hero h1 span { font-weight: 500; }
        .sc-card { position: relative; width: min(1064px, calc(100% - 32px)); margin: 0 auto 28px; background: #fff; box-shadow: 0 2px 18px rgba(0,0,0,.06); }
        .sc-summary { margin-top: -170px; padding: 48px 64px; }
        .sc-summary-head { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
        .sc-summary h2 { margin: 0; font-size: 29px; font-weight: 500; }
        .sc-pill { padding: 7px 18px; border-radius: 999px; background: #fdf3e1; color: #9a6400; font-size: 14px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
        .sc-pill.done { background: #ebf7f1; color: #12895a; }
        .sc-tools { margin-left: auto; display: flex; gap: 18px; }
        .sc-tools button { border: 0; background: none; color: #333; cursor: pointer; padding: 4px; }
        .sc-summary dl { display: flex; flex-wrap: wrap; gap: 20px 64px; margin: 36px 0 44px; }
        .sc-summary dt { font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: #707070; margin-bottom: 10px; }
        .sc-summary dd { margin: 0; font-size: 19px; }
        .sc-button { display: block; width: 100%; box-sizing: border-box; border: 0; background: var(--accent); color: #fff; text-align: center; text-decoration: none; padding: 21px 16px; font: 500 16px 'Figtree', sans-serif; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; }
        .sc-button:disabled { opacity: .6; }
        .sc-contract { padding: 24px 32px 36px; }
        .sc-contract .contract-document { max-width: none; padding: 40px 32px 24px; }
        .sc-sign { width: 100%; padding-top: 6px; }
        .sc-tabs { display: inline-flex; border: 1px solid #ddd; border-radius: 999px; padding: 3px; margin-bottom: 12px; }
        .sc-tabs button { border: 0; background: none; border-radius: 999px; padding: 6px 16px; font: inherit; font-size: 13px; cursor: pointer; color: #555; }
        .sc-tabs button.active { background: #1f1f1f; color: #fff; }
        .signature-pad { position: relative; height: 150px; border: 1px dashed #c9c9c9; border-radius: 8px; background: #fcfcfc; }
        .signature-pad canvas { width: 100%; height: 100%; display: block; touch-action: none; cursor: crosshair; }
        .signature-pad-hint { position: absolute; left: 16px; bottom: 12px; color: #aaa; font-size: 13px; pointer-events: none; }
        .signature-pad-clear { position: absolute; right: 10px; top: 10px; border: 1px solid #ddd; background: #fff; border-radius: 6px; padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer; }
        .sc-typed { height: 150px; display: flex; align-items: center; padding: 0 20px; border: 1px dashed #c9c9c9; border-radius: 8px; font-family: 'Mrs Saint Delafield', cursive; font-size: 54px; color: #111; overflow: hidden; white-space: nowrap; }
        .sc-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0 14px; }
        .sc-fields label { display: grid; gap: 6px; }
        .sc-fields span { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #707070; }
        .sc-fields input { border: 1px solid #d6d6d6; border-radius: 6px; padding: 11px 12px; font: inherit; font-size: 16px; }
        .sc-check { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; color: #555; line-height: 1.55; margin-bottom: 16px; }
        .sc-check input { margin-top: 4px; }
        .sc-error { color: #a12020; font-size: 14px; margin: 0 0 12px; }
        .cd-signature .cd-signature-mark:has(.sc-sign) { border-bottom: 0; padding-bottom: 0; }
        .sc-footer { text-align: center; color: #707070; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; margin-top: 30px; }
        @media (max-width: 700px) {
          .sc-hero { min-height: 440px; padding: 36px 16px 130px; }
          .sc-hero h1 { margin-top: 40px; }
          .sc-summary { margin-top: -110px; padding: 28px 20px; }
          .sc-summary h2 { font-size: 22px; }
          .sc-summary dl { flex-direction: column; gap: 16px; margin: 26px 0 30px; }
          .sc-summary dd { font-size: 16px; }
          .sc-card { width: calc(100% - 24px); }
          .sc-contract { padding: 6px 2px 20px; }
          .sc-contract .contract-document { padding: 28px 18px 20px; }
          .sc-fields { grid-template-columns: 1fr; }
        }
        @media print {
          .sc-hero, .sc-tools, .sc-button, .sc-sign, .sc-footer { display: none !important; }
          .sc-card { box-shadow: none; width: 100%; margin: 0; }
          .sc-summary { margin-top: 0; padding: 0 0 16px; }
        }
      `}</style>
    </>
  )
}

const BRAND_FILES = { cover: ['contract-cover.jpg', 'contract-cover.webp', 'contract-cover.png'], logo: ['logo.png', 'logo.webp', 'logo.jpg', 'logo.svg'] }
function brandAsset(envValue, names) {
  const configured = safeImageUrl(envValue)
  if (configured) return configured
  const found = names.find(name => fs.existsSync(path.join(process.cwd(), 'public', 'brand', name)))
  return found ? `/brand/${found}` : ''
}

export async function getServerSideProps({ params, res }) {
  res.setHeader('Cache-Control', 'private, no-store')
  const parsed = verifyContractToken(params.token)
  if (!parsed) return { notFound: true }

  const db = createServiceClient()
  if (!db) return { notFound: true }

  const { data } = await db
    .from('contracts')
    .select('id, user_id, client_name, type, body, status, sent, signed_by, signed_at, fields')
    .eq('id', parsed.contractId)
    .single()
  if (!data) return { notFound: true }
  const { data: profile } = await db.from('profiles').select('business_name').eq('id', data.user_id).single()

  return {
    props: {
      token: params.token,
      brand: {
        studioName: profile?.business_name || '',
        coverUrl: brandAsset(process.env.CONTRACT_COVER_URL, BRAND_FILES.cover),
        logoUrl: brandAsset(process.env.STUDIO_LOGO_URL, BRAND_FILES.logo),
      },
      contract: {
        id: data.id,
        client: data.client_name || '',
        type: data.type || '',
        body: data.body || '',
        status: data.status || 'pending',
        sent: data.sent || '',
        signedBy: data.signed_by || '',
        signedAt: data.signed_at || '',
        signatureImage: data.fields?.signatureImage || '',
      },
    },
  }
}
