import { requireUser } from '../../lib/api-auth'
import { stripeConfigFor } from '../../lib/integrations'
import { balanceCents, payUrlFor } from '../../lib/payments'

// Owner-only: returns the client-facing payment link for an invoice.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  const id = String(req.body?.invoiceId || '')
  if (!id) return res.status(400).json({ error: 'Invoice ID is required' })

  const { data: invoice } = await auth.db.from('invoices').select('id, amount, paid, status')
    .eq('id', id).eq('user_id', auth.user.id).single()
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
  if (invoice.status === 'paid' || balanceCents(invoice) <= 0) return res.status(409).json({ error: 'Invoice is already paid' })
  if (!await stripeConfigFor(auth.db, auth.user.id)) return res.status(503).json({ error: 'Connect Stripe under Integrations first' })

  const url = payUrlFor(invoice.id)
  if (!url) return res.status(503).json({ error: 'NEXT_PUBLIC_APP_URL and CONTRACT_SIGNING_SECRET must be configured' })
  return res.status(200).json({ url })
}
