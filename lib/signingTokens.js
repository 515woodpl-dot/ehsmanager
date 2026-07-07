import crypto from 'crypto'

function getSecret() {
  return process.env.CONTRACT_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ehs-dev-signing-secret'
}

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

function fromBase64url(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

export function createContractToken(contractId) {
  const payload = base64url(JSON.stringify({ contractId }))
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyContractToken(token) {
  const [payload, sig] = String(token || '').split('.')
  if (!payload || !sig) return null

  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null

  try {
    const data = JSON.parse(fromBase64url(payload))
    return data?.contractId ? data : null
  } catch {
    return null
  }
}
