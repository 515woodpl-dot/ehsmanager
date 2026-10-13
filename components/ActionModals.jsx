import { useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'
import { Modal } from './UI'
import { LineItemBuilder, calcTotal } from './LineItemBuilder'
import ContractBuilder from './ContractBuilder'
import ContractDocument from './ContractDocument'
import { Overlay, Header, SendEmailModal } from './InvoiceModals'
import { nextInvoiceNumber, invoiceLabel } from '../lib/invoices'
import { buildItemCatalog, nextQuoteNumber, quoteLabel } from '../lib/documents'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })
const fmt$ = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtLongDate = iso => { if (!iso) return ''; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
const firstName = name => (name || '').split(/\s+/)[0] || 'there'
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const todayShort = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// Calls an authenticated API route. A document created a moment ago may
// still be saving in the background, so a 404 is retried briefly.
async function callApi(endpoint, body) {
  const { data: { session } } = await pibase.auth.getSession()
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify(body) })
    const result = await r.json().catch(() => ({}))
    if (r.ok) return result
    if (r.status !== 404 || attempt === 5) throw new Error(typeof result.error === 'string' ? result.error : result.error?.message || 'Request failed')
    await wait(1000)
  }
}

async function copyText(value) {
  try { await navigator.clipboard.writeText(value); return true } catch {}
  const input = document.createElement('textarea')
  input.value = value; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.appendChild(input); input.select()
  const copied = document.execCommand('copy'); input.remove(); return copied
}

// Gets the client's private chat link and copies it.
export async function copyChatLink(clientId, toast) {
  try {
    const { url } = await callApi('/api/chat-link', { clientId })
    toast(await copyText(url) ? 'Chat link copied — share it with your client' : url)
  } catch (error) { toast(error.message || 'Could not create chat link') }
}

const clientFor = (data, doc, fallback) => data.clients.find(c => c.id === doc?.clientId) || fallback || data.clients.find(c => c.name === doc?.client) || null

function Banner({ tone = 'open', children }) {
  const colors = tone === 'done' ? [C.greenBg, C.green] : ['#FFF1DC', '#8A5300']
  return <div style={{ margin: '0 0 18px', padding: '10px 14px', background: colors[0], color: colors[1], borderRadius: 8, fontSize: 13 }}>{children}</div>
}

// ── Quote ─────────────────────────────────────────────────────────
const emptyQuoteLines = () => ({ items: [{ id: uid(), name: '', description: '', qty: 1, price: '' }], discount: '', discountType: '%', tax: '', notes: '' })

