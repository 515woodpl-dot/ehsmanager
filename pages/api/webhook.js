import { createServiceClient } from '../../lib/pibase'
import { stripeConfigFor } from '../../lib/integrations'

export const config = { api: { bodyParser: false } }

const MAX_BODY = 1024 * 1024
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY) { reject(new Error('Payload too large')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Each studio registers https://<app>/api/webhook?account=<their user id> in
// their own Stripe dashboard (shown under Integrations). The legacy URL with no
// `account` belongs to the studio owner.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const accountId = String(req.query.account || process.env.STUDIO_OWNER_USER_ID || '')
  if (!UUID.test(accountId)) return res.status(400).json({ error: 'Unknown webhook account' })

  const db = createServiceClient()
  if (!db) return res.status(503).json({ error: 'Database not configured' })
  const stripeConfig = await stripeConfigFor(db, accountId)
  if (!stripeConfig?.webhookSecret) return res.status(503).json({ error: 'Stripe webhook is not configured' })

  let event
  try {
    const rawBody = await getRawBody(req)
    event = stripeConfig.stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], stripeConfig.webhookSecret)
  } catch (err) {
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object
    // Delayed methods (ACH etc.) complete first and pay later via the async event.
    if (session.payment_status !== 'paid') return res.status(200).json({ received: true })
    const { invoiceId, userId } = session.metadata || {}
    // A studio's webhook may only settle that studio's invoices.
    if (!invoiceId || userId !== accountId) return res.status(200).json({ received: true })

    const { data: invoice, error: lookupError } = await db.from('invoices')
      .select('id, amount, paid, status, payment_intent_id').eq('id', invoiceId).eq('user_id', accountId).single()
    if (lookupError || !invoice) {
      console.error('[webhook] paid checkout for missing invoice', invoiceId, session.id)
      return res.status(200).json({ received: true })
    }
    const paymentId = String(session.payment_intent || session.id)
    if (invoice.payment_intent_id === paymentId) return res.status(200).json({ received: true }) // redelivery

    const amount = Number(invoice.amount) || 0
    const paid = Math.min(amount, Math.round((Number(invoice.paid) || 0) * 100 + (session.amount_total || 0)) / 100)
    const { error } = await db.from('invoices').update({
      paid,
      status: paid >= amount ? 'paid' : 'partial',
      payment_method: 'Stripe',
      paid_at: new Date().toISOString(),
      payment_intent_id: paymentId,
      updated_at: new Date().toISOString(),
    }).eq('id', invoiceId).eq('user_id', accountId)
      .or(`payment_intent_id.is.null,payment_intent_id.neq.${paymentId}`)
    if (error) {
      console.error('[webhook] unable to record payment', error.message)
      return res.status(500).json({ error: 'Unable to update invoice' }) // Stripe retries
    }
  }

  return res.status(200).json({ received: true })
}
