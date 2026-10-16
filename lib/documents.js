// Shared helpers for client documents (quotes, contracts, questionnaires,
// sessions) shown in client details and their pages.

const QUOTE_PATTERN = /^Q-1\d{3,}$/

export const quoteLabel = q => QUOTE_PATTERN.test(q?.number || '') ? q.number : 'Quote'

export function nextQuoteNumber(quotes = []) {
  const highest = quotes.reduce((max, q) => Math.max(max, QUOTE_PATTERN.test(q.number || '') ? Number(q.number.slice(2)) : 0), 1000)
  return 'Q-' + (highest + 1)
}

const today = () => new Date().toLocaleDateString('en-CA')

// "done" documents get a light green card, everything still waiting on
// the studio or the client gets a light orange one.
export function docTone(kind, item) {
  switch (kind) {
    case 'invoice': return item.status === 'paid' ? 'done' : 'open'
    case 'quote': return item.status === 'accepted' ? 'done' : 'open'
    case 'contract': return item.status === 'signed' && item.fields?.studioSignature?.name ? 'done' : 'open'
    case 'questionnaire': return item.status === 'completed' ? 'done' : 'open'
    case 'session': return item.status !== 'canceled' && item.date && item.date < today() ? 'done' : 'open'
    case 'message': return 'done'
    default: return 'open'
  }
}

// Every line item the studio has used before (session catalog, invoices,
// quotes), newest wins, so they can be picked again instead of retyped.
export function buildItemCatalog(data = {}) {
  const byName = new Map()
  const add = item => {
    const name = String(item?.name || '').trim()
    if (!name) return
    byName.set(name.toLowerCase(), { name, description: item.description || '', price: item.price === '' || item.price == null ? '' : Number(item.price) || 0 })
  }
  ;(data.sessionCatalog || []).forEach(s => add({ name: s.name, description: s.description, price: s.price }))
  ;(data.quotes || []).forEach(q => (q.lineData?.items || []).forEach(add))
  ;(data.invoices || []).forEach(i => (i.lineData?.items || []).forEach(add))
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}
