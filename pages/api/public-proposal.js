import { createServiceClient } from '../../lib/pibase'
import { notifyStudio } from '../../lib/push'
import { emailWrap, sendStudioEmail } from '../../lib/email'
import { loadStudioConfig } from '../../lib/studioConfig'
import { verifyProposalToken } from '../../lib/signingTokens'

// Public proposal page.
//   GET  ?token=…            → the proposal + studio details (counts a view)
//   GET  ?token=…&preview=1  → same, without counting (the studio checking it)
//   POST { token, …details } → client accepts: saves their details, adds them
//                              as a lead + client, tells the studio
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
const clean = (v, n = 200) => typeof v === 'string' ? v.trim().slice(0, n) : ''
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function publicView(row, branding) {
  const b = branding || {}
  return {
    proposal: {
      title: row.title, number: row.number || '', prospect: row.prospect || '', contactName: row.contact_name || '',
      contactEmail: row.contact_email || '', contactPhone: row.contact_phone || '',
      language: row.language === 'en' ? 'en' : 'es', body: row.body || '', status: row.status,
      date: row.sent_at || row.created_at, acceptedAt: row.accepted_at || null,
      acceptedBy: row.acceptance?.name || null,
    },
    studio: {
      name: b.businessName || '515Studio', email: b.studioEmail || 'hello@515studio.net', phone: b.phone || '',
      website: /^https:\/\//.test(b.website || '') ? b.website : 'https://515studio.net', owner: b.ownerName || '',
      logoUrl: '/515-logo.svg', // same mark as 515studio.net
    },
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const db = createServiceClient()
  if (!db) return res.status(503).json({ error: 'Proposals are unavailable right now' })
  const token = req.method === 'GET' ? req.query.token : req.body?.token
  const parsed = verifyProposalToken(token)
  if (!parsed) return res.status(404).json({ error: 'This proposal link is not valid' })
  const { data: row } = await db.from('proposals').select('*').eq('id', parsed.proposalId).maybeSingle()
  if (!row) return res.status(404).json({ error: 'This proposal is no longer available' })
  const { data: settings } = await db.from('studio_settings').select('branding').eq('user_id', row.user_id).maybeSingle()

  if (req.method === 'GET') {
    if (!req.query.preview) {
      const firstView = !row.viewed_at
      const status = ['draft', 'sent'].includes(row.status) ? 'viewed' : row.status
      await db.from('proposals').update({ view_count: (row.view_count || 0) + 1, viewed_at: row.viewed_at || new Date().toISOString(), status }).eq('id', row.id)
      if (firstView) await notifyStudio(db, row.user_id, { type: 'documents', title: `👀 ${row.prospect || row.contact_name || 'A client'} opened your proposal`, body: row.title, url: '/?view=proposals', tag: `proposal-view-${row.id}` }).catch(() => {})
    }
    return res.status(200).json(publicView(row, settings?.branding))
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (row.status === 'accepted') return res.status(409).json({ error: 'This proposal was already accepted. We will be in touch soon.' })
  const body = req.body || {}
  if (body.company_website_hp) return res.status(200).json({ ok: true }) // bot trap
  const d = {
    name: clean(body.name, 120), business: clean(body.business, 160), email: clean(body.email, 254).toLowerCase(),
    phone: clean(body.phone, 40), address: clean(body.address, 200), city: clean(body.city, 120),
    website: clean(body.website, 200), message: clean(body.message, 2000),
  }
  if (!d.name || !EMAIL.test(d.email) || !d.phone || body.agree !== true) {
    return res.status(400).json({ error: row.language === 'en' ? 'Please fill in your name, email and phone, and tick the box to accept.' : 'Por favor complete su nombre, correo y teléfono, y marque la casilla para aceptar.' })
  }
  const acceptedAt = new Date().toISOString()
  const acceptance = { ...d, at: acceptedAt, userAgent: clean(req.headers['user-agent'] || '', 300) }

  // 1. Claim the acceptance first — only one submission can win.
  const { data: claimed, error: claimError } = await db.from('proposals')
    .update({ status: 'accepted', accepted_at: acceptedAt, acceptance, updated_at: acceptedAt })
    .eq('id', row.id).neq('status', 'accepted').select('id')
  if (claimError) { console.error('[public-proposal] accept', claimError.message); return res.status(500).json({ error: 'Your acceptance could not be saved. Please try again.' }) }
  if (!claimed?.length) return res.status(409).json({ error: 'This proposal was already accepted. We will be in touch soon.' })

  // 2. Client: the one the proposal was made for, else one with the same
  //    email (any letter case), else a new one in the Inquiry stage.
  const notes = [
    `Accepted proposal: ${row.title}${row.number ? ` (${row.number})` : ''}`,
    d.business && `Business: ${d.business}`, (d.address || d.city) && `Address: ${[d.address, d.city].filter(Boolean).join(', ')}`,
    d.website && `Current website: ${d.website}`, d.message && `Message: ${d.message}`,
  ].filter(Boolean).join('\n')
  let clientId = row.client_id
  if (!clientId) {
    const pattern = d.email.replace(/[\\%_]/g, m => `\\${m}`)
    const { data: matches } = await db.from('clients').select('id').eq('user_id', row.user_id).ilike('email', pattern).order('created_at', { ascending: true }).limit(1)
    clientId = matches?.[0]?.id || null
  }
  if (!clientId) {
    const { data: created, error } = await db.from('clients').insert({ user_id: row.user_id, name: d.business ? `${d.name} — ${d.business}` : d.name, email: d.email, phone: d.phone, type: 'Web Design & Development', status: 'inquiry', notes }).select('id').single()
    if (error) console.error('[public-proposal] client insert', error.message)
    clientId = created?.id || null
  }
  if (clientId) await db.from('proposals').update({ client_id: clientId }).eq('id', row.id)

  // 3. Lead row (same list as the contact form), then tell the studio.
  await db.from('leads').insert({ user_id: row.user_id, name: d.name, email: d.email, phone: d.phone, interest: 'Proposal accepted', message: notes, source: 'proposal' }).then(({ error }) => { if (error) console.error('[public-proposal] lead insert', error.message) })
  await notifyStudio(db, row.user_id, { type: 'documents', title: `🎉 ${d.business || d.name} accepted your proposal`, body: row.title, url: '/?view=proposals', tag: `proposal-accept-${row.id}` }).catch(() => {})
  try {
    const config = await loadStudioConfig(db, row.user_id)
    if (config.branding.studioEmail) {
      const rows = [['Name', d.name], ['Business', d.business], ['Email', d.email], ['Phone', d.phone], ['Address', [d.address, d.city].filter(Boolean).join(', ')], ['Current website', d.website]].filter(([, v]) => v)
      const html = emailWrap(`
        <h1>Proposal accepted 🎉</h1>
        <p><strong>${esc(d.business || d.name)}</strong> accepted <strong>${esc(row.title)}</strong>. They're now a client in the Inquiry stage — next step: send the quote and contract.</p>
        <div class="box">${rows.map(([k, v]) => `<div class="box-row"><span class="label">${esc(k)}</span><span class="value">${esc(v)}</span></div>`).join('')}</div>
        ${d.message ? `<div class="box"><strong>Message:</strong><br/><br/>${esc(d.message)}</div>` : ''}
        <a href="${esc(process.env.NEXT_PUBLIC_APP_URL || 'https://manager.515studio.net')}/?view=proposals" class="btn">Open proposals</a>`, config)
      const result = await sendStudioEmail(config, { to: config.branding.studioEmail, replyTo: d.email, subject: `Proposal accepted: ${d.business || d.name}`, html })
      if (result.error) console.error('[public-proposal] studio email', result.error)
    }
  } catch (error) { console.error('[public-proposal] studio email', error.message) }

  return res.status(200).json({ ok: true })
}
