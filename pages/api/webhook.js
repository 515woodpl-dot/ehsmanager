import stripe from '../../lib/stripe'
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
  if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' })
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
      console.log(`✅ Payment succeeded: ${intent.metadata.clientName} — $${intent.amount_received / 100}`)
      break
    }
    case 'payment_intent.payment_failed': {
      console.log(`❌ Payment failed: ${event.data.object.metadata.clientName}`)
      break
    }
  }
  res.status(200).json({ received: true })
}
