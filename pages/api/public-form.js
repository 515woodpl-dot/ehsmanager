import { createServiceClient } from '../../lib/pibase'
import { notifyStudio } from '../../lib/push'
import { emailWrap, sendStudioEmail } from '../../lib/email'
import { loadStudioConfig, appUrl } from '../../lib/studioConfig'
import { clientConfirmationEmail } from '../../lib/leadEmails'

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
 * (single-tenant mode — set this to the studio owner's user id).
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
      if (lead?.website) return res.status(200).json({ ok: true })
      if (!lead?.name || !lead?.email) return res.status(400).json({ error: 'Name and email required' })

      // Basic anti-abuse: cap field lengths
      const clean = s => typeof s === 'string' ? s.slice(0, 500).trim() : ''
      const safeLead = {
        name: clean(lead.name),
        email: clean(lead.email).toLowerCase(),
        phone: clean(lead.phone),
        interest: Array.isArray(lead.services) ? lead.services.slice(0, 5).map(clean).filter(Boolean).join(', ') : clean(lead.interest),
        company: clean(lead.company),
        message: typeof lead.message === 'string' ? lead.message.slice(0, 3000).trim() : '',
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeLead.email)) return res.status(400).json({ error: 'Enter a valid email address' })

      // 1. Save lead row
      const { error: leadErr } = await db.from('leads').insert({
        user_id: studioId,
        name: safeLead.name, email: safeLead.email, phone: safeLead.phone || null,
        interest: safeLead.interest || null,
        message: [safeLead.company && `Company: ${safeLead.company}`, safeLead.message].filter(Boolean).join('\n\n') || null,
        source: lead.source === 'website_515studio' ? 'website_515studio' : 'contact_form',
      })
      if (leadErr) {
        console.error('[public-form] lead insert failed', leadErr)
        return res.status(500).json({ error: 'Failed to save lead' })
      }

      // 2. Create client in inquiry stage. Lead is already captured, so this is best-effort.
      const { data: existingClient } = await db.from('clients').select('id').eq('user_id', studioId).eq('email', safeLead.email).single()
      if (!existingClient) {
        const { error: clientErr } = await db.from('clients').insert({
          user_id: studioId,
          name: safeLead.name,
          email: safeLead.email,
          phone: safeLead.phone,
          type: safeLead.interest.split(', ')[0] || null,
          status: 'inquiry',
          notes: [safeLead.company && `Company: ${safeLead.company}`, safeLead.message].filter(Boolean).join('\n\n') || null,
        })
        if (clientErr) console.error('[public-form] client insert failed', clientErr)
      }

      // 3. Notify the studio owner by email (best-effort)
      try {
        const config = await loadStudioConfig(db, studioId)
        if (config.branding.studioEmail) {
          const fmtDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
          const html = emailWrap(`
            <h1>New Inquiry</h1>
            <p>You have a new lead from your contact form.</p>
            <div class="box">
              <div class="box-row"><span class="label">Name</span><span class="value">${escapeHtml(safeLead.name)}</span></div>
              <div class="box-row"><span class="label">Email</span><span class="value">${escapeHtml(safeLead.email)}</span></div>
              ${safeLead.phone ? `<div class="box-row"><span class="label">Phone</span><span class="value">${escapeHtml(safeLead.phone)}</span></div>` : ''}
              ${safeLead.company ? `<div class="box-row"><span class="label">Company</span><span class="value">${escapeHtml(safeLead.company)}</span></div>` : ''}
              ${safeLead.interest ? `<div class="box-row"><span class="label">Interested in</span><span class="value">${escapeHtml(safeLead.interest)}</span></div>` : ''}
              <div class="box-row"><span class="label">Received</span><span class="value">${escapeHtml(fmtDate)}</span></div>
            </div>
            ${safeLead.message ? `<div class="box" style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#444;"><strong>Message:</strong><br/><br/>${escapeHtml(safeLead.message)}</div>` : ''}
            <a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL || 'https://manager.515studio.net')}" class="btn">Open Studio Manager</a>
            <p style="margin-top:20px;font-size:13px;color:#9B9B98;">This lead has been added to your client list.</p>
          `, config)
          const result = await sendStudioEmail(config, {
            to: config.branding.studioEmail,
            replyTo: safeLead.email,
            subject: `New inquiry from ${safeLead.name}`,
            html,
          })
          if (result.error) console.error('[public-form] email failed', result.error)
        }
      } catch (e) { console.error('[public-form] email failed', e) }

      // 4. Confirm to the client: "we got your info, we will reach out" (best-effort)
      try {
        const config = await loadStudioConfig(db, studioId)
        const studioEmail = config.branding.studioEmail || 'hello@515studio.net'
        const result = await sendStudioEmail(config, {
          to: safeLead.email,
          replyTo: studioEmail,
          subject: "We got your info — we'll be in touch soon | 515Studio",
          html: clientConfirmationEmail({
            name: safeLead.name, interest: safeLead.interest, company: safeLead.company, message: safeLead.message,
            logoUrl: 'https://515studio.net/img/515-logo.png', siteUrl: config.branding.website || 'https://515studio.net', replyEmail: studioEmail,
          }),
        })
        if (result.error) console.error('[public-form] client confirmation failed', result.error)
      } catch (e) { console.error('[public-form] client confirmation failed', e) }

      await notifyStudio(db, studioId, { type: 'bookings', title: `💌 New inquiry from ${safeLead.name}`, body: safeLead.interest || safeLead.message || safeLead.email, url: '/?view=clients', tag: `lead-${safeLead.email}` })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('[public-form] unhandled error', e)
    return res.status(500).json({ error: 'Unable to submit form right now' })
  }
}
