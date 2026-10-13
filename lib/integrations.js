import { Resend } from 'resend'
import Stripe from 'stripe'
import { openSecret, sealSecret } from './secretBox'

// Per-studio Resend and Stripe credentials, encrypted at rest in
// `integration_secrets`. That table has RLS enabled with no policies, so only
// the server-side service client can read or write it.
export const STRIPE_API_VERSION = '2024-04-10'
const TABLE = 'integration_secrets'
const aad = (userId, provider) => `${userId}:${provider}`

// Server-wide env keys belong to the studio owner's own accounts. Other
// tenants must bring their own keys so they cannot send mail from the owner's
// verified domain or charge through the owner's Stripe account.
export const isStudioOwner = userId => !!process.env.STUDIO_OWNER_USER_ID && userId === process.env.STUDIO_OWNER_USER_ID

export async function loadIntegration(db, userId, provider) {
  const { data, error } = await db.from(TABLE).select('secret, settings, updated_at')
    .eq('user_id', userId).eq('provider', provider).maybeSingle()
  if (error) throw new Error(`Unable to load ${provider} settings: ${error.message}`)
  if (!data) return null
  const secrets = openSecret(data.secret, aad(userId, provider))
  return { secrets: secrets || {}, settings: data.settings || {}, updatedAt: data.updated_at, unreadable: !secrets }
}

export async function saveIntegration(db, userId, provider, secrets, settings) {
  const { error } = await db.from(TABLE).upsert({
    user_id: userId, provider,
    secret: sealSecret(secrets, aad(userId, provider)),
    settings, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' })
  if (error) throw new Error(`Unable to save ${provider} settings: ${error.message}`)
}

export async function deleteIntegration(db, userId, provider) {
  const { error } = await db.from(TABLE).delete().eq('user_id', userId).eq('provider', provider)
  if (error) throw new Error(`Unable to remove ${provider} settings: ${error.message}`)
}

const cleanName = value => String(value || '').replace(/[<>"\\\r\n]/g, '').trim().slice(0, 80)
export const formatFrom = (name, email) => `${cleanName(name) || 'Studio Manager'} <${email}>`

// Returns { resend, fromEmail, fromName, replyTo, source } or null.
export async function emailConfigFor(db, userId) {
  const row = await loadIntegration(db, userId, 'resend').catch(error => { console.error('[integrations]', error.message); return null })
  if (row?.secrets?.apiKey && row.settings.fromEmail) {
    return { resend: new Resend(row.secrets.apiKey), fromEmail: row.settings.fromEmail, fromName: row.settings.fromName || '', replyTo: row.settings.replyTo || '', source: 'studio' }
  }
  if (isStudioOwner(userId) && process.env.RESEND_API_KEY) {
    return { resend: new Resend(process.env.RESEND_API_KEY), fromEmail: process.env.RESEND_FROM_EMAIL || 'hello@elliesheartstrings.com', fromName: '', replyTo: '', source: 'environment' }
  }
  return null
}

// Returns { stripe, webhookSecret, source } or null.
export async function stripeConfigFor(db, userId) {
  const row = await loadIntegration(db, userId, 'stripe').catch(error => { console.error('[integrations]', error.message); return null })
  const envWebhook = isStudioOwner(userId) ? process.env.STRIPE_WEBHOOK_SECRET || null : null
  if (row?.secrets?.secretKey) {
    return { stripe: new Stripe(row.secrets.secretKey, { apiVersion: STRIPE_API_VERSION }), webhookSecret: row.secrets.webhookSecret || envWebhook, source: 'studio' }
  }
  if (isStudioOwner(userId) && process.env.STRIPE_SECRET_KEY) {
    return { stripe: new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION }), webhookSecret: envWebhook, source: 'environment' }
  }
  return null
}
