import { createServiceClient } from '../../lib/pibase'
import { verifyQuestionnaireToken } from '../../lib/signingTokens'

// Public endpoint: the client submits answers from the emailed link.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const parsed = verifyQuestionnaireToken(req.body?.token)
  if (!parsed) return res.status(404).json({ error: 'This questionnaire link is not valid' })
  const db = createServiceClient()
  if (!db) return res.status(503).json({ error: 'Service is not configured' })

  const { data: row } = await db.from('questionnaires').select('id, questions, status').eq('id', parsed.questionnaireId).single()
  if (!row) return res.status(404).json({ error: 'Questionnaire not found' })
  if (row.status === 'completed') return res.status(409).json({ error: 'This questionnaire has already been submitted' })

  // Only keep answers for questions that exist, as trimmed strings.
  const questions = Array.isArray(row.questions) ? row.questions : row.questions?.items || []
  const incoming = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {}
  const answers = {}
  for (const q of questions) {
    const value = incoming[q.id]
    if (typeof value === 'string' && value.trim()) answers[q.id] = value.trim().slice(0, 5000)
  }
  if (!Object.keys(answers).length) return res.status(400).json({ error: 'Please answer at least one question' })

  const { error } = await db.from('questionnaires')
    .update({ answers: { ...answers, submittedAt: new Date().toISOString() }, status: 'completed' })
    .eq('id', row.id).neq('status', 'completed')
  if (error) return res.status(500).json({ error: 'Your answers could not be saved. Please try again.' })
  return res.status(200).json({ ok: true })
}
