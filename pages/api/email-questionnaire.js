import { requireUser } from '../../lib/api-auth'
import { createQuestionnaireToken } from '../../lib/signingTokens'
import { appUrl, escapeHtml, loadEmailClient, sendDocumentEmail } from '../../lib/documentEmail'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const auth = await requireUser(req, res)
  if (!auth) return

  const questionnaireId = req.body?.questionnaire?.id
  if (!questionnaireId) return res.status(400).json({ error: 'Missing questionnaire ID' })
  const { data: row } = await auth.db.from('questionnaires').select('id, client_id, questions, status')
    .eq('id', questionnaireId).eq('user_id', auth.user.id).single()
  if (!row) return res.status(404).json({ error: 'Questionnaire not found' })
  const { client, error } = await loadEmailClient(auth, row.client_id)
  if (error) return res.status(400).json({ error })

  const title = row.questions?.title || 'Questionnaire'
  let buttonUrl = null
  try { buttonUrl = appUrl(`/questionnaire/${createQuestionnaireToken(row.id)}`) } catch { buttonUrl = null }

  const result = await sendDocumentEmail(res, auth, {
    client,
    subject: req.body?.subject,
    message: req.body?.message,
    heading: title,
    fallbackHtml: `<p>Hi ${escapeHtml(client.name || 'there')},</p><p>Please take a few minutes to answer a few questions before your session.</p>`,
    buttonUrl,
    buttonLabel: 'Answer questionnaire',
  })
  // Record that it went out (unless the client already answered).
  if (res.statusCode === 200 && row.status !== 'completed') {
    await auth.db.from('questionnaires').update({ status: 'sent' }).eq('id', row.id).eq('user_id', auth.user.id)
  }
  return result
}
