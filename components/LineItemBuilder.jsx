import { useId } from 'react'
import { T, C } from '../lib/tokens'

const uid = () => Math.random().toString(36).slice(2, 8)
const fmt$ = n => '$' + Number(n || 0).toFixed(2)

export function LineItemBuilder({ value, onChange, catalog = [] }) {
  const { items = [], discount = '', discountType = '%', tax = '', notes = '' } = value

  const update = (patch) => onChange({ ...value, ...patch })

  const addItem = () => update({ items: [...items, { id: uid(), name: '', description: '', qty: 1, price: '' }] })
  const removeItem = (id) => update({ items: items.filter(i => i.id !== id) })
  const updateItem = (id, patch) => update({ items: items.map(i => i.id === id ? { ...i, ...patch } : i) })
  const listId = useId()

  // Typing (or picking) the name of a saved item fills in its details,
  // without overwriting anything already entered.
  const changeName = (item, name) => {
    const saved = catalog.find(c => c.name.toLowerCase() === name.trim().toLowerCase())
    const patch = { name }
    if (saved) {
      if (!item.description) patch.description = saved.description
      if (item.price === '' || item.price == null || Number(item.price) === 0) patch.price = saved.price
    }
    updateItem(item.id, patch)
  }

  const addSaved = name => {
    const saved = catalog.find(c => c.name === name)
    if (!saved) return
    const blank = items.find(i => !i.name && !i.description && !Number(i.price))
    const filled = { name: saved.name, description: saved.description, price: saved.price, qty: 1 }
    update({ items: blank ? items.map(i => i.id === blank.id ? { ...i, ...filled } : i) : [...items, { id: uid(), ...filled }] })
  }

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0)
  const discountAmt = discount ? (discountType === '%' ? subtotal * parseFloat(discount) / 100 : parseFloat(discount)) : 0
  const taxAmt = tax ? (subtotal - discountAmt) * parseFloat(tax) / 100 : 0
  const total = calcTotal(value)

  return (
    <div>
      <div style={{ ...T.formLabel, marginBottom: 10 }}>Items</div>

      {/* Line items — one card per item so name and description get full width */}
      {items.map((item, index) => {
        const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
        return (
          <div key={item.id} className="line-item-card">
            <div className="line-item-grid">
              <label className="line-item-field line-item-name">
                <span>Item {index + 1}</span>
                <input style={{ ...T.formInput, fontSize: 14, fontWeight: 500 }} list={catalog.length ? listId : undefined} placeholder={catalog.length ? 'Type or pick a saved item' : 'e.g. Maternity Signature session'} value={item.name} onChange={e => changeName(item, e.target.value)} />
              </label>
              <label className="line-item-field">
                <span>Qty</span>
                <input style={{ ...T.formInput, textAlign: 'center' }} type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, { qty: e.target.value })} />
              </label>
              <label className="line-item-field">
                <span>Price</span>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13, pointerEvents: 'none' }}>$</span>
                  <input style={{ ...T.formInput, paddingLeft: 22 }} type="number" min="0" step="0.01" placeholder="0.00" value={item.price} onChange={e => updateItem(item.id, { price: e.target.value })} />
                </div>
              </label>
              <div className="line-item-field">
                <span>Amount</span>
                <div style={{ padding: '9px 0', fontSize: 14, fontWeight: 600, textAlign: 'right', color: C.text }}>{fmt$(amount)}</div>
              </div>
              <button onClick={() => removeItem(item.id)} title="Remove item" aria-label={`Remove item ${index + 1}`} className="line-item-remove" style={{ ...T.btnGhost, color: C.faint, fontSize: 18 }}>×</button>
            </div>
            <label className="line-item-field" style={{ marginTop: 10 }}>
              <span>Description</span>
              <textarea style={{ ...T.formInput, resize: 'vertical', fontSize: 13, minHeight: 60 }} rows={2} placeholder="What's included — hours of coverage, edited images, prints, travel…" value={item.description || ''} onChange={e => updateItem(item.id, { description: e.target.value })} />
            </label>
          </div>
        )
      })}

      {catalog.length > 0 && <datalist id={listId}>{catalog.map(c => <option key={c.name} value={c.name}>{c.price !== '' ? fmt$(c.price) : ''}</option>)}</datalist>}

      {/* Add item */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={addItem} style={{ ...T.btnGhost, color: C.blue, fontSize: 13, fontWeight: 500, padding: '6px 4px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 17, lineHeight: 1 }}>⊕</span> Add item
        </button>
        {catalog.length > 0 && (
          <select aria-label="Add a saved item" style={{ ...T.formInput, width: 'auto', maxWidth: '100%', fontSize: 13, padding: '6px 10px' }} value="" onChange={e => addSaved(e.target.value)}>
            <option value="">+ Add a saved item…</option>
            {catalog.map(c => <option key={c.name} value={c.name}>{c.name}{c.price !== '' ? ` · ${fmt$(c.price)}` : ''}</option>)}
          </select>
        )}
      </div>

      {/* Totals section */}
      <div style={{ display: 'flex', gap: 20 }} className="line-item-totals">
        {/* Notes */}
        <div style={{ flex: 1 }}>
          <label style={T.formLabel}>Notes</label>
          <textarea style={{ ...T.formInput, resize: 'none', fontSize: 13 }} rows={3} placeholder="Thank you for your business" value={notes} onChange={e => update({ notes: e.target.value })} />
        </div>

        {/* Subtotal / discount / tax / total */}
        <div style={{ width: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.muted }}>Subtotal</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt$(subtotal)}</span>
          </div>

          {/* Discount row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.blue, cursor: 'pointer' }} onClick={() => discount === false ? update({ discount: '' }) : {}}>Add discount</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input style={{ ...T.formInput, width: 70, padding: '4px 8px', fontSize: 12 }} placeholder="0" value={discount} onChange={e => update({ discount: e.target.value })} />
              <select style={{ ...T.formInput, width: 52, padding: '4px 6px', fontSize: 12 }} value={discountType} onChange={e => update({ discountType: e.target.value })}>
                <option>%</option><option>$</option>
              </select>
              {discountAmt > 0 && <span style={{ fontSize: 12, color: C.green, width: 60, textAlign: 'right' }}>−{fmt$(discountAmt)}</span>}
            </div>
          </div>

          {/* Tax row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.blue, cursor: 'pointer' }}>Add tax</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input style={{ ...T.formInput, width: 70, padding: '4px 8px', fontSize: 12 }} placeholder="0" value={tax} onChange={e => update({ tax: e.target.value })} />
              <span style={{ fontSize: 12, color: C.muted, width: 52, textAlign: 'center' }}>%</span>
              {taxAmt > 0 && <span style={{ fontSize: 12, color: C.muted, width: 60, textAlign: 'right' }}>{fmt$(taxAmt)}</span>}
            </div>
          </div>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Total</span>
            <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, letterSpacing: '-0.4px' }}>{fmt$(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function calcTotal(lineData) {
  const { items = [], discount = '', discountType = '%', tax = '' } = lineData
  const subtotal = items.reduce((sum, item) => sum + Math.max(0, parseFloat(item.qty) || 0) * Math.max(0, parseFloat(item.price) || 0), 0)
  const discountValue = Math.max(0, parseFloat(discount) || 0)
  const requestedDiscount = discountType === '%' ? subtotal * Math.min(discountValue, 100) / 100 : discountValue
  const discountedSubtotal = Math.max(0, subtotal - Math.min(subtotal, requestedDiscount))
  const taxRate = Math.max(0, parseFloat(tax) || 0)
  return Math.round((discountedSubtotal + discountedSubtotal * taxRate / 100) * 100) / 100
}
