import { requireUser } from '../../lib/api-auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  return res.status(200).json({
    pibase: Boolean(process.env.NEXT_PUBLIC_PIBASE_URL && process.env.NEXT_PUBLIC_PIBASE_ANON_KEY && process.env.PIBASE_SERVICE_KEY),
    resend: Boolean(process.env.RESEND_API_KEY),
    stripe: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
  })
}
