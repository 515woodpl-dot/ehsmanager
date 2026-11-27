/**
 * lib/leadEmails.js — 515Studio client-facing email for new website inquiries.
 * Standalone HTML (table layout, inline styles) so it renders in Gmail/Outlook/Apple Mail.
 */
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const NAVY = '#151A2E', CREAM = '#F5F0E8', LIME = '#C7FF3F', RUST = '#B7410E'

export function clientConfirmationEmail({ name, interest, message, company, logoUrl, siteUrl = 'https://515studio.net', replyEmail = 'hello@515studio.net' }) {
  const first = esc((name || '').trim().split(/\s+/)[0] || 'there')
  const preview = `Thanks ${first} — we got your info and will reach out soon.`
  const rows = [
    interest && ['Interested in', interest],
    company && ['Company', company],
  ].filter(Boolean)
  const summary = (rows.length || message) ? `
    <tr><td style="padding:0 40px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E4DCCB;border-radius:10px">
        <tr><td style="padding:18px 22px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${RUST};font-weight:bold">What you sent us</td></tr>
        ${rows.map(([k, v]) => `<tr><td style="padding:0 22px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${NAVY}"><span style="color:#7a7a85">${esc(k)}:</span> <strong>${esc(v)}</strong></td></tr>`).join('')}
        ${message ? `<tr><td style="padding:6px 22px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#3b3f52;white-space:pre-wrap">${esc(message.length > 600 ? message.slice(0, 600) + '…' : message)}</td></tr>` : '<tr><td style="padding-bottom:12px"></td></tr>'}
      </table>
    </td></tr>` : ''
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>We got your info — 515Studio</title></head>
<body style="margin:0;padding:0;background:${CREAM}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CREAM}">${preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM}"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${CREAM};border-radius:14px;overflow:hidden;border:1px solid #E4DCCB">
    <tr><td style="background:${NAVY};padding:28px 40px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#ffffff;border-radius:12px;padding:10px 14px"><img src="${esc(logoUrl)}" alt="515Studio" height="64" style="display:block;height:64px;width:auto;border:0"></td>
        <td style="padding-left:16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${CREAM};letter-spacing:-.2px">515Studio</td>
      </tr></table>
    </td></tr>
    <tr><td style="height:5px;background:${LIME};font-size:0;line-height:0">&nbsp;</td></tr>
    <tr><td style="padding:40px 40px 12px">
      <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${RUST};font-weight:bold">Message received</p>
      <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:${NAVY};font-weight:normal">Thanks, ${first} — we got your info.</h1>
      <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#3b3f52">Your project inquiry is in. Someone from our team is reading it now and <strong>we will reach out to you soon</strong> to talk about next steps.</p>
      <p style="margin:0 0 26px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#3b3f52">Nothing else is needed from you. If you remember something to add, just reply to this email.</p>
    </td></tr>
    ${summary}
    <tr><td style="padding:0 40px 40px">
      <a href="${esc(siteUrl)}" style="display:inline-block;background:${NAVY};color:${CREAM};text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;padding:13px 26px;border-radius:8px;border-bottom:3px solid ${LIME}">Visit 515studio.net</a>
      <p style="margin:26px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#3b3f52">Talk soon,<br><strong style="color:${NAVY}">The 515Studio team</strong></p>
    </td></tr>
    <tr><td style="background:${NAVY};padding:20px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#b9bccb">
      515Studio · Strategy · Web Development · Digital Marketing · SEO<br>
      <a href="mailto:${esc(replyEmail)}" style="color:${LIME};text-decoration:none">${esc(replyEmail)}</a> · <a href="${esc(siteUrl)}" style="color:${LIME};text-decoration:none">515studio.net</a><br>
      <span style="color:#8a8ea3">You received this because you submitted the contact form at 515studio.net.</span>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`
}
