import { useState } from 'react'
import { T, C } from '../lib/tokens'
import { Modal } from './UI'
import { LineItemBuilder, calcTotal } from './LineItemBuilder'
import { CONTRACT_TEMPLATE, fillContract, buildContractFields } from '../lib/contractTemplate'

const uid = () => Math.random().toString(36).slice(2, 8)
const fmt$ = n => '$' + Number(n || 0).toFixed(2)

// ── Invoice Modal ─────────────────────────────────────────────────
export function InvoiceModal({ client, data, setData, toast, onClose }) {
  const emptyLine = { items: [{ id: uid(), name: '', description: '', qty: 1, price: '' }], discount: '', discountType: '%', tax: '', notes: 'Thank you for your business' }
  const [lineData, setLineData] = useState(emptyLine)
  const [due, setDue] = useState('')
  const [existing, setExisting] = useState(null)

  const clientInvoices = data.invoices.filter(i => i.clientId === client.id)
  const total = calcTotal(lineData)

  const save = () => {
    if (calcTotal(lineData) === 0 && lineData.items.every(i => !i.name)) {
      toast('Add at least one item'); return
    }
    const inv = {
      id: 'INV-' + String(data.invoices.length + 1).padStart(3, '0'),
      client: client.name, clientId: client.id,
      amount: total, due, status: 'unpaid', paid: 0,
      note: lineData.notes || '', paymentIntentId: null,
      lineData,
    }
    setData(d => ({ ...d, invoices: [...d.invoices, inv] }))
    toast('Invoice created'); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 780, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.14)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={T.modalTitle}>New Invoice — {client.name}</div>
          <button onClick={onClose} style={{ ...T.btnGhost, fontSize: 20, color: C.muted }}>×</button>
        </div>

        {/* Existing invoices for this client */}
        {clientInvoices.length > 0 && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Previous invoices</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {clientInvoices.map(i => (
                <div key={i.id} style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.border2}`, fontSize: 12, fontWeight: 500, color: C.muted, background: C.surface }}>
                  {i.id} · {fmt$(i.amount)} · <span style={{ color: i.status === 'paid' ? C.green : i.status === 'partial' ? C.amber : C.red }}>{i.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Due date */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end' }}>
          <div style={{ ...T.formGroup, marginBottom: 0, flex: 1 }}>
            <label style={T.formLabel}>Due date</label>
            <input style={T.formInput} type="date" value={due} onChange={e => setDue(e.target.value)} />
          </div>
          <div style={{ fontSize: 13, color: C.muted, paddingBottom: 10 }}>For: <strong>{client.name}</strong></div>
        </div>

        <LineItemBuilder value={lineData} onChange={setLineData} />

        <div style={T.modalFooter}>
          <button style={T.btn} onClick={onClose}>Cancel</button>
          <button style={T.btnPrimary} onClick={save}>Create invoice · {fmt$(total)}</button>
        </div>
      </div>
    </div>
  )
}

// ── Quote Modal ───────────────────────────────────────────────────
export function QuoteModal({ client, data, setData, toast, onClose }) {
  const emptyLine = { items: [{ id: uid(), name: '', description: '', qty: 1, price: '' }], discount: '', discountType: '%', tax: '', notes: '' }
  const [lineData, setLineData] = useState(emptyLine)
  const [validUntil, setValidUntil] = useState('')
  const total = calcTotal(lineData)

  const save = () => {
    const q = {
      id: 'QT-' + String((data.quotes?.length || 0) + 1).padStart(3, '0'),
      client: client.name, clientId: client.id,
      amount: total, validUntil, status: 'pending',
      lineData, createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }
    setData(d => ({ ...d, quotes: [...(d.quotes || []), q] }))
    toast('Quote sent'); onClose()
  }

  const clientQuotes = (data.quotes || []).filter(q => q.clientId === client.id)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 780, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.14)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={T.modalTitle}>New Quote — {client.name}</div>
          <button onClick={onClose} style={{ ...T.btnGhost, fontSize: 20, color: C.muted }}>×</button>
        </div>

        {clientQuotes.length > 0 && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Previous quotes</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {clientQuotes.map(q => (
                <div key={q.id} style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${C.border2}`, fontSize: 12, fontWeight: 500, color: C.muted, background: C.surface, cursor: 'pointer' }}
                  onClick={() => setLineData(q.lineData || emptyLine)} title="Click to load this quote">
                  {q.id} · {fmt$(q.amount)} · {q.status} ↩
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ ...T.formGroup, marginBottom: 20 }}>
          <label style={T.formLabel}>Valid until</label>
          <input style={{ ...T.formInput, maxWidth: 220 }} type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
        </div>

        <LineItemBuilder value={lineData} onChange={setLineData} />

        <div style={T.modalFooter}>
          <button style={T.btn} onClick={onClose}>Cancel</button>
          <button style={T.btnPrimary} onClick={save}>Send quote · {fmt$(total)}</button>
        </div>
      </div>
    </div>
  )
}

