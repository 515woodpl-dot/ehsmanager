import { createServiceClient } from '../../lib/supabase'
import { resend, FROM, emailWrap } from '../../lib/email'

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
    if (error) return res.status(404).json({ error: 'Studio not found' })
    return res.status(200).json({ settings: data.form_settings })
  }

  // ── POST: submit a lead ────────────────────────────────────────
  if (req.method === 'POST') {
    const { lead } = req.body || {}
    if (!lead?.name || !lead?.email) return res.status(400).json({ error: 'Name and email required' })

    // Basic anti-abuse: cap field lengths
    const clean = s => typeof s === 'string' ? s.slice(0, 500) : ''
    const safeLead = {
      name: clean(lead.name),
      email: clean(lead.email),
      phone: clean(lead.phone),
      interest: Array.isArray(lead.services) ? lead.services.slice(0, 5).map(clean).join(', ') : clean(lead.interest),
      message: typeof lead.message === 'string' ? lead.message.slice(0, 3000) : '',
    }

    // 1. Save lead row
    const { error: leadErr } = await db.from('leads').insert({
      user_id: studioId,
      ...safeLead,
      source: 'contact_form',
    })
    if (leadErr) return res.status(500).json({ error: 'Failed to save lead' })

    // 2. Create client in inquiry stage
    await db.from('clients').insert({
      user_id: studioId,
      name: safeLead.name,
      email: safeLead.email,
      phone: safeLead.phone,
      type: safeLead.interest.split(', ')[0] || null,
      status: 'inquiry',
      notes: safeLead.message || null,
    })

    // 3. Notify the studio owner by email (best-effort)
    try {
      const { data: profile } = await db.from('profiles').select('email, business_name').eq('id', studioId).single()
      if (profile?.email) {
        const fmtDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
        const html = emailWrap(`
          <h1>New Inquiry</h1>
          <p>You have a new lead from your contact form.</p>
          <div class="box">
            <div class="box-row"><span class="label">Name</span><span class="value">${safeLead.name}</span></div>
            <div class="box-row"><span class="label">Email</span><span class="value">${safeLead.email}</span></div>
            ${safeLead.phone ? `<div class="box-row"><span class="label">Phone</span><span class="value">${safeLead.phone}</span></div>` : ''}
            ${safeLead.interest ? `<div class="box-row"><span class="label">Interested in</span><span class="value">${safeLead.interest}</span></div>` : ''}
            <div class="box-row"><span class="label">Received</span><span class="value">${fmtDate}</span></div>
          </div>
          ${safeLead.message ? `<div class="box" style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#444;"><strong>Message:</strong><br/><br/>${safeLead.message.replace(/</g, '&lt;')}</div>` : ''}
          <a href="https://manager.elliesheartstrings.com" class="btn">Open Studio Manager</a>
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

  return res.status(405).end()
}
