import crypto from 'crypto'

// AES-256-GCM envelope for third-party API keys stored in PIBASE.
// The master key never leaves the server environment; the database only
// holds ciphertext, so a leaked table dump does not leak Stripe/Resend keys.
const VERSION = 'v1'

function masterKey() {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY || ''
  if (raw.length < 32) return null
  return crypto.createHash('sha256').update(`ehs-integrations:${raw}`).digest()
}

export const encryptionConfigured = () => !!masterKey()

// `context` is bound as additional authenticated data so a ciphertext copied
// to another tenant's row (or another provider) fails to decrypt.
export function sealSecret(value, context) {
  const key = masterKey()
  if (!key) throw new Error('INTEGRATIONS_ENCRYPTION_KEY is not configured')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(context))
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join(':')
}

export function openSecret(sealed, context) {
  const key = masterKey()
  if (!key || !sealed) return null
  const [version, iv, tag, body] = String(sealed).split(':')
  if (version !== VERSION || !iv || !tag || !body) return null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
    decipher.setAAD(Buffer.from(context))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    const text = Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8')
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const maskSecret = value => {
  const text = String(value || '')
  if (!text) return ''
  const prefix = text.match(/^(sk|rk)_(live|test)_|^whsec_|^re_/)?.[0] || ''
  return `${prefix}••••${text.slice(-4)}`
}
