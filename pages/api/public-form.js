import { createServiceClient } from '../../lib/pibase'
import { tooMany } from '../../lib/rateLimit'
import { notifyStudio } from '../../lib/push'
import { emailWrap, sendStudioEmail } from '../../lib/email'
import { loadStudioConfig, baseUrl } from '../../lib/studioConfig'
import { DEFAULT_BUSINESS_TYPE, isBusinessType } from '../../lib/businessTypes'

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

/**
 * Public contact form endpoint.
 *
 * GET  /api/public-form   → returns the business's form settings
 * POST /api/public-form   → body: { lead } — saves lead
 *                                             as client + lead row, emails the owner
 *
 * The business is the account set in STUDIO_OWNER_USER_ID.
 */
export default async function handler(req, res) {
  try {
    const db = createServiceClient()
    if (!db) return res.status(500).json({ error: 'Database not configured' })

    // Always this deployment's own business: a visitor can't send leads into
    // another account by naming it.
    const studioId = process.env.STUDIO_OWNER_USER_ID
    if (!studioId) return res.status(400).json({ error: 'No studio configured' })

    // ── GET: form settings ─────────────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await db
        .from('studio_settings')
        .select('form_settings, branding')
        .eq('user_id', studioId)
        .single()
      if (error) {
        console.error('[public-form] settings lookup failed', error)
        return res.status(404).json({ error: 'Studio not found' })
      }
      const branding = data.branding || {}
      return res.status(200).json({
        settings: data.form_settings,
        businessName: branding.businessName || '',
        businessType: isBusinessType(branding.businessType) ? branding.businessType : DEFAULT_BUSINESS_TYPE,
      })
    }

    // ── POST: submit a lead ────────────────────────────────────────
    if (req.method === 'POST') {
      if (tooMany(req, 'contact', 5, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many messages from this connection. Please try again in a few minutes.' })
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
        message: typeof lead.message === 'string' ? lead.message.slice(0, 3000).trim() : '',
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeLead.email)) return res.status(400).json({ error: 'Enter a valid email address' })
      if (!safeLead.phone) return res.status(400).json({ error: 'Phone number is required' })

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
      // New leads start in the first stage of this business's pipeline.
      const { data: existing } = await db.from('clients').select('id').eq('user_id', studioId).eq('email', safeLead.email).limit(1)
      const { data: pipeline } = await db.from('studio_settings').select('stages').eq('user_id', studioId).maybeSingle()
      if (!existing?.length) {
        const { error: clientErr } = await db.from('clients').insert({
          user_id: studioId,
          name: safeLead.name,
          email: safeLead.email,
          phone: safeLead.phone,
          type: safeLead.interest.split(', ')[0] || null,
          status: pipeline?.stages?.[0]?.id || 'inquiry',
          notes: safeLead.message || null,
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
              ${safeLead.interest ? `<div class="box-row"><span class="label">Interested in</span><span class="value">${escapeHtml(safeLead.interest)}</span></div>` : ''}
              <div class="box-row"><span class="label">Received</span><span class="value">${escapeHtml(fmtDate)}</span></div>
            </div>
            ${safeLead.message ? `<div class="box" style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#444;"><strong>Message:</strong><br/><br/>${escapeHtml(safeLead.message)}</div>` : ''}
            ${(() => { try { return `<a href="${escapeHtml(baseUrl(config))}" class="btn">Open the app</a>` } catch { return '' } })()}
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

      await notifyStudio(db, studioId, { type: 'bookings', title: `💌 New inquiry from ${safeLead.name}`, body: safeLead.interest || safeLead.message || safeLead.email, url: '/?view=clients', tag: `lead-${safeLead.email}` })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('[public-form] unhandled error', e)
    return res.status(500).json({ error: 'Unable to submit form right now' })
  }
}
