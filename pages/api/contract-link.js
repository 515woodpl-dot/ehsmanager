import { requireUser } from '../../lib/api-auth'
import { createContractToken } from '../../lib/signingTokens'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  const id = String(req.body?.contractId || '')
  if (!id) return res.status(400).json({ error: 'Contract ID is required' })

  const { data: contract, error } = await auth.db.from('contracts')
    .select('id, client_id, status').eq('id', id).eq('user_id', auth.user.id).single()
  if (error || !contract) return res.status(404).json({ error: 'Contract not found' })
  if (contract.status !== 'pending') return res.status(409).json({ error: 'Contract is already signed' })
  if (!contract.client_id) return res.status(400).json({ error: 'Link a client before sharing the contract' })

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) return res.status(503).json({ error: 'NEXT_PUBLIC_APP_URL is not configured' })
    const url = new URL(`/sign/${createContractToken(contract.id)}`, baseUrl).toString()
    return res.status(200).json({ url })
  } catch {
    return res.status(503).json({ error: 'Contract signing is not configured' })
  }
}
