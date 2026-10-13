import { createInvoiceToken } from './signingTokens'

export const balanceCents = invoice => Math.max(0, Math.round((Number(invoice.amount) - Number(invoice.paid)) * 100))

export function payUrlFor(invoiceId) {
  const base = process.env.NEXT_PUBLIC_APP_URL
  if (!base) return null
  try {
    return new URL(`/pay/${createInvoiceToken(invoiceId)}`, base).toString()
  } catch {
    return null
  }
}

// Creates (or reuses) a Stripe Checkout Session for the invoice's open
// balance. Any older open session for a different amount is expired first so
// a client cannot pay twice through two tabs. Card data stays on Stripe.
export async function checkoutSessionForInvoice({ db, stripe, invoice, userId, token, clientEmail, businessName }) {
  const cents = balanceCents(invoice)
  if (invoice.status === 'paid' || cents <= 0) return { paid: true }

  if (invoice.stripe_checkout_session_id) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(invoice.stripe_checkout_session_id)
      if (existing.status === 'open' && existing.amount_total === cents && existing.url) return { url: existing.url }
      if (existing.status === 'open') await stripe.checkout.sessions.expire(existing.id)
      // Paid, but the webhook has not recorded it yet: don't take a second payment.
      if (existing.status === 'complete' && existing.payment_intent !== invoice.payment_intent_id) return { processing: true }
    } catch (error) {
      console.error('[payments] unable to reuse checkout session', error.message)
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const label = invoice.number || `Invoice ${String(invoice.id).slice(0, 8)}`
  const metadata = { invoiceId: invoice.id, userId }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: cents,
        product_data: { name: `${label}${businessName ? ` — ${businessName}` : ''}`.slice(0, 250) },
      },
    }],
    customer_email: clientEmail || undefined,
    client_reference_id: invoice.id,
    metadata,
    payment_intent_data: { metadata },
    success_url: new URL(`/pay/${token}?status=success`, appUrl).toString(),
    cancel_url: new URL(`/pay/${token}`, appUrl).toString(),
  }, { idempotencyKey: `invoice-${invoice.id}-${cents}-${invoice.stripe_checkout_session_id || 'first'}` })

  const { error } = await db.from('invoices').update({ stripe_checkout_session_id: session.id })
    .eq('id', invoice.id).eq('user_id', userId)
  if (error) console.error('[payments] unable to store checkout session', error.message)
  return { url: session.url }
}
