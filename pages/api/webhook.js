import stripe from '../../lib/stripe'
import { createServiceClient } from '../../lib/supabase'
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
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
      const intent = event.data.object
      const db = createServiceClient()
      if (!db) return res.status(503).json({ error: 'Database not configured' })
      const { invoiceId, userId } = intent.metadata || {}
      if (!invoiceId || !userId) break
      const { data: invoice, error: lookupError } = await db.from('invoices')
        .select('id, amount, paid, status').eq('id', invoiceId).eq('user_id', userId)
        .eq('payment_intent_id', intent.id).single()
      if (lookupError || !invoice) return res.status(500).json({ error: 'Linked invoice not found' })
      if (invoice.status === 'paid') break
      if (Math.round((Number(invoice.amount) - Number(invoice.paid)) * 100) !== intent.amount_received) {
        return res.status(500).json({ error: 'Payment amount does not match invoice balance' })
      }
      const { error } = await db.from('invoices').update({
        paid: invoice.amount, status: 'paid', payment_method: 'Stripe', paid_at: new Date().toISOString(),
      }).eq('id', invoiceId).eq('user_id', userId).eq('payment_intent_id', intent.id)
      if (error) return res.status(500).json({ error: 'Unable to update invoice' })
      break
    }
    case 'payment_intent.payment_failed': {
      console.log(`❌ Payment failed: ${event.data.object.metadata.clientName}`)
      break
    }
  }
  res.status(200).json({ received: true })
}
