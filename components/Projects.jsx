import { useEffect, useState, useMemo } from 'react'
import { QuoteModal, ContractModal, QuestionnaireModal, SessionModal, MessageModal, copyChatLink } from './ActionModals'
import { T, C, badge } from '../lib/tokens'
import { Modal, Badge, Avatar, Seg, ConfirmModal } from './UI'
import { removeClient } from '../lib/data'
import { InvoiceModal } from './InvoiceModals'
import { invoiceLabel } from '../lib/invoices'
import { docTone, quoteLabel } from '../lib/documents'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })
const fmtDate = iso => { if (!iso) return 'TBD'; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

// ── Action Item (left panel of card modal) ────────────────────────
function ActionItem({ icon, title, subtitle, onClick, color = C.text }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 8, cursor: 'pointer', background: C.surface, transition: 'all 0.12s' }}
      onMouseEnter={e => e.currentTarget.style.background = C.surface2}
      onMouseLeave={e => e.currentTarget.style.background = C.surface}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: C.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, color }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 500, fontSize: 13.5, color: C.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  )
}

// ── Activity card (client documents) ──────────────────────────────
// Light orange while waiting on the studio or client, light green once done.
function DocCard({ kind, item, title, subtitle, status, onClick }) {
  const tone = docTone(kind, item)
  return (
    <button type="button" onClick={onClick} className={`doc-card doc-card-${tone}`} title="Open">
      <div style={{ minWidth: 0 }}>
        <div className="doc-card-title">{title}</div>
        {subtitle && <div className="doc-card-sub">{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span className="doc-card-status">{status}</span>
        <span style={{ color: C.faint }}>›</span>
      </div>
    </button>
  )
}

function ActivitySection({ title, onAdd, addLabel = '+ New', empty, children }) {
  const items = [].concat(children || []).filter(Boolean)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint }}>{title}</div>
        {onAdd && <button style={{ ...T.btnGhost, color: C.blue, fontWeight: 500 }} onClick={onAdd}>{addLabel}</button>}
      </div>
      {items.length ? items : <div style={{ fontSize: 12, color: C.faint, marginBottom: 6 }}>{empty}</div>}
    </div>
  )
}

const QUESTIONNAIRE_STATUS = { draft: 'Not sent', sent: 'Awaiting answers', completed: 'Answered' }
const sessionStatus = b => b.status === 'canceled' ? 'Canceled' : docTone('session', b) === 'done' ? 'Done' : b.status === 'confirmed' ? 'Confirmed' : 'Upcoming'

