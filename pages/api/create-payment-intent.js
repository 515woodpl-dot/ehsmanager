import stripe from '../../lib/stripe'
import { requireUser } from '../../lib/api-auth'
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' })
  const invoiceId = req.body?.invoiceId
  if (!invoiceId) return res.status(400).json({ error: 'Invoice ID is required' })
  const { data: invoice, error: lookupError } = await auth.db.from('invoices')
    .select('id, amount, paid, status, payment_intent_id')
    .eq('id', invoiceId).eq('user_id', auth.user.id).single()
  if (lookupError || !invoice) return res.status(404).json({ error: 'Invoice not found' })
  const cents = Math.round((Number(invoice.amount) - Number(invoice.paid)) * 100)
  if (invoice.status === 'paid' || cents <= 0) return res.status(409).json({ error: 'Invoice is already paid' })
  try {
    if (invoice.payment_intent_id) {
      const existing = await stripe.paymentIntents.retrieve(invoice.payment_intent_id)
      if (existing.status !== 'canceled' && existing.status !== 'succeeded' && existing.amount === cents) {
        return res.status(200).json({ clientSecret: existing.client_secret })
      }
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: cents, currency: 'usd',
      metadata: { invoiceId: invoice.id, userId: auth.user.id },
      automatic_payment_methods: { enabled: true },
    })
    const { error } = await auth.db.from('invoices').update({ payment_intent_id: paymentIntent.id })
      .eq('id', invoice.id).eq('user_id', auth.user.id)
    if (error) return res.status(500).json({ error: 'Unable to link payment to invoice' })
    res.status(200).json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
