import { emailWrap, sendStudioEmail, signOffHtml } from '../../lib/email'
import { requireUser } from '../../lib/api-auth'
import { createInvoiceToken } from '../../lib/signingTokens'
import { invoiceFromRow, payableOptions, paymentSchedule } from '../../lib/invoices'

const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireUser(req, res)
  if (!auth) return
  const bizName = auth.config.branding.businessName
  const ownerName = (auth.config.branding.ownerName || '').split(' ')[0] || bizName

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

  const pct = invoice.amount > 0 ? Math.round((invoice.paid / invoice.amount) * 100) : 0
  const owing = invoice.amount - invoice.paid
  const fmt = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
  const fmtDate = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'

  const plan = paymentSchedule(invoiceFromRow(row))
  const dueNow = payableOptions(invoiceFromRow(row))[0] || null
  const planHtml = plan.length > 1
    ? plan.map(p => `<div class="box-row"><span class="label">${escapeHtml(p.label)}${p.due ? ` · due ${fmtDate(p.due)}` : ''}</span><span class="value">${p.status === 'paid' ? 'Paid' : fmt(p.remaining)}</span></div>`).join('')
    : ''
  const statusLabel = invoice.status === 'paid' ? 'Paid in full' : invoice.status === 'partial' ? `${fmt(invoice.paid)} paid · ${fmt(owing)} remaining` : `${fmt(invoice.amount)} due`

  const lineItemsHtml = invoice.lineItems?.length
    ? invoice.lineItems.map(li => `<div class="box-row"><span class="label">${escapeHtml(li.name || li.description || 'Item')}${li.qty > 1 ? ` ×${Number(li.qty)}` : ''}</span><span class="value">${fmt((li.price || 0) * (li.qty || 1))}</span></div>`).join('')
    : ''

  const label = invoice.number || 'Invoice'
  let viewUrl = null
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://manager.elliesheartstrings.com'
    viewUrl = new URL(`/invoice/${createInvoiceToken(invoice.id)}`, baseUrl).toString()
  } catch {
    viewUrl = null
  }

  // The studio can write its own message in the send dialog; keep the
  // default wording for callers that don't send one.
  const customMessage = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 5000) : ''
  const intro = customMessage
    ? customMessage.split(/\n{2,}/).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`).join('')
    : `<p>Hi ${escapeHtml(clientName || 'there')},</p>
    <p>Please find your invoice details below. ${invoice.status !== 'paid' ? (dueNow ? `${plan.length > 1 ? `Your ${escapeHtml(dueNow.label.toLowerCase())} of ` : ''}${fmt(dueNow.amount)} is due${dueNow.due ? ' by ' + fmtDate(dueNow.due) : ''}.` : '') : 'Thank you for your payment!'}</p>`
  const customSubject = typeof req.body?.subject === 'string' ? req.body.subject.replace(/[\r\n]+/g, ' ').trim().slice(0, 200) : ''

  const html = emailWrap(`
    <h1>Invoice ${escapeHtml(label)}</h1>
    ${intro}
    ${viewUrl ? `<p><a href="${escapeHtml(viewUrl)}" class="btn" style="color:#ffffff;">View invoice ${escapeHtml(label)}</a></p>` : ''}

    ${dueNow
      ? `<p style="margin:16px 0 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9B9B98;">${plan.length > 1 ? `Due now · ${escapeHtml(dueNow.label)}` : 'Amount due'}</p>
    <div class="amount">${fmt(dueNow.amount)}</div>${dueNow.due ? `<p>Due by ${fmtDate(dueNow.due)}</p>` : ''}`
      : `<div class="amount">${fmt(invoice.amount)}</div><p>Paid in full — thank you!</p>`}

    ${planHtml ? `<div class="box"><div class="box-row"><span class="label"><strong>Payment plan</strong></span><span class="value"></span></div>${planHtml}</div>` : ''}

    <div class="box">
      ${lineItemsHtml}
      <div class="box-row"><span class="label">Invoice</span><span class="value">${escapeHtml(label)}</span></div>
      <div class="box-row"><span class="label">Invoice total</span><span class="value">${fmt(invoice.amount)}</span></div>
      <div class="box-row"><span class="label">Status</span><span class="value">${statusLabel}</span></div>
      ${invoice.note ? `<div class="box-row"><span class="label">Note</span><span class="value">${escapeHtml(invoice.note)}</span></div>` : ''}
    </div>

    ${customMessage ? '' : `<p>If you have any questions about this invoice, please don't hesitate to reach out.</p>
    <p>Thank you for choosing ${escapeHtml(bizName)}.</p>`}
    ${signOffHtml(auth.config)}
  `, auth.config)

  const result = await sendStudioEmail(auth.config, {
    to: clientEmail,
    clientId: row.client_id,
    subject: customSubject || `Invoice ${label} from ${bizName}`,
    html,
  })
  if (result.error) return res.status(400).json({ error: result.error })
  return res.status(200).json({ id: result.id })
}
