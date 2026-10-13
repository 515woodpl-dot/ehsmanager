import { createServiceClient } from '../../lib/pibase'
import { verifyInvoiceToken } from '../../lib/signingTokens'
import PublicDocument, { LineItemsTable, fmt$, fmtDate, summariseLineItems } from '../../components/PublicDocument'

const STATUS = { paid: 'Paid in full', partial: 'Partially paid', unpaid: 'Awaiting payment' }

export default function InvoicePage({ invoice, businessName }) {
  const balance = Math.max(0, invoice.amount - invoice.paid)
  return (
    <PublicDocument pageTitle={`Invoice ${invoice.number} · ${businessName}`} eyebrow={businessName} title={`Invoice ${invoice.number}`}
      statusLabel={STATUS[invoice.status] || invoice.status} tone={invoice.status === 'paid' ? 'done' : 'open'}>
      <div className="inv-meta">
        <div><span>Billed to</span><strong>{invoice.client || '—'}</strong></div>
        <div><span>Due date</span><strong>{fmtDate(invoice.due)}</strong></div>
        <div><span>Balance due</span><strong>{fmt$(balance)}</strong></div>
      </div>
      <LineItemsTable items={invoice.items} />
      <div className="inv-totals">
        {invoice.items.length > 0 && <div><span>Subtotal</span><span>{fmt$(invoice.subtotal)}</span></div>}
        {invoice.discount > 0 && <div><span>Discount</span><span>−{fmt$(invoice.discount)}</span></div>}
        {invoice.tax > 0 && <div><span>Tax</span><span>{fmt$(invoice.tax)}</span></div>}
        <div className="inv-total"><span>Total</span><span>{fmt$(invoice.amount)}</span></div>
        {invoice.paid > 0 && <div><span>Paid</span><span>−{fmt$(invoice.paid)}</span></div>}
        {invoice.paid > 0 && <div className="inv-total"><span>Balance due</span><span>{fmt$(balance)}</span></div>}
      </div>
      {invoice.notes && <div className="inv-notes"><span>Notes</span><p>{invoice.notes}</p></div>}
      <button type="button" className="inv-button" onClick={() => window.print()}>Print or save as PDF</button>
    </PublicDocument>
  )
}

export async function getServerSideProps({ params, res }) {
  const parsed = verifyInvoiceToken(params.token)
  if (!parsed) return { notFound: true }
  const db = createServiceClient()
  if (!db) return { notFound: true }

  const { data } = await db.from('invoices')
    .select('id, user_id, number, client_name, amount, paid, due, status, note, line_items')
    .eq('id', parsed.invoiceId).single()
  if (!data) return { notFound: true }
  const { data: profile } = await db.from('profiles').select('business_name').eq('id', data.user_id).single()
  const { notes, ...summary } = summariseLineItems(data.line_items)

  res.setHeader('Cache-Control', 'private, no-store')
  return {
    props: {
      businessName: profile?.business_name || "Ellie's Heartstrings Photography",
      invoice: {
        number: data.number || '', client: data.client_name || '',
        amount: Number(data.amount) || 0, paid: Number(data.paid) || 0,
        due: data.due || '', status: data.status || 'unpaid',
        notes: notes || data.note || '', ...summary,
      },
    },
  }
}
