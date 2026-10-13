import crypto from 'crypto'

function getSecret() {
  return process.env.CONTRACT_SIGNING_SECRET
}

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

function fromBase64url(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

export function createContractToken(contractId) {
  if (!getSecret()) throw new Error('Contract signing secret is not configured')
  const payload = base64url(JSON.stringify({ contractId }))
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyContractToken(token) {
  if (!getSecret()) return null
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

// Invoice view links reuse the signing secret with a distinct payload key,
// so an invoice token can never be accepted as a contract token.
export function createInvoiceToken(invoiceId) {
  if (!getSecret()) throw new Error('Signing secret is not configured')
  const payload = base64url(JSON.stringify({ invoiceId }))
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyInvoiceToken(token) {
  if (!getSecret()) return null
  const [payload, sig] = String(token || '').split('.')
  if (!payload || !sig) return null

  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null

  try {
    const data = JSON.parse(fromBase64url(payload))
    return data?.invoiceId ? data : null
  } catch {
    return null
  }
}
