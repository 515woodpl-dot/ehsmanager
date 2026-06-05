import stripe from '../../lib/stripe'
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { amount, invoiceId, clientName, description } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), currency: 'usd',
      metadata: { invoiceId: invoiceId || '', clientName: clientName || '', description: description || '' },
      automatic_payment_methods: { enabled: true },
    })
    res.status(200).json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
