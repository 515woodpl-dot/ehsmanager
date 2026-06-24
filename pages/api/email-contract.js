import { resend, FROM, emailWrap } from '../../lib/email'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { contract, clientEmail, clientName } = req.body
  if (!contract || !clientEmail) return res.status(400).json({ error: 'Missing fields' })

  const html = emailWrap(`
    <h1>${contract.type || 'Photography Agreement'}</h1>
    <p>Hi ${clientName || 'there'},</p>
    <p>Please review your photography contract below. Once you've read through the terms, you can sign it by logging into the client portal or replying to this email.</p>

    <div class="box">
      <div class="box-row"><span class="label">Contract</span><span class="value">${contract.type || 'Photography Agreement'}</span></div>
      <div class="box-row"><span class="label">Sent</span><span class="value">${contract.sent || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
      <div class="box-row"><span class="label">Status</span><span class="value">Awaiting signature</span></div>
    </div>

    ${contract.body ? `<div class="box" style="font-size:13px;line-height:1.8;font-family:Arial,sans-serif;color:#444;white-space:pre-wrap;max-height:400px;overflow:auto;">${contract.body.substring(0, 2000)}${contract.body.length > 2000 ? '...' : ''}</div>` : ''}

    <p>If you have any questions about the contract terms, please reach out before signing.</p>
    <p style="margin-top:24px;">Warmly,<br/><strong>Ellie</strong></p>
  `)

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: clientEmail,
      subject: `Your ${contract.type || 'Photography Agreement'} — Ellie Heartstrings`,
      html,
    })
    if (error) return res.status(400).json({ error })
    return res.status(200).json({ id: data.id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
