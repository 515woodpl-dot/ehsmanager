import crypto from 'crypto'
import { getResend, replyAddress, appUrl } from './studioConfig'

// Verified sending domain fallback. The display name is per studio; the
// address can be changed in Settings once the studio verifies its domain.
const DEFAULT_SEND_ADDRESS = process.env.RESEND_FROM_EMAIL || 'hello@elliesheartstrings.com'

const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export const logoUrl = config => config?.branding?.logo
  ? appUrl(`/api/logo/${config.userId}?v=${crypto.createHash('sha1').update(config.branding.logo).digest('hex').slice(0, 8)}`)
  : ''

// Shared base HTML wrapper for all emails. `studio` is a studio config
// (from loadStudioConfig) or, for older callers, just a business name.
export function emailWrap(content, studio = 'Ellie Heartstrings') {
  const branding = typeof studio === 'string' ? { businessName: studio } : studio.branding
  const logo = typeof studio === 'string' ? '' : logoUrl(studio)
  const contact = [branding.phone, branding.website, branding.address].filter(Boolean).map(escapeHtml).join(' · ')
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background: #F9F9F8; font-family: 'Georgia', serif; color: #111110; }
    .wrap { max-width: 600px; margin: 40px auto; background: #fff; border: 1px solid #E8E8E7; border-radius: 12px; overflow: hidden; }
    .header { padding: 32px 40px 24px; border-bottom: 1px solid #E8E8E7; }
    .logo { font-family: Georgia, serif; font-size: 20px; letter-spacing: -0.3px; color: #111110; }
    .logo span { display: block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #9B9B98; margin-top: 2px; font-family: Arial, sans-serif; font-weight: normal; }
    .logo img { display: block; max-height: 64px; max-width: 220px; }
    .body { padding: 32px 40px; }
    h1 { font-family: Georgia, serif; font-size: 22px; margin: 0 0 16px; letter-spacing: -0.3px; }
    p { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #444; margin: 0 0 14px; }
    .box { background: #F9F9F8; border: 1px solid #E8E8E7; border-radius: 8px; padding: 20px 24px; margin: 20px 0; }
    .box-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #E8E8E7; font-family: Arial, sans-serif; font-size: 13px; }
    .box-row:last-child { border-bottom: none; }
    .box-row .label { color: #9B9B98; }
    .box-row .value { color: #111110; font-weight: 500; }
    .btn { display: inline-block; background: #111110; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-family: Arial, sans-serif; font-size: 14px; font-weight: 500; margin: 8px 0; }
    .footer { padding: 20px 40px; border-top: 1px solid #E8E8E7; font-family: Arial, sans-serif; font-size: 12px; color: #9B9B98; }
    .amount { font-family: Georgia, serif; font-size: 28px; letter-spacing: -0.5px; color: #111110; margin: 4px 0 20px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo">${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(branding.businessName)}" />` : `${escapeHtml(branding.businessName)}<span>Photography</span>`}</div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">${escapeHtml(branding.businessName)}${contact ? `<br/>${contact}` : ''}</div>
  </div>
</body>
</html>`
}

// The owner's sign-off: their saved signature, or "Warmly, <first name>".
export function signOffHtml(config) {
  const { signature, ownerName, businessName } = config.branding
  if (signature) return `<p style="margin-top:24px;">${escapeHtml(signature).replace(/\n/g, '<br/>')}</p>`
  return `<p style="margin-top:24px;">Warmly,<br/><strong>${escapeHtml((ownerName || '').split(' ')[0] || businessName)}</strong></p>`
}

// Sends one email for a studio. With a client, replies are routed back
// into the app (when a receiving domain is set) and/or to the studio email.
export async function sendStudioEmail(config, { to, subject, html, clientId = null, replyToStudio = true, replyTo: replyToOverride = null }) {
  const resend = getResend(config)
  if (!resend) return { error: 'Email is not set up yet. Add your Resend API key in Settings.' }
  const inbound = clientId ? replyAddress(config, clientId) : null
  const studioEmail = config.branding.studioEmail
  const replyTo = replyToOverride ? [replyToOverride] : [
    inbound,
    replyToStudio && studioEmail && (!inbound || config.integrations.copyRepliesToStudio) ? studioEmail : null,
  ].filter(Boolean)
  const fromAddress = config.integrations.fromEmail || DEFAULT_SEND_ADDRESS
  try {
    const { data, error } = await resend.emails.send({
      from: `${config.branding.businessName.replace(/[<>"]/g, '')} <${fromAddress}>`,
      replyTo: replyTo.length ? replyTo : undefined,
      to,
      subject,
      html,
    })
    if (error) return { error: error.message || 'Email could not be sent' }
    return { id: data.id }
  } catch (err) {
    return { error: err.message || 'Email could not be sent' }
  }
}