// ── Contract Modal ────────────────────────────────────────────────
export function ContractModal({ client, data, setData, toast, onClose }) {
  const clientBooking = data.bookings.find(b => b.clientId === client.id)
  const clientInvoice = data.invoices.find(i => i.clientId === client.id)
  const autoFields = buildContractFields(client, clientBooking, clientInvoice)
  const [body, setBody] = useState(fillContract(CONTRACT_TEMPLATE, autoFields))
  const [contractType, setContractType] = useState(`${client.type || 'Portrait'} Photography Agreement`)
  const [tab, setTab] = useState('edit') // edit | preview

  const save = () => {
    const k = {
      id: uid(), client: client.name, clientId: client.id,
      type: contractType, sent: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'pending', body,
    }
    setData(d => ({ ...d, contracts: [...d.contracts, k] }))
    toast('Contract created'); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 760, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.14)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={T.modalTitle}>New Contract — {client.name}</div>
          <button onClick={onClose} style={{ ...T.btnGhost, fontSize: 20, color: C.muted }}>×</button>
        </div>

        {/* Auto-fill notice */}
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12.5, color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>✦</span>
          Fields auto-filled from client record, booking, and invoice. Edit anything below before saving.
        </div>

        <div style={{ ...T.formGroup, marginBottom: 16 }}>
          <label style={T.formLabel}>Contract title</label>
          <input style={T.formInput} value={contractType} onChange={e => setContractType(e.target.value)} />
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'inline-flex', background: C.surface2, borderRadius: 8, padding: 3, gap: 2, marginBottom: 14 }}>
          {[['edit', 'Edit'], ['preview', 'Preview']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: tab === v ? C.surface : 'transparent', color: C.text, fontWeight: tab === v ? 500 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>

        {tab === 'edit' ? (
          <textarea style={{ ...T.formInput, resize: 'vertical', fontSize: 13, lineHeight: 1.7, fontFamily: 'monospace', minHeight: 420 }} value={body} onChange={e => setBody(e.target.value)} />
        ) : (
          <div style={{ background: C.surface2, borderRadius: 10, padding: '20px 24px', fontSize: 13.5, lineHeight: 1.85, color: C.text, whiteSpace: 'pre-wrap', minHeight: 420, fontWeight: 300 }}>{body}</div>
        )}

        <div style={T.modalFooter}>
          <button style={T.btn} onClick={onClose}>Cancel</button>
          <button style={T.btnPrimary} onClick={save}>Save contract</button>
        </div>
      </div>
    </div>
  )
}

