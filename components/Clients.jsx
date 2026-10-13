import { useState, useRef } from 'react'
import { T, C } from '../lib/tokens'
import { Modal, Badge, Avatar, SearchBar } from './UI'
import { removeClient } from '../lib/data'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })
const fmtDate = iso => { if (!iso) return 'TBD'; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/["']/g, ''))
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] || '' })
    // Map common column names
    return {
      id: uid(),
      name: obj.name || obj['full name'] || obj.fullname || obj.client || '',
      email: obj.email || obj['email address'] || '',
      phone: obj.phone || obj['phone number'] || obj.mobile || '',
      type: obj.type || obj['session type'] || 'Family',
      date: obj.date || obj['session date'] || '',
      notes: obj.notes || obj.note || '',
      status: obj.status || 'inquiry',
      archived: false,
    }
  }).filter(c => c.name)
}

export default function Clients({ data, setData, toast, sessionTypes }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [importPreview, setImportPreview] = useState([])
  const [importError, setImportError] = useState('')
  const fileRef = useRef()
  const blank = { name: '', email: '', phone: '', type: sessionTypes?.[0] || 'Family', date: '', notes: '' }
  const [form, setForm] = useState(blank)

  const types = sessionTypes || ['Family', 'Maternity', 'Newborn', 'Portrait']

  const filtered = data.clients.filter(c => {
    if (c.archived) return false
    const m = c.name.toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase())
    return filter === 'all' ? m : m && c.status === filter
  })

  const add = () => {
    if (!form.name.trim()) return
    setData(d => ({ ...d, clients: [...d.clients, { id: uid(), ...form, status: 'inquiry', archived: false }] }))
    toast('Client added'); setAddModal(false); setForm(blank)
  }

  const save = () => {
    setData(d => ({ ...d, clients: d.clients.map(c => c.id === editModal.id ? { ...editModal } : c) }))
    toast('Client updated'); setEditModal(null)
  }

  const del = id => {
    if (!confirm('Delete this client?')) return
    setData(d => removeClient(d, id))
    toast('Client deleted')
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportError('')
    try {
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const text = await file.text()
        const parsed = parseCSV(text)
        if (parsed.length === 0) { setImportError('No valid contacts found. Make sure the CSV has a header row with at least a "name" column.'); return }
        setImportPreview(parsed)
        setImportModal(true)
      } else {
        setImportError('Please export your spreadsheet as CSV and upload the .csv file.')
      }
    } catch (err) {
      setImportError('Could not read file: ' + err.message)
    }
    e.target.value = ''
  }

  const confirmImport = () => {
    setData(d => ({ ...d, clients: [...d.clients, ...importPreview] }))
    toast(`Imported ${importPreview.length} contacts`)
    setImportModal(false); setImportPreview([])
  }

  const iconSize = 19 // 20% larger than 16

  return (
    <div>
      <div style={T.pageHeader} className="page-header-wrap">
        <div>
          <div style={T.pageTitle}>Clients</div>
          <div style={T.pageSub}>{filtered.length} clients</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={T.btn} onClick={() => fileRef.current.click()}>↑ Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
          <button style={T.btnPrimary} onClick={() => setAddModal(true)}>+ Add client</button>
        </div>
      </div>

      {importError && (
        <div style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 8, padding: '10px 16px', fontSize: 13, color: C.red, marginBottom: 16 }}>{importError}</div>
      )}

      <div className="client-card-grid">
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search clients..." />
          <select style={{ ...T.formInput, width: 150 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="inquiry">Inquiry</option>
            <option value="booked">Booked</option>
            <option value="postpro">Post-pro</option>
            <option value="done">Done</option>
          </select>
        </div>

        {filtered.length === 0 && <div style={{ padding: '32px 0', textAlign: 'center', color: C.faint, fontSize: 13 }}>No clients found</div>}

        {filtered.map((c, i) => (
          <article key={c.id} className="client-summary-card" role="button" tabIndex={0} onClick={() => setEditModal({ ...c })} onKeyDown={event => { if (event.key === 'Enter') setEditModal({ ...c }) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar name={c.name} size={38} />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{c.email || '—'} · {c.phone || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ textAlign: 'right', fontSize: 13 }}>
                <div style={{ fontWeight: 400, color: C.muted }}>{c.type}</div>
                <div style={{ fontSize: 12, color: C.faint }}>{fmtDate(c.date)}</div>
              </div>
              <Badge type={c.status} label={c.status} />
              {/* Edit — 20% larger */}
              <button style={{ ...T.btnGhost, padding: '5px 9px' }} onClick={event => { event.stopPropagation(); setEditModal({ ...c }) }} title="Edit">
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              {/* Delete — 20% larger */}
              <button style={{ ...T.btnGhost, padding: '5px 9px', color: C.red }} onClick={event => { event.stopPropagation(); del(c.id) }} title="Delete">
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                </svg>
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Add modal */}
      {addModal && (
        <Modal title="Add client" onClose={() => setAddModal(false)} wide
          footer={<><button style={T.btn} onClick={() => setAddModal(false)}>Cancel</button><button style={T.btnPrimary} onClick={add}>Add client</button></>}>
          <div style={T.formRow} className="form-row-2">
            <div style={T.formGroup}><label style={T.formLabel}>Full name</label><input style={T.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></div>
            <div style={T.formGroup}><label style={T.formLabel}>Session type</label>
              <select style={T.formInput} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {types.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={T.formRow} className="form-row-2">
            <div style={T.formGroup}><label style={T.formLabel}>Email</label><input style={T.formInput} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div style={T.formGroup}><label style={T.formLabel}>Phone</label><input style={T.formInput} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div style={T.formGroup}><label style={T.formLabel}>Session date</label><input style={T.formInput} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          <div style={T.formGroup}><label style={T.formLabel}>Notes</label><textarea style={{ ...T.formInput, resize: 'none' }} rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </Modal>
      )}

      {/* Edit modal */}
      {editModal && (
        <Modal title="Edit client" onClose={() => setEditModal(null)} wide
          footer={<><button style={{ ...T.btn, color: C.red, borderColor: C.red }} onClick={() => { del(editModal.id); setEditModal(null) }}>Delete</button><div style={{ flex: 1 }} /><button style={T.btn} onClick={() => setEditModal(null)}>Cancel</button><button style={T.btnPrimary} onClick={save}>Save</button></>}>
          <div style={T.formRow} className="form-row-2">
            <div style={T.formGroup}><label style={T.formLabel}>Full name</label><input style={T.formInput} value={editModal.name} onChange={e => setEditModal({ ...editModal, name: e.target.value })} /></div>
            <div style={T.formGroup}><label style={T.formLabel}>Status</label>
              <select style={T.formInput} value={editModal.status} onChange={e => setEditModal({ ...editModal, status: e.target.value })}>
                {(data.stages || []).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div style={T.formRow} className="form-row-2">
            <div style={T.formGroup}><label style={T.formLabel}>Email</label><input style={T.formInput} value={editModal.email || ''} onChange={e => setEditModal({ ...editModal, email: e.target.value })} /></div>
            <div style={T.formGroup}><label style={T.formLabel}>Phone</label><input style={T.formInput} value={editModal.phone || ''} onChange={e => setEditModal({ ...editModal, phone: e.target.value })} /></div>
          </div>
          <div style={T.formRow} className="form-row-2">
            <div style={T.formGroup}><label style={T.formLabel}>Session date</label><input style={T.formInput} type="date" value={editModal.date || ''} onChange={e => setEditModal({ ...editModal, date: e.target.value })} /></div>
            <div style={T.formGroup}><label style={T.formLabel}>Type</label>
              <select style={T.formInput} value={editModal.type} onChange={e => setEditModal({ ...editModal, type: e.target.value })}>
                {types.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={T.formGroup}><label style={T.formLabel}>Notes</label><textarea style={{ ...T.formInput, resize: 'none' }} rows={3} value={editModal.notes || ''} onChange={e => setEditModal({ ...editModal, notes: e.target.value })} /></div>
        </Modal>
      )}

      {/* Import preview modal */}
      {importModal && (
        <Modal title={`Import ${importPreview.length} contacts`} onClose={() => { setImportModal(false); setImportPreview([]) }} wide
          footer={<><button style={T.btn} onClick={() => { setImportModal(false); setImportPreview([]) }}>Cancel</button><button style={T.btnPrimary} onClick={confirmImport}>Import all</button></>}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Preview of contacts to be imported. All will be set to <strong>Inquiry</strong> status.</div>
          <div style={{ maxHeight: 360, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface2 }}>
                  {['Name', 'Email', 'Phone', 'Type'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {importPreview.map((c, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '9px 12px', fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '9px 12px', color: C.muted }}>{c.email || '—'}</td>
                    <td style={{ padding: '9px 12px', color: C.muted }}>{c.phone || '—'}</td>
                    <td style={{ padding: '9px 12px', color: C.muted }}>{c.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}
