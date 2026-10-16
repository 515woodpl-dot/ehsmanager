// Invoice numbering and status helpers shared by the manager UI.
// Display numbers look like "#1001", "#1002", … per studio.

const NUMBER_PATTERN = /^#1\d{3,}$/
const FIRST_NUMBER = 1001

const numericPart = number => NUMBER_PATTERN.test(number || '') ? Number(number.slice(1)) : 0

export const hasInvoiceNumber = inv => NUMBER_PATTERN.test(inv?.number || '')

export function invoiceLabel(inv) {
  return hasInvoiceNumber(inv) ? inv.number : 'Invoice'
}

export function nextInvoiceNumber(invoices = []) {
  const highest = invoices.reduce((max, inv) => Math.max(max, numericPart(inv.number)), FIRST_NUMBER - 1)
  return '#' + (highest + 1)
}

// Gives every invoice without a "#1xxx" number one, oldest first, so legacy
// rows (UUID-only or "INV-001") keep their relative order.
export function assignInvoiceNumbers(invoices = []) {
  if (invoices.every(hasInvoiceNumber)) return invoices
  const byAge = [...invoices].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
  let next = Number(nextInvoiceNumber(invoices).slice(1))
  const assigned = new Map()
  for (const inv of byAge) {
    if (!hasInvoiceNumber(inv)) assigned.set(inv.id, '#' + next++)
  }
  return invoices.map(inv => assigned.has(inv.id) ? { ...inv, number: assigned.get(inv.id) } : inv)
}

export function invoiceStatus(amount, paid) {
  if (amount > 0 && paid >= amount) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

// ── Payment plans ────────────────────────────────────────────────
// An invoice can be split into installments (e.g. a deposit now and the
// rest before the session). They live in lineData.schedule as
// { id, label, amount, due }; payments received are logged in
// lineData.payments as { id, amount, method, at, intentId? }.
// The invoice's `paid` total stays the source of truth: it is applied to
// the installments in order to see which are paid.

const cents = n => Math.round((Number(n) || 0) * 100)
const dollars = c => Math.round(c) / 100

// Fixes the schedule up so it always adds up to the invoice total: the
// last installment takes whatever is left over. Empty → no plan.
export function normaliseSchedule(schedule, total) {
  const rows = (Array.isArray(schedule) ? schedule : []).filter(Boolean)
  if (rows.length < 2) return []
  const totalCents = cents(total)
  let used = 0
  return rows.map((row, index) => {
    const last = index === rows.length - 1
    const amount = last ? Math.max(0, totalCents - used) : Math.min(Math.max(0, cents(row.amount)), Math.max(0, totalCents - used))
    used += amount
    return { id: String(row.id || index), label: String(row.label || `Payment ${index + 1}`).slice(0, 80), amount: dollars(amount), due: row.due || '' }
  })
}

// Installments with what's been paid on each, given the invoice's paid
// total. Without a plan, the whole invoice is one installment.
export function paymentSchedule(invoice) {
  const total = Number(invoice?.amount) || 0
  const plan = normaliseSchedule(invoice?.lineData?.schedule, total)
  const rows = plan.length ? plan : [{ id: 'full', label: 'Payment in full', amount: total, due: invoice?.due || '' }]
  let left = cents(invoice?.paid)
  return rows.map(row => {
    const applied = Math.min(cents(row.amount), Math.max(0, left))
    left -= applied
    const remaining = dollars(cents(row.amount) - applied)
    return { ...row, paid: dollars(applied), remaining, status: remaining <= 0 ? 'paid' : applied > 0 ? 'partial' : 'due' }
  })
}

export const hasPaymentPlan = invoice => normaliseSchedule(invoice?.lineData?.schedule, invoice?.amount).length > 1

// The next installment still owed (what the client should pay now), or
// null when the invoice is paid.
export function nextInstallment(invoice) {
  return paymentSchedule(invoice).find(row => row.remaining > 0) || null
}

// Records a payment on an invoice and returns the updated invoice.
export function applyPayment(invoice, { id, amount, method, at = new Date().toISOString(), intentId = null }) {
  const total = Number(invoice.amount) || 0
  const paid = dollars(Math.min(cents(total), cents(invoice.paid) + Math.max(0, cents(amount))))
  const payments = [...(invoice.lineData?.payments || []), { id, amount: dollars(cents(amount)), method: method || null, at, ...(intentId ? { intentId } : {}) }]
  return {
    ...invoice,
    paid,
    status: invoiceStatus(total, paid),
    paymentMethod: method || invoice.paymentMethod || null,
    paidAt: paid >= total ? new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : invoice.paidAt || null,
    lineData: { ...(invoice.lineData || { items: invoice.lineItems || [] }), payments },
  }
}

// Builds the invoice shape these helpers use from a database row.
export function invoiceFromRow(row) {
  const lineData = Array.isArray(row.line_items) ? { items: row.line_items } : (row.line_items || {})
  return { id: row.id, number: row.number || '', amount: Number(row.amount) || 0, paid: Number(row.paid) || 0, due: row.due || '', status: row.status || 'unpaid', lineData }
}

// What the client may pay online right now: the next installment, and the
// whole balance when the studio allows it (on by default).
export function payableOptions(invoice) {
  const balance = dollars(Math.max(0, cents(invoice.amount) - cents(invoice.paid)))
  if (balance <= 0) return []
  const next = nextInstallment(invoice)
  if (!hasPaymentPlan(invoice)) return [{ key: 'full', label: invoice.paid > 0 ? 'Remaining balance' : 'Payment in full', amount: balance, due: invoice.due || '' }]
  if (!next || next.remaining >= balance) return [{ key: 'full', label: next?.label || 'Remaining balance', amount: balance, due: next?.due || invoice.due || '' }]
  const options = [{ key: 'next', label: next.label, amount: next.remaining, due: next.due }]
  if (invoice.lineData?.allowPayInFull !== false) options.push({ key: 'full', label: 'Full balance', amount: balance, due: '' })
  return options
}
