import { resend, fromFor, emailWrap } from '../../lib/email'
import { requireUser } from '../../lib/api-auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireUser(req, res)
  if (!auth) return
  const bizName = auth.profile.business_name || 'My Studio'
  const ownerName = (auth.profile.full_name || '').split(' ')[0] || bizName

  const { invoice, clientEmail, clientName } = req.body
  if (!invoice || !clientEmail) return res.status(400).json({ error: 'Missing fields' })
  if (!resend) return res.status(500).json({ error: 'Email service is not configured' })

  const pct = invoice.amount > 0 ? Math.round((invoice.paid / invoice.amount) * 100) : 0
  const owing = invoice.amount - invoice.paid
  const fmt = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
  const fmtDate = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'

  const statusLabel = invoice.status === 'paid' ? 'Paid in full' : invoice.status === 'partial' ? `${fmt(invoice.paid)} paid · ${fmt(owing)} remaining` : `${fmt(invoice.amount)} due`

  const lineItemsHtml = invoice.lineItems?.length
    ? invoice.lineItems.map(li => `<div class="box-row"><span class="label">${li.description || li.name || 'Item'}${li.qty > 1 ? ` ×${li.qty}` : ''}</span><span class="value">${fmt((li.price || 0) * (li.qty || 1))}</span></div>`).join('')
    : ''

  const html = emailWrap(`
    <h1>Invoice ${invoice.number || invoice.id}</h1>
    <p>Hi ${clientName || 'there'},</p>
    <p>Please find your invoice details below. ${invoice.status !== 'paid' ? 'Payment is due by ' + fmtDate(invoice.due) + '.' : 'Thank you for your payment!'}</p>

    <div class="amount">${fmt(invoice.amount)}</div>

    <div class="box">
      ${lineItemsHtml}
      <div class="box-row"><span class="label">Invoice</span><span class="value">${invoice.number || invoice.id}</span></div>
      <div class="box-row"><span class="label">Due date</span><span class="value">${fmtDate(invoice.due)}</span></div>
      <div class="box-row"><span class="label">Status</span><span class="value">${statusLabel}</span></div>
      ${invoice.note ? `<div class="box-row"><span class="label">Note</span><span class="value">${invoice.note}</span></div>` : ''}
    </div>

    <p>If you have any questions about this invoice, please don't hesitate to reach out.</p>
    <p>Thank you for choosing ${bizName}.</p>
    <p style="margin-top:24px;">Warmly,<br/><strong>${ownerName}</strong></p>
  `, bizName)

  try {
    const { data, error } = await resend.emails.send({
      from: fromFor(bizName),
      reply_to: auth.profile.email || undefined,
      to: clientEmail,
      subject: `Invoice ${invoice.number || invoice.id} from ${bizName}`,
      html,
    })
    if (error) return res.status(400).json({ error })
    return res.status(200).json({ id: data.id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
