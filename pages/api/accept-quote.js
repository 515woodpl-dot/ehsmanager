import { loadStudioConfig } from '../../lib/studioConfig'
import { createServiceClient } from '../../lib/pibase'
import { notifyStudio } from '../../lib/push'
import { createInvoiceToken, verifyQuoteToken } from '../../lib/signingTokens'
import { appUrl } from '../../lib/documentEmail'

const invoiceLink = (id, config) => { try { return appUrl(`/invoice/${createInvoiceToken(id)}`, config) } catch { return null } }

// Public endpoint: the client accepts a quote from its emailed link. The
// quote is marked accepted and an unpaid invoice is created from its items.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const parsed = verifyQuoteToken(req.body?.token)
  if (!parsed) return res.status(404).json({ error: 'This quote link is not valid' })
  const db = createServiceClient()
  if (!db) return res.status(503).json({ error: 'Service is not configured' })

  const { data: quote, error: lookupError } = await db.from('quotes').select('*').eq('id', parsed.quoteId).maybeSingle()
  if (lookupError) return res.status(503).json({ error: 'Busy right now. Please try again in a moment.' })
  if (!quote) return res.status(404).json({ error: 'Quote not found' })
  const details = quote.line_items && !Array.isArray(quote.line_items) ? quote.line_items : { items: quote.line_items || [] }

  if (quote.status === 'accepted') {
    return res.status(200).json({ alreadyAccepted: true, invoiceUrl: details.invoiceId ? invoiceLink(details.invoiceId, await loadStudioConfig(db, quote.user_id)) : null })
  }
  if (quote.note && quote.note < new Date().toLocaleDateString('en-CA')) {
    return res.status(409).json({ error: 'This quote has expired. Please contact the studio for an updated quote.' })
  }

  // Claim the quote first so a double click can't create two invoices.
  const acceptedAt = new Date().toISOString()
  const { data: claimed } = await db.from('quotes').update({ status: 'accepted' })
    .eq('id', quote.id).neq('status', 'accepted').select('id')
  if (!claimed?.length) {
    // Accepted a moment ago by another click: wait briefly for its invoice so
    // this client also gets the link.
    let invoiceId = null
    for (let i = 0; i < 10 && !invoiceId; i++) {
      await new Promise(resolve => setTimeout(resolve, 300))
      const { data: again } = await db.from('quotes').select('line_items').eq('id', quote.id).maybeSingle()
      invoiceId = again?.line_items?.invoiceId || null
    }
    return res.status(200).json({ alreadyAccepted: true, invoiceUrl: invoiceId ? invoiceLink(invoiceId, await loadStudioConfig(db, quote.user_id)) : null })
  }

  const { number: quoteNumber, invoiceId: _ignored, acceptedAt: _a, ...lineData } = details
  const { data: invoice, error } = await db.from('invoices').insert({
    user_id: quote.user_id,
    client_id: quote.client_id,
    client_name: quote.client_name,
    number: null,  // the database gives the next free number (migration 006)
    amount: Number(quote.amount) || 0,
    paid: 0,
    status: 'unpaid',
    note: lineData.notes || (quoteNumber ? `From accepted quote ${quoteNumber}` : 'From accepted quote'),
    line_items: lineData,
  }).select('id, number').single()
  if (error || !invoice) {
    await db.from('quotes').update({ status: quote.status || 'pending' }).eq('id', quote.id)
    return res.status(500).json({ error: 'The quote could not be accepted. Please try again.' })
  }

  await db.from('quotes').update({ line_items: { ...details, invoiceId: invoice.id, acceptedAt } }).eq('id', quote.id)
  await notifyStudio(db, quote.user_id, { type: 'documents', title: `✅ ${quote.client_name || 'A client'} accepted quote ${quoteNumber || ''}`.trim(), body: `Invoice ${invoice.number} for $${Number(quote.amount || 0).toLocaleString('en-US')} was created`, url: '/?view=invoices', tag: `quote-${quote.id}` })
  return res.status(200).json({ accepted: true, invoiceNumber: invoice.number, invoiceUrl: invoiceLink(invoice.id, await loadStudioConfig(db, quote.user_id)) })
}
