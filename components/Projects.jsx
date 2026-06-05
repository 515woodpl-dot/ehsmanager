import { useState, useMemo } from 'react'
import { T, C, badge } from '../lib/tokens'
import { Modal, Badge, Avatar, Seg } from './UI'

const uid = () => Math.random().toString(36).slice(2, 8)
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

// ── Card Modal ────────────────────────────────────────────────────
function CardModal({ client, stages, sessionTypes, data, setData, onClose, toast }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...client })
  const [activeTab, setActiveTab] = useState('getstarted')

  const clientInvoices = data.invoices.filter(i => i.clientId === client.id)
  const clientContracts = data.contracts.filter(k => k.clientId === client.id)
  const clientBookings = data.bookings.filter(b => b.clientId === client.id)

  const save = () => {
    setData(d => ({ ...d, clients: d.clients.map(c => c.id === client.id ? { ...form } : c) }))
    toast('Client updated'); setEditing(false)
  }

  const archive = () => {
    setData(d => ({ ...d, clients: d.clients.map(c => c.id === client.id ? { ...c, archived: true } : c) }))
    toast('Project archived'); onClose()
  }

  const del = () => {
    if (!confirm('Delete this project permanently?')) return
    setData(d => ({ ...d, clients: d.clients.filter(c => c.id !== client.id) }))
    toast('Project deleted'); onClose()
  }

  const createInvoice = () => {
    const inv = { id: 'INV-' + String(data.invoices.length + 1).padStart(3, '0'), client: client.name, clientId: client.id, amount: 0, due: '', status: 'unpaid', paid: 0, note: '', paymentIntentId: null }
    setData(d => ({ ...d, invoices: [...d.invoices, inv] }))
    toast('Invoice created — edit it in Invoices')
  }

  const createContract = () => {
    const k = { id: uid(), client: client.name, clientId: client.id, type: 'Photography Agreement', sent: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), status: 'pending', body: '' }
    setData(d => ({ ...d, contracts: [...d.contracts, k] }))
    toast('Contract created — edit it in Contracts')
  }

  const createSession = () => {
    const b = { id: uid(), client: client.name, clientId: client.id, type: client.type || 'Portrait', date: '', time: '', location: '', status: 'pending', notes: '' }
    setData(d => ({ ...d, bookings: [...d.bookings, b] }))
    toast('Session created — set the date in Calendar')
  }

  const createMessage = () => {
    const existing = data.messages.find(m => m.clientId === client.id)
    if (!existing) {
      setData(d => ({ ...d, messages: [{ id: uid(), from: client.name, clientId: client.id, thread: [], unread: false }, ...d.messages] }))
    }
    toast('Go to Inbox to send a message')
  }

  return (
    <div style={T.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.14)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 28px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <Avatar name={client.name} size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, fontWeight: 400, letterSpacing: '-0.3px' }}>{client.name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{client.type} · {fmtDate(client.date)}</div>
          </div>
          <Badge type={client.status} label={client.status} />
          <button onClick={onClose} style={{ ...T.btnGhost, fontSize: 20, color: C.faint, marginLeft: 8 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', flex: 1, overflow: 'hidden' }}>

          {/* LEFT PANEL */}
          <div style={{ borderRight: `1px solid ${C.border}`, padding: '22px 20px', overflowY: 'auto' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, background: C.surface2, borderRadius: 8, padding: 3, marginBottom: 20 }}>
              {[{ id: 'getstarted', label: 'Get Started' }, { id: 'activity', label: 'Activity' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', background: activeTab === tab.id ? C.surface : 'transparent', color: C.text, fontWeight: activeTab === tab.id ? 500 : 400, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'getstarted' && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, marginBottom: 10 }}>Send documents</div>
                <ActionItem icon="$" title="Invoice" subtitle="Get paid for your services" onClick={createInvoice} color={C.green} />
                <ActionItem icon="✎" title="Contract" subtitle="Request a signature" onClick={createContract} color={C.blue} />
                <ActionItem icon="?" title="Questionnaire" subtitle="Learn about client needs" onClick={() => toast('Questionnaire coming soon')} color={C.purple} />
                <ActionItem icon="📋" title="Quote" subtitle="Get client acceptance" onClick={() => toast('Quote coming soon')} color={C.amber} />

                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, margin: '18px 0 10px' }}>Schedule sessions</div>
                <ActionItem icon="📅" title="Session" subtitle="Invite your client to a session" onClick={createSession} />

                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, margin: '18px 0 10px' }}>Conversations</div>
                <ActionItem icon="✉" title="New message" subtitle="Write to your client" onClick={createMessage} />

                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, margin: '18px 0 10px' }}>Gallery</div>
                <ActionItem icon="🖼" title="Client Gallery" subtitle="Link photo collections" onClick={() => toast('Gallery linking coming soon')} />
              </>
            )}

            {activeTab === 'activity' && (
              <div>
                {clientInvoices.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, marginBottom: 10 }}>Invoices</div>
                    {clientInvoices.map(i => (
                      <div key={i.id} style={{ ...T.cardSm, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontSize: 13, fontWeight: 500 }}>{i.id}</div><div style={{ fontSize: 11, color: C.muted }}>${i.amount.toLocaleString()}</div></div>
                        <Badge type={i.status} label={i.status} />
                      </div>
                    ))}
                  </>
                )}
                {clientContracts.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, margin: '14px 0 10px' }}>Contracts</div>
                    {clientContracts.map(k => (
                      <div key={k.id} style={{ ...T.cardSm, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{k.type}</div>
                        <Badge type={k.status} label={k.status} />
                      </div>
                    ))}
                  </>
                )}
                {clientBookings.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, margin: '14px 0 10px' }}>Sessions</div>
                    {clientBookings.map(b => (
                      <div key={b.id} style={{ ...T.cardSm, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontSize: 13, fontWeight: 500 }}>{b.type}</div><div style={{ fontSize: 11, color: C.muted }}>{fmtDate(b.date)}</div></div>
                        <Badge type={b.status} label={b.status} />
                      </div>
                    ))}
                  </>
                )}
                {clientInvoices.length === 0 && clientContracts.length === 0 && clientBookings.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: C.faint, fontSize: 13 }}>No activity yet</div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT PANEL — Client details */}
          <div style={{ padding: '22px 26px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17 }}>Client details</div>
              {!editing
                ? <button style={T.btnSm} onClick={() => setEditing(true)}>Edit</button>
                : <div style={{ display: 'flex', gap: 8 }}>
                  <button style={T.btnSm} onClick={() => { setEditing(false); setForm({ ...client }) }}>Cancel</button>
                  <button style={T.btnPrimary} onClick={save}>Save</button>
                </div>
              }
            </div>

            {editing ? (
              <>
                <div style={T.formRow}>
                  <div style={T.formGroup}><label style={T.formLabel}>Full name</label><input style={T.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div style={T.formGroup}><label style={T.formLabel}>Session type</label>
                    <select style={T.formInput} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {sessionTypes.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={T.formRow}>
                  <div style={T.formGroup}><label style={T.formLabel}>Email</label><input style={T.formInput} type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div style={T.formGroup}><label style={T.formLabel}>Phone</label><input style={T.formInput} value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div style={T.formRow}>
                  <div style={T.formGroup}><label style={T.formLabel}>Session date</label><input style={T.formInput} type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                  <div style={T.formGroup}><label style={T.formLabel}>Status</label>
                    <select style={T.formInput} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={T.formGroup}><label style={T.formLabel}>Notes</label><textarea style={{ ...T.formInput, resize: 'none' }} rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </>
            ) : (
              <div>
                {[
                  { label: 'Full name', value: client.name },
                  { label: 'Email', value: client.email || '—' },
                  { label: 'Phone', value: client.phone || '—' },
                  { label: 'Session type', value: client.type },
                  { label: 'Session date', value: fmtDate(client.date) },
                  { label: 'Status', value: client.status },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{f.label}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 400, textAlign: 'right', maxWidth: '60%' }}>{f.value}</div>
                  </div>
                ))}
                {client.notes && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.faint, marginBottom: 6 }}>Notes</div>
                    <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.6, fontWeight: 300 }}>{client.notes}</div>
                  </div>
                )}
              </div>
            )}

            {/* Danger zone */}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.faint, marginBottom: 12 }}>Actions</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...T.btnSm, color: C.amber, borderColor: C.amber }} onClick={archive}>Archive project</button>
                <button style={{ ...T.btnSm, color: C.red, borderColor: C.red }} onClick={del}>Delete project</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      <div style={T.formRow}>
        <div style={T.formGroup}><label style={T.formLabel}>Email</label><input style={T.formInput} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
        <div style={T.formGroup}><label style={T.formLabel}>Phone</label><input style={T.formInput} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 000-0000" /></div>
      </div>
      <div style={T.formRow}>
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

  const drop = (e, stageId) => {
    e.preventDefault()
    if (!dragging) return
    setData(d => ({ ...d, clients: d.clients.map(c => c.id === dragging.id ? { ...c, status: stageId } : c) }))
    toast('Moved to ' + stages.find(s => s.id === stageId)?.label)
    setDragging(null); setOver(null)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(200px, 1fr))`, gap: 10, alignItems: 'start', overflowX: 'auto', paddingBottom: 8 }}>
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
  )
}

// ── List view ─────────────────────────────────────────────────────
function ListView({ clients, stages, onCardClick }) {
  return (
    <div style={T.card}>
      {clients.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: C.faint, fontSize: 13 }}>No projects found</div>}
      {clients.map((c, i) => (
        <div key={c.id} onClick={() => onCardClick(c)}
          style={{ ...T.dataRow, borderBottom: i === clients.length - 1 ? 'none' : `1px solid ${C.border}`, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = C.surface2}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...T.avatar(36) }}>{c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{c.email || '—'} · {c.phone || '—'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
    if (!confirm('Permanently delete this project?')) return
    setData(d => ({ ...d, clients: d.clients.filter(c => c.id !== id) }))
    toast('Project deleted')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={T.pageTitle}>Projects</div>
          <div style={T.pageSub}>{activeClients.length} active · {archivedClients.length} archived</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* View toggle */}
        <Seg
          options={[{ value: 'board', label: 'Board' }, { value: 'list', label: 'List' }, { value: 'archive', label: `Archive${archivedClients.length > 0 ? ` (${archivedClients.length})` : ''}` }]}
          value={view} onChange={setView}
        />

        {/* Search */}
        {view !== 'archive' && (
          <div style={{ position: 'relative', width: 200 }}>
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

        <button style={T.btn} onClick={() => setStageModal(true)}>⚙ Stages</button>
        <button style={T.btnPrimary} onClick={() => setNewModal(true)}>+ New project</button>
      </div>

      {/* Views */}
      {view === 'board' && <BoardView clients={activeClients} stages={stages} onCardClick={setCardModal} setData={setData} toast={toast} />}
      {view === 'list' && <ListView clients={activeClients} stages={stages} onCardClick={setCardModal} />}
      {view === 'archive' && <ArchiveView clients={archivedClients} onUnarchive={unarchive} onDelete={deletePermanently} />}

      {/* Modals */}
      {newModal && <NewProjectModal stages={stages} sessionTypes={sessionTypes} onAdd={addProject} onClose={() => setNewModal(false)} onAddType={addSessionType} />}
      {stageModal && <StageModal stages={stages} onSave={saveStages} onClose={() => setStageModal(false)} />}
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
