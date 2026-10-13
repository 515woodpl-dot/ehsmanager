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

function sign(data) {
  if (!getSecret()) throw new Error('Contract signing secret is not configured')
  const payload = base64url(JSON.stringify(data))
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verify(token) {
  if (!getSecret()) return null
  const [payload, sig] = String(token || '').split('.')
  if (!payload || !sig) return null

  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null

  try {
    return JSON.parse(fromBase64url(payload))
  } catch {
    return null
  }
}

export function createContractToken(contractId) {
  return sign({ contractId })
}

export function verifyContractToken(token) {
  const data = verify(token)
  return data?.contractId ? data : null
}

// Payment links use a distinct `kind` so a contract token can never be
// replayed as an invoice token or vice versa.
export function createInvoiceToken(invoiceId) {
  return sign({ kind: 'pay', invoiceId })
}

export function verifyInvoiceToken(token) {
  const data = verify(token)
  return data?.kind === 'pay' && data.invoiceId ? data : null
}
