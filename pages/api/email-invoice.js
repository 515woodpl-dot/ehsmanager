import { emailWrap, escapeHtml, sendStudioEmail } from '../../lib/email'
import { requireUser } from '../../lib/api-auth'
import { stripeConfigFor } from '../../lib/integrations'
import { balanceCents, payUrlFor } from '../../lib/payments'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireUser(req, res)
  if (!auth) return
  const bizName = auth.profile.business_name || 'My Studio'
  const ownerName = (auth.profile.full_name || '').split(' ')[0] || bizName

  const invoiceId = req.body?.invoice?.id
  if (!invoiceId) return res.status(400).json({ error: 'Missing invoice ID' })
  const { data: row } = await auth.db.from('invoices').select('*')
    .eq('id', invoiceId).eq('user_id', auth.user.id).single()
  if (!row) return res.status(404).json({ error: 'Invoice not found' })
  if (!row.client_id) return res.status(400).json({ error: 'Invoice has no linked client' })
  const { data: client } = await auth.db.from('clients').select('name, email')
    .eq('id', row.client_id).eq('user_id', auth.user.id).single()
  if (!client?.email) return res.status(400).json({ error: 'Client email is missing' })
  const invoice = { ...row, client: row.client_name, lineItems: Array.isArray(row.line_items) ? row.line_items : row.line_items?.items || [] }
  const clientEmail = client.email
  const clientName = client.name
  const payUrl = invoice.status !== 'paid' && balanceCents(invoice) > 0 && await stripeConfigFor(auth.db, auth.user.id)
    ? payUrlFor(invoice.id)
    : null

  const pct = invoice.amount > 0 ? Math.round((invoice.paid / invoice.amount) * 100) : 0
  const owing = invoice.amount - invoice.paid
  const fmt = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
  const fmtDate = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'

  const statusLabel = invoice.status === 'paid' ? 'Paid in full' : invoice.status === 'partial' ? `${fmt(invoice.paid)} paid · ${fmt(owing)} remaining` : `${fmt(invoice.amount)} due`

  const lineItemsHtml = invoice.lineItems?.length
    ? invoice.lineItems.map(li => `<div class="box-row"><span class="label">${escapeHtml(li.description || li.name || 'Item')}${li.qty > 1 ? ` ×${Number(li.qty)}` : ''}</span><span class="value">${fmt((li.price || 0) * (li.qty || 1))}</span></div>`).join('')
    : ''

  const html = emailWrap(`
    <h1>Invoice ${escapeHtml(invoice.number || invoice.id)}</h1>
    <p>Hi ${escapeHtml(clientName || 'there')},</p>
    <p>Please find your invoice details below. ${invoice.status !== 'paid' ? 'Payment is due by ' + fmtDate(invoice.due) + '.' : 'Thank you for your payment!'}</p>

    <div class="amount">${fmt(invoice.amount)}</div>

    <div class="box">
      ${lineItemsHtml}
      <div class="box-row"><span class="label">Invoice</span><span class="value">${escapeHtml(invoice.number || invoice.id)}</span></div>
      <div class="box-row"><span class="label">Due date</span><span class="value">${fmtDate(invoice.due)}</span></div>
      <div class="box-row"><span class="label">Status</span><span class="value">${escapeHtml(statusLabel)}</span></div>
      ${invoice.note ? `<div class="box-row"><span class="label">Note</span><span class="value">${escapeHtml(invoice.note)}</span></div>` : ''}
    </div>

    ${payUrl ? `<a href="${escapeHtml(payUrl)}" class="btn">Pay ${fmt(owing)} securely</a>` : ''}

    <p>If you have any questions about this invoice, please don't hesitate to reach out.</p>
    <p>Thank you for choosing ${escapeHtml(bizName)}.</p>
    <p style="margin-top:24px;">Warmly,<br/><strong>${escapeHtml(ownerName)}</strong></p>
  `, bizName)

  const result = await sendStudioEmail(auth.db, auth.user.id, {
    businessName: bizName,
    replyTo: auth.profile.email || auth.user.email,
    to: clientEmail,
    subject: `Invoice ${invoice.number || invoice.id} from ${bizName}`,
    html,
  })
  return res.status(result.status).json(result.body)
}