// ── Card Modal ────────────────────────────────────────────────────
function CardModal({ client: clientProp, stages, sessionTypes, data, setData, onClose, toast }) {
  // Always render the latest saved version of this client. The prop is the
  // snapshot taken when the card was clicked, so reading it directly made
  // saved edits look like they were ignored.
  const client = data.clients.find(c => c.id === clientProp.id) || clientProp
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...client })
  const [liveNotes, setLiveNotes] = useState(client.notes || '')
  const [notesSavedAt, setNotesSavedAt] = useState('')
  // details | getstarted | activity. On phones these are three tabs of one
  // screen; on desktop "details" is always visible on the right.
  const [tab, setTab] = useState('details')
  const [activeModal, setActiveModal] = useState(null) // invoice|contract|quote|questionnaire|session|message
  const [openDoc, setOpenDoc] = useState(null) // { kind, item } — existing document opened from Activity
  const [confirmDelete, setConfirmDelete] = useState(false)

  const mine = list => (list || []).filter(x => x.clientId === client.id)
  const clientInvoices = mine(data.invoices)
  const clientQuotes = mine(data.quotes)
  const clientContracts = mine(data.contracts)
  const clientQuestionnaires = mine(data.questionnaires)
  const clientBookings = mine(data.bookings).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const clientMessages = mine(data.messages)
  const openCount = [
    ...clientInvoices.map(x => docTone('invoice', x)), ...clientQuotes.map(x => docTone('quote', x)),
    ...clientContracts.map(x => docTone('contract', x)), ...clientQuestionnaires.map(x => docTone('questionnaire', x)),
    ...clientBookings.map(x => docTone('session', x)),
  ].filter(t => t === 'open').length

  const startEditing = () => { setForm({ ...client }); setEditing(true) }

  const save = () => {
    if (!form.name?.trim()) { toast('Name is required'); return }
    const { name, email, phone, type, date, status } = form
    setData(d => ({ ...d, clients: d.clients.map(c => c.id === client.id ? { ...c, name: name.trim(), email, phone, type, date, status, notes: liveNotes } : c) }))
    toast('Client updated'); setEditing(false)
  }

  useEffect(() => {
    setEditing(false)
    setForm({ ...client })
    setLiveNotes(client.notes || '')
    setNotesSavedAt('')
  }, [client.id])

  useEffect(() => {
    if (liveNotes === (client.notes || '')) return
    const timer = setTimeout(() => {
      setData(d => ({
        ...d,
        clients: d.clients.map(c => c.id === client.id ? { ...c, notes: liveNotes } : c),
      }))
      setForm(f => ({ ...f, notes: liveNotes }))
      setNotesSavedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    }, 450)
    return () => clearTimeout(timer)
  }, [client.id, client.notes, liveNotes, setData])

  const archive = () => {
    setData(d => ({ ...d, clients: d.clients.map(c => c.id === client.id ? { ...c, archived: true } : c) }))
    toast('Project archived'); onClose()
  }

  const del = () => {
    setData(d => removeClient(d, client.id))
    toast('Project deleted'); setConfirmDelete(false); onClose()
  }

  // After creating anything, show it in Activity so it's clear it exists.
  const showActivity = () => setTab('activity')
  const open = (kind, item) => setOpenDoc({ kind, item })
  const closeDoc = () => setOpenDoc(null)
  const modalProps = { client, data, setData, toast, onSaved: showActivity }
  const leftTab = tab === 'activity' ? 'activity' : 'getstarted'

  const sectionLabel = text => <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, marginBottom: 10 }}>{text}</div>

  return (
    <>
    <div style={T.overlay} className="card-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 940, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.14)', display: 'flex', flexDirection: 'column' }} className="card-modal-inner">
        {/* Header */}
        <div className="card-modal-header" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 28px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <Avatar name={client.name} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, fontWeight: 400, letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{client.type} · {fmtDate(client.date)}</div>
          </div>
          <Badge type={client.status} label={stages.find(s => s.id === client.status)?.label || client.status} />
          <button onClick={onClose} aria-label="Close" style={{ ...T.btnGhost, fontSize: 22, color: C.faint, marginLeft: 4 }}>×</button>
        </div>

        {/* Phone tabs — one screen, three views */}
        <div className="card-mobile-tabs" role="tablist">
          {[{ id: 'details', label: 'Details' }, { id: 'getstarted', label: 'Create' }, { id: 'activity', label: `Activity${openCount ? ` · ${openCount}` : ''}` }].map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, overflow: 'hidden' }} className="card-modal-body">

          {/* LEFT PANEL */}
          <div style={{ borderRight: `1px solid ${C.border}`, padding: '22px 20px', overflowY: 'auto' }} className={`card-modal-left${tab === 'details' ? ' card-pane-hidden-mobile' : ''}`}>
            {/* Desktop tabs */}
            <div className="card-left-tabs" style={{ display: 'flex', gap: 2, background: C.surface2, borderRadius: 8, padding: 3, marginBottom: 20 }}>
              {[{ id: 'getstarted', label: 'Get Started' }, { id: 'activity', label: `Activity${openCount ? ` · ${openCount}` : ''}` }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', background: leftTab === t.id ? C.surface : 'transparent', color: C.text, fontWeight: leftTab === t.id ? 500 : 400, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {leftTab === 'getstarted' && (
              <>
                {sectionLabel('Send documents')}
                <ActionItem icon="$" title="Invoice" subtitle="Get paid for your services" onClick={() => setActiveModal('invoice')} color={C.green} />
                <ActionItem icon="📋" title="Quote" subtitle="Get client acceptance" onClick={() => setActiveModal('quote')} color={C.amber} />
                <ActionItem icon="✎" title="Contract" subtitle="Request a signature" onClick={() => setActiveModal('contract')} color={C.blue} />
                <ActionItem icon="?" title="Questionnaire" subtitle="Learn about client needs" onClick={() => setActiveModal('questionnaire')} color={C.purple} />

                <div style={{ height: 8 }} />
                {sectionLabel('Schedule sessions')}
                <ActionItem icon="📅" title="Session" subtitle="Invite your client to a session" onClick={() => setActiveModal('session')} />

                <div style={{ height: 8 }} />
                {sectionLabel('Conversations')}
                <ActionItem icon="✉" title="New message" subtitle="Email your client" onClick={() => setActiveModal('message')} />
              </>
            )}

            {leftTab === 'activity' && (
              <div>
                <div className="doc-legend"><span className="doc-dot doc-dot-open" /> Waiting <span className="doc-dot doc-dot-done" /> Done</div>
                <ActivitySection title="Invoices" onAdd={() => setActiveModal('invoice')} empty="No invoices yet">
                  {clientInvoices.map(i => <DocCard key={i.id} kind="invoice" item={i} onClick={() => open('invoice', i)}
                    title={`Invoice ${invoiceLabel(i)}`} subtitle={`$${i.amount.toLocaleString()}${i.due ? ` · Due ${fmtDate(i.due)}` : ''}`} status={i.status} />)}
                </ActivitySection>
                <ActivitySection title="Quotes" onAdd={() => setActiveModal('quote')} empty="No quotes yet">
                  {clientQuotes.map(q => <DocCard key={q.id} kind="quote" item={q} onClick={() => open('quote', q)}
                    title={`Quote ${quoteLabel(q)}`} subtitle={`$${Number(q.amount || 0).toLocaleString()}${q.validUntil ? ` · Valid until ${fmtDate(q.validUntil)}` : ''}`} status={q.status === 'accepted' ? 'accepted' : 'awaiting'} />)}
                </ActivitySection>
                <ActivitySection title="Contracts" onAdd={() => setActiveModal('contract')} empty="No contracts yet">
                  {clientContracts.map(k => <DocCard key={k.id} kind="contract" item={k} onClick={() => open('contract', k)}
                    title={k.type || 'Contract'} subtitle={k.sent ? `Created ${k.sent}` : ''} status={k.status === 'signed' ? 'signed' : 'awaiting signature'} />)}
                </ActivitySection>
                <ActivitySection title="Questionnaires" onAdd={() => setActiveModal('questionnaire')} empty="No questionnaires yet">
                  {clientQuestionnaires.map(q => <DocCard key={q.id} kind="questionnaire" item={q} onClick={() => open('questionnaire', q)}
                    title={q.title || 'Questionnaire'} subtitle={`${q.questions?.length || 0} question${q.questions?.length === 1 ? '' : 's'}${q.createdAt ? ` · ${q.createdAt}` : ''}`} status={QUESTIONNAIRE_STATUS[q.status] || q.status} />)}
                </ActivitySection>
                <ActivitySection title="Sessions" onAdd={() => setActiveModal('session')} empty="No sessions yet">
                  {clientBookings.map(b => <DocCard key={b.id} kind="session" item={b} onClick={() => open('session', b)}
                    title={b.type || 'Session'} subtitle={`${fmtDate(b.date)}${b.time ? ` · ${b.time}` : ''}${b.location ? ` · ${b.location}` : ''}`} status={sessionStatus(b)} />)}
                </ActivitySection>
                <ActivitySection title="Messages" onAdd={() => setActiveModal('message')} empty="No messages yet">
                  <button key="chat-link" type="button" style={{ ...T.btnGhost, color: C.blue, padding: '0 0 8px', fontSize: 12 }} onClick={() => copyChatLink(client.id, toast)}>Copy {client.name.split(' ')[0]}'s chat link</button>
                  {clientMessages.map(m => { const last = m.thread?.[m.thread.length - 1]; return <DocCard key={m.id} kind={m.unread ? 'unread' : 'message'} item={m} onClick={() => { if (m.unread) setData(d => ({ ...d, messages: d.messages.map(x => x.id === m.id ? { ...x, unread: false } : x) })); setActiveModal('message') }}
                    title={`${m.unread ? 'New reply · ' : ''}${m.thread?.length || 0} message${m.thread?.length === 1 ? '' : 's'}`} subtitle={last ? `${last.out ? 'You' : client.name}: ${last.text}` : ''} status={last?.time || ''} /> })}
                </ActivitySection>
              </div>
            )}
          </div>

          {/* RIGHT PANEL — Client details */}
          <div style={{ padding: '22px 26px', overflowY: 'auto' }} className={`card-modal-right${tab !== 'details' ? ' card-pane-hidden-mobile' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17 }}>Client details</div>
              {!editing
                ? <button style={T.btnSm} onClick={startEditing}>Edit</button>
                : <div style={{ display: 'flex', gap: 8 }}>
                  <button style={T.btnSm} onClick={() => setEditing(false)}>Cancel</button>
                  <button style={T.btnPrimary} onClick={save}>Save</button>
                </div>
              }
            </div>

            {editing ? (
              <>
                <div style={T.formRow} className="form-row-2">
                  <div style={T.formGroup}><label style={T.formLabel}>Full name</label><input style={T.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div style={T.formGroup}><label style={T.formLabel}>Session type</label>
                    <select style={T.formInput} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {sessionTypes.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={T.formRow} className="form-row-2">
                  <div style={T.formGroup}><label style={T.formLabel}>Email</label><input style={T.formInput} type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div style={T.formGroup}><label style={T.formLabel}>Phone</label><input style={T.formInput} value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div style={T.formRow} className="form-row-2">
                  <div style={T.formGroup}><label style={T.formLabel}>Session date</label><input style={T.formInput} type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                  <div style={T.formGroup}><label style={T.formLabel}>Status</label>
                    <select style={T.formInput} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div>
                {[
                  { label: 'Full name', value: client.name },
                  { label: 'Email', value: client.email || '—' },
                  { label: 'Phone', value: client.phone || '—' },
                  { label: 'Session type', value: client.type },
                  { label: 'Session date', value: fmtDate(client.date) },
                  { label: 'Status', value: stages.find(s => s.id === client.status)?.label || client.status },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{f.label}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 400, textAlign: 'right', maxWidth: '65%', overflowWrap: 'anywhere' }}>{f.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 7 }}>
                <label style={T.formLabel}>Client notes</label>
                <span style={{ fontSize: 11, color: C.faint }}>
                  {notesSavedAt ? `Autosaved ${notesSavedAt}` : 'Autosaves while typing'}
                </span>
              </div>
              <textarea
                style={{ ...T.formInput, resize: 'vertical', minHeight: 110 }}
                rows={5}
                value={liveNotes}
                onChange={e => setLiveNotes(e.target.value)}
                placeholder="Private client notes, preferences, follow-ups, payment reminders..."
              />
            </div>

            {/* Danger zone */}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.faint, marginBottom: 12 }}>Actions</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button style={{ ...T.btnSm, color: C.amber, borderColor: C.amber }} onClick={archive}>Archive project</button>
                <button style={{ ...T.btnSm, color: C.red, borderColor: C.red }} onClick={() => setConfirmDelete(true)}>Delete project</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* New documents */}
    {activeModal === 'invoice' && <InvoiceModal {...modalProps} onClose={() => setActiveModal(null)} />}
    {activeModal === 'quote' && <QuoteModal {...modalProps} onClose={() => setActiveModal(null)} />}
    {activeModal === 'contract' && <ContractModal {...modalProps} onClose={() => setActiveModal(null)} />}
    {activeModal === 'questionnaire' && <QuestionnaireModal {...modalProps} onClose={() => setActiveModal(null)} />}
    {activeModal === 'session' && <SessionModal {...modalProps} onClose={() => setActiveModal(null)} />}
    {activeModal === 'message' && <MessageModal {...modalProps} onClose={() => setActiveModal(null)} />}

    {/* Existing documents opened from Activity */}
    {openDoc?.kind === 'invoice' && <InvoiceModal {...modalProps} invoice={openDoc.item} onClose={closeDoc} />}
    {openDoc?.kind === 'quote' && <QuoteModal {...modalProps} quote={openDoc.item} onClose={closeDoc} />}
    {openDoc?.kind === 'contract' && <ContractModal {...modalProps} contract={openDoc.item} onClose={closeDoc} />}
    {openDoc?.kind === 'questionnaire' && <QuestionnaireModal {...modalProps} questionnaire={openDoc.item} onClose={closeDoc} />}
    {openDoc?.kind === 'session' && <SessionModal {...modalProps} session={openDoc.item} onClose={closeDoc} />}

    {confirmDelete && <ConfirmModal danger title="Delete this project?" message={`${client.name}'s project will be removed. Existing invoices, sessions and contracts will remain in your records without a linked client.`} confirmLabel="Delete project" onClose={() => setConfirmDelete(false)} onConfirm={del} />}
    </>
  )
}

