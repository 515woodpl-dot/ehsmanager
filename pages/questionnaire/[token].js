import { useState } from 'react'
import { createServiceClient } from '../../lib/pibase'
import { loadStudioConfig } from '../../lib/studioConfig'
import { logoUrl } from '../../lib/email'
import { verifyQuestionnaireToken } from '../../lib/signingTokens'
import PublicDocument from '../../components/PublicDocument'

export default function QuestionnairePage({ token, questionnaire, businessName, logo }) {
  const [answers, setAnswers] = useState({})
  const [done, setDone] = useState(questionnaire.status === 'completed')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (id, value) => setAnswers(a => ({ ...a, [id]: value }))

  const submit = async event => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/submit-questionnaire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, answers }) })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'Your answers could not be sent')
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicDocument pageTitle={`${questionnaire.title} · ${businessName}`} eyebrow={businessName} logo={logo} title={questionnaire.title}
      statusLabel={done ? 'Submitted' : 'Awaiting your answers'} tone={done ? 'done' : 'open'}>
      {done ? (
        <div className="inv-message success">Thank you, {questionnaire.client || 'your answers were received'}! {businessName} has your answers.</div>
      ) : (
        <form onSubmit={submit}>
          {questionnaire.questions.map((q, index) => (
            <div key={q.id} className="inv-field">
              <span>{index + 1}. {q.text}</span>
              {q.type === 'textarea' ? (
                <textarea rows={4} value={answers[q.id] || ''} onChange={e => set(q.id, e.target.value)} />
              ) : q.type === 'yesno' ? (
                <div className="inv-yesno">
                  {['Yes', 'No'].map(option => (
                    <label key={option}><input type="radio" name={q.id} checked={answers[q.id] === option} onChange={() => set(q.id, option)} /> {option}</label>
                  ))}
                </div>
              ) : (
                <input value={answers[q.id] || ''} onChange={e => set(q.id, e.target.value)} />
              )}
            </div>
          ))}
          {error && <div className="inv-message error">{error}</div>}
          <button type="submit" className="inv-button" disabled={busy}>{busy ? 'Sending…' : 'Submit answers'}</button>
        </form>
      )}
    </PublicDocument>
  )
}

export async function getServerSideProps({ params, res }) {
  const parsed = verifyQuestionnaireToken(params.token)
  if (!parsed) return { notFound: true }
  const db = createServiceClient()
  if (!db) return { notFound: true }

  const { data } = await db.from('questionnaires').select('id, user_id, client_name, questions, status').eq('id', parsed.questionnaireId).single()
  if (!data) return { notFound: true }
  const studio = await loadStudioConfig(db, data.user_id)
  const details = Array.isArray(data.questions) ? { items: data.questions } : (data.questions || {})

  res.setHeader('Cache-Control', 'private, no-store')
  return {
    props: {
      token: params.token,
      businessName: studio.branding.businessName,
      logo: logoUrl(studio),
      questionnaire: {
        title: details.title || 'Questionnaire',
        client: (data.client_name || '').split(/\s+/)[0],
        status: data.status || 'sent',
        questions: (details.items || []).filter(q => q?.id && q?.text).map(q => ({ id: String(q.id), text: String(q.text), type: ['text', 'textarea', 'yesno'].includes(q.type) ? q.type : 'text' })),
      },
    },
  }
}
