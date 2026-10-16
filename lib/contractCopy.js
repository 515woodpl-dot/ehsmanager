// Server helpers for contracts signed by both sides: once the client and
// the studio have both signed, the client is emailed a copy (a link to the
// signed agreement, which they can print or save as PDF).
import { emailWrap, sendStudioEmail, signOffHtml } from './email'
import { createContractToken } from './signingTokens'
import { appUrl } from './studioConfig'

const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export const signedDate = () => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

export const fullySigned = row => row?.status === 'signed' && !!row?.fields?.studioSignature?.name

// Checks a signature from the browser: a typed name, optionally a drawn PNG.
export function cleanSignature({ name, signatureData, method }) {
  const cleanName = String(name || '').trim().slice(0, 120)
  if (!cleanName) return { error: 'Type your full name to sign' }
  const drawn = method === 'draw'
  if (drawn && (!String(signatureData || '').startsWith('data:image/png;base64,') || String(signatureData).length > 350000)) return { error: 'Draw your signature before signing' }
  return { name: cleanName, method: drawn ? 'draw' : 'type', data: drawn ? signatureData : null }
}

// Emails the signed contract to the client (and a copy to the studio).
// Marks it on the row so it is only sent once. Never throws.
export async function sendSignedCopy(db, config, contractId) {
  try {
    const { data: row } = await db.from('contracts').select('id, user_id, client_id, client_name, type, status, signed_by, signed_at, fields')
      .eq('id', contractId).single()
    if (!fullySigned(row) || row.fields?.copySentAt) return { skipped: true }
    let email = row.fields?.signerEmail || ''
    let name = row.client_name || ''
    if (row.client_id) {
      const { data: client } = await db.from('clients').select('name, email').eq('id', row.client_id).eq('user_id', row.user_id).maybeSingle()
      email = client?.email || email
      name = client?.name || name
    }
    if (!email) return { error: 'The client has no email address' }

    const title = row.type || 'Photography Agreement'
    const url = appUrl(`/sign/${createContractToken(row.id)}`)
    const studio = row.fields.studioSignature
    const html = emailWrap(`
      <h1>Your signed ${escapeHtml(title)}</h1>
      <p>Hi ${escapeHtml((name || '').split(/\s+/)[0] || 'there')},</p>
      <p>Your agreement is now signed by both of us. Here is your copy to keep — open it any time to view, print or save it as a PDF.</p>
      <div class="box">
        <div class="box-row"><span class="label">Agreement</span><span class="value">${escapeHtml(title)}</span></div>
        <div class="box-row"><span class="label">Signed by you</span><span class="value">${escapeHtml(row.signed_by || name)}${row.signed_at ? ` · ${escapeHtml(row.signed_at)}` : ''}</span></div>
        <div class="box-row"><span class="label">Signed by ${escapeHtml(config.branding.businessName)}</span><span class="value">${escapeHtml(studio.name)}${studio.at ? ` · ${escapeHtml(studio.at)}` : ''}</span></div>
      </div>
      <p><a href="${escapeHtml(url)}" class="btn" style="color:#ffffff;">View your signed contract</a></p>
      ${signOffHtml(config)}
    `, config)
    const result = await sendStudioEmail(config, { to: email, clientId: row.client_id, subject: `Your signed ${title} — ${config.branding.businessName}`, html })
    if (result.error) return { error: result.error }
    if (config.branding.studioEmail && config.branding.studioEmail !== email) {
      await sendStudioEmail(config, { to: config.branding.studioEmail, subject: `Signed copy sent: ${title} — ${name}`, html, replyToStudio: false })
    }
    const sentAt = new Date().toISOString()
    await db.from('contracts').update({ fields: { ...row.fields, copySentAt: sentAt, copySentTo: email } }).eq('id', row.id)
    return { sent: true, to: email, sentAt }
  } catch (error) {
    console.error('[contract copy]', error)
    return { error: error.message }
  }
}
