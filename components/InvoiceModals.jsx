import { useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'
import { LineItemBuilder, calcTotal } from './LineItemBuilder'
import { applyPayment, invoiceLabel, invoiceStatus, nextInstallment, nextInvoiceNumber, normaliseSchedule, paymentSchedule } from '../lib/invoices'
import { buildItemCatalog } from '../lib/documents'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })
const fmt$ = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtLongDate = iso => { if (!iso) return ''; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

export function Overlay({ onClose, children, maxWidth = 860 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} className="modal-wrap"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" style={{ background: C.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.14)' }} className="modal-inner">
        {children}
      </div>
    </div>
  )
}

export function Header({ title, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <div style={T.modalTitle}>{title}</div>
      <button onClick={onClose} aria-label="Close" style={{ ...T.btnGhost, fontSize: 20, color: C.muted }}>×</button>
    </div>
  )
}

const emptyLineData = () => ({ items: [{ id: uid(), name: '', description: '', qty: 1, price: '' }], discount: '', discountType: '%', tax: '', notes: 'Thank you for your business' })

// Invoices created before line items existed only carry an amount + note.
function lineDataFor(invoice) {
  if (!invoice) return emptyLineData()
  if (invoice.lineData?.items?.length) return invoice.lineData
  return { ...emptyLineData(), items: [{ id: uid(), name: invoice.note || 'Photography services', description: '', qty: 1, price: invoice.amount || '' }], notes: invoice.note || '' }
}

