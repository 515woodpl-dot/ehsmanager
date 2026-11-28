// Server only: emails the client a receipt when an online payment comes in
// or the studio records one by hand (the app's own branded email, sent from
// the studio's address). Never throws.
import { emailWrap, sendStudioEmail, signOffHtml } from './email'
import { loadStudioConfig, appUrl } from './studioConfig'
import { createInvoiceToken } from './signingTokens'

const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const money = n => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export async function sendPaymentReceipt(db, { userId, invoiceRow, amount, paidTotal, fallbackEmail = '', method = 'Card (secure payment by Stripe)', paidAt = null }) {
  try {
    let email = '', name = invoiceRow.client_name || ''
    if (invoiceRow.client_id) {
      const { data: client } = await db.from('clients').select('name, email').eq('id', invoiceRow.client_id).eq('user_id', userId).maybeSingle()
      email = client?.email || ''
      name = client?.name || name
    }
    email = email || fallbackEmail
    if (!email) return { skipped: 'no client email' }

    const config = await loadStudioConfig(db, userId)
    const total = Number(invoiceRow.amount) || 0
    const balance = Math.max(0, Math.round((total - paidTotal) * 100) / 100)
    const label = invoiceRow.number || 'your invoice'
    let link = ''
    try { link = appUrl(`/invoice/${createInvoiceToken(invoiceRow.id)}`) } catch {}
    const first = esc((name || '').trim().split(/\s+/)[0] || 'there')
    const date = new Date(paidAt || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
    const html = emailWrap(`
      <h1>Payment received — thank you!</h1>
      <p>Hi ${first},</p>
      <p>We received your payment of <strong>${money(amount)}</strong> for invoice ${esc(label)}. This email is your receipt.</p>
      <div class="box">
        <div class="box-row"><span class="label">Invoice</span><span class="value">${esc(label)}</span></div>
        <div class="box-row"><span class="label">Amount paid</span><span class="value">${money(amount)}</span></div>
        <div class="box-row"><span class="label">Date</span><span class="value">${esc(date)}</span></div>
        <div class="box-row"><span class="label">Paid by</span><span class="value">${esc(method)}</span></div>
        <div class="box-row"><span class="label">Invoice total</span><span class="value">${money(total)}</span></div>
        <div class="box-row"><span class="label">${balance > 0 ? 'Balance remaining' : 'Status'}</span><span class="value">${balance > 0 ? money(balance) : 'Paid in full'}</span></div>
      </div>
      ${link ? `<p><a href="${esc(link)}" class="btn" style="color:#ffffff;">View your invoice</a></p>` : ''}
      <p>You can print the invoice or save it as a PDF from that page.</p>
      ${signOffHtml(config)}
    `, config)
    const result = await sendStudioEmail(config, { to: email, clientId: invoiceRow.client_id || null, subject: `Payment received — ${label} · ${config.branding.businessName}`, html })
    if (result.error) { console.error('[receipt]', result.error); return { error: result.error } }
    return { sent: true, to: email }
  } catch (error) {
    console.error('[receipt]', error.message)
    return { error: error.message }
  }
}
