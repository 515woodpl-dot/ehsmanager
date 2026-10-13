import { useState } from 'react'
import { createServiceClient } from '../../lib/pibase'
import { loadStudioConfig } from '../../lib/studioConfig'
import { logoUrl } from '../../lib/email'
import { verifyQuoteToken } from '../../lib/signingTokens'
import PublicDocument, { LineItemsTable, fmt$, fmtDate, summariseLineItems } from '../../components/PublicDocument'

export default function QuotePage({ token, quote, businessName, logo }) {
  const [status, setStatus] = useState(quote.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invoiceUrl, setInvoiceUrl] = useState('')
  const expired = status !== 'accepted' && quote.validUntil && quote.validUntil < new Date().toLocaleDateString('en-CA')

  const accept = async () => {
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/accept-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'The quote could not be accepted')
      setStatus('accepted'); setInvoiceUrl(body.invoiceUrl || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const accepted = status === 'accepted'
  return (
    <PublicDocument pageTitle={`Quote ${quote.number} · ${businessName}`} eyebrow={businessName} logo={logo} title={`Quote ${quote.number}`}
      statusLabel={accepted ? 'Accepted' : expired ? 'Expired' : 'Awaiting your approval'} tone={accepted ? 'done' : expired ? 'muted' : 'open'}>
      <div className="inv-meta">
        <div><span>Prepared for</span><strong>{quote.client || '—'}</strong></div>
        <div><span>Valid until</span><strong>{fmtDate(quote.validUntil)}</strong></div>
        <div><span>Total</span><strong>{fmt$(quote.amount)}</strong></div>
      </div>
      <LineItemsTable items={quote.items} />
      <div className="inv-totals">
        {quote.items.length > 0 && <div><span>Subtotal</span><span>{fmt$(quote.subtotal)}</span></div>}
        {quote.discount > 0 && <div><span>Discount</span><span>−{fmt$(quote.discount)}</span></div>}
        {quote.tax > 0 && <div><span>Tax</span><span>{fmt$(quote.tax)}</span></div>}
        <div className="inv-total"><span>Total</span><span>{fmt$(quote.amount)}</span></div>
      </div>
      {quote.notes && <div className="inv-notes"><span>Notes</span><p>{quote.notes}</p></div>}

      {accepted ? (
        <>
          <div className="inv-message success">Thank you! This quote has been accepted{invoiceUrl ? ' and your invoice is ready.' : '.'}</div>
          {invoiceUrl && <a className="inv-button" href={invoiceUrl}>View your invoice</a>}
        </>
      ) : expired ? (
        <div className="inv-message error">This quote has expired. Please contact {businessName} for an updated quote.</div>
      ) : (
        <>
          {error && <div className="inv-message error">{error}</div>}
          <button type="button" className="inv-button" disabled={busy} onClick={accept}>{busy ? 'Accepting…' : `Accept quote · ${fmt$(quote.amount)}`}</button>
        </>
      )}
      <button type="button" className="inv-button secondary" onClick={() => window.print()}>Print or save as PDF</button>
    </PublicDocument>
  )
}

export async function getServerSideProps({ params, res }) {
  const parsed = verifyQuoteToken(params.token)
  if (!parsed) return { notFound: true }
  const db = createServiceClient()
  if (!db) return { notFound: true }

  const { data } = await db.from('quotes')
    .select('id, user_id, client_name, amount, status, note, line_items')
    .eq('id', parsed.quoteId).single()
  if (!data) return { notFound: true }
  const studio = await loadStudioConfig(db, data.user_id)

  res.setHeader('Cache-Control', 'private, no-store')
  return {
    props: {
      token: params.token,
      businessName: studio.branding.businessName,
      logo: logoUrl(studio),
      quote: {
        number: data.line_items?.number || '', client: data.client_name || '',
        amount: Number(data.amount) || 0, status: data.status || 'pending',
        validUntil: data.note || '', ...summariseLineItems(data.line_items),
      },
    },
  }
}
