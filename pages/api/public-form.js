import { createServiceClient } from '../../lib/pibase'
import { resend, FROM, emailWrap } from '../../lib/email'

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

/**
 * Public contact form endpoint.
 *
 * GET  /api/public-form?s=<studio_user_id>  → returns that studio's form settings
 * POST /api/public-form                     → body: { studio, lead } — saves lead
 *                                             as client + lead row, emails the owner
 *
 * If no studio id is given, falls back to STUDIO_OWNER_USER_ID env var
 * (single-tenant mode — set this to Ellie's user id).
 */
export default async function handler(req, res) {
  try {
    const db = createServiceClient()
    if (!db) return res.status(500).json({ error: 'Database not configured' })

    const studioId = (req.method === 'GET' ? req.query.s : req.body?.studio) || process.env.STUDIO_OWNER_USER_ID
    if (!studioId) return res.status(400).json({ error: 'No studio configured' })

    // ── GET: form settings ─────────────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await db
        .from('studio_settings')
        .select('form_settings')
        .eq('user_id', studioId)
        .single()
      if (error) {
        console.error('[public-form] settings lookup failed', error)
        return res.status(404).json({ error: 'Studio not found' })
      }
      return res.status(200).json({ settings: data.form_settings })
    }

    // ── POST: submit a lead ────────────────────────────────────────
    if (req.method === 'POST') {
      const { lead } = req.body || {}
      if (!lead?.name || !lead?.email) return res.status(400).json({ error: 'Name and email required' })

      // Basic anti-abuse: cap field lengths
      const clean = s => typeof s === 'string' ? s.slice(0, 500).trim() : ''
      const safeLead = {
        name: clean(lead.name),
        email: clean(lead.email),
        phone: clean(lead.phone),
        interest: Array.isArray(lead.services) ? lead.services.slice(0, 5).map(clean).filter(Boolean).join(', ') : clean(lead.interest),
        message: typeof lead.message === 'string' ? lead.message.slice(0, 3000).trim() : '',
      }

      // 1. Save lead row
      const { error: leadErr } = await db.from('leads').insert({
        user_id: studioId,
        ...safeLead,
        source: 'contact_form',
      })
      if (leadErr) {
        console.error('[public-form] lead insert failed', leadErr)
        return res.status(500).json({ error: 'Failed to save lead' })
      }

      // 2. Create client in inquiry stage. Lead is already captured, so this is best-effort.
      const { error: clientErr } = await db.from('clients').insert({
        user_id: studioId,
        name: safeLead.name,
        email: safeLead.email,
        phone: safeLead.phone,
        type: safeLead.interest.split(', ')[0] || null,
        status: 'inquiry',
        notes: safeLead.message || null,
      })
      if (clientErr) console.error('[public-form] client insert failed', clientErr)

      // 3. Notify the studio owner by email (best-effort)
      try {
        const { data: profile } = await db.from('profiles').select('email, business_name').eq('id', studioId).single()
        if (resend && profile?.email) {
          const fmtDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
          const html = emailWrap(`
            <h1>New Inquiry</h1>
            <p>You have a new lead from your contact form.</p>
            <div class="box">
              <div class="box-row"><span class="label">Name</span><span class="value">${escapeHtml(safeLead.name)}</span></div>
              <div class="box-row"><span class="label">Email</span><span class="value">${escapeHtml(safeLead.email)}</span></div>
              ${safeLead.phone ? `<div class="box-row"><span class="label">Phone</span><span class="value">${escapeHtml(safeLead.phone)}</span></div>` : ''}
              ${safeLead.interest ? `<div class="box-row"><span class="label">Interested in</span><span class="value">${escapeHtml(safeLead.interest)}</span></div>` : ''}
              <div class="box-row"><span class="label">Received</span><span class="value">${escapeHtml(fmtDate)}</span></div>
            </div>
            ${safeLead.message ? `<div class="box" style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#444;"><strong>Message:</strong><br/><br/>${escapeHtml(safeLead.message)}</div>` : ''}
            <a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL || 'https://manager.elliesheartstrings.com')}" class="btn">Open Studio Manager</a>
            <p style="margin-top:20px;font-size:13px;color:#9B9B98;">This lead has been added to your client list.</p>
          `, profile.business_name)
          await resend.emails.send({
            from: FROM,
            to: profile.email,
            reply_to: safeLead.email,
            subject: `New inquiry from ${safeLead.name}`,
            html,
          })
        }
      } catch (e) { console.error('[public-form] email failed', e) }

      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('[public-form] unhandled error', e)
    return res.status(500).json({ error: 'Unable to submit form right now' })
  }
}