// ── Questionnaire Modal ───────────────────────────────────────────
export function QuestionnaireModal({ client, data, setData, toast, onClose }) {
  const [title, setTitle] = useState(`${client.type || 'Session'} Questionnaire`)
  const [questions, setQuestions] = useState([
    { id: uid(), text: 'How did you hear about us?', type: 'text' },
    { id: uid(), text: 'Do you have any specific shots in mind?', type: 'textarea' },
    { id: uid(), text: 'Are there any props or outfits you plan to bring?', type: 'text' },
  ])
  const [newQ, setNewQ] = useState('')

  const addQ = () => {
    if (!newQ.trim()) return
    setQuestions([...questions, { id: uid(), text: newQ.trim(), type: 'text' }])
    setNewQ('')
  }

  const removeQ = id => setQuestions(questions.filter(q => q.id !== id))
  const updateQ = (id, patch) => setQuestions(questions.map(q => q.id === id ? { ...q, ...patch } : q))

  const save = () => {
    const qn = {
      id: uid(), client: client.name, clientId: client.id, title,
      questions, status: 'sent',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }
    setData(d => ({ ...d, questionnaires: [...(d.questionnaires || []), qn] }))
    toast('Questionnaire created'); onClose()
  }

  return (
    <Modal title={`Questionnaire — ${client.name}`} onClose={onClose} wide
      footer={<><button style={T.btn} onClick={onClose}>Cancel</button><button style={T.btnPrimary} onClick={save}>Send questionnaire</button></>}>
      <div style={T.formGroup}>
        <label style={T.formLabel}>Questionnaire title</label>
        <input style={T.formInput} value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={T.formLabel}>Questions</label>
        {questions.map((q, i) => (
          <div key={q.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.muted, flexShrink: 0 }}>{i + 1}</div>
            <input style={{ ...T.formInput, flex: 1 }} value={q.text} onChange={e => updateQ(q.id, { text: e.target.value })} placeholder="Question text" />
            <select style={{ ...T.formInput, width: 110 }} value={q.type} onChange={e => updateQ(q.id, { type: e.target.value })}>
              <option value="text">Short text</option>
              <option value="textarea">Long text</option>
              <option value="yesno">Yes / No</option>
            </select>
            <button style={{ ...T.btnGhost, color: C.red, fontSize: 16, flexShrink: 0 }} onClick={() => removeQ(q.id)}>×</button>
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

// ── Session Modal ─────────────────────────────────────────────────
export function SessionModal({ client, data, setData, toast, onClose }) {
  const [form, setForm] = useState({
    type: client.type || data.sessionTypes?.[0] || 'Family',
    date: client.date || '',
    time: '',
    location: '',
    notes: '',
  })
  const types = data.sessionTypes || ['Family', 'Maternity', 'Newborn', 'Portrait']

  const save = () => {
    if (!form.date) { toast('Please set a session date'); return }
    const b = { id: uid(), client: client.name, clientId: client.id, ...form, status: 'pending' }
    setData(d => ({ ...d, bookings: [...d.bookings, b] }))
    toast('Session scheduled'); onClose()
  }

  return (
    <Modal title={`Schedule Session — ${client.name}`} onClose={onClose}
      footer={<><button style={T.btn} onClick={onClose}>Cancel</button><button style={T.btnPrimary} onClick={save}>Schedule session</button></>}>
      <div style={T.formRow}>
        <div style={T.formGroup}>
          <label style={T.formLabel}>Session type</label>
          <select style={T.formInput} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            {types.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={T.formGroup}>
          <label style={T.formLabel}>Date <span style={{ color: C.red }}>*</span></label>
          <input style={T.formInput} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
      </div>
      <div style={T.formRow}>
        <div style={T.formGroup}>
          <label style={T.formLabel}>Time</label>
          <input style={T.formInput} type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
        </div>
        <div style={T.formGroup}>
          <label style={T.formLabel}>Location</label>
          <input style={T.formInput} placeholder="Studio, park, etc." value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>
      </div>
      <div style={T.formGroup}>
        <label style={T.formLabel}>Notes for client</label>
        <textarea style={{ ...T.formInput, resize: 'none' }} rows={3} placeholder="Outfit suggestions, what to bring, parking info..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>

      {/* Preview */}
      {form.date && (
        <div style={{ background: C.surface2, borderRadius: 8, padding: '12px 14px', marginTop: 4, fontSize: 13, color: C.muted }}>
          📅 <strong style={{ color: C.text }}>{client.name}</strong> · {form.type} · {new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}{form.time ? ` at ${form.time}` : ''}{form.location ? ` · ${form.location}` : ''}
        </div>
      )}
    </Modal>
  )
}

// ── Message Modal ─────────────────────────────────────────────────
export function MessageModal({ client, data, setData, toast, onClose }) {
  const [body, setBody] = useState('')
  const existing = data.messages.find(m => m.clientId === client.id)

  const send = () => {
    if (!body.trim()) { toast('Write a message first'); return }
    const msg = { id: uid(), from: 'You', text: body.trim(), time: 'Just now', out: true }
    if (existing) {
      setData(d => ({ ...d, messages: d.messages.map(m => m.id === existing.id ? { ...m, thread: [...m.thread, msg] } : m) }))
    } else {
      setData(d => ({ ...d, messages: [{ id: uid(), from: client.name, clientId: client.id, thread: [msg], unread: false }, ...d.messages] }))
    }
    toast('Message sent'); onClose()
  }

  return (
    <Modal title={`Message — ${client.name}`} onClose={onClose}
      footer={<><button style={T.btn} onClick={onClose}>Cancel</button><button style={T.btnPrimary} onClick={send}>Send message</button></>}>
      <div style={{ marginBottom: 12, fontSize: 13, color: C.muted }}>
        To: <strong style={{ color: C.text }}>{client.name}</strong>{client.email ? ` · ${client.email}` : ''}
      </div>
      {existing?.thread?.length > 0 && (
        <div style={{ background: C.surface2, borderRadius: 8, padding: '10px 14px', marginBottom: 14, maxHeight: 160, overflowY: 'auto' }}>
          {existing.thread.slice(-3).map(m => (
            <div key={m.id} style={{ marginBottom: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: m.out ? C.text : C.blue }}>{m.out ? 'You' : client.name}:</span>{' '}
              <span style={{ color: C.muted }}>{m.text}</span>
            </div>
          ))}
        </div>
      )}
      <div style={T.formGroup}>
        <label style={T.formLabel}>Message</label>
        <textarea style={{ ...T.formInput, resize: 'none' }} rows={5} placeholder={`Write a message to ${client.name}...`} value={body} onChange={e => setBody(e.target.value)} autoFocus />
      </div>
    </Modal>
  )
}

// ── Gallery Modal ─────────────────────────────────────────────────
export function GalleryModal({ client, data, setData, toast, onClose }) {
  const existing = data.clients.find(c => c.id === client.id)?.gallery || []
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [galleries, setGalleries] = useState(existing)

  const add = () => {
    if (!url.trim()) { toast('Enter a gallery URL'); return }
    const entry = { id: uid(), url: url.trim(), label: label.trim() || 'Gallery', addedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    const updated = [...galleries, entry]
    setGalleries(updated)
    setUrl(''); setLabel('')
  }

  const remove = id => setGalleries(galleries.filter(g => g.id !== id))

  const save = () => {
    setData(d => ({ ...d, clients: d.clients.map(c => c.id === client.id ? { ...c, gallery: galleries } : c) }))
    toast('Gallery links saved'); onClose()
  }

  return (
    <Modal title={`Gallery — ${client.name}`} onClose={onClose}
      footer={<><button style={T.btn} onClick={onClose}>Cancel</button><button style={T.btnPrimary} onClick={save}>Save</button></>}>
      <div style={{ marginBottom: 16 }}>
        <label style={T.formLabel}>Add gallery link</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input style={{ ...T.formInput, flex: 1 }} placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          <input style={{ ...T.formInput, width: 140 }} placeholder="Label (optional)" value={label} onChange={e => setLabel(e.target.value)} />
          <button style={T.btnSm} onClick={add}>Add</button>
        </div>
      </div>

      {galleries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: C.faint, fontSize: 13 }}>No gallery links yet. Paste a URL above.</div>
      )}

      {galleries.map(g => (
        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🖼</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>{g.label}</div>
            <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.blue, textDecoration: 'none', wordBreak: 'break-all' }}>{g.url}</a>
          </div>
          <div style={{ fontSize: 11, color: C.faint, whiteSpace: 'nowrap' }}>{g.addedAt}</div>
          <button style={{ ...T.btnGhost, color: C.red, fontSize: 16 }} onClick={() => remove(g.id)}>×</button>
        </div>
      ))}
    </Modal>
  )
}
