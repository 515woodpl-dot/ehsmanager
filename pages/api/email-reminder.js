import { resend, FROM, emailWrap } from '../../lib/email'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { booking, clientEmail, clientName } = req.body
  if (!booking || !clientEmail) return res.status(400).json({ error: 'Missing fields' })

  const fmtDate = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'
  const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}` }

  const html = emailWrap(`
    <h1>Session Reminder</h1>
    <p>Hi ${clientName || 'there'},</p>
    <p>This is a friendly reminder about your upcoming photography session. We're looking forward to seeing you!</p>

    <div class="box">
      <div class="box-row"><span class="label">Session type</span><span class="value">${booking.type || 'Photography Session'}</span></div>
      <div class="box-row"><span class="label">Date</span><span class="value">${fmtDate(booking.date)}</span></div>
      ${booking.time ? `<div class="box-row"><span class="label">Time</span><span class="value">${fmtTime(booking.time)}</span></div>` : ''}
      ${booking.location ? `<div class="box-row"><span class="label">Location</span><span class="value">${booking.location}</span></div>` : ''}
    </div>

    <p><strong>A few things to keep in mind:</strong></p>
    <p>Please arrive a few minutes early so we have time to get comfortable before we start shooting. Feel free to reach out if you have any questions or need to make changes.</p>

    ${booking.notes ? `<p><strong>Session notes:</strong> ${booking.notes}</p>` : ''}

    <p style="margin-top:24px;">See you soon!<br/><strong>Ellie</strong></p>
  `)

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: clientEmail,
      subject: `Session reminder — ${fmtDate(booking.date)}`,
      html,
    })
    if (error) return res.status(400).json({ error })
    return res.status(200).json({ id: data.id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
