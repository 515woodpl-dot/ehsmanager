// Creates (or finds) the company owner's account in the PIBASE project and
// fills in the business profile, so the app is ready to sign in to without
// anyone confirming an email or clicking through setup.
//
//   node --no-warnings scripts/provision.mjs --env .env.local --email owner@company.com \
//        --business-name "Acme Studio" --business-type creative [--owner-name "Ann Lee"] \
//        [--password-file path]   (written with a new random password, mode 600)
//
// Prints JSON: { "userId": "...", "created": true|false }. Safe to run again:
// an existing owner keeps their password, and the profile is only filled in
// where it is still empty.
import { randomBytes } from 'crypto'
import { writeFileSync } from 'fs'
import { readEnv } from './migrate-env.mjs'
import { BUSINESS_TYPES, businessDefaults } from '../lib/businessTypes.js'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1] && !all[index + 1].startsWith('--') ? all[index + 1] : 'true']] : pairs), []))
const fail = message => { console.error(`provision: ${message}`); process.exit(1) }
const env = { ...readEnv(args.env || '.env.local'), ...process.env }
const base = String(env.NEXT_PUBLIC_PIBASE_URL || '').replace(/\/$/, '')
const key = env.PIBASE_SERVICE_KEY
if (!base || !key) fail('NEXT_PUBLIC_PIBASE_URL and PIBASE_SERVICE_KEY are required')
const email = String(args.email || '').trim().toLowerCase()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('--email must be an email address')
const type = args['business-type'] || 'creative'
if (!BUSINESS_TYPES[type]) fail(`--business-type must be one of ${Object.keys(BUSINESS_TYPES).join(', ')}`)
const businessName = String(args['business-name'] || '').trim()
if (!businessName) fail('--business-name is required')

const call = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const text = await response.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!response.ok) fail(`${options.method || 'GET'} ${path} → ${response.status} ${typeof body === 'string' ? body : JSON.stringify(body)}`.slice(0, 500))
  return body
}

// 1. The owner account, confirmed.
const listed = await call('/auth/v1/admin/users')
let user = (listed?.users || []).find(u => String(u.email || '').toLowerCase() === email)
let created = false
if (!user) {
  const password = randomBytes(18).toString('base64url')
  user = await call('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: args['owner-name'] || email.split('@')[0], business_type: type } }) })
  user = user?.user || user
  created = true
  if (args['password-file']) writeFileSync(args['password-file'], `Sign in at your manager address with:\nemail: ${email}\npassword: ${password}\nChange it after the first sign-in if you like (Settings, or "Forgot password" once email is set up).\n`, { mode: 0o600 })
}
if (!user?.id) fail('the owner account could not be created')

// 2. The business profile and starting lists, where still empty. The
//    sign-up trigger created the studio_settings row with photography lists.
const rows = await call(`/rest/v1/studio_settings?user_id=eq.${user.id}&select=branding`)
if (!rows?.length) fail('studio settings were not created for the owner (is the schema applied?)')
const branding = rows[0].branding || {}
const patch = { updated_at: new Date().toISOString() }
if (!branding.businessType) {
  const defaults = businessDefaults(type)
  Object.assign(patch, {
    stages: defaults.stages,
    session_types: defaults.sessionTypes,
    form_settings: { contactType: 'Lead', buttonLabel: 'Submit', formTitle: '', afterSubmit: 'message', successMessage: 'Thank you for contacting us!', redirectUrl: '', checkboxOptions: defaults.checkboxOptions },
  })
}
patch.branding = {
  ...branding,
  businessType: branding.businessType || type,
  businessName: branding.businessName || businessName,
  studioEmail: branding.studioEmail || email,
  ...(args['owner-name'] && !branding.ownerName ? { ownerName: args['owner-name'] } : {}),
}
await call(`/rest/v1/studio_settings?user_id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify(patch), headers: { Prefer: 'return=minimal' } })
await call(`/rest/v1/profiles?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ business_name: patch.branding.businessName }), headers: { Prefer: 'return=minimal' } })

console.log(JSON.stringify({ userId: user.id, created }))
