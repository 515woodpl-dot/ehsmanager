/**
 * lib/accounting.js — bookkeeping numbers for the Finances page.
 *
 * Cash basis: money counts on the day it was received (each payment logged
 * in invoice.lineData.payments). Sales tax is the invoice's tax share of
 * each payment, so a 50% deposit carries 50% of that invoice's tax.
 */

export const DEFAULT_ACCOUNTING = {
  taxRate: 6.625,             // New Jersey sales tax (%)
  taxName: 'NJ Sales Tax',
  taxByDefault: true,         // pre-fill the rate on new invoices
  filing: 'quarterly',        // quarterly (ST-50) or monthly (ST-51)
  filings: {},                // { '2026-Q1': { filedOn, amount, note } }
}

export const EXPENSE_CATEGORIES = [
  'Equipment', 'Software & subscriptions', 'Props & wardrobe', 'Prints & lab', 'Studio rent & utilities',
  'Marketing & advertising', 'Travel & mileage', 'Insurance', 'Education', 'Contract labor',
  'Payment processing fees', 'Office supplies', 'Meals', 'Other',
]

const round2 = n => Math.round((Number(n) || 0) * 100) / 100
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
export const money = n => (n < 0 ? '−$' : '$') + Math.abs(round2(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parses ISO strings and older "Nov 3, 2026" style dates into a local date.
export function toDate(value) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d) }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}
export const isoDay = d => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''

// Subtotal, discount and sales tax of one invoice, from its line items.
export function invoiceTax(inv) {
  const ld = inv.lineData || {}
  const items = ld.items || inv.lineItems || []
  const subtotal = items.reduce((s, i) => s + num(i.qty) * num(i.price), 0)
  const discount = ld.discount ? (ld.discountType === '$' ? num(ld.discount) : subtotal * num(ld.discount) / 100) : 0
  const rate = num(ld.tax)
  const tax = round2(Math.max(0, subtotal - discount) * rate / 100)
  const total = num(inv.amount) || round2(subtotal - discount + tax)
  return { subtotal: round2(subtotal), discount: round2(discount), rate, tax, total, taxShare: total > 0 ? tax / total : 0 }
}

// Every payment on an invoice. Invoices marked paid before payments were
// itemised get one entry for the unexplained difference.
export function paymentsOf(inv) {
  const list = (inv.lineData?.payments || []).map(p => ({ ...p, amount: num(p.amount) }))
  const logged = list.reduce((s, p) => s + p.amount, 0)
  const missing = round2(num(inv.paid) - logged)
  if (missing > 0.009) list.push({ id: `legacy-${inv.id}`, amount: missing, method: inv.paymentMethod || 'Not recorded', at: inv.paidAt || inv.createdAt || inv.due || '', legacy: true })
  return list
}

// One row per payment received, with its tax share and Stripe fee.
export function paymentLedger(data) {
  const clients = new Map((data.clients || []).map(c => [c.id, c]))
  const rows = []
  for (const inv of data.invoices || []) {
    const t = invoiceTax(inv)
    const client = clients.get(inv.clientId)
    for (const p of paymentsOf(inv)) {
      const date = toDate(p.at)
      const tax = round2(p.amount * t.taxShare)
      rows.push({
        id: p.id, date, day: isoDay(date), invoiceId: inv.id, invoice: inv.number || 'Invoice', client: inv.client || client?.name || '',
        type: client?.type || '', method: p.method || 'Not recorded', amount: round2(p.amount), tax, sales: round2(p.amount - tax),
        taxRate: t.rate, fee: num(p.fee), deposit: round2(p.amount - num(p.fee)), legacy: !!p.legacy,
      })
    }
  }
  return rows.sort((a, b) => (b.day || '').localeCompare(a.day || ''))
}

// NJ due dates: 20th of the month after the period (ST-50 quarterly / ST-51 monthly).
export function quarterDue(year, q) { return q === 4 ? `${year + 1}-01-20` : `${year}-${String(q * 3 + 1).padStart(2, '0')}-20` }

export function yearSummary(data, year) {
  const ledger = paymentLedger(data).filter(r => r.date && r.date.getFullYear() === year)
  const expenses = (data.expenses || []).filter(e => toDate(e.date)?.getFullYear() === year)
  const months = MONTHS.map((label, m) => ({ label, collected: 0, tax: 0, fees: 0, expenses: 0 }))
  const quarters = [1, 2, 3, 4].map(q => ({ q, key: `${year}-Q${q}`, collected: 0, taxable: 0, exempt: 0, tax: 0, due: quarterDue(year, q) }))
  const byMethod = {}, byType = {}, byCategory = {}
  for (const r of ledger) {
    const m = r.date.getMonth(), q = quarters[Math.floor(m / 3)]
    months[m].collected += r.amount; months[m].tax += r.tax; months[m].fees += r.fee
    q.collected += r.amount; q.tax += r.tax
    if (r.tax > 0) q.taxable += r.sales; else q.exempt += r.sales
    byMethod[r.method] = (byMethod[r.method] || 0) + r.amount
    const type = r.type || 'Other'; byType[type] = (byType[type] || 0) + r.sales
  }
  for (const e of expenses) {
    months[toDate(e.date).getMonth()].expenses += num(e.amount)
    byCategory[e.category || 'Other'] = (byCategory[e.category || 'Other'] || 0) + num(e.amount)
  }
  // Stripe fees are a business expense too.
  const fees = round2(ledger.reduce((s, r) => s + r.fee, 0))
  if (fees > 0) byCategory['Payment processing fees (Stripe)'] = fees
  const invoicesInYear = (data.invoices || []).filter(i => toDate(i.createdAt || i.due)?.getFullYear() === year)
  const collected = round2(ledger.reduce((s, r) => s + r.amount, 0))
  const tax = round2(ledger.reduce((s, r) => s + r.tax, 0))
  const expenseTotal = round2(expenses.reduce((s, e) => s + num(e.amount), 0))
  const sales = round2(collected - tax)
  return {
    year, ledger, expenses, months: months.map(r => ({ ...r, net: round2(r.collected - r.tax - r.fees - r.expenses) })), quarters,
    byMethod, byType, byCategory,
    totals: {
      collected, tax, sales, fees, expenses: expenseTotal,
      net: round2(sales - fees - expenseTotal),
      invoiced: round2(invoicesInYear.reduce((s, i) => s + num(i.amount), 0)),
      invoiceCount: invoicesInYear.length,
      outstanding: round2((data.invoices || []).reduce((s, i) => s + Math.max(0, num(i.amount) - num(i.paid)), 0)),
    },
  }
}