// ── Stage management modal ────────────────────────────────────────
function StageModal({ stages, onSave, onClose }) {
  const [local, setLocal] = useState([...stages])
  const [newLabel, setNewLabel] = useState('')
  const add = () => { if (!newLabel.trim()) return; setLocal([...local, { id: newLabel.toLowerCase().replace(/\s+/g, '-') + '-' + uid(), label: newLabel.trim() }]); setNewLabel('') }
  const del = id => setLocal(local.filter(s => s.id !== id))
  const rename = (id, label) => setLocal(local.map(s => s.id === id ? { ...s, label } : s))
  return (
    <div style={T.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...T.modal, maxWidth: 460 }}>
        <div style={T.modalHeader}>
          <div style={T.modalTitle}>Manage stages</div>
          <button onClick={onClose} style={{ ...T.btnGhost, fontSize: 20, color: C.muted }}>×</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          {local.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ color: C.faint, fontSize: 13, width: 20, textAlign: 'center' }}>{i + 1}</div>
              <input style={{ ...T.formInput, flex: 1 }} value={s.label} onChange={e => rename(s.id, e.target.value)} />
              <button style={{ ...T.btnGhost, color: C.red, fontSize: 16 }} onClick={() => del(s.id)}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input style={{ ...T.formInput, flex: 1 }} placeholder="New stage name..." value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          <button style={T.btnPrimary} onClick={add}>Add</button>
        </div>
        <div style={T.modalFooter}>
          <button style={T.btn} onClick={onClose}>Cancel</button>
          <button style={T.btnPrimary} onClick={() => { onSave(local); onClose() }}>Save stages</button>
        </div>
      </div>
    </div>
  )
}

