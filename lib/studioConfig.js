/**
 * lib/studioConfig.js — per-studio settings and integration keys (server only)
 *
 * Business details live in studio_settings.branding and non-secret
 * integration options in studio_settings.integrations. API keys live in
 * studio_secrets, encrypted with AES-256-GCM; that table has RLS enabled and
 * no policies, so only the server (service key) can read it. Anything not
 * saved in the app falls back to the server environment variables.
 */
import crypto from 'crypto'
import { Resend } from 'resend'
import Stripe from 'stripe'

export const SECRET_FIELDS = {
  resendApiKey: { env: 'RESEND_API_KEY', prefix: ['re_'] },
  resendWebhookSecret: { env: 'RESEND_WEBHOOK_SECRET', prefix: ['whsec_'] },
  stripeSecretKey: { env: 'STRIPE_SECRET_KEY', prefix: ['sk_', 'rk_'] },
  stripePublishableKey: { env: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', prefix: ['pk_'] },
  stripeWebhookSecret: { env: 'STRIPE_WEBHOOK_SECRET', prefix: ['whsec_'] },
}

export const DEFAULT_INTEGRATIONS = { fromEmail: '', inboundDomain: '', copyRepliesToStudio: true }

function encryptionKey() {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY || process.env.CONTRACT_SIGNING_SECRET
  return secret ? crypto.createHash('sha256').update(`ehs-studio-secrets:${secret}`).digest() : null
}

export const canStoreSecrets = () => !!encryptionKey()

function encrypt(values) {
  const key = encryptionKey()
  if (!key) throw new Error('Set SETTINGS_ENCRYPTION_KEY on the server before saving keys')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(values), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join('.')
}

function decrypt(payload) {
  const key = encryptionKey()
  if (!key || !payload) return {}
  try {
    const [version, iv, tag, body] = payload.split('.')
    if (version !== 'v1') return {}
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8'))
  } catch {
    console.error('[studioConfig] saved keys could not be decrypted — was the encryption key changed?')
    return {}
  }
}

// Loads everything the server needs to act for one studio.
export async function loadStudioConfig(db, userId) {
  const [settingsResult, secretsResult, profileResult] = await Promise.all([
    db.from('studio_settings').select('branding, integrations, availability').eq('user_id', userId).maybeSingle(),
    db.from('studio_secrets').select('payload').eq('user_id', userId).maybeSingle(),
    db.from('profiles').select('email, full_name, business_name').eq('id', userId).maybeSingle(),
  ])
  // Before migration 003 is applied these columns/tables don't exist yet.
  const migrationNeeded = !!(settingsResult.error || secretsResult.error)
  const branding = settingsResult.data?.branding || {}
  const profile = profileResult.data || {}
  const saved = decrypt(secretsResult.data?.payload)
  const secrets = {}
  const sources = {}
  for (const [field, { env }] of Object.entries(SECRET_FIELDS)) {
    secrets[field] = saved[field] || process.env[env] || ''
    sources[field] = saved[field] ? 'app' : process.env[env] ? 'server' : null
  }
  return {
    userId,
    migrationNeeded,
    savedSecrets: saved,
    secrets,
    sources,
    integrations: { ...DEFAULT_INTEGRATIONS, ...(settingsResult.data?.integrations || {}) },
    timezone: settingsResult.data?.availability?.timezone || 'America/New_York',
    branding: {
      businessName: branding.businessName || profile.business_name || 'My Studio',
      ownerName: branding.ownerName || profile.full_name || '',
      studioEmail: branding.studioEmail || profile.email || '',
      phone: branding.phone || '', website: branding.website || '', address: branding.address || '',
      signature: branding.signature || '', logo: branding.logo || '',
      iconBackground: branding.iconBackground || '#ffffff',
    },
  }
}

export async function saveStudioSecrets(db, userId, changes) {
  const current = decrypt((await db.from('studio_secrets').select('payload').eq('user_id', userId).maybeSingle()).data?.payload)
  const next = { ...current }
  for (const [field, value] of Object.entries(changes)) {
    if (!SECRET_FIELDS[field]) continue
    if (value === null) delete next[field]
    else next[field] = value
  }
  const { error } = await db.from('studio_secrets').upsert({ user_id: userId, payload: encrypt(next), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(`Unable to save keys: ${error.message}`)
}

// The studio to use for public webhooks that don't carry a signed-in user.
export const defaultStudioId = req => String(req.query?.studio || process.env.STUDIO_OWNER_USER_ID || '')

export const getResend = config => config.secrets.resendApiKey ? new Resend(config.secrets.resendApiKey) : null
export const getStripe = config => config.secrets.stripeSecretKey ? new Stripe(config.secrets.stripeSecretKey, { apiVersion: '2024-04-10' }) : null

export function appUrl(path) {
  return new URL(path, process.env.NEXT_PUBLIC_APP_URL || 'https://manager.elliesheartstrings.com').toString()
}

// ── Reply addresses ───────────────────────────────────────────────
// reply+<client id><check>@<receiving domain> routes a client's email reply
// back into their conversation. The check stops guessed addresses from
// posting into someone else's thread.
function replyCheck(clientId) {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY || process.env.CONTRACT_SIGNING_SECRET || ''
  return crypto.createHmac('sha256', `ehs-reply:${secret}`).update(clientId).digest('hex').slice(0, 10)
}

export function replyAddress(config, clientId) {
  const domain = String(config.integrations.inboundDomain || '').trim().replace(/^@/, '')
  if (!domain || !clientId) return null
  return `reply+${clientId.replace(/-/g, '')}${replyCheck(clientId)}@${domain}`
}

export function clientIdFromReplyAddress(address) {
  const match = /reply\+([0-9a-f]{32})([0-9a-f]{10})@/i.exec(String(address || ''))
  if (!match) return null
  const hex = match[1].toLowerCase()
  const clientId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  return replyCheck(clientId) === match[2].toLowerCase() ? clientId : null
}
