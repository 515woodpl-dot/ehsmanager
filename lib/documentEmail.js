import { emailWrap, sendStudioEmail, signOffHtml } from './email'
export { appUrl } from './studioConfig'

export const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// The studio's own message (from the send dialog), as HTML paragraphs.
export function messageHtml(message) {
  const text = typeof message === 'string' ? message.trim().slice(0, 5000) : ''
  return text ? text.split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('') : ''
}

export function cleanSubject(subject) {
  return typeof subject === 'string' ? subject.replace(/[\r\n]+/g, ' ').trim().slice(0, 200) : ''
}

// Loads the linked client for a document row and checks it can be emailed.
export async function loadEmailClient(auth, clientId) {
  if (!clientId) return { error: 'This has no linked client' }
  const { data: client } = await auth.db.from('clients').select('id, name, email')
    .eq('id', clientId).eq('user_id', auth.user.id).single()
  if (!client?.email) return { error: 'Client email is missing' }
  return { client }
}

// Sends a document email: heading, the studio's message (or a fallback),
// a call-to-action button, optional details, and the owner's sign-off.
export async function sendDocumentEmail(res, auth, { client, subject, message, fallbackHtml, heading, buttonUrl, buttonLabel, detailsHtml = '' }) {
  const config = auth.config
  const html = emailWrap(`
    <h1>${escapeHtml(heading)}</h1>
    ${messageHtml(message) || fallbackHtml}
    ${buttonUrl ? `<p><a href="${escapeHtml(buttonUrl)}" class="btn" style="color:#ffffff;">${escapeHtml(buttonLabel)}</a></p>` : ''}
    ${detailsHtml}
    ${signOffHtml(config)}
  `, config)
  const result = await sendStudioEmail(config, {
    to: client.email, clientId: client.id, html,
    subject: cleanSubject(subject) || `${heading} from ${config.branding.businessName}`,
  })
  if (result.error) return res.status(400).json({ error: result.error })
  return res.status(200).json({ id: result.id })
}