// ── New Project Modal ─────────────────────────────────────────────
function NewProjectModal({ stages, sessionTypes, onAdd, onClose, onAddType }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: sessionTypes[0] || 'Family', date: '', status: stages[0]?.id || 'inquiry', notes: '' })
  const [customType, setCustomType] = useState('')
  const [addingType, setAddingType] = useState(false)

  const submit = () => {
    if (!form.name.trim()) return
    onAdd(form); onClose()
  }

  const saveCustomType = () => {
    if (!customType.trim()) return
    onAddType(customType.trim())
    setForm({ ...form, type: customType.trim() })
    setCustomType(''); setAddingType(false)
  }

  return (
    <Modal title="New project" onClose={onClose}
      footer={<><button style={T.btn} onClick={onClose}>Cancel</button><button style={T.btnPrimary} onClick={submit}>Create project</button></>}>
      <div style={T.formGroup}><label style={T.formLabel}>Full name</label><input style={T.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Client name" autoFocus /></div>
      <div style={T.formRow} className="form-row-2">
        <div style={T.formGroup}><label style={T.formLabel}>Email</label><input style={T.formInput} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
        <div style={T.formGroup}><label style={T.formLabel}>Phone</label><input style={T.formInput} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" /></div>
      </div>
      <div style={T.formRow} className="form-row-2">
        <div style={T.formGroup}>
          <label style={T.formLabel}>Session type</label>
          {addingType ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={{ ...T.formInput, flex: 1 }} placeholder="Type name..." value={customType} onChange={e => setCustomType(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveCustomType()} autoFocus />
              <button style={T.btnSm} onClick={saveCustomType}>Add</button>
              <button style={T.btnGhost} onClick={() => setAddingType(false)}>×</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <select style={{ ...T.formInput, flex: 1 }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {sessionTypes.map(t => <option key={t}>{t}</option>)}
              </select>
              <button style={{ ...T.btnSm, flexShrink: 0 }} onClick={() => setAddingType(true)} title="Add custom type">+</button>
            </div>
          )}
        </div>
        <div style={T.formGroup}><label style={T.formLabel}>Session date</label><input style={T.formInput} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
      </div>
      <div style={T.formGroup}><label style={T.formLabel}>Stage</label>
        <select style={T.formInput} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
          {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <div style={T.formGroup}><label style={T.formLabel}>Notes</label><textarea style={{ ...T.formInput, resize: 'none' }} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
    </Modal>
  )
}

// ── Board view ────────────────────────────────────────────────────
function BoardView({ clients, stages, onCardClick, setData, toast }) {
  const [dragging, setDragging] = useState(null)
  const [over, setOver] = useState(null)
  const [mobileStage, setMobileStage] = useState(stages[0]?.id)
  const currentStage = stages.find(s => s.id === mobileStage) || stages[0]
  const moveTo = (client, stageId) => {
    setData(d => ({ ...d, clients: d.clients.map(c => c.id === client.id ? { ...c, status: stageId } : c) }))
    toast(`${client.name} moved to ${stages.find(s => s.id === stageId)?.label}`)
  }

  const drop = (e, stageId) => {
    e.preventDefault()
    if (!dragging) return
    setData(d => ({ ...d, clients: d.clients.map(c => c.id === dragging.id ? { ...c, status: stageId } : c) }))
    toast('Moved to ' + stages.find(s => s.id === stageId)?.label)
    setDragging(null); setOver(null)
  }

  return (
    <>
    {/* Phones: one stage at a time, picked from tabs; touch can't drag, so
        each card has a "Move to" picker instead. */}
    <div className="kanban-mobile">
      <div className="chip-tabs" role="tablist">
        {stages.map(stage => (
          <button key={stage.id} role="tab" aria-selected={currentStage?.id === stage.id} className={currentStage?.id === stage.id ? 'active' : ''} onClick={() => setMobileStage(stage.id)}>
            {stage.label} <span>{clients.filter(c => c.status === stage.id).length}</span>
          </button>
        ))}
      </div>
      {clients.filter(c => c.status === currentStage?.id).map(c => (
        <div key={c.id} className="mobile-project-card" onClick={() => onCardClick(c)}>
          <Avatar name={c.name} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mobile-project-name">{c.name}</div>
            <div className="mobile-project-meta">{c.type} · {fmtDate(c.date)}</div>
          </div>
          <select aria-label={`Move ${c.name} to stage`} value={c.status} onClick={e => e.stopPropagation()} onChange={e => moveTo(c, e.target.value)}>
            {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      ))}
      {clients.filter(c => c.status === currentStage?.id).length === 0 && <div className="mobile-empty">No projects in {currentStage?.label}</div>}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(200px, 1fr))`, gap: 10, alignItems: 'start', overflowX: 'auto', paddingBottom: 8 }} className="kanban-board">
      {stages.map(stage => {
        const cards = clients.filter(c => c.status === stage.id)
        return (
          <div key={stage.id}
            style={{ background: over === stage.id ? '#F0F0FF' : C.surface2, borderRadius: 12, padding: 12, minHeight: 100, border: `1px solid ${over === stage.id ? '#C4C4F8' : C.border}`, transition: 'all 0.15s' }}
            onDragOver={e => { e.preventDefault(); setOver(stage.id) }}
            onDragLeave={() => setOver(null)}
            onDrop={e => drop(e, stage.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{stage.label}</span>
              <span style={{ fontSize: 11, color: C.faint, fontWeight: 500 }}>{cards.length}</span>
            </div>
            {cards.map(c => (
              <div key={c.id}
                draggable
                onDragStart={() => setDragging(c)}
                onDragEnd={() => { setDragging(null); setOver(null) }}
                onClick={() => onCardClick(c)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 13px', marginBottom: 8, cursor: 'pointer', opacity: dragging?.id === c.id ? 0.35 : 1, transition: 'box-shadow 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 3 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{c.type}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 9, fontSize: 11, color: C.faint }}>
                  <span>{fmtDate(c.date)}</span>
                </div>
              </div>
            ))}
            {cards.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: C.faint }}>Drop here</div>}
          </div>
        )
      })}
    </div>
    </>
  )
}

// ── List view ─────────────────────────────────────────────────────
function ListView({ clients, stages, onCardClick }) {
  return (
    <div style={T.card}>
      {clients.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: C.faint, fontSize: 13 }}>No projects found</div>}
      {clients.map((c, i) => (
        <div key={c.id} onClick={() => onCardClick(c)}
          className="project-list-row"
          style={{ ...T.dataRow, borderBottom: i === clients.length - 1 ? 'none' : `1px solid ${C.border}`, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = C.surface2}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div className="project-list-main" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...T.avatar(36) }}>{c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{c.email || '—'} · {c.phone || '—'}</div>
            </div>
          </div>
          <div className="project-list-meta" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 12, color: C.muted }}>{c.type}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{fmtDate(c.date)}</div>
            <Badge type={c.status} label={stages.find(s => s.id === c.status)?.label || c.status} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Archive view ──────────────────────────────────────────────────
function ArchiveView({ clients, onUnarchive, onDelete }) {
  return (
    <div style={T.card}>
      {clients.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: C.faint, fontSize: 13 }}>No archived projects</div>}
      {clients.map((c, i) => (
        <div key={c.id} style={{ ...T.dataRow, borderBottom: i === clients.length - 1 ? 'none' : `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...T.avatar(36), opacity: 0.5 }}>{c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14, color: C.muted }}>{c.name}</div>
              <div style={{ fontSize: 12, color: C.faint }}>{c.type} · {fmtDate(c.date)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={T.btnSm} onClick={() => onUnarchive(c.id)}>Restore</button>
            <button style={{ ...T.btnSm, color: C.red, borderColor: C.red }} onClick={() => onDelete(c.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Projects component ───────────────────────────────────────
export default function Projects({ data, setData, toast }) {
  const [view, setView] = useState('board') // board | list | archive
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [cardModal, setCardModal] = useState(null)
  const [newModal, setNewModal] = useState(false)
  const [stageModal, setStageModal] = useState(false)
  const [archiveDelete, setArchiveDelete] = useState(null)

  const stages = data.stages || []
  const sessionTypes = data.sessionTypes || []

  const activeClients = useMemo(() => {
    let list = data.clients.filter(c => !c.archived)
    if (search) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    if (typeFilter !== 'all') list = list.filter(c => c.type === typeFilter)
    if (sortBy === 'date') list = [...list].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [data.clients, search, typeFilter, sortBy])

  const archivedClients = data.clients.filter(c => c.archived)

  const addProject = (form) => {
    setData(d => ({ ...d, clients: [...d.clients, { id: uid(), ...form, archived: false }] }))
    toast('Project created')
  }

  const addSessionType = (type) => {
    if (data.sessionTypes.includes(type)) return
    setData(d => ({ ...d, sessionTypes: [...d.sessionTypes, type] }))
    toast('Session type added')
  }

  const saveStages = (newStages) => {
    setData(d => ({ ...d, stages: newStages }))
    toast('Stages updated')
  }

  const unarchive = (id) => {
    setData(d => ({ ...d, clients: d.clients.map(c => c.id === id ? { ...c, archived: false } : c) }))
    toast('Project restored')
  }

  const deletePermanently = (id) => {
    setData(d => removeClient(d, id))
    setArchiveDelete(null); toast('Project deleted')
  }

  return (
    <div>
      {/* Header */}
      <div className="projects-header page-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 12 }}>
        <div>
          <div style={T.pageTitle}>Projects</div>
          <div style={T.pageSub}>{activeClients.length} active · {archivedClients.length} archived</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={T.btn} onClick={() => setStageModal(true)} title="Manage stages">⚙ Stages</button>
          <button style={T.btnPrimary} onClick={() => setNewModal(true)}>+ New project</button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }} className="projects-toolbar">
        {/* View toggle */}
        <Seg
          options={[{ value: 'board', label: 'Board' }, { value: 'list', label: 'List' }, { value: 'archive', label: `Archive${archivedClients.length > 0 ? ` (${archivedClients.length})` : ''}` }]}
          value={view} onChange={setView}
        />

        {/* Search */}
        {view !== 'archive' && (
          <div className="project-search-wrap" style={{ position: 'relative', width: 200 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.faint, fontSize: 13, pointerEvents: 'none' }}>⌕</span>
            <input style={{ ...T.formInput, paddingLeft: 28, paddingRight: search ? 28 : 12, background: C.surface2, height: 36 }}
              placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.faint, fontSize: 15 }}>×</button>}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Right filters */}
        {view !== 'archive' && (
          <>
            <select style={{ ...T.formInput, width: 'auto', minWidth: 140, height: 36, paddingTop: 0, paddingBottom: 0 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {sessionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select style={{ ...T.formInput, width: 'auto', minWidth: 130, height: 36, paddingTop: 0, paddingBottom: 0 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="date">Sort by date</option>
              <option value="name">Sort by name</option>
            </select>
          </>
        )}

      </div>

      {/* Views */}
      {view === 'board' && <BoardView clients={activeClients} stages={stages} onCardClick={setCardModal} setData={setData} toast={toast} />}
      {view === 'list' && <ListView clients={activeClients} stages={stages} onCardClick={setCardModal} />}
      {view === 'archive' && <ArchiveView clients={archivedClients} onUnarchive={unarchive} onDelete={id => setArchiveDelete(archivedClients.find(client => client.id === id))} />}

      {/* Modals */}
      {newModal && <NewProjectModal stages={stages} sessionTypes={sessionTypes} onAdd={addProject} onClose={() => setNewModal(false)} onAddType={addSessionType} />}
      {stageModal && <StageModal stages={stages} onSave={saveStages} onClose={() => setStageModal(false)} />}
      {archiveDelete && <ConfirmModal danger title="Delete archived project?" message={`${archiveDelete.name}'s project will be permanently removed from the client list.`} confirmLabel="Delete project" onClose={() => setArchiveDelete(null)} onConfirm={() => deletePermanently(archiveDelete.id)} />}
      {cardModal && (
        <CardModal
          client={cardModal}
          stages={stages}
          sessionTypes={sessionTypes}
          data={data}
          setData={setData}
          onClose={() => setCardModal(null)}
          toast={toast}
        />
      )}
    </div>
  )
}

export { CardModal as CardModalExport }
