import { resend, FROM, emailWrap } from '../../lib/email'

// Sends YOU a notification when someone fills out the public contact form
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { lead } = req.body
  if (!lead) return res.status(400).json({ error: 'Missing lead' })

  const fmtDate = () => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

  const html = emailWrap(`
    <h1>New Inquiry</h1>
    <p>You have a new lead from your contact form.</p>

    <div class="box">
      ${lead.name ? `<div class="box-row"><span class="label">Name</span><span class="value">${lead.name}</span></div>` : ''}
      ${lead.email ? `<div class="box-row"><span class="label">Email</span><span class="value">${lead.email}</span></div>` : ''}
      ${lead.phone ? `<div class="box-row"><span class="label">Phone</span><span class="value">${lead.phone}</span></div>` : ''}
      ${lead.interest ? `<div class="box-row"><span class="label">Interested in</span><span class="value">${Array.isArray(lead.interest) ? lead.interest.join(', ') : lead.interest}</span></div>` : ''}
      <div class="box-row"><span class="label">Received</span><span class="value">${fmtDate()}</span></div>
    </div>

    ${lead.message ? `<div class="box" style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#444;"><strong>Message:</strong><br/><br/>${lead.message}</div>` : ''}

    <a href="https://manager.elliesheartstrings.com" class="btn">Open Studio Manager</a>

    <p style="margin-top:20px;font-size:13px;color:#9B9B98;">This lead has been automatically added to your client list.</p>
  `)

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: 'hello@elliesheartstrings.com',
      reply_to: lead.email || undefined,
      subject: `New inquiry from ${lead.name || 'your contact form'}`,
      html,
    })
    if (error) return res.status(400).json({ error })
    return res.status(200).json({ id: data.id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