// ── Create / edit invoice ─────────────────────────────────────────
// Pass `invoice` to edit an existing one; omit it to create. `client` is
// optional — without it the modal shows a client picker.
export function InvoiceModal({ client: clientProp, invoice, data, setData, toast, onClose, onSaved }) {
  const isEdit = !!invoice
  const [clientId, setClientId] = useState(invoice?.clientId || clientProp?.id || '')
  const [lineData, setLineData] = useState(() => lineDataFor(invoice))
  const [due, setDue] = useState(invoice?.due || '')
  const [sendFor, setSendFor] = useState(null) // invoice to email after saving

  const client = data.clients.find(c => c.id === clientId) || (clientProp?.id === clientId ? clientProp : null)
  const clientName = client?.name || invoice?.client || ''
  const pickClient = !clientProp && !isEdit
  const total = calcTotal(lineData)

  const save = ({ thenSend = false } = {}) => {
    if (!clientName) { toast('Choose a client'); return }
    if (lineData.items.every(i => !i.name?.trim()) && total === 0) { toast('Add at least one item'); return }
    const schedule = normaliseSchedule(lineData.schedule, total)
    if (schedule.length && schedule.some(row => row.amount <= 0)) { toast('Every payment in the plan needs an amount'); return }
    const fields = { client: clientName, clientId: client?.id || invoice?.clientId || null, amount: total, due, note: lineData.notes || '', lineData: { ...lineData, schedule } }
    let saved
    if (isEdit) {
      const paid = invoice.paid || 0
      saved = { ...invoice, ...fields, status: invoiceStatus(total, paid) }
      setData(d => ({ ...d, invoices: d.invoices.map(i => i.id === invoice.id ? saved : i) }))
      toast(`${invoiceLabel(saved)} updated`)
    } else {
      saved = { id: uid(), number: nextInvoiceNumber(data.invoices), ...fields, status: 'unpaid', paid: 0, paymentIntentId: null, createdAt: new Date().toISOString() }
      setData(d => ({ ...d, invoices: [...d.invoices, saved] }))
      toast(`Invoice ${saved.number} created`)
    }
    onSaved?.()
    if (!isEdit || thenSend) setSendFor(saved)
    else onClose()
  }

  const remove = () => {
    if (!confirm(`Delete ${invoiceLabel(invoice)}? This cannot be undone.`)) return
    setData(d => ({ ...d, invoices: d.invoices.filter(i => i.id !== invoice.id) }))
    toast(`${invoiceLabel(invoice)} deleted`); onClose()
  }

  if (sendFor) return <SendInvoiceModal invoice={sendFor} client={client} toast={toast} onClose={onClose} justCreated={!isEdit} />

  const clientInvoices = clientId ? data.invoices.filter(i => i.clientId === clientId && i.id !== invoice?.id) : []

  return (
    <Overlay onClose={onClose}>
      <Header title={isEdit ? `Edit invoice ${invoiceLabel(invoice)} — ${clientName}` : `New invoice${clientName ? ` — ${clientName}` : ''}`} onClose={onClose} />

      <div className="invoice-editor-meta">
        {pickClient ? (
          <div style={{ ...T.formGroup, marginBottom: 0 }}>
            <label style={T.formLabel}>Client</label>
            <select style={T.formInput} value={clientId} onChange={e => setClientId(e.target.value)} autoFocus>
              <option value="">Choose a client…</option>
              {data.clients.filter(c => !c.archived).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ ...T.formGroup, marginBottom: 0 }}>
            <label style={T.formLabel}>Bill to</label>
            <div style={{ padding: '9px 0', fontSize: 14, fontWeight: 500 }}>{clientName}{client?.email ? <span style={{ color: C.muted, fontWeight: 400 }}> · {client.email}</span> : ''}</div>
          </div>
        )}
        <div style={{ ...T.formGroup, marginBottom: 0 }}>
          <label style={T.formLabel}>Invoice number</label>
          <div style={{ padding: '9px 0', fontSize: 14, fontWeight: 500 }}>{isEdit ? invoiceLabel(invoice) : nextInvoiceNumber(data.invoices)}</div>
        </div>
        <div style={{ ...T.formGroup, marginBottom: 0 }}>
          <label style={T.formLabel}>Due date</label>
          <input style={T.formInput} type="date" value={due} onChange={e => setDue(e.target.value)} />
        </div>
      </div>

      {isEdit && invoice.paid > 0 && (
        <div style={{ margin: '0 0 18px', padding: '10px 14px', background: C.amberBg, color: C.amber, borderRadius: 8, fontSize: 13 }}>
          {fmt$(invoice.paid)} has already been paid on this invoice. Changing the items updates the balance due.
        </div>
      )}

      {clientInvoices.length > 0 && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Other invoices for {clientName}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {clientInvoices.map(i => (
              <div key={i.id} style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.border2}`, fontSize: 12, fontWeight: 500, color: C.muted, background: C.surface }}>
                {invoiceLabel(i)} · {fmt$(i.amount)} · <span style={{ color: i.status === 'paid' ? C.green : i.status === 'partial' ? C.amber : C.red }}>{i.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <LineItemBuilder value={lineData} onChange={setLineData} catalog={buildItemCatalog(data)} />

      <PaymentPlanEditor schedule={lineData.schedule || []} total={total} due={due} paid={invoice?.paid || 0}
        onChange={schedule => setLineData(current => ({ ...current, schedule }))}
        allowPayInFull={lineData.allowPayInFull !== false} onAllowPayInFull={allowPayInFull => setLineData(current => ({ ...current, allowPayInFull }))} />

      <div style={{ ...T.modalFooter, flexWrap: 'wrap' }} className="modal-footer-wrap">
        {isEdit && <button style={{ ...T.btn, color: C.red, borderColor: C.red }} onClick={remove}>Delete invoice</button>}
        <div style={{ flex: 1 }} />
        <button style={T.btn} onClick={onClose}>Cancel</button>
        {isEdit && <button style={T.btn} onClick={() => save({ thenSend: true })}>Save &amp; email client</button>}
        <button style={T.btnPrimary} onClick={() => save()}>{isEdit ? 'Save changes' : 'Create invoice'} · {fmt$(total)}</button>
      </div>
    </Overlay>
  )
}

// ── Payment plan ──────────────────────────────────────────────────
const todayIso = () => new Date().toLocaleDateString('en-CA')
const round2 = n => Math.round(n * 100) / 100
const PLAN_PRESETS = [
  { key: 'full', label: 'Pay in full' },
  { key: 'deposit', label: 'Deposit + balance' },
  { key: 'three', label: '3 payments' },
]

function presetSchedule(key, total, due) {
  if (key === 'deposit') return [
    { id: uid(), label: 'Deposit', amount: round2(total / 2), due: todayIso() },
    { id: uid(), label: 'Balance', amount: 0, due: due || '' },
  ]
  if (key === 'three') return [
    { id: uid(), label: 'Deposit', amount: round2(total / 3), due: todayIso() },
    { id: uid(), label: 'Second payment', amount: round2(total / 3), due: '' },
    { id: uid(), label: 'Final payment', amount: 0, due: due || '' },
  ]
  return []
}

// Splits the invoice into installments. The last one always takes what's
// left so the plan adds up to the total.
export function PaymentPlanEditor({ schedule, total, due, paid = 0, onChange, allowPayInFull = true, onAllowPayInFull }) {
  const rows = normaliseSchedule(schedule, total)
  const active = rows.length > 1
  const progress = paymentSchedule({ amount: total, paid, due, lineData: { schedule: rows } })
  // Edits keep what was typed (e.g. "12.") — totals use the normalised rows.
  const base = active ? schedule.filter(Boolean) : rows
  const update = (id, patch) => onChange(base.map(row => row.id === id ? { ...row, ...patch } : row))
  const remove = id => onChange(base.length <= 2 ? [] : base.filter(row => row.id !== id))
  const add = () => onChange([...base.slice(0, -1), { id: uid(), label: `Payment ${base.length}`, amount: '', due: '' }, base[base.length - 1]])
  const presetKey = !active ? 'full' : null

  return (
    <div className="payment-plan">
      <div className="payment-plan-head">
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Payment plan</div>
          <div style={{ fontSize: 12, color: C.muted }}>{active ? 'The client pays one installment at a time.' : 'The client pays the whole invoice at once.'}</div>
        </div>
        <div className="chip-tabs" role="group" aria-label="Payment plan">
          {PLAN_PRESETS.map(preset => (
            <button key={preset.key} type="button" className={presetKey === preset.key ? 'active' : ''}
              onClick={() => onChange(presetSchedule(preset.key, total, due))}>{preset.label}</button>
          ))}
        </div>
      </div>
      {active && (
        <>
          {rows.map((row, index) => {
            const last = index === rows.length - 1
            const state = progress[index]
            return (
              <div key={row.id} className="payment-plan-row">
                <input aria-label="Payment name" style={T.formInput} value={row.label} onChange={e => update(row.id, { label: e.target.value })} />
                <div className="payment-plan-amount">
                  <span>$</span>
                  <input aria-label="Amount" style={{ ...T.formInput, paddingLeft: 22 }} type="number" min="0" step="0.01" inputMode="decimal" readOnly={last}
                    value={last ? row.amount : (base[index]?.amount ?? row.amount)}
                    onChange={e => update(row.id, { amount: e.target.value })}
                    title={last ? 'The last payment is whatever is left' : undefined} />
                </div>
                <input aria-label="Due date" style={T.formInput} type="date" value={row.due} onChange={e => update(row.id, { due: e.target.value })} />
                <div className="payment-plan-status">
                  {state?.status === 'paid' ? <span style={{ color: C.green }}>Paid</span> : state?.status === 'partial' ? <span style={{ color: C.amber }}>{fmt$(state.paid)} paid</span> : last ? <span style={{ color: C.faint }}>Rest</span> : null}
                  <button type="button" aria-label="Remove payment" style={{ ...T.btnGhost, color: C.muted, fontSize: 18 }} onClick={() => remove(row.id)}>×</button>
                </div>
              </div>
            )
          })}
          <button type="button" style={{ ...T.btnSm, marginTop: 4 }} onClick={add}>+ Add payment</button>
          {onAllowPayInFull && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: C.muted, cursor: 'pointer' }}>
              <input type="checkbox" checked={allowPayInFull} onChange={e => onAllowPayInFull(e.target.checked)} />
              Let the client pay the whole balance at once if they'd like
            </label>
          )}
        </>
      )}
    </div>
  )
}

// ── Record a payment received outside the app ─────────────────────
const PAY_METHODS = [
  { value: 'Cash', desc: 'Payment received in cash' },
  { value: 'Credit Card', desc: 'Card payment taken outside the app' },
  { value: 'Bank transfer', desc: 'Zelle, Venmo, check or bank transfer' },
  { value: 'Gift / Complimentary', desc: 'No charge — gift or comp session' },
]

export function RecordPaymentModal({ invoice, setData, toast, onClose }) {
  const next = nextInstallment(invoice)
  const balance = Math.max(0, Math.round((invoice.amount - invoice.paid) * 100) / 100)
  const [amount, setAmount] = useState(String(next?.remaining ?? balance))
  const [method, setMethod] = useState(null)
  const value = Math.round((parseFloat(amount) || 0) * 100) / 100
  const schedule = paymentSchedule(invoice)

  const confirm = () => {
    if (!method) { toast('Select a payment method'); return }
    if (value <= 0) { toast('Enter the amount received'); return }
    if (value > balance) { toast(`That's more than the ${fmt$(balance)} still owed`); return }
    const updated = applyPayment(invoice, { id: uid(), amount: value, method })
    setData(d => ({ ...d, invoices: d.invoices.map(i => i.id === invoice.id ? { ...updated, lineData: { ...(i.lineData || {}), ...updated.lineData } } : i) }))
    toast(updated.status === 'paid' ? `${invoiceLabel(invoice)} paid in full · ${method}` : `${fmt$(value)} recorded · ${fmt$(updated.amount - updated.paid)} still owed`)
    onClose()
  }

  const presets = [
    ...(next && next.remaining < balance ? [{ label: `${next.label} · ${fmt$(next.remaining)}`, value: next.remaining }] : []),
    { label: `Full balance · ${fmt$(balance)}`, value: balance },
  ]

  return (
    <Overlay onClose={onClose} maxWidth={560}>
      <Header title="Record a payment" onClose={onClose} />
      <div style={{ marginBottom: 16, padding: '12px 16px', background: C.surface2, borderRadius: 10, fontSize: 13 }}>
        <div style={{ fontWeight: 500 }}>{invoiceLabel(invoice)} · {invoice.client}</div>
        <div style={{ color: C.muted, marginTop: 2 }}>Total {fmt$(invoice.amount)} · paid {fmt$(invoice.paid)} · <strong style={{ color: C.text }}>{fmt$(balance)} owed</strong></div>
        {schedule.length > 1 && (
          <div style={{ marginTop: 8, display: 'grid', gap: 3 }}>
            {schedule.map(row => (
              <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: row.status === 'paid' ? C.green : C.muted }}>
                <span>{row.label}{row.due ? ` · due ${fmtLongDate(row.due)}` : ''}</span>
                <span>{row.status === 'paid' ? 'Paid' : fmt$(row.remaining)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={T.formGroup}>
        <label style={T.formLabel}>Amount received</label>
        <div className="payment-plan-amount">
          <span>$</span>
          <input style={{ ...T.formInput, paddingLeft: 22, fontSize: 16 }} type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {presets.map(preset => (
            <button key={preset.label} type="button" style={{ ...T.btnSm, ...(value === preset.value ? { borderColor: C.text, color: C.text } : {}) }} onClick={() => setAmount(String(preset.value))}>{preset.label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PAY_METHODS.map(opt => (
          <div key={opt.value} onClick={() => setMethod(opt.value)} role="radio" aria-checked={method === opt.value}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${method === opt.value ? C.text : C.border}`, background: method === opt.value ? C.surface3 : C.surface, cursor: 'pointer' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${method === opt.value ? C.text : C.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {method === opt.value && <div style={{ width: 9, height: 9, borderRadius: '50%', background: C.text }} />}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{opt.value}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{opt.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={T.modalFooter}>
        <div style={{ flex: 1 }} />
        <button style={T.btn} onClick={onClose}>Cancel</button>
        <button style={T.btnPrimary} onClick={confirm}>Record {fmt$(value)}</button>
      </div>
    </Overlay>
  )
}

// ── Email invoice to client ───────────────────────────────────────
export function defaultInvoiceEmail(invoice, clientName) {
  const first = (clientName || '').split(/\s+/)[0] || 'there'
  const number = invoiceLabel(invoice)
  const next = invoice.status !== 'paid' ? nextInstallment(invoice) : null
  const planned = paymentSchedule(invoice).length > 1
  const dueLine = !next ? '' : planned
    ? ` To get started, your ${next.label.toLowerCase()} of ${fmt$(next.remaining)} is due${next.due ? ` by ${fmtLongDate(next.due)}` : ''}.`
    : ` ${fmt$(next.remaining)} is due${next.due ? ` by ${fmtLongDate(next.due)}` : ''}.`
  return {
    subject: `Your invoice ${number} is ready`,
    message: `Hi ${first},\n\nThank you so much for choosing us! Your invoice ${number} is ready.${dueLine}\n\nClick the button below to view your invoice and pay securely online. If you have any questions, just reply to this email.`,
  }
}

export function SendInvoiceModal({ invoice, client, toast, onClose, justCreated = false }) {
  const clientName = client?.name || invoice.client
  const initial = defaultInvoiceEmail(invoice, clientName)
  return (
    <SendEmailModal
      endpoint="/api/email-invoice" payload={{ invoice: { id: invoice.id } }}
      client={client} clientName={clientName} toast={toast} onClose={onClose} justCreated={justCreated}
      title={justCreated ? `Invoice ${invoiceLabel(invoice)} created — email it to ${clientName}?` : `Email invoice ${invoiceLabel(invoice)}`}
      sentToast={`Invoice ${invoiceLabel(invoice)} emailed`}
      initialSubject={initial.subject} initialMessage={initial.message} buttonLabel={`View invoice ${invoiceLabel(invoice)}`}
    />
  )
}

// Generic "email this document to the client" step: editable subject and
// message, a preview with the link button, and a retry while a freshly
// created document finishes saving in the background.
export function SendEmailModal({ endpoint, payload, client, clientName, toast, onClose, justCreated = false, title, sentToast, initialSubject, initialMessage, buttonLabel, extraActions = null }) {
  const [subject, setSubject] = useState(initialSubject)
  const [message, setMessage] = useState(initialMessage)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const email = client?.email || ''

  const send = async () => {
    if (!email) return
    setSending(true); setError('')
    try {
      const { data: { session } } = await pibase.auth.getSession()
      for (let attempt = 0; attempt < 6; attempt++) {
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({ ...payload, subject, message }),
        })
        if (r.ok) { toast(`${sentToast} to ${email}`); onClose({ sent: true }); return }
        const body = await r.json().catch(() => ({}))
        if (r.status !== 404) { setError(typeof body.error === 'string' ? body.error : body.error?.message || 'Failed to send email'); return }
        await wait(1000)
      }
      setError('This is still saving. Please try again in a moment.')
    } catch {
      setError('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <Overlay onClose={onClose} maxWidth={680}>
      <Header title={title} onClose={onClose} />

      <div style={T.formGroup}>
        <label style={T.formLabel}>To</label>
        {email
          ? <div style={{ padding: '9px 12px', background: C.surface2, borderRadius: 8, fontSize: 14 }}>{clientName} &lt;{email}&gt;</div>
          : <div style={{ padding: '10px 14px', background: C.redBg, color: C.red, borderRadius: 8, fontSize: 13 }}>{clientName} has no email address. Add one in the client details to send this.</div>}
      </div>
      <div style={T.formGroup}>
        <label style={T.formLabel}>Subject</label>
        <input style={T.formInput} value={subject} onChange={e => setSubject(e.target.value)} />
      </div>
      <div style={T.formGroup}>
        <label style={T.formLabel}>Message</label>
        <textarea style={{ ...T.formInput, resize: 'vertical', minHeight: 150, lineHeight: 1.6 }} rows={7} value={message} onChange={e => setMessage(e.target.value)} />
      </div>

      <div style={{ ...T.formLabel, marginTop: 4 }}>Preview</div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', background: C.surface2 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.7, color: '#444', whiteSpace: 'pre-wrap' }}>{message}</div>
        <div style={{ display: 'inline-block', marginTop: 14, background: C.text, color: '#fff', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>{buttonLabel}</div>
      </div>

      {error && <div style={{ marginTop: 14, padding: '10px 14px', background: C.redBg, color: C.red, borderRadius: 8, fontSize: 13 }}>{error}</div>}

      <div style={{ ...T.modalFooter, flexWrap: 'wrap' }}>
        {extraActions}
        <div style={{ flex: 1 }} />
        <button style={T.btn} onClick={() => onClose()}>{justCreated ? 'Not now' : 'Cancel'}</button>
        <button style={{ ...T.btnPrimary, opacity: !email || sending ? 0.55 : 1 }} disabled={!email || sending} onClick={send}>{sending ? 'Sending…' : 'Send email'}</button>
      </div>
    </Overlay>
  )
}
