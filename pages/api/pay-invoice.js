import { createServiceClient } from '../../lib/pibase'
import { getStripe, loadStudioConfig, appUrl } from '../../lib/studioConfig'
import { verifyInvoiceToken } from '../../lib/signingTokens'
import { invoiceFromRow, payableOptions } from '../../lib/invoices'

// Public: starts a Stripe Checkout payment for an invoice from the client's
// signed invoice link. The amount always comes from the invoice on the
// server — the next installment, or the full balance when the studio
// allows it — never from the browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const parsed = verifyInvoiceToken(req.body?.token)
  if (!parsed) return res.status(404).json({ error: 'This invoice link is not valid' })
  const db = createServiceClient()
  if (!db) return res.status(503).json({ error: 'Payments are not available right now' })

  const { data: row } = await db.from('invoices').select('id, user_id, client_id, number, amount, paid, due, status, line_items')
    .eq('id', parsed.invoiceId).single()
  if (!row) return res.status(404).json({ error: 'Invoice not found' })
  const config = await loadStudioConfig(db, row.user_id)
  const stripe = getStripe(config)
  if (!stripe) return res.status(503).json({ error: 'Online payment is not set up. Please contact us to pay.' })

  const invoice = invoiceFromRow(row)
  const option = payableOptions(invoice).find(o => o.key === req.body?.option)
  if (!option) return res.status(409).json({ error: invoice.status === 'paid' ? 'This invoice is already paid' : 'That payment option is not available' })

  let email
  if (row.client_id) {
    const { data: client } = await db.from('clients').select('email').eq('id', row.client_id).eq('user_id', row.user_id).maybeSingle()
    email = client?.email || undefined
  }
  const back = appUrl(`/invoice/${req.body.token}`)
  const label = row.number || 'Invoice'
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        quantity: 1,
        price_data: { currency: 'usd', unit_amount: Math.round(option.amount * 100), product_data: { name: `${label} — ${option.label}`, description: config.branding.businessName } },
      }],
      // The webhook reads these to credit the right invoice.
      payment_intent_data: { metadata: { invoiceId: row.id, userId: row.user_id, option: option.key, label: option.label } },
      metadata: { invoiceId: row.id, userId: row.user_id },
      success_url: `${back}?paid=1`,
      cancel_url: back,
    })
    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('[pay-invoice]', error.message)
    return res.status(502).json({ error: 'Payment could not be started. Please try again.' })
  }
}
