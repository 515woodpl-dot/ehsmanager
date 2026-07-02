import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

// Verified sending domain. Display name is per-tenant; the address stays
// on the verified domain until tenants can verify their own domains.
const SEND_ADDRESS = 'hello@elliesheartstrings.com'
export const FROM = `Ellie Heartstrings <${SEND_ADDRESS}>`
export const fromFor = (businessName) => `${businessName || 'Studio Manager'} <${SEND_ADDRESS}>`

// Shared base HTML wrapper for all emails
export function emailWrap(content, businessName = 'Ellie Heartstrings') {
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
      <div class="logo">${businessName}<span>Photography</span></div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">${businessName}</div>
  </div>
</body>
</html>`
}
