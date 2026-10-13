import Head from 'next/head'

export const fmt$ = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }

// Normalises stored line items (array or { items, discount, tax, notes })
// into display rows and totals, mirroring calcTotal in LineItemBuilder.
export function summariseLineItems(lineItems) {
  const details = Array.isArray(lineItems) ? { items: lineItems } : (lineItems || {})
  const items = (details.items || [])
    .filter(item => item && (item.name || item.description || Number(item.price)))
    .map(item => ({ id: String(item.id || ''), name: String(item.name || ''), description: String(item.description || ''), qty: Math.max(0, Number(item.qty) || 0), price: Math.max(0, Number(item.price) || 0) }))
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0)
  const discountValue = Math.max(0, Number(details.discount) || 0)
  const discount = Math.min(subtotal, details.discountType === '$' ? discountValue : subtotal * Math.min(discountValue, 100) / 100)
  const tax = (subtotal - discount) * Math.max(0, Number(details.tax) || 0) / 100
  return { items, subtotal, discount, tax, notes: String(details.notes || '') }
}

export function LineItemsTable({ items }) {
  if (!items.length) return null
  return (
    <table className="inv-items">
      <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={item.id || index}>
            <td><strong>{item.name || 'Item'}</strong>{item.description && <p>{item.description}</p>}</td>
            <td className="num">{item.qty}</td>
            <td className="num">{fmt$(item.price)}</td>
            <td className="num">{fmt$(item.qty * item.price)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Page shell + styles shared by the client-facing invoice, quote and
// questionnaire pages. `tone` is 'open' | 'done' | 'muted'.
export default function PublicDocument({ pageTitle, eyebrow, title, statusLabel, tone = 'open', logo = '', children }) {
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
      </Head>
      <main className="inv-page">
        <section className="inv-card">
          <div className="inv-top">
            <div>
              {logo ? <img className="inv-logo" src={logo} alt={eyebrow} /> : <p className="inv-eyebrow">{eyebrow}</p>}
              <h1>{title}</h1>
            </div>
            {statusLabel && <span className={`inv-status inv-status-${tone}`}>{statusLabel}</span>}
          </div>
          {children}
        </section>
      </main>
      <style jsx global>{`
        body { background: #FAFAF9; color: #111110; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; }
        * { box-sizing: border-box; }
        .inv-page { min-height: 100vh; padding: 48px 20px 72px; display: grid; justify-items: center; }
        .inv-card { width: min(820px, 100%); background: #fff; border: 1px solid #EAEAEA; border-radius: 16px; padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.04); }
        .inv-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .inv-logo { display: block; max-height: 56px; max-width: 200px; margin-bottom: 12px; }
        .inv-eyebrow { color: #7F7E7C; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 8px; }
        .inv-card h1 { font-family: Georgia, serif; font-size: clamp(1.8rem, 5vw, 2.6rem); font-weight: 400; margin: 0; }
        .inv-status { border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 600; }
        .inv-status-open { background: #FFF1DC; color: #8A5300; }
        .inv-status-done { background: #EAF4EE; color: #1A6B3C; }
        .inv-status-muted { background: #F1F1EF; color: #7F7E7C; }
        .inv-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 24px; }
        .inv-meta div { display: grid; gap: 4px; background: #F8F8F7; border-radius: 10px; padding: 12px 14px; }
        .inv-meta span, .inv-notes span, .inv-field > span { color: #7F7E7C; font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
        .inv-items { width: 100%; border-collapse: collapse; font-size: 14px; }
        .inv-items th { text-align: left; color: #7F7E7C; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; padding: 8px 6px; border-bottom: 1px solid #EAEAEA; }
        .inv-items td { padding: 12px 6px; border-bottom: 1px solid #EAEAEA; vertical-align: top; }
        .inv-items td p { margin: 4px 0 0; color: #7F7E7C; font-size: 13px; white-space: pre-wrap; }
        .inv-items .num { text-align: right; white-space: nowrap; }
        .inv-totals { margin: 18px 0 0 auto; width: min(300px, 100%); }
        .inv-totals div { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; color: #555; }
        .inv-totals .inv-total { border-top: 1px solid #EAEAEA; color: #111110; font-weight: 600; font-size: 16px; }
        .inv-notes { margin-top: 24px; padding: 14px 16px; border: 1px solid #EAEAEA; border-radius: 10px; }
        .inv-notes p { margin: 6px 0 0; white-space: pre-wrap; font-size: 14px; }
        .inv-button { margin-top: 24px; width: 100%; border: 1px solid #111110; border-radius: 10px; background: #111110; color: #fff; font: inherit; font-weight: 600; min-height: 48px; cursor: pointer; display: grid; place-items: center; text-decoration: none; }
        .inv-button.secondary { background: #fff; color: #111110; border-color: #DDDCDA; }
        .inv-button:disabled { opacity: .6; }
        .inv-message { margin-top: 20px; padding: 14px 16px; border-radius: 10px; font-size: 14px; }
        .inv-message.success { background: #EAF4EE; color: #1A6B3C; border: 1px solid #b7d9c5; }
        .inv-message.error { background: #FDECEA; color: #991F1F; }
        .inv-field { display: grid; gap: 8px; margin-bottom: 18px; }
        .inv-field > span { font-size: 12px; letter-spacing: .02em; text-transform: none; color: #111110; font-weight: 600; }
        .inv-field input, .inv-field textarea { border: 1px solid #DDDCDA; border-radius: 10px; font: inherit; font-size: 16px; padding: 12px 14px; width: 100%; color: #111110; }
        .inv-yesno { display: flex; gap: 10px; }
        .inv-yesno label { display: flex; align-items: center; gap: 6px; border: 1px solid #DDDCDA; border-radius: 10px; padding: 10px 16px; cursor: pointer; }
        @media (max-width: 600px) { .inv-page { padding: 16px 12px 40px; } .inv-card { padding: 20px 16px; border-radius: 12px; } .inv-meta { grid-template-columns: 1fr; } }
        @media print { body { background: #fff; } .inv-page { padding: 0; } .inv-card { border: 0; box-shadow: none; } .inv-button { display: none; } }
      `}</style>
    </>
  )
}
