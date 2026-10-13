import Stripe from 'stripe'
import { requireUser } from '../../lib/api-auth'
import { encryptionConfigured, maskSecret } from '../../lib/secretBox'
import {
  STRIPE_API_VERSION, deleteIntegration, emailConfigFor, isStudioOwner,
  loadIntegration, saveIntegration, stripeConfigFor,
} from '../../lib/integrations'
import { emailWrap, sendStudioEmail } from '../../lib/email'

// Admin → Integrations. Secrets are write-only: the browser can submit or
// replace them, but responses only ever contain masked hints.
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/
const PATTERNS = {
  resendKey: /^re_[A-Za-z0-9_]{10,200}$/,
  stripeKey: /^(sk|rk)_(live|test)_[A-Za-z0-9]{10,250}$/,
  webhookSecret: /^whsec_[A-Za-z0-9+/=]{10,200}$/,
}
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : ''

function webhookUrl(userId) {
  const base = process.env.NEXT_PUBLIC_APP_URL
  if (!base) return ''
  return new URL(`/api/webhook?account=${userId}`, base).toString()
}

async function status(db, userId) {
  const owner = isStudioOwner(userId)
  let tableReady = true
  const load = provider => loadIntegration(db, userId, provider).catch(() => { tableReady = false; return null })
  const [resend, stripe] = await Promise.all([load('resend'), load('stripe')])
  const envResend = owner && !!process.env.RESEND_API_KEY
  const envStripe = owner && !!process.env.STRIPE_SECRET_KEY
  const stripeKey = stripe?.secrets?.secretKey || ''
  return {
    encryptionReady: encryptionConfigured(),
    tableReady,
    webhookUrl: webhookUrl(userId),
    resend: {
      configured: !!(resend?.secrets?.apiKey && resend.settings.fromEmail) || envResend,
      source: resend?.secrets?.apiKey ? 'studio' : envResend ? 'environment' : null,
      apiKeyHint: maskSecret(resend?.secrets?.apiKey),
      fromEmail: resend?.settings?.fromEmail || (envResend && !resend ? process.env.RESEND_FROM_EMAIL || 'hello@elliesheartstrings.com' : ''),
      fromName: resend?.settings?.fromName || '',
      replyTo: resend?.settings?.replyTo || '',
      updatedAt: resend?.updatedAt || null,
      unreadable: !!resend?.unreadable,
    },
    stripe: {
      configured: !!stripeKey || envStripe,
      source: stripeKey ? 'studio' : envStripe ? 'environment' : null,
      mode: stripeKey ? (/_live_/.test(stripeKey) ? 'live' : 'test') : envStripe ? (/_live_/.test(process.env.STRIPE_SECRET_KEY) ? 'live' : 'test') : null,
      secretKeyHint: maskSecret(stripeKey),
      webhookSecretHint: maskSecret(stripe?.secrets?.webhookSecret),
      webhookConfigured: !!stripe?.secrets?.webhookSecret || (owner && !!process.env.STRIPE_WEBHOOK_SECRET),
      updatedAt: stripe?.updatedAt || null,
      unreadable: !!stripe?.unreadable,
    },
  }
}

async function save(db, userId, provider, values) {
  const existing = await loadIntegration(db, userId, provider)
  const prior = existing?.unreadable ? {} : existing?.secrets || {}

  if (provider === 'resend') {
    const apiKey = text(values.apiKey, 250) || prior.apiKey
    const settings = { fromEmail: text(values.fromEmail, 254).toLowerCase(), fromName: text(values.fromName, 80), replyTo: text(values.replyTo, 254).toLowerCase() }
    if (!apiKey || !PATTERNS.resendKey.test(apiKey)) return 'Enter a valid Resend API key (starts with re_)'
    if (!EMAIL.test(settings.fromEmail)) return 'Enter the sender address on your verified Resend domain'
    if (settings.replyTo && !EMAIL.test(settings.replyTo)) return 'Reply-to must be a valid email'
    await saveIntegration(db, userId, 'resend', { apiKey }, settings)
    return null
  }

  const secretKey = text(values.secretKey, 260) || prior.secretKey
  const webhookSecret = text(values.webhookSecret, 210) || prior.webhookSecret || ''
  if (!secretKey || !PATTERNS.stripeKey.test(secretKey)) return 'Enter a valid Stripe secret or restricted key (sk_… or rk_…)'
  if (webhookSecret && !PATTERNS.webhookSecret.test(webhookSecret)) return 'Webhook signing secret must start with whsec_'
  // Prove the key works (and has Checkout access) before storing it.
  try {
    await new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION }).checkout.sessions.list({ limit: 1 })
  } catch (error) {
    return `Stripe rejected this key: ${error.message}`
  }
  await saveIntegration(db, userId, 'stripe', { secretKey, webhookSecret }, {})
  return null
}

async function test(db, auth, provider) {
  if (provider === 'resend') {
    const to = auth.user.email
    if (!to) return { ok: false, message: 'Your account has no email address to send a test to' }
    if (!await emailConfigFor(db, auth.user.id)) return { ok: false, message: 'Resend is not configured' }
    const bizName = auth.profile.business_name || 'My Studio'
    const result = await sendStudioEmail(db, auth.user.id, {
      businessName: bizName, to, subject: `Test email from ${bizName}`,
      html: emailWrap('<h1>Email is connected</h1><p>Invoices, contracts, reminders and contact-form notifications will be sent through this Resend account.</p>', bizName),
    })
    return result.status === 200 ? { ok: true, message: `Test email sent to ${to}` } : { ok: false, message: result.body.error }
  }
  const config = await stripeConfigFor(db, auth.user.id)
  if (!config) return { ok: false, message: 'Stripe is not configured' }
  try {
    await config.stripe.checkout.sessions.list({ limit: 1 })
  } catch (error) {
    return { ok: false, message: `Stripe rejected the key: ${error.message}` }
  }
  if (!config.webhookSecret) return { ok: false, message: 'API key works, but the webhook signing secret is missing — payments will not be recorded on invoices' }
  return { ok: true, message: 'Stripe key works and webhook secret is set' }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const auth = await requireUser(req, res)
  if (!auth) return
  const { db, user } = auth
  const provider = String(req.body?.provider || req.query.provider || '')

  try {
    if (req.method === 'GET') return res.status(200).json(await status(db, user.id))
    if (!['resend', 'stripe'].includes(provider)) return res.status(400).json({ error: 'Unknown provider' })

    if (req.method === 'PUT') {
      if (!encryptionConfigured()) return res.status(503).json({ error: 'Server is missing INTEGRATIONS_ENCRYPTION_KEY, so keys cannot be stored securely' })
      const problem = await save(db, user.id, provider, req.body?.values || {})
      if (problem) return res.status(400).json({ error: problem })
      return res.status(200).json(await status(db, user.id))
    }
    if (req.method === 'DELETE') {
      await deleteIntegration(db, user.id, provider)
      return res.status(200).json(await status(db, user.id))
    }
    if (req.method === 'POST' && req.body?.action === 'test') return res.status(200).json(await test(db, auth, provider))
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[integrations]', error.message)
    return res.status(500).json({ error: 'Unable to update integrations. Has migration 003 been applied?' })
  }
}