export function yearsWithActivity(data) {
  const years = new Set([new Date().getFullYear()])
  for (const r of paymentLedger(data)) if (r.date) years.add(r.date.getFullYear())
  for (const e of data.expenses || []) { const d = toDate(e.date); if (d) years.add(d.getFullYear()) }
  for (const i of data.invoices || []) { const d = toDate(i.createdAt || i.due); if (d) years.add(d.getFullYear()) }
  return [...years].sort((a, b) => b - a)
}

// ── CSV ──────────────────────────────────────────────────────────
const cell = v => {
  const s = v == null ? '' : typeof v === 'number' ? v.toFixed(2) : String(v)
  // Leading = + - @ would be run as formulas by spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v !== 'number' ? `'${s}` : s
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
export function toCSV(columns, rows) {
  return [columns.map(c => cell(c.label)).join(','), ...rows.map(r => columns.map(c => cell(typeof c.value === 'function' ? c.value(r) : r[c.value])).join(','))].join('\r\n')
}
export function downloadCSV(filename, csv) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const CSV = {
  payments: s => toCSV([
    { label: 'Date', value: 'day' }, { label: 'Invoice', value: 'invoice' }, { label: 'Client', value: 'client' }, { label: 'Session type', value: 'type' },
    { label: 'Method', value: 'method' }, { label: 'Amount received', value: 'amount' }, { label: 'Sales (excl. tax)', value: 'sales' },
    { label: 'Sales tax', value: 'tax' }, { label: 'Tax rate %', value: r => String(r.taxRate || 0) }, { label: 'Stripe fee', value: 'fee' }, { label: 'Net deposit', value: 'deposit' },
  ], [...s.ledger].reverse()),
  expenses: s => toCSV([
    { label: 'Date', value: 'date' }, { label: 'Vendor', value: 'vendor' }, { label: 'Category', value: 'category' },
    { label: 'Amount', value: r => Number(r.amount) || 0 }, { label: 'Paid with', value: 'method' }, { label: 'Notes', value: 'notes' },
  ], [...s.expenses].sort((a, b) => (a.date || '').localeCompare(b.date || ''))),
  invoices: (data, year) => toCSV([
    { label: 'Invoice', value: r => r.number || '' }, { label: 'Created', value: r => isoDay(toDate(r.createdAt)) }, { label: 'Due', value: 'due' },
    { label: 'Client', value: 'client' }, { label: 'Subtotal', value: r => invoiceTax(r).subtotal }, { label: 'Discount', value: r => invoiceTax(r).discount },
    { label: 'Sales tax', value: r => invoiceTax(r).tax }, { label: 'Total', value: r => Number(r.amount) || 0 }, { label: 'Paid', value: r => Number(r.paid) || 0 },
    { label: 'Balance', value: r => Math.max(0, (Number(r.amount) || 0) - (Number(r.paid) || 0)) }, { label: 'Status', value: 'status' },
  ], (data.invoices || []).filter(i => toDate(i.createdAt || i.due)?.getFullYear() === year)),
  salesTax: (s, accounting) => toCSV([
    { label: 'Period', value: r => `${s.year} Q${r.q}` }, { label: 'Gross receipts', value: 'collected' }, { label: 'Taxable sales', value: 'taxable' },
    { label: 'Non-taxable sales', value: 'exempt' }, { label: 'Sales tax collected', value: 'tax' }, { label: 'Return due', value: 'due' },
    { label: 'Filed on', value: r => accounting?.filings?.[r.key]?.filedOn || '' }, { label: 'Amount paid to NJ', value: r => Number(accounting?.filings?.[r.key]?.amount) || 0 },
  ], s.quarters),
  summary: s => toCSV([{ label: 'Line', value: 'label' }, { label: 'Amount', value: 'amount' }], [
    { label: `Gross receipts ${s.year}`, amount: s.totals.collected },
    { label: 'Less sales tax collected', amount: -s.totals.tax },
    { label: 'Sales (excl. tax)', amount: s.totals.sales },
    { label: 'Less Stripe fees', amount: -s.totals.fees },
    { label: 'Less expenses', amount: -s.totals.expenses },
    { label: 'Net profit (before income tax)', amount: s.totals.net },
    { label: '', amount: '' },
    ...Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]).map(([label, amount]) => ({ label: `Expense · ${label}`, amount })),
    { label: '', amount: '' },
    ...s.months.map(m => ({ label: `${m.label} ${s.year} net`, amount: m.net })),
  ]),
}
