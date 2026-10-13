import { useState } from 'react'
import Head from 'next/head'
import { createServiceClient } from '../../lib/pibase'
import { verifyInvoiceToken } from '../../lib/signingTokens'
import { balanceCents } from '../../lib/payments'

const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

export default function PayInvoicePage({ token, invoice, returned }) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const settled = invoice.status === 'paid' || invoice.balanceCents <= 0

  const pay = async () => {
    setError('')
    setStatus('loading')
    const res = await fetch('/api/pay-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => null)
    const data = await res?.json().catch(() => ({})) || {}
    if (!res?.ok || !data.url) {
      setError(data.error || 'Unable to start checkout. Please try again.')
      setStatus('idle')
      return
    }
    window.location.assign(data.url)
  }

  return (
    <>
      <Head>
        <title>{`Invoice ${invoice.number}`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
      </Head>
      <main className="pay-page">
        <section className="pay-card">
          <p className="pay-eyebrow">{invoice.businessName}</p>
          <h1>Invoice {invoice.number}</h1>
          <div className="pay-rows">
            <div><span>Client</span><strong>{invoice.client || '—'}</strong></div>
            <div><span>Total</span><strong>{money(invoice.amountCents)}</strong></div>
            {invoice.paidCents > 0 && <div><span>Paid</span><strong>{money(invoice.paidCents)}</strong></div>}
            {invoice.due && <div><span>Due</span><strong>{invoice.due}</strong></div>}
          </div>
          {settled ? (
            <div className="pay-success">This invoice is paid in full. Thank you!</div>
          ) : returned ? (
            <div className="pay-success">Thank you! Your payment is being confirmed. You can close this page; a receipt will arrive from Stripe.</div>
          ) : (
            <>
              <div className="pay-due"><span>Amount due</span><strong>{money(invoice.balanceCents)}</strong></div>
              {error && <p className="pay-error">{error}</p>}
              <button onClick={pay} disabled={status === 'loading'}>{status === 'loading' ? 'Opening secure checkout…' : `Pay ${money(invoice.balanceCents)}`}</button>
              <p className="pay-note">Payments are processed securely by Stripe. Card details are never shared with the studio.</p>
            </>
          )}
        </section>
      </main>
      <style jsx global>{`
        body { background: #FAFAF9; color: #111110; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; }
        * { box-sizing: border-box; }
        .pay-page { min-height: 100vh; padding: 48px 20px 72px; display: grid; place-items: start center; }
        .pay-card { width: min(520px, 100%); background: #fff; border: 1px solid #EAEAEA; border-radius: 16px; padding: 28px; box-shadow: 0 8px 30px rgba(0,0,0,0.04); }
        .pay-eyebrow { color: #7F7E7C; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 10px; }
        .pay-card h1 { font-family: Georgia, serif; font-size: clamp(1.8rem, 6vw, 2.6rem); font-weight: 400; margin: 0 0 20px; }
        .pay-rows div, .pay-due { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #EAEAEA; font-size: 14px; }
        .pay-rows span, .pay-due span { color: #7F7E7C; }
        .pay-due { border-bottom: none; font-size: 16px; margin: 8px 0 16px; }
        .pay-due strong { font-family: Georgia, serif; font-size: 24px; font-weight: 400; }
        .pay-card button { width: 100%; border: 1px solid #111110; border-radius: 10px; background: #111110; color: #fff; cursor: pointer; font: inherit; font-weight: 600; min-height: 48px; padding: 12px 16px; }
        .pay-card button:disabled { opacity: .65; }
        .pay-note { color: #7F7E7C; font-size: 12px; margin: 12px 0 0; text-align: center; }
        .pay-error { color: #991F1F; font-size: 13px; margin: 0 0 12px; }
        .pay-success { background: #EAF4EE; border: 1px solid #b7d9c5; border-radius: 10px; color: #1A6B3C; padding: 16px; margin-top: 18px; }
        @media (max-width: 600px) { .pay-page { padding: 20px 12px 44px; } .pay-card { padding: 20px 16px; } }
      `}</style>
    </>
  )
}

export async function getServerSideProps({ params, query, res }) {
  res.setHeader('Cache-Control', 'private, no-store')
  const parsed = verifyInvoiceToken(params.token)
  if (!parsed) return { notFound: true }
  const db = createServiceClient()
  if (!db) return { notFound: true }

  const { data } = await db.from('invoices')
    .select('id, user_id, number, client_name, amount, paid, status, due')
    .eq('id', parsed.invoiceId).single()
  if (!data) return { notFound: true }
  const { data: profile } = await db.from('profiles').select('business_name').eq('id', data.user_id).single()

  return {
    props: {
      token: params.token,
      returned: query.status === 'success',
      invoice: {
        number: data.number || String(data.id).slice(0, 8).toUpperCase(),
        client: data.client_name || '',
        businessName: profile?.business_name || 'Studio',
        status: data.status || 'unpaid',
        due: data.due ? new Date(data.due + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '',
        amountCents: Math.round(Number(data.amount) * 100) || 0,
        paidCents: Math.round(Number(data.paid) * 100) || 0,
        balanceCents: balanceCents(data),
      },
    },
  }
}
