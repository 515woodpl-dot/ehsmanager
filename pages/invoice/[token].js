import Head from 'next/head'
import { createServiceClient } from '../../lib/pibase'
import { verifyInvoiceToken } from '../../lib/signingTokens'

const fmt$ = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
const STATUS = { paid: 'Paid in full', partial: 'Partially paid', unpaid: 'Awaiting payment' }

export default function InvoicePage({ invoice, businessName }) {
  const balance = Math.max(0, invoice.amount - invoice.paid)
  return (
    <>
      <Head>
        <title>{`Invoice ${invoice.number} · ${businessName}`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
      </Head>
      <main className="inv-page">
        <section className="inv-card">
          <div className="inv-top">
            <div>
              <p className="inv-eyebrow">{businessName}</p>
              <h1>Invoice {invoice.number}</h1>
            </div>
            <span className={`inv-status inv-status-${invoice.status}`}>{STATUS[invoice.status] || invoice.status}</span>
          </div>

          <div className="inv-meta">
            <div><span>Billed to</span><strong>{invoice.client || '—'}</strong></div>
            <div><span>Due date</span><strong>{fmtDate(invoice.due)}</strong></div>
            <div><span>Balance due</span><strong>{fmt$(balance)}</strong></div>
          </div>

          {invoice.items.length > 0 && (
            <table className="inv-items">
              <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td><strong>{item.name || 'Item'}</strong>{item.description && <p>{item.description}</p>}</td>
                    <td className="num">{item.qty}</td>
                    <td className="num">{fmt$(item.price)}</td>
                    <td className="num">{fmt$(item.qty * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="inv-totals">
            {invoice.items.length > 0 && <div><span>Subtotal</span><span>{fmt$(invoice.subtotal)}</span></div>}
            {invoice.discount > 0 && <div><span>Discount</span><span>−{fmt$(invoice.discount)}</span></div>}
            {invoice.tax > 0 && <div><span>Tax</span><span>{fmt$(invoice.tax)}</span></div>}
            <div className="inv-total"><span>Total</span><span>{fmt$(invoice.amount)}</span></div>
            {invoice.paid > 0 && <div><span>Paid</span><span>−{fmt$(invoice.paid)}</span></div>}
            {invoice.paid > 0 && <div className="inv-total"><span>Balance due</span><span>{fmt$(balance)}</span></div>}
          </div>

          {invoice.notes && <div className="inv-notes"><span>Notes</span><p>{invoice.notes}</p></div>}

          <button type="button" className="inv-print" onClick={() => window.print()}>Print or save as PDF</button>
        </section>
      </main>
      <style jsx global>{`
        body { background: #FAFAF9; color: #111110; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; }
        * { box-sizing: border-box; }
        .inv-page { min-height: 100vh; padding: 48px 20px 72px; display: grid; justify-items: center; }
        .inv-card { width: min(820px, 100%); background: #fff; border: 1px solid #EAEAEA; border-radius: 16px; padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.04); }
        .inv-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .inv-eyebrow { color: #7F7E7C; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 8px; }
        .inv-card h1 { font-family: Georgia, serif; font-size: clamp(1.8rem, 5vw, 2.6rem); font-weight: 400; margin: 0; }
        .inv-status { border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 600; background: #FDECEA; color: #991F1F; }
        .inv-status-paid { background: #EAF4EE; color: #1A6B3C; }
        .inv-status-partial { background: #FBF2DC; color: #7A5200; }
        .inv-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 24px; }
        .inv-meta div { display: grid; gap: 4px; background: #F8F8F7; border-radius: 10px; padding: 12px 14px; }
        .inv-meta span, .inv-notes span { color: #7F7E7C; font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
        .inv-items { width: 100%; border-collapse: collapse; font-size: 14px; }
        .inv-items th { text-align: left; color: #7F7E7C; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; padding: 8px 6px; border-bottom: 1px solid #EAEAEA; }
        .inv-items td { padding: 12px 6px; border-bottom: 1px solid #EAEAEA; vertical-align: top; }
        .inv-items td p { margin: 4px 0 0; color: #7F7E7C; font-size: 13px; white-space: pre-wrap; }
        .inv-items .num { text-align: right; white-space: nowrap; }
        .inv-totals { margin: 18px 0 0 auto; width: min(300px, 100%); }
        .inv-totals div { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; color: #555; }
        .inv-totals .inv-total { border-top: 1px solid #EAEAEA; color: #111110; font-weight: 600; font-size: 16px; }
        .inv-notes { margin-top: 24px; padding: 14px 16px; border: 1px solid #EAEAEA; border-radius: 10px; }
        .inv-notes p { margin: 6px 0 0; white-space: pre-wrap; font-size: 14px; }
        .inv-print { margin-top: 24px; width: 100%; border: 1px solid #111110; border-radius: 10px; background: #111110; color: #fff; font: inherit; font-weight: 600; min-height: 46px; cursor: pointer; }
        @media (max-width: 600px) { .inv-page { padding: 16px 12px 40px; } .inv-card { padding: 20px 16px; border-radius: 12px; } .inv-meta { grid-template-columns: 1fr; } }
        @media print { body { background: #fff; } .inv-page { padding: 0; } .inv-card { border: 0; box-shadow: none; } .inv-print { display: none; } }
      `}</style>
    </>
  )
}

export async function getServerSideProps({ params, res }) {
  const parsed = verifyInvoiceToken(params.token)
  if (!parsed) return { notFound: true }

  const db = createServiceClient()
  if (!db) return { notFound: true }

  const { data } = await db
    .from('invoices')
    .select('id, user_id, number, client_name, amount, paid, due, status, note, line_items')
    .eq('id', parsed.invoiceId)
    .single()
  if (!data) return { notFound: true }

  const { data: profile } = await db.from('profiles').select('business_name').eq('id', data.user_id).single()

  const details = Array.isArray(data.line_items) ? { items: data.line_items } : (data.line_items || {})
  const items = (details.items || [])
    .filter(item => item && (item.name || item.description || Number(item.price)))
    .map(item => ({ id: String(item.id || ''), name: String(item.name || ''), description: String(item.description || ''), qty: Math.max(0, Number(item.qty) || 0), price: Math.max(0, Number(item.price) || 0) }))
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0)
  const discountValue = Math.max(0, Number(details.discount) || 0)
  const discount = Math.min(subtotal, details.discountType === '$' ? discountValue : subtotal * Math.min(discountValue, 100) / 100)
  const tax = (subtotal - discount) * Math.max(0, Number(details.tax) || 0) / 100

  res.setHeader('Cache-Control', 'private, no-store')
  return {
    props: {
      businessName: profile?.business_name || "Ellie's Heartstrings Photography",
      invoice: {
        number: data.number || '',
        client: data.client_name || '',
        amount: Number(data.amount) || 0,
        paid: Number(data.paid) || 0,
        due: data.due || '',
        status: data.status || 'unpaid',
        notes: details.notes || data.note || '',
        items, subtotal, discount, tax,
      },
    },
  }
}
