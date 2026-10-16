import { useState } from 'react'
import { createServiceClient } from '../../lib/pibase'
import { getStripe, loadStudioConfig } from '../../lib/studioConfig'
import { logoUrl } from '../../lib/email'
import { verifyInvoiceToken } from '../../lib/signingTokens'
import { invoiceFromRow, payableOptions, paymentSchedule } from '../../lib/invoices'
import PublicDocument, { LineItemsTable, fmt$, fmtDate, summariseLineItems } from '../../components/PublicDocument'

const STATUS = { paid: 'Paid in full', partial: 'Partially paid', unpaid: 'Awaiting payment' }

// The client sees what is due now (e.g. the deposit) first. The full
// balance is only offered when the studio allows paying in full.
export default function InvoicePage({ token, invoice, businessName, logo, schedule, options, canPayOnline, justPaid }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const dueNow = options[0] || null

  const pay = async option => {
    setBusy(option.key); setError('')
    try {
      const r = await fetch('/api/pay-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, option: option.key }) })
      const body = await r.json().catch(() => ({}))
      if (!r.ok || !body.url) throw new Error(body.error || 'Payment could not be started')
      window.location.href = body.url
    } catch (err) { setError(err.message); setBusy('') }
  }

  return (
    <PublicDocument pageTitle={`Invoice ${invoice.number} · ${businessName}`} eyebrow={businessName} logo={logo} title={`Invoice ${invoice.number}`}
      statusLabel={STATUS[invoice.status] || invoice.status} tone={invoice.status === 'paid' ? 'done' : 'open'}>
      {justPaid && <div className="inv-message success" style={{ marginTop: 0, marginBottom: 20 }}>Thank you! Your payment went through. It can take a minute to show here.</div>}

      {dueNow ? (
        <div className="inv-due-now">
          <span>{schedule.length > 1 ? `Due now · ${dueNow.label}` : 'Amount due'}</span>
          <strong>{fmt$(dueNow.amount)}</strong>
          {dueNow.due && <small>Due by {fmtDate(dueNow.due)}</small>}
        </div>
      ) : (
        <div className="inv-due-now done"><span>Paid in full</span><strong>{fmt$(invoice.amount)}</strong><small>Thank you!</small></div>
      )}

      {canPayOnline && options.length > 0 && (
        <div className="inv-pay">
          {options.map((option, index) => (
            <button key={option.key} type="button" className={`inv-button${index > 0 ? ' secondary' : ''}`} disabled={!!busy} onClick={() => pay(option)}>
              {busy === option.key ? 'Opening secure checkout…' : index > 0 ? `Pay the full balance instead · ${fmt$(option.amount)}` : option.key === 'next' ? `Pay ${option.label} · ${fmt$(option.amount)}` : `Pay ${fmt$(option.amount)}`}
            </button>
          ))}
          <p className="inv-pay-note">Secure card payment by Stripe.</p>
        </div>
      )}
      {error && <div className="inv-message error">{error}</div>}

      <div className="inv-meta">
        <div><span>Billed to</span><strong>{invoice.client || '—'}</strong></div>
        <div><span>Invoice total</span><strong>{fmt$(invoice.amount)}</strong></div>
        <div><span>Paid so far</span><strong>{fmt$(invoice.paid)}</strong></div>
      </div>

      {schedule.length > 1 && (
        <div className="inv-plan">
          <h2>Payment plan</h2>
          {schedule.map(row => (
            <div key={row.id} className={`inv-plan-row ${row.status}`}>
              <div><strong>{row.label}</strong>{row.due && <small>Due {fmtDate(row.due)}</small>}</div>
              <span>{row.status === 'paid' ? `Paid · ${fmt$(row.amount)}` : row.status === 'partial' ? `${fmt$(row.remaining)} left` : fmt$(row.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <LineItemsTable items={invoice.items} />
      <div className="inv-totals">
        {invoice.items.length > 0 && <div><span>Subtotal</span><span>{fmt$(invoice.subtotal)}</span></div>}
        {invoice.discount > 0 && <div><span>Discount</span><span>−{fmt$(invoice.discount)}</span></div>}
        {invoice.tax > 0 && <div><span>Tax</span><span>{fmt$(invoice.tax)}</span></div>}
        <div className="inv-total"><span>Total</span><span>{fmt$(invoice.amount)}</span></div>
        {invoice.paid > 0 && <div><span>Paid</span><span>−{fmt$(invoice.paid)}</span></div>}
      </div>
      {invoice.notes && <div className="inv-notes"><span>Notes</span><p>{invoice.notes}</p></div>}
      <button type="button" className="inv-button secondary" onClick={() => window.print()}>Print or save as PDF</button>
      <style jsx global>{`
        .inv-due-now { display: grid; gap: 2px; padding: 18px 20px; border-radius: 12px; background: #FFF6E8; border: 1px solid #F3DDB5; margin-bottom: 16px; }
        .inv-due-now.done { background: #EAF4EE; border-color: #b7d9c5; }
        .inv-due-now span { color: #8A5300; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
        .inv-due-now.done span { color: #1A6B3C; }
        .inv-due-now strong { font-family: Georgia, serif; font-size: 34px; font-weight: 400; color: #111110; }
        .inv-due-now small { color: #7F7E7C; font-size: 13px; }
        .inv-pay { margin-bottom: 24px; }
        .inv-pay .inv-button { margin-top: 10px; }
        .inv-pay-note { color: #9B9B98; font-size: 12px; text-align: center; margin: 8px 0 0; }
        .inv-plan { margin-bottom: 24px; border: 1px solid #EAEAEA; border-radius: 12px; padding: 4px 16px; }
        .inv-plan h2 { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #7F7E7C; margin: 12px 0 4px; }
        .inv-plan-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid #F1F1EF; font-size: 14px; }
        .inv-plan-row:first-of-type { border-top: 0; }
        .inv-plan-row div { display: grid; gap: 2px; }
        .inv-plan-row small { color: #9B9B98; font-size: 12px; }
        .inv-plan-row.paid span { color: #1A6B3C; }
        .inv-plan-row.paid strong { color: #7F7E7C; }
        @media (max-width: 600px) { .inv-meta { grid-template-columns: 1fr; } }
        @media print { .inv-pay, .inv-button { display: none !important; } }
      `}</style>
    </PublicDocument>
  )
}

export async function getServerSideProps({ params, query, res }) {
  const parsed = verifyInvoiceToken(params.token)
  if (!parsed) return { notFound: true }
  const db = createServiceClient()
  if (!db) return { notFound: true }

  const { data } = await db.from('invoices')
    .select('id, user_id, number, client_name, amount, paid, due, status, note, line_items')
    .eq('id', parsed.invoiceId).single()
  if (!data) return { notFound: true }
  const studio = await loadStudioConfig(db, data.user_id)
  const { notes, ...summary } = summariseLineItems(data.line_items)
  const invoice = invoiceFromRow(data)

  res.setHeader('Cache-Control', 'private, no-store')
  return {
    props: {
      token: params.token,
      businessName: studio.branding.businessName,
      logo: logoUrl(studio),
      schedule: paymentSchedule(invoice).map(({ id, label, amount, due, remaining, status }) => ({ id, label, amount, due, remaining, status })),
      options: payableOptions(invoice),
      canPayOnline: !!getStripe(studio),
      justPaid: query.paid === '1',
      invoice: {
        number: data.number || '', client: data.client_name || '',
        amount: invoice.amount, paid: invoice.paid, status: invoice.status,
        notes: notes || data.note || '', ...summary,
      },
    },
  }
}
