import { useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'
import { LineItemBuilder, calcTotal } from './LineItemBuilder'
import { invoiceLabel, invoiceStatus, nextInvoiceNumber } from '../lib/invoices'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })
const fmt$ = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtLongDate = iso => { if (!iso) return ''; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

function Overlay({ onClose, children, maxWidth = 860 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} className="modal-wrap"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" style={{ background: C.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.14)' }} className="modal-inner">
        {children}
      </div>
    </div>
  )
}

function Header({ title, onClose }) {
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
export function InvoiceModal({ client: clientProp, invoice, data, setData, toast, onClose }) {
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
    const fields = { client: clientName, clientId: client?.id || invoice?.clientId || null, amount: total, due, note: lineData.notes || '', lineData }
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

      <LineItemBuilder value={lineData} onChange={setLineData} />

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

// ── Email invoice to client ───────────────────────────────────────
export function defaultInvoiceEmail(invoice, clientName) {
  const first = (clientName || '').split(/\s+/)[0] || 'there'
  const number = invoiceLabel(invoice)
  const balance = Math.max(0, (invoice.amount || 0) - (invoice.paid || 0))
  const due = invoice.due && invoice.status !== 'paid' ? ` Payment is due by ${fmtLongDate(invoice.due)}.` : ''
  return {
    subject: `Your invoice ${number} is ready`,
    message: `Hi ${first},\n\nThank you so much for choosing us! Your invoice ${number} for ${fmt$(balance || invoice.amount)} is ready.${due}\n\nClick the button below to view your invoice and its details. If you have any questions, just reply to this email.`,
  }
}

export function SendInvoiceModal({ invoice, client, toast, onClose, justCreated = false }) {
  const clientName = client?.name || invoice.client
  const initial = defaultInvoiceEmail(invoice, clientName)
  const [subject, setSubject] = useState(initial.subject)
  const [message, setMessage] = useState(initial.message)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const email = client?.email || ''

  const send = async () => {
    if (!email) return
    setSending(true); setError('')
    try {
      const { data: { session } } = await pibase.auth.getSession()
      // A brand-new invoice is saved in the background; give the sync a
      // moment to land before the server looks it up.
      for (let attempt = 0; attempt < 6; attempt++) {
        const r = await fetch('/api/email-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({ invoice: { id: invoice.id }, subject, message }),
        })
        if (r.ok) { toast(`Invoice ${invoiceLabel(invoice)} emailed to ${email}`); onClose(); return }
        const body = await r.json().catch(() => ({}))
        if (r.status !== 404) { setError(typeof body.error === 'string' ? body.error : body.error?.message || 'Failed to send email'); return }
        await wait(1000)
      }
      setError('The invoice is still saving. Please try again in a moment.')
    } catch {
      setError('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <Overlay onClose={onClose} maxWidth={680}>
      <Header title={justCreated ? `Invoice ${invoiceLabel(invoice)} created — email it to ${clientName}?` : `Email invoice ${invoiceLabel(invoice)}`} onClose={onClose} />

      <div style={T.formGroup}>
        <label style={T.formLabel}>To</label>
        {email
          ? <div style={{ padding: '9px 12px', background: C.surface2, borderRadius: 8, fontSize: 14 }}>{clientName} &lt;{email}&gt;</div>
          : <div style={{ padding: '10px 14px', background: C.redBg, color: C.red, borderRadius: 8, fontSize: 13 }}>{clientName} has no email address. Add one in the client details to send this invoice.</div>}
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
        <div style={{ display: 'inline-block', marginTop: 14, background: C.text, color: '#fff', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>View invoice {invoiceLabel(invoice)}</div>
      </div>

      {error && <div style={{ marginTop: 14, padding: '10px 14px', background: C.redBg, color: C.red, borderRadius: 8, fontSize: 13 }}>{error}</div>}

      <div style={T.modalFooter}>
        <button style={T.btn} onClick={onClose}>{justCreated ? 'Not now' : 'Cancel'}</button>
        <button style={{ ...T.btnPrimary, opacity: !email || sending ? 0.55 : 1 }} disabled={!email || sending} onClick={send}>{sending ? 'Sending…' : 'Send email'}</button>
      </div>
    </Overlay>
  )
}
