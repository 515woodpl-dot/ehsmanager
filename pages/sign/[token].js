import { useState } from 'react'
import Head from 'next/head'
import { createServiceClient } from '../../lib/pibase'
import { verifyContractToken } from '../../lib/signingTokens'
import ContractDocument from '../../components/ContractDocument'

export default function SignContractPage({ token, contract }) {
  const [signerName, setSignerName] = useState(contract.signedBy || contract.client || '')
  const [signerEmail, setSignerEmail] = useState('')
  const [accepted, setAccepted] = useState(contract.status === 'signed')
  const [status, setStatus] = useState(contract.status === 'signed' ? 'signed' : 'idle')
  const [signedBy, setSignedBy] = useState(contract.signedBy || '')
  const [signedAt, setSignedAt] = useState(contract.signedAt || '')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!accepted) {
      setError('Please confirm you reviewed and agree to the contract.')
      return
    }
    setStatus('sending')
    const res = await fetch('/api/sign-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, signerName, signerEmail }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Unable to sign contract.')
      setStatus('idle')
      return
    }
    setStatus('signed')
    setSignedBy(signerName.trim())
    setSignedAt(data.signedAt || '')
  }

  return (
    <>
      <Head>
        <title>Sign Contract</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="sign-page">
        <section className="sign-card">
          <p className="sign-eyebrow">Ellie's Heartstrings Photography</p>
          <h1>{contract.type || 'Photography Agreement'}</h1>
          <div className="sign-meta">
            <span>{contract.client}</span>
            <span>{contract.sent ? `Sent ${contract.sent}` : 'Ready for review'}</span>
            <span>{status === 'signed' ? 'Signed' : 'Awaiting signature'}</span>
          </div>
        </section>

        <section className="sign-card contract-copy">
          <ContractDocument body={contract.body} signedBy={signedBy} signedAt={signedAt} />
        </section>

        <form className="sign-card" onSubmit={submit}>
          {status === 'signed' ? (
            <div className="sign-success">Contract signed. Thank you.</div>
          ) : (
            <>
              <label>
                <span>Full legal name</span>
                <input value={signerName} onChange={e => setSignerName(e.target.value)} required />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} />
              </label>
              <label className="sign-check">
                <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
                <span>I reviewed and agree to this contract. Typing my name acts as my electronic signature.</span>
              </label>
              {error && <p className="sign-error">{error}</p>}
              <button type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Signing...' : 'Sign contract'}</button>
            </>
          )}
        </form>
      </main>
      <style jsx global>{`
        body { background: #FAFAF9; color: #111110; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: rgba(0,0,0,0); }
        .sign-page { min-height: 100vh; padding: 48px 20px 72px; display: grid; gap: 18px; justify-items: center; }
        .sign-card { width: min(880px, 100%); background: #fff; border: 1px solid #EAEAEA; border-radius: 16px; padding: 28px; box-shadow: 0 8px 30px rgba(0,0,0,0.04); }
        .sign-eyebrow { color: #7F7E7C; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 10px; }
        .sign-card h1 { font-family: Georgia, serif; font-size: clamp(2rem, 6vw, 3.5rem); font-weight: 400; line-height: 1.05; margin: 0 0 18px; }
        .sign-meta { display: flex; flex-wrap: wrap; gap: 8px; color: #7F7E7C; font-size: 13px; }
        .sign-meta span { border: 1px solid #EAEAEA; border-radius: 999px; padding: 6px 10px; }
        .contract-copy { font-size: 14px; line-height: 1.8; }
        .contract-body-render p { margin: 0; white-space: pre-wrap; }
        .contract-body-space { height: .9rem; }
        .contract-body-heading { color: #111110; font-weight: 700; }
        .sign-card label { display: grid; gap: 6px; margin-bottom: 14px; }
        .sign-card label span:first-child { color: #7F7E7C; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
        .sign-card input[type="text"], .sign-card input[type="email"], .sign-card input:not([type]) { border: 1px solid #DDDCDA; border-radius: 10px; color: #111110; font: inherit; font-size: 16px; padding: 12px 14px; width: 100%; }
        .sign-check { align-items: flex-start; display: flex !important; gap: 10px !important; }
        .sign-check span { color: #7F7E7C !important; font-size: 13px !important; font-weight: 400 !important; letter-spacing: 0 !important; line-height: 1.6; text-transform: none !important; }
        .sign-check input { margin-top: 4px; }
        .sign-card button { width: 100%; border: 1px solid #111110; border-radius: 10px; background: #111110; color: #fff; cursor: pointer; font: inherit; font-weight: 600; min-height: 48px; padding: 12px 16px; }
        .sign-card button:disabled { opacity: .65; }
        .sign-error { color: #991F1F; font-size: 13px; margin: 0 0 12px; }
        .sign-success { background: #EAF4EE; border: 1px solid #b7d9c5; border-radius: 10px; color: #1A6B3C; padding: 16px; }
        @media (max-width: 600px) { .sign-page { padding: 20px 12px 44px; } .sign-card { border-radius: 12px; padding: 20px 16px; } }
      `}</style>
    </>
  )
}

export async function getServerSideProps({ params }) {
  const parsed = verifyContractToken(params.token)
  if (!parsed) return { notFound: true }

  const db = createServiceClient()
  if (!db) return { notFound: true }

  const { data } = await db
    .from('contracts')
    .select('id, client_name, type, body, status, sent, signed_by, signed_at')
    .eq('id', parsed.contractId)
    .single()

  if (!data) return { notFound: true }

  return {
    props: {
      token: params.token,
      contract: {
        id: data.id,
        client: data.client_name || '',
        type: data.type || '',
        body: data.body || '',
        status: data.status || 'pending',
        sent: data.sent || '',
        signedBy: data.signed_by || '',
        signedAt: data.signed_at || '',
      },
    },
  }
}
