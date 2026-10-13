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
