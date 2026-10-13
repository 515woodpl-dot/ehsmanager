import { emailWrap, escapeHtml, sendStudioEmail } from '../../lib/email'
import { requireUser } from '../../lib/api-auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireUser(req, res)
  if (!auth) return
  const bizName = auth.profile.business_name || 'My Studio'
  const ownerName = (auth.profile.full_name || '').split(' ')[0] || bizName

  const bookingId = req.body?.booking?.id
  if (!bookingId) return res.status(400).json({ error: 'Missing booking ID' })
  const { data: row } = await auth.db.from('bookings').select('*')
    .eq('id', bookingId).eq('user_id', auth.user.id).single()
  if (!row) return res.status(404).json({ error: 'Booking not found' })
  if (!row.client_id) return res.status(400).json({ error: 'Booking has no linked client' })
  const { data: client } = await auth.db.from('clients').select('name, email')
    .eq('id', row.client_id).eq('user_id', auth.user.id).single()
  if (!client?.email) return res.status(400).json({ error: 'Client email is missing' })
  const booking = row
  const clientEmail = client.email
  const clientName = client.name

  const fmtDate = iso => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'
  const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}` }

  const html = emailWrap(`
    <h1>Session Reminder</h1>
    <p>Hi ${escapeHtml(clientName || 'there')},</p>
    <p>This is a friendly reminder about your upcoming photography session. We're looking forward to seeing you!</p>

    <div class="box">
      <div class="box-row"><span class="label">Session type</span><span class="value">${escapeHtml(booking.type || 'Photography Session')}</span></div>
      <div class="box-row"><span class="label">Date</span><span class="value">${fmtDate(booking.date)}</span></div>
      ${booking.time ? `<div class="box-row"><span class="label">Time</span><span class="value">${fmtTime(booking.time)}</span></div>` : ''}
      ${booking.location ? `<div class="box-row"><span class="label">Location</span><span class="value">${escapeHtml(booking.location)}</span></div>` : ''}
    </div>

    <p><strong>A few things to keep in mind:</strong></p>
    <p>Please arrive a few minutes early so we have time to get comfortable before we start shooting. Feel free to reach out if you have any questions or need to make changes.</p>

    ${booking.notes ? `<p><strong>Session notes:</strong> ${escapeHtml(booking.notes)}</p>` : ''}

    <p style="margin-top:24px;">See you soon!<br/><strong>${escapeHtml(ownerName)}</strong></p>
  `, bizName)

  const result = await sendStudioEmail(auth.db, auth.user.id, {
    businessName: bizName,
    replyTo: auth.profile.email || auth.user.email,
    to: clientEmail,
    subject: `Session reminder — ${fmtDate(booking.date)}`,
    html,
  })
  return res.status(result.status).json(result.body)
}
