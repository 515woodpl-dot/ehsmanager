import { requireUser } from '../../lib/api-auth'
import { SECRET_FIELDS, DEFAULT_INTEGRATIONS, canStoreSecrets, saveStudioSecrets, loadStudioConfig, appUrl } from '../../lib/studioConfig'

const BRANDING_FIELDS = ['businessName', 'ownerName', 'studioEmail', 'phone', 'website', 'address', 'signature', 'logo']
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const MAX_LOGO = 400 * 1024

// What the Settings page is allowed to see: never the keys themselves,
// only whether each is set, where from, and its last 4 characters.
function describe(config) {
  const keys = {}
  for (const field of Object.keys(SECRET_FIELDS)) {
    const value = config.secrets[field]
    keys[field] = { set: !!value, source: config.sources[field], last4: value ? value.slice(-4) : '' }
  }
  const studio = encodeURIComponent(config.userId)
  return {
    branding: config.branding,
    integrations: config.integrations,
    keys,
    canStoreSecrets: canStoreSecrets(),
    migrationNeeded: config.migrationNeeded,
    webhooks: {
      stripe: appUrl(`/api/webhook?studio=${studio}`),
      inbound: appUrl(`/api/inbound-email?studio=${studio}`),
    },
    status: {
      email: !!config.secrets.resendApiKey,
      replies: !!(config.secrets.resendApiKey && config.secrets.resendWebhookSecret && config.integrations.inboundDomain),
      payments: !!(config.secrets.stripeSecretKey && config.secrets.stripePublishableKey && config.secrets.stripeWebhookSecret),
    },
  }
}

export default async function handler(req, res) {
  const auth = await requireUser(req, res)
  if (!auth) return
  if (req.method === 'GET') return res.status(200).json(describe(auth.config))
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (auth.config.migrationNeeded) return res.status(409).json({ error: 'Apply supabase-migration-003-settings-inbox.sql to your database first.' })

  const { branding = null, integrations = null, keys = null } = req.body || {}

  if (branding) {
    const next = { ...auth.config.branding }
    for (const field of BRANDING_FIELDS) {
      if (typeof branding[field] !== 'string') continue
      next[field] = field === 'logo' ? branding[field] : branding[field].trim().slice(0, field === 'signature' || field === 'address' ? 500 : 200)
    }
    if (!next.businessName) return res.status(400).json({ error: 'Business name is required' })
    if (next.studioEmail && !EMAIL_RE.test(next.studioEmail)) return res.status(400).json({ error: 'Enter a valid studio email' })
    if (next.logo && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(next.logo) || next.logo.length > MAX_LOGO * 1.4)) {
      return res.status(400).json({ error: 'Logo must be a PNG, JPG or WebP image under 400 KB' })
    }
    const { error } = await auth.db.from('studio_settings').update({ branding: next, updated_at: new Date().toISOString() }).eq('user_id', auth.user.id)
    if (error) return res.status(500).json({ error: `Unable to save business details: ${error.message}` })
    // Keep the profile in step: other parts of the app read it.
    await auth.db.from('profiles').update({ business_name: next.businessName, full_name: next.ownerName || undefined }).eq('id', auth.user.id)
  }

  if (integrations) {
    const next = { ...DEFAULT_INTEGRATIONS, ...auth.config.integrations }
    if (typeof integrations.fromEmail === 'string') {
      const fromEmail = integrations.fromEmail.trim().toLowerCase()
      if (fromEmail && !EMAIL_RE.test(fromEmail)) return res.status(400).json({ error: 'Enter a valid sending address' })
      next.fromEmail = fromEmail
    }
    if (typeof integrations.inboundDomain === 'string') {
      const domain = integrations.inboundDomain.trim().toLowerCase().replace(/^@/, '')
      if (domain && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return res.status(400).json({ error: 'Enter a domain like replies.yourstudio.com' })
      next.inboundDomain = domain
    }
    if (typeof integrations.copyRepliesToStudio === 'boolean') next.copyRepliesToStudio = integrations.copyRepliesToStudio
    const { error } = await auth.db.from('studio_settings').update({ integrations: next, updated_at: new Date().toISOString() }).eq('user_id', auth.user.id)
    if (error) return res.status(500).json({ error: `Unable to save email settings: ${error.message}` })
  }

  if (keys) {
    const changes = {}
    for (const [field, value] of Object.entries(keys)) {
      const spec = SECRET_FIELDS[field]
      if (!spec) continue
      if (value === null) { changes[field] = null; continue }
      if (typeof value !== 'string' || !value.trim()) continue
      const clean = value.trim()
      if (!spec.prefix.some(prefix => clean.startsWith(prefix)) || clean.length > 500) {
        return res.status(400).json({ error: `That doesn't look like the right key — it should start with ${spec.prefix.join(' or ')}` })
      }
      changes[field] = clean
    }
    if (Object.keys(changes).length) {
      if (!canStoreSecrets()) return res.status(503).json({ error: 'Set SETTINGS_ENCRYPTION_KEY on the server before saving keys' })
      try { await saveStudioSecrets(auth.db, auth.user.id, changes) } catch (error) { return res.status(500).json({ error: error.message }) }
    }
  }

  return res.status(200).json(describe(await loadStudioConfig(auth.db, auth.user.id)))
}
