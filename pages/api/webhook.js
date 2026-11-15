import { createServiceClient } from '../../lib/pibase'
import { notifyStudio } from '../../lib/push'
import { defaultStudioId, getStripe, loadStudioConfig } from '../../lib/studioConfig'
import { applyPayment, invoiceFromRow } from '../../lib/invoices'
export const config = { api: { bodyParser: false } }
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const sig = req.headers['stripe-signature']
  // Keys come from the studio's Settings (?studio=<id> on the webhook URL,
  // or STUDIO_OWNER_USER_ID), falling back to the server environment.
  const serviceDb = createServiceClient()
  const studioId = defaultStudioId(req)
  const config = serviceDb && studioId ? await loadStudioConfig(serviceDb, studioId) : null
  const stripe = config ? getStripe(config) : null
  const webhookSecret = config?.secrets.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret) return res.status(503).json({ error: 'Stripe webhook is not configured' })
  let event
  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const db = createServiceClient()
      if (!db) return res.status(503).json({ error: 'Database not configured' })
      // Trust only what Stripe itself says about this payment, fetched with
      // the studio's own secret key: an event signed with a made-up webhook
      // secret names a payment that doesn't exist in that Stripe account.
      let intent
      try {
        intent = await stripe.paymentIntents.retrieve(event.data.object.id)
      } catch (err) {
        console.error('[webhook] payment not found in Stripe', err.message)
        return res.status(400).json({ error: 'Payment not found in this Stripe account' })
      }
      if (intent.status !== 'succeeded') break
      const { invoiceId, label } = intent.metadata || {}
      // The invoice must belong to the studio whose keys verified the event.
      const userId = config.userId
      if (!invoiceId || !userId || (intent.metadata?.userId && intent.metadata.userId !== userId)) {
        console.error('[webhook] payment for another studio ignored', { invoiceId, studio: userId })
        break
      }
      // Payments can be one installment or the whole balance. Each Stripe
      // payment is logged once (by its id), so a retried webhook is a no-op.
      // The update only applies if nobody changed `paid` in between.
      let credited = false
      for (let attempt = 0; attempt < 3 && !credited; attempt++) {
        const { data: row, error: lookupError } = await db.from('invoices')
          .select('id, amount, paid, status, due, line_items').eq('id', invoiceId).eq('user_id', userId).maybeSingle()
        if (lookupError) return res.status(500).json({ error: 'Unable to read the invoice, retry' })
        if (!row) { console.error('[webhook] invoice not found for this studio', invoiceId); credited = true; break }
        const invoice = invoiceFromRow(row)
        if ((invoice.lineData.payments || []).some(p => p.intentId === intent.id)) { credited = true; break }
        const updated = applyPayment(invoice, { id: `stripe-${intent.id}`, amount: intent.amount_received / 100, method: 'Stripe', intentId: intent.id })
        const { data: saved, error } = await db.from('invoices').update({
          paid: updated.paid, status: updated.status, payment_method: 'Stripe', paid_at: updated.paidAt,
          line_items: updated.lineData, updated_at: new Date().toISOString(),
        }).eq('id', invoiceId).eq('user_id', userId).eq('paid', row.paid).select('id')
        if (error) return res.status(500).json({ error: 'Unable to update invoice' })
        if (saved?.length) {
          credited = true
          await notifyStudio(db, userId, { type: 'payments', title: `💰 Payment received`, body: `$${(intent.amount_received / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} paid online${label ? ` · ${label}` : ''}${updated.status === 'paid' ? ' · invoice paid in full' : ''}`, url: '/?view=invoices', tag: `payment-${intent.id}` })
        }
      }
      if (!credited) return res.status(500).json({ error: 'Invoice changed while recording payment, retry' })
      break
    }
    case 'payment_intent.payment_failed': {
      console.log(`❌ Payment failed: ${event.data.object.metadata.clientName}`)
      break
    }
  }
  res.status(200).json({ received: true })
}
