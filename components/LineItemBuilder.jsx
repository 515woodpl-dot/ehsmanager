import { useState } from 'react'
import { T, C } from '../lib/tokens'

const uid = () => Math.random().toString(36).slice(2, 8)
const fmt$ = n => '$' + Number(n || 0).toFixed(2)

export function LineItemBuilder({ value, onChange }) {
  const { items = [], discount = '', discountType = '%', tax = '', notes = '' } = value

  const update = (patch) => onChange({ ...value, ...patch })

  const addItem = () => update({ items: [...items, { id: uid(), name: '', description: '', qty: 1, price: '' }] })
  const removeItem = (id) => update({ items: items.filter(i => i.id !== id) })
  const updateItem = (id, patch) => update({ items: items.map(i => i.id === id ? { ...i, ...patch } : i) })

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0)
  const discountAmt = discount ? (discountType === '%' ? subtotal * parseFloat(discount) / 100 : parseFloat(discount)) : 0
  const taxAmt = tax ? (subtotal - discountAmt) * parseFloat(tax) / 100 : 0
  const total = subtotal - discountAmt + taxAmt

  const colHead = (label, w) => (
    <div style={{ width: w, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted }}>{label}</div>
  )

  return (
    <div>
      {/* Column headers */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, padding: '0 4px' }}>
        {colHead('Items', '100%')}
        {colHead('Qty', 64)}
        {colHead('Price', 100)}
        {colHead('Amount', 90)}
        <div style={{ width: 28 }} />
      </div>

      {/* Line items */}
      {items.map((item) => {
        const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
        return (
          <div key={item.id} style={{ display: 'flex', gap: 8, marginBottom: 8, background: C.surface2, borderRadius: 8, padding: '10px 10px 10px 12px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input style={{ ...T.formInput, marginBottom: 6, background: C.surface, fontSize: 13.5 }} placeholder="Item name" value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })} />
              <input style={{ ...T.formInput, background: C.surface, fontSize: 12, color: C.muted }} placeholder="Item description (optional)" value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} />
            </div>
            <input style={{ ...T.formInput, width: 64, background: C.surface, textAlign: 'center' }} type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, { qty: e.target.value })} />
            <div style={{ position: 'relative', width: 100 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13, pointerEvents: 'none' }}>$</span>
              <input style={{ ...T.formInput, paddingLeft: 22, background: C.surface }} type="number" min="0" step="0.01" placeholder="0.00" value={item.price} onChange={e => updateItem(item.id, { price: e.target.value })} />
            </div>
            <div style={{ width: 90, padding: '9px 0', fontSize: 14, fontWeight: 500, textAlign: 'right', color: C.text }}>{fmt$(amount)}</div>
            <button onClick={() => removeItem(item.id)} style={{ ...T.btnGhost, padding: '6px', color: C.faint, fontSize: 16, marginTop: 6 }}>×</button>
          </div>
        )
      })}

      {/* Add item */}
      <button onClick={addItem} style={{ ...T.btnGhost, color: C.blue, fontSize: 13, fontWeight: 500, padding: '6px 4px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>⊕</span> Add item
      </button>

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