export function QuoteModal({ client: clientProp, quote, data, setData, toast, onClose, onSaved }) {
  const isEdit = !!quote
  const client = clientFor(data, quote, clientProp)
  const clientName = client?.name || quote?.client || ''
  const [lineData, setLineData] = useState(() => quote?.lineData?.items?.length ? quote.lineData : emptyQuoteLines())
  const [validUntil, setValidUntil] = useState(quote?.validUntil || '')
  const [sendFor, setSendFor] = useState(null)
  const total = calcTotal(lineData)
  const accepted = quote?.status === 'accepted'
  const linkedInvoice = quote?.invoiceId ? data.invoices.find(i => i.id === quote.invoiceId) : null

  const build = () => ({ ...(quote || {}), client: clientName, clientId: client?.id || quote?.clientId || null, amount: total, validUntil, lineData })

  const save = ({ thenSend = false } = {}) => {
    if (lineData.items.every(i => !i.name?.trim()) && total === 0) { toast('Add at least one item'); return }
    let saved
    if (isEdit) {
      saved = build()
      setData(d => ({ ...d, quotes: d.quotes.map(q => q.id === quote.id ? saved : q) }))
      toast(`Quote ${quoteLabel(saved)} updated`)
    } else {
      saved = { ...build(), id: uid(), number: nextQuoteNumber(data.quotes || []), status: 'pending', createdAt: new Date().toISOString() }
      setData(d => ({ ...d, quotes: [...(d.quotes || []), saved] }))
      toast(`Quote ${saved.number} created`)
    }
    onSaved?.()
    if (!isEdit || thenSend) setSendFor(saved)
    else onClose()
  }

  // Accepting a quote turns it into an unpaid invoice with the same items.
  const accept = () => {
    if (!confirm(`Mark quote ${quoteLabel(quote)} as accepted and create an invoice for ${fmt$(total)}?`)) return
    const number = nextInvoiceNumber(data.invoices)
    const invoice = { id: uid(), number, client: clientName, clientId: client?.id || quote.clientId || null, amount: total, due: '', status: 'unpaid', paid: 0, note: lineData.notes || `From accepted quote ${quoteLabel(quote)}`, paymentIntentId: null, lineData, createdAt: new Date().toISOString() }
    setData(d => ({
      ...d,
      invoices: [...d.invoices, invoice],
      quotes: d.quotes.map(q => q.id === quote.id ? { ...build(), status: 'accepted', invoiceId: invoice.id, acceptedAt: new Date().toISOString() } : q),
    }))
    toast(`Quote accepted · invoice ${number} created`); onSaved?.(); onClose()
  }

  const remove = () => {
    if (!confirm(`Delete quote ${quoteLabel(quote)}? This cannot be undone.`)) return
    setData(d => ({ ...d, quotes: d.quotes.filter(q => q.id !== quote.id) }))
    toast(`Quote ${quoteLabel(quote)} deleted`); onClose()
  }

  if (sendFor) {
    const valid = sendFor.validUntil ? ` It's valid until ${fmtLongDate(sendFor.validUntil)}.` : ''
    return <SendEmailModal endpoint="/api/email-quote" payload={{ quote: { id: sendFor.id } }} client={client} clientName={clientName} toast={toast} onClose={() => onClose()} justCreated={!isEdit}
      title={!isEdit ? `Quote ${sendFor.number} created — email it to ${clientName}?` : `Email quote ${quoteLabel(sendFor)}`} sentToast={`Quote ${quoteLabel(sendFor)} emailed`}
      initialSubject={`Your quote ${quoteLabel(sendFor)} is ready`}
      initialMessage={`Hi ${firstName(clientName)},\n\nThank you for your interest! Here is your quote ${quoteLabel(sendFor)} for ${fmt$(sendFor.amount)}.${valid}\n\nClick the button below to review it. If everything looks good, you can accept it right there and your invoice will be created automatically.`}
      buttonLabel="View & accept quote" />
  }

  return (
    <Overlay onClose={onClose}>
      <Header title={isEdit ? `Quote ${quoteLabel(quote)} — ${clientName}` : `New quote — ${clientName}`} onClose={onClose} />
      {accepted && <Banner tone="done">Accepted{quote.acceptedAt ? ` on ${new Date(quote.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}.{linkedInvoice ? ` Invoice ${invoiceLabel(linkedInvoice)} was created from it.` : ''}</Banner>}
      {isEdit && !accepted && <Banner>Waiting for {clientName} to accept.</Banner>}

      <div className="invoice-editor-meta">
        <div style={{ ...T.formGroup, marginBottom: 0 }}>
          <label style={T.formLabel}>Prepared for</label>
          <div style={{ padding: '9px 0', fontSize: 14, fontWeight: 500 }}>{clientName}{client?.email ? <span style={{ color: C.muted, fontWeight: 400 }}> · {client.email}</span> : ''}</div>
        </div>
        <div style={{ ...T.formGroup, marginBottom: 0 }}>
          <label style={T.formLabel}>Quote number</label>
          <div style={{ padding: '9px 0', fontSize: 14, fontWeight: 500 }}>{isEdit ? quoteLabel(quote) : nextQuoteNumber(data.quotes || [])}</div>
        </div>
        <div style={{ ...T.formGroup, marginBottom: 0 }}>
          <label style={T.formLabel}>Valid until</label>
          <input style={T.formInput} type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
        </div>
      </div>

      <LineItemBuilder value={lineData} onChange={setLineData} catalog={buildItemCatalog(data)} />

      <div style={{ ...T.modalFooter, flexWrap: 'wrap' }} className="modal-footer-wrap">
        {isEdit && <button style={{ ...T.btn, color: C.red, borderColor: C.red }} onClick={remove}>Delete</button>}
        <div style={{ flex: 1 }} />
        <button style={T.btn} onClick={onClose}>Cancel</button>
        {isEdit && !accepted && <button style={{ ...T.btn, color: C.green, borderColor: C.green }} onClick={accept}>Accepted → create invoice</button>}
        {isEdit && !accepted && <button style={T.btn} onClick={() => save({ thenSend: true })}>Save &amp; email client</button>}
        <button style={T.btnPrimary} onClick={() => save()}>{isEdit ? 'Save changes' : 'Create quote'} · {fmt$(total)}</button>
      </div>
    </Overlay>
  )
}

// ── Contract ──────────────────────────────────────────────────────
// Without `contract`: build a new one, then offer to email it.
// With `contract`: view it, email it, copy the signing link, edit or delete.
export function ContractModal({ client: clientProp, contract, data, setData, toast, onClose, onSaved }) {
  const [mode, setMode] = useState(contract ? 'view' : 'build') // build | view | send
  const [current, setCurrent] = useState(contract || null)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const live = current ? data.contracts.find(k => k.id === current.id) || current : null
  const client = clientFor(data, live, clientProp)
  const clientName = client?.name || live?.client || ''

  const handleSave = k => {
    const exists = data.contracts.some(item => item.id === k.id)
    setData(d => ({ ...d, contracts: exists ? d.contracts.map(item => item.id === k.id ? k : item) : [...d.contracts, k] }))
    toast(exists ? 'Contract updated' : 'Contract saved'); onSaved?.()
    setCurrent(k); setMode(exists ? 'view' : 'send')
  }

  const copyLink = async () => {
    setBusy(true)
    try {
      const result = await callApi('/api/contract-link', { contractId: live.id })
      setLink(result.url)
      toast(await copyText(result.url) ? 'Signing link copied' : 'Signing link ready')
    } catch (error) { toast(error.message || 'Could not create signing link') }
    setBusy(false)
  }

  const remove = () => {
    if (!confirm('Delete this contract? This cannot be undone.')) return
    setData(d => ({ ...d, contracts: d.contracts.filter(k => k.id !== live.id) }))
    toast('Contract deleted'); onClose()
  }

  if (mode === 'build') {
    return (
      <Overlay onClose={onClose} maxWidth={760}>
        <ContractBuilder client={client} contract={live} data={data} onSave={handleSave} onClose={live ? () => setMode('view') : onClose} />
      </Overlay>
    )
  }

  if (mode === 'send') {
    return <SendEmailModal endpoint="/api/email-contract" payload={{ contract: { id: live.id } }} client={client} clientName={clientName} toast={toast}
      onClose={result => (result?.sent || !contract ? onClose() : setMode('view'))} justCreated={!contract}
      title={!contract ? `Contract saved — email it to ${clientName} to sign?` : `Email contract to ${clientName}`} sentToast="Contract emailed"
      initialSubject={`Your ${live.type || 'photography agreement'} is ready to sign`}
      initialMessage={`Hi ${firstName(clientName)},\n\nYour ${live.type || 'photography agreement'} is ready. Please review it and sign securely using the button below.\n\nIf you have any questions about the terms, just reply to this email before signing.`}
      buttonLabel="Review and sign contract"
      extraActions={<button style={T.btn} disabled={busy} onClick={copyLink}>{busy ? 'Preparing…' : 'Copy signing link'}</button>} />
  }

  const signed = live.status === 'signed'
  return (
    <Overlay onClose={onClose} maxWidth={820}>
      <Header title={`${live.type || 'Contract'} — ${clientName}`} onClose={onClose} />
      {signed
        ? <Banner tone="done">Signed by {live.signedBy || clientName}{live.signedAt ? ` · ${live.signedAt}` : ''}</Banner>
        : <Banner>Waiting for {clientName} to sign · created {live.sent || 'recently'}</Banner>}
      {link && (
        <div style={T.formGroup}>
          <label style={T.formLabel}>Signing link</label>
          <input aria-label="Signing link" style={T.formInput} readOnly value={link} onFocus={event => event.currentTarget.select()} />
        </div>
      )}
      <div style={{ background: C.surface2, borderRadius: 10, padding: 12, border: `1px solid ${C.border}`, maxHeight: '55vh', overflowY: 'auto' }}>
        <ContractDocument body={live.body} signedBy={live.signedBy} signedAt={live.signedAt} signatureData={live.fields?.signatureData} headerImageUrl={live.fields?.headerImageUrl} />
      </div>
      <div style={{ ...T.modalFooter, flexWrap: 'wrap' }} className="modal-footer-wrap">
        <button style={{ ...T.btn, color: C.red, borderColor: C.red }} onClick={remove}>Delete</button>
        <div style={{ flex: 1 }} />
        {!signed && <button style={T.btn} onClick={() => setMode('build')}>Edit</button>}
        {!signed && <button style={T.btn} disabled={busy} onClick={copyLink}>{busy ? 'Preparing…' : 'Copy signing link'}</button>}
        {!signed && <button style={T.btnPrimary} onClick={() => setMode('send')}>Email to client</button>}
        {signed && <button style={T.btnPrimary} onClick={onClose}>Close</button>}
      </div>
    </Overlay>
  )
}

// ── Questionnaire ─────────────────────────────────────────────────
const defaultQuestions = () => [
  { id: uid(), text: 'How did you hear about us?', type: 'text' },
  { id: uid(), text: 'Do you have any specific shots in mind?', type: 'textarea' },
  { id: uid(), text: 'Are there any props or outfits you plan to bring?', type: 'text' },
]

export function QuestionnaireModal({ client: clientProp, questionnaire, data, setData, toast, onClose, onSaved }) {
  const isEdit = !!questionnaire
  const live = isEdit ? (data.questionnaires || []).find(q => q.id === questionnaire.id) || questionnaire : null
  const client = clientFor(data, live, clientProp)
  const clientName = client?.name || live?.client || ''
  const [title, setTitle] = useState(live?.title || `${client?.type || 'Session'} Questionnaire`)
  const [questions, setQuestions] = useState(live?.questions?.length ? live.questions : defaultQuestions())
  const [newQ, setNewQ] = useState('')
  const [sendFor, setSendFor] = useState(null)

  const addQ = () => {
    if (!newQ.trim()) return
    setQuestions([...questions, { id: uid(), text: newQ.trim(), type: 'text' }])
    setNewQ('')
  }
  const removeQ = id => setQuestions(questions.filter(q => q.id !== id))
  const updateQ = (id, patch) => setQuestions(questions.map(q => q.id === id ? { ...q, ...patch } : q))

  const save = () => {
    const cleaned = questions.filter(q => q.text.trim())
    if (!cleaned.length) { toast('Add at least one question'); return }
    let saved
    if (isEdit) {
      saved = { ...live, title, questions: cleaned }
      setData(d => ({ ...d, questionnaires: d.questionnaires.map(q => q.id === live.id ? saved : q) }))
    } else {
      saved = { id: uid(), client: clientName, clientId: client?.id || null, title, questions: cleaned, answers: {}, status: 'draft', createdAt: todayShort() }
      setData(d => ({ ...d, questionnaires: [...(d.questionnaires || []), saved] }))
    }
    onSaved?.(); setSendFor(saved)
  }

  const remove = () => {
    if (!confirm(`Delete "${live.title}"? This cannot be undone.`)) return
    setData(d => ({ ...d, questionnaires: d.questionnaires.filter(q => q.id !== live.id) }))
    toast('Questionnaire deleted'); onClose()
  }

  if (sendFor) {
    return <SendEmailModal endpoint="/api/email-questionnaire" payload={{ questionnaire: { id: sendFor.id } }} client={client} clientName={clientName} toast={toast}
      onClose={result => {
        if (result?.sent) setData(d => ({ ...d, questionnaires: d.questionnaires.map(q => q.id === sendFor.id && q.status !== 'completed' ? { ...q, status: 'sent' } : q) }))
        else if (sendFor.status !== 'sent') toast('Saved as a draft — open it from Activity to send it')
        onClose()
      }}
      justCreated title={`Send "${sendFor.title}" to ${clientName}`} sentToast="Questionnaire sent"
      initialSubject="A few questions before your session"
      initialMessage={`Hi ${firstName(clientName)},\n\nTo help us plan your session, please take a few minutes to answer a few quick questions.\n\nClick the button below to open the questionnaire. Thank you!`}
      buttonLabel="Answer questionnaire" />
  }

  // Answered questionnaires are read-only: show the client's answers.
  if (live?.status === 'completed') {
    const submittedAt = live.answers?.submittedAt
    return (
      <Modal title={`${live.title} — ${clientName}`} onClose={onClose} wide
        footer={<><button style={{ ...T.btn, color: C.red, borderColor: C.red }} onClick={remove}>Delete</button><div style={{ flex: 1 }} /><button style={T.btnPrimary} onClick={onClose}>Close</button></>}>
        <Banner tone="done">Answered{submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</Banner>
        {live.questions.map((q, i) => (
          <div key={q.id} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>{i + 1}. {q.text}</div>
            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{live.answers?.[q.id] || <span style={{ color: C.faint }}>No answer</span>}</div>
          </div>
        ))}
      </Modal>
    )
  }

  return (
    <Modal title={isEdit ? `${live.title} — ${clientName}` : `Questionnaire — ${clientName}`} onClose={onClose} wide
      footer={<>
        {isEdit && <button style={{ ...T.btn, color: C.red, borderColor: C.red }} onClick={remove}>Delete</button>}
        <div style={{ flex: 1 }} />
        <button style={T.btn} onClick={onClose}>Cancel</button>
        <button style={T.btnPrimary} onClick={save}>{live?.status === 'sent' ? 'Save & resend' : 'Next: send to client'}</button>
      </>}>
      {live && <Banner>{live.status === 'sent' ? `Sent to ${clientName} — waiting for answers.` : 'Draft — not sent yet.'}</Banner>}
      <div style={T.formGroup}>
        <label style={T.formLabel}>Questionnaire title</label>
        <input style={T.formInput} value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={T.formLabel}>Questions</label>
        {questions.map((q, i) => (
          <div key={q.id} className="questionnaire-row">
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.muted, flexShrink: 0 }}>{i + 1}</div>
            <input style={{ ...T.formInput, flex: 1, minWidth: 0 }} value={q.text} onChange={e => updateQ(q.id, { text: e.target.value })} placeholder="Question text" />
            <select style={{ ...T.formInput, width: 120 }} value={q.type} onChange={e => updateQ(q.id, { type: e.target.value })}>
              <option value="text">Short text</option>
              <option value="textarea">Long text</option>
              <option value="yesno">Yes / No</option>
            </select>
            <button aria-label="Remove question" style={{ ...T.btnGhost, color: C.red, fontSize: 16, flexShrink: 0 }} onClick={() => removeQ(q.id)}>×</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...T.formInput, flex: 1 }} placeholder="Add a question..." value={newQ} onChange={e => setNewQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && addQ()} />
        <button style={T.btnSm} onClick={addQ}>Add</button>
      </div>
    </Modal>
  )
}

// ── Session ───────────────────────────────────────────────────────
export function SessionModal({ client: clientProp, session, data, setData, toast, onClose, onSaved }) {
  const isEdit = !!session
  const client = clientFor(data, session, clientProp)
  const clientName = client?.name || session?.client || ''
  const [form, setForm] = useState({
    type: session?.type || client?.type || data.sessionTypes?.[0] || 'Family',
    date: session?.date || client?.date || '',
    time: session?.time || '',
    location: session?.location || '',
    notes: session?.notes || '',
    status: session?.status || 'pending',
  })
  const types = data.sessionTypes || ['Family', 'Maternity', 'Newborn', 'Portrait']
  const when = form.date ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''

  const save = () => {
    if (!form.date) { toast('Please set a session date'); return }
    if (isEdit) {
      setData(d => ({ ...d, bookings: d.bookings.map(b => b.id === session.id ? { ...b, ...form } : b) }))
      toast('Session updated')
    } else {
      const b = { id: uid(), client: clientName, clientId: client?.id || null, ...form }
      setData(d => ({ ...d, bookings: [...d.bookings, b] }))
      toast(`Session scheduled · ${when}${form.time ? ` at ${form.time}` : ''}`)
    }
    onSaved?.(); onClose()
  }

  const remove = () => {
    if (!confirm('Delete this session? This cannot be undone.')) return
    setData(d => ({ ...d, bookings: d.bookings.filter(b => b.id !== session.id) }))
    toast('Session deleted'); onClose()
  }

  return (
    <Modal title={`${isEdit ? 'Session' : 'Schedule session'} — ${clientName}`} onClose={onClose}
      footer={<>
        {isEdit && <button style={{ ...T.btn, color: C.red, borderColor: C.red }} onClick={remove}>Delete</button>}
        <div style={{ flex: 1 }} />
        <button style={T.btn} onClick={onClose}>Cancel</button>
        <button style={T.btnPrimary} onClick={save}>{isEdit ? 'Save changes' : 'Schedule session'}</button>
      </>}>
      <div style={T.formRow} className="form-row-2">
        <div style={T.formGroup}>
          <label style={T.formLabel}>Session type</label>
          <select style={T.formInput} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            {!types.includes(form.type) && form.type && <option>{form.type}</option>}
            {types.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={T.formGroup}>
          <label style={T.formLabel}>Date <span style={{ color: C.red }}>*</span></label>
          <input style={T.formInput} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
      </div>
      <div style={T.formRow} className="form-row-2">
        <div style={T.formGroup}>
          <label style={T.formLabel}>Time</label>
          <input style={T.formInput} type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
        </div>
        <div style={T.formGroup}>
          <label style={T.formLabel}>Location</label>
          <input style={T.formInput} placeholder="Studio, park, etc." value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
      </div>
      {isEdit && (
        <div style={T.formGroup}>
          <label style={T.formLabel}>Status</label>
          <select style={T.formInput} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      )}
      <div style={T.formGroup}>
        <label style={T.formLabel}>Notes for client</label>
        <textarea style={{ ...T.formInput, resize: 'none' }} rows={3} placeholder="Outfit suggestions, what to bring, parking info..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>

      {form.date && (
        <div style={{ background: C.surface2, borderRadius: 8, padding: '12px 14px', marginTop: 4, fontSize: 13, color: C.muted }}>
          📅 <strong style={{ color: C.text }}>{clientName}</strong> · {form.type} · {when}{form.time ? ` at ${form.time}` : ''}{form.location ? ` · ${form.location}` : ''}
        </div>
      )}
    </Modal>
  )
}

// ── Message ───────────────────────────────────────────────────────
// Emails the client through /api/email-message (Resend) and records the
// message in their Inbox conversation.
export function MessageModal({ client, data, setData, toast, onClose, onSaved }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const existing = data.messages.find(m => m.clientId === client.id)

  const send = async () => {
    if (!body.trim()) { toast('Write a message first'); return }
    if (!client.email) { setError(`${client.name} has no email address. Add one in the client details first.`); return }
    setSending(true); setError('')
    try {
      await callApi('/api/email-message', { clientId: client.id, clientName: client.name, message: body.trim() })
      const msg = { id: uid(), from: 'You', text: body.trim(), time: todayShort(), at: new Date().toISOString(), out: true, via: 'email' }
      if (existing) {
        setData(d => ({ ...d, messages: d.messages.map(m => m.id === existing.id ? { ...m, thread: [...m.thread, msg] } : m) }))
      } else {
        setData(d => ({ ...d, messages: [{ id: uid(), from: client.name, clientId: client.id, thread: [msg], unread: false }, ...d.messages] }))
      }
      toast(`Email sent to ${client.email}`); onSaved?.(); onClose()
    } catch (err) {
      setError(err.message || 'Message could not be sent')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal title={`Message — ${client.name}`} onClose={onClose}
      footer={<><button style={T.btn} onClick={onClose}>Cancel</button><button style={{ ...T.btnPrimary, opacity: sending ? 0.6 : 1 }} disabled={sending} onClick={send}>{sending ? 'Sending…' : 'Send email'}</button></>}>
      <div style={{ marginBottom: 12, fontSize: 13, color: C.muted }}>
        To: <strong style={{ color: C.text }}>{client.name}</strong>{client.email ? ` · ${client.email}` : ' · no email address'}
      </div>
      {existing?.thread?.length > 0 && (
        <div style={{ background: C.surface2, borderRadius: 8, padding: '10px 14px', marginBottom: 14, maxHeight: 200, overflowY: 'auto' }}>
          {existing.thread.slice(-5).map(m => (
            <div key={m.id} style={{ marginBottom: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: m.out ? C.text : C.blue }}>{m.out ? 'You' : client.name}{m.via ? ` (${m.via})` : ''}:</span>{' '}
              <span style={{ color: C.muted, whiteSpace: 'pre-wrap' }}>{m.text}</span>
              {m.time && <span style={{ color: C.faint, fontSize: 11 }}> · {m.time}</span>}
            </div>
          ))}
        </div>
      )}
      <div style={T.formGroup}>
        <label style={T.formLabel}>Message</label>
        <textarea style={{ ...T.formInput, resize: 'vertical' }} rows={6} placeholder={`Write a message to ${client.name}...`} value={body} onChange={e => setBody(e.target.value)} autoFocus />
      </div>
      <div style={{ fontSize: 12, color: C.faint, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span>Sent by email with a link to your private chat. Replies show up here.</span>
        <button type="button" style={{ ...T.btnGhost, color: C.blue, padding: 0 }} onClick={() => copyChatLink(client.id, toast)}>Copy chat link</button>
      </div>
      {error && <div style={{ marginTop: 12, padding: '10px 14px', background: C.redBg, color: C.red, borderRadius: 8, fontSize: 13 }}>{error}</div>}
    </Modal>
  )
}
