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

// Client-facing links for other documents reuse the signing secret with a
// distinct payload key per document type, so a token for one kind of
// document can never be accepted as another (or as a contract token).
function createScopedToken(key, id) {
  if (!getSecret()) throw new Error('Signing secret is not configured')
  const payload = base64url(JSON.stringify({ [key]: id }))
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyScopedToken(token, key) {
  if (!getSecret()) return null
  const [payload, sig] = String(token || '').split('.')
  if (!payload || !sig) return null

  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null

  try {
    const data = JSON.parse(fromBase64url(payload))
    return data?.[key] ? data : null
  } catch {
    return null
  }
}

export const createInvoiceToken = id => createScopedToken('invoiceId', id)
export const verifyInvoiceToken = token => verifyScopedToken(token, 'invoiceId')
export const createQuoteToken = id => createScopedToken('quoteId', id)
export const verifyQuoteToken = token => verifyScopedToken(token, 'quoteId')
export const createQuestionnaireToken = id => createScopedToken('questionnaireId', id)
export const verifyQuestionnaireToken = token => verifyScopedToken(token, 'questionnaireId')
export const createChatToken = id => createScopedToken('chatClientId', id)
export const verifyChatToken = token => verifyScopedToken(token, 'chatClientId')
