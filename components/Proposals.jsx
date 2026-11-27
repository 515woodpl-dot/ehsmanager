import { useEffect, useMemo, useRef, useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'
import { Modal, ConfirmModal } from './UI'
import { QuoteModal, ContractModal } from './ActionModals'
import { ProposalBody, firstHeading } from '../lib/proposalMarkdown'

// Proposals: write or import a proposal, share its branded link, see when the
// client opens it, and when they accept (they become a client in Inquiry).

const uid = () => crypto.randomUUID()
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const STATUS = {
  draft: ['Draft', C.surface3, C.muted], sent: ['Sent', C.blueBg, C.blue], viewed: ['Opened', C.amberBg, C.amber],
  accepted: ['Accepted', C.greenBg, C.green], declined: ['Declined', C.redBg, C.red],
}
const StatusPill = ({ status, expired }) => { const [label, bg, color] = expired ? ['Expired', C.redBg, C.red] : STATUS[status] || STATUS.draft; return <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, background: bg, color, whiteSpace: 'nowrap' }}>{label}</span> }
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
const plusDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d) }
const isExpired = p => !!p.validUntil && !['accepted', 'declined'].includes(p.status) && p.validUntil < todayIso()
const fmtDay = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const nextNumber = list => `P-${Math.max(1000, ...list.map(p => Number(/^P-(\d+)$/.exec(p.number || '')?.[1] || 0))) + 1}`

async function api(path, init = {}) {
  const { data: { session } } = await pibase.auth.getSession()
  const r = await fetch(path, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${session?.access_token || ''}` } })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(body.error || 'Something went wrong'), { status: r.status })
  return body
}

export default function Proposals({ data, setData, toast, setView }) {
  const proposals = data.proposals || []
  const [editing, setEditing] = useState(null)
  const [sharing, setSharing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [filter, setFilter] = useState('all')
  const counts = useMemo(() => ({ all: proposals.length, open: proposals.filter(p => !['accepted', 'declined'].includes(p.status) && !isExpired(p)).length, accepted: proposals.filter(p => p.status === 'accepted').length }), [proposals])
  const shown = proposals.filter(p => filter === 'all' || (filter === 'accepted' ? p.status === 'accepted' : !['accepted', 'declined'].includes(p.status) && !isExpired(p)))

  if (!data.proposalsReady) return <div style={T.card}>Proposals need a one-time database update: apply <code>pibase-migration-005-proposals.sql</code>.</div>

  const save = p => {
    const row = { ...p, id: p.id || uid(), title: p.title.trim() || firstHeading(p.body) || 'Proposal', number: p.number || nextNumber(proposals) }
    setData(d => ({ ...d, proposals: p.id ? d.proposals.map(x => x.id === p.id ? { ...x, ...row } : x) : [row, ...d.proposals] }))
    return row
  }
  const remove = p => { setData(d => ({ ...d, proposals: d.proposals.filter(x => x.id !== p.id) })); setDeleting(null); setViewing(null); toast('Proposal deleted') }

  return <div>
    <div style={T.pageHeader} className="page-header-wrap">
      <div><div style={T.pageTitle}>Proposals</div><div style={T.pageSub}>{counts.open} open · {counts.accepted} accepted</div></div>
      <button style={T.btnPrimary} onClick={() => setEditing({ title: '', prospect: '', contactName: '', contactEmail: '', contactPhone: '', language: 'es', body: '', status: 'draft', validUntil: plusDays(30) })}>+ New proposal</button>
    </div>
    <div className="chip-tabs" style={{ marginBottom: 16 }}>
      {[['all', 'All'], ['open', 'Open'], ['accepted', 'Accepted']].map(([k, l]) => <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{l} <span>{counts[k]}</span></button>)}
    </div>
    {!shown.length && <div style={{ ...T.card, textAlign: 'center', color: C.muted }}>
      {proposals.length ? 'Nothing here.' : <>No proposals yet. Create one, or import the PDF you made with Claude — then send the client its link.</>}
    </div>}
    <div style={{ display: 'grid', gap: 12 }}>
      {shown.map(p => <article key={p.id} style={{ ...T.card, padding: '18px 22px', cursor: 'pointer' }} onClick={() => setViewing(p)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>{p.number}{p.language === 'en' ? ' · English' : ' · Español'}</div>
            <div style={{ fontWeight: 600, fontSize: 15.5 }}>{p.title}</div>
            <div style={{ color: C.muted, fontSize: 13.5, marginTop: 2 }}>{[p.prospect, p.contactName].filter(Boolean).join(' · ') || 'No client yet'}</div>
          </div>
          <StatusPill status={p.status} expired={isExpired(p)} />
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 10 }}>
          {p.status === 'declined' ? `Declined ${fmtDate(p.declinedAt)}${p.declineReason ? ` — “${p.declineReason.slice(0, 90)}${p.declineReason.length > 90 ? '…' : ''}”` : ''}` : p.status === 'accepted' ? `Accepted ${fmtDate(p.acceptedAt)} by ${p.acceptance?.name || 'the client'}` : p.viewCount ? `Opened ${p.viewCount} time${p.viewCount > 1 ? 's' : ''} · last ${fmtDate(p.viewedAt)}` : p.sentAt ? `Sent ${fmtDate(p.sentAt)} · not opened yet` : `Created ${fmtDate(p.createdAt) || 'today'}`}{p.validUntil && !['accepted', 'declined'].includes(p.status) ? ` · valid until ${fmtDay(p.validUntil)}` : ''}
        </div>
        <div className="card-actions" style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
          <button style={T.btnSm} onClick={() => setSharing(p)}>Share link</button>
          {p.status !== 'accepted' && <button style={T.btnSm} onClick={() => setEditing(p)}>Edit</button>}
          <button style={T.btnSm} onClick={() => setViewing(p)}>View</button>
        </div>
      </article>)}
    </div>

    {editing && <ProposalEditor proposal={editing} clients={data.clients || []} toast={toast} onClose={() => setEditing(null)} onSave={(p, thenShare) => { const row = save(p); setEditing(null); toast('Proposal saved'); if (thenShare) setSharing(row) }} />}
    {sharing && <ShareProposal proposal={proposals.find(p => p.id === sharing.id) || sharing} setData={setData} toast={toast} onClose={() => setSharing(null)} />}
    {viewing && <ProposalDetail proposal={proposals.find(p => p.id === viewing.id) || viewing} data={data} setData={setData} toast={toast} setView={setView}
      onClose={() => setViewing(null)} onEdit={p => { setViewing(null); setEditing(p) }} onShare={p => { setViewing(null); setSharing(p) }} onDelete={p => setDeleting(p)} />}
    {deleting && <ConfirmModal danger title="Delete this proposal?" message={`${deleting.title} will be deleted and its link will stop working.${deleting.status === 'accepted' ? ' The client created when it was accepted is kept.' : ''}`} confirmLabel="Delete proposal" onConfirm={() => remove(deleting)} onClose={() => setDeleting(null)} />}
  </div>
}

function ProposalEditor({ proposal, clients, toast, onClose, onSave }) {
  const [p, setP] = useState(proposal)
  const [tab, setTab] = useState('write')
  const [importing, setImporting] = useState(false)
  const file = useRef(null)
  const set = (k, v) => setP(x => ({ ...x, [k]: v }))
  // Picking an existing client links the proposal to them (acceptance then
  // updates that client instead of creating a new one) and fills their details.
  const pickClient = id => {
    const c = clients.find(x => x.id === id)
    setP(x => c
      ? { ...x, clientId: c.id, contactName: c.name || '', contactEmail: c.email || '', contactPhone: c.phone || '' }
      : { ...x, clientId: null })
  }
  const importPdf = async f => {
    if (!f) return
    if (f.size > 950 * 1024) { toast('That PDF is over 1 MB — export a smaller one, or paste the text'); return }
    setImporting(true)
    try {
      const result = await api('/api/proposal-import', { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: f })
      setP(x => ({ ...x, title: x.title || result.title, body: result.markdown, language: /\b(the|your|and)\b/i.test(result.markdown.slice(0, 600)) && !/\b(su|para|página)\b/i.test(result.markdown.slice(0, 600)) ? 'en' : x.language }))
      setTab('preview'); toast('PDF imported — check the preview, then tidy anything (tables especially) in Write')
    } catch (e) { toast(e.message) }
    setImporting(false)
    if (file.current) file.current.value = ''
  }
  const valid = (p.title.trim() || firstHeading(p.body)) && p.body.trim()
  return <Modal extraWide title={proposal.id ? `Edit proposal ${proposal.number || ''}` : 'New proposal'} onClose={onClose} footer={<>
    <button style={T.btn} onClick={onClose}>Cancel</button>
    <button style={T.btn} disabled={!valid} onClick={() => onSave(p, false)}>Save</button>
    <button style={T.btnPrimary} disabled={!valid} onClick={() => onSave(p, true)}>Save &amp; get link</button>
  </>}>
    <div style={T.formRow} className="form-row-2">
      <div style={T.formGroup}><label style={T.formLabel}>Title</label><input style={T.formInput} value={p.title} onChange={e => set('title', e.target.value)} placeholder="Propuesta para MP Carpet Cleaning — Más clientes desde su página web" /></div>
      <div style={T.formGroup}><label style={T.formLabel}>Valid until</label><input style={T.formInput} type="date" value={p.validUntil || ''} onChange={e => set('validUntil', e.target.value)} /><div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Leave empty for no expiry.</div></div>
    </div>
    <div style={T.formRow} className="form-row-2">
      <div style={T.formGroup}><label style={T.formLabel}>Language of the page</label><select style={T.formInput} value={p.language} onChange={e => set('language', e.target.value)}><option value="es">Español</option><option value="en">English</option></select></div>
    </div>
    <div style={T.formGroup}>
      <label style={T.formLabel}>Client</label>
      <select style={T.formInput} value={p.clientId || ''} onChange={e => pickClient(e.target.value)}>
        <option value="">New client — added automatically when they accept</option>
        {clients.filter(c => !c.archived || c.id === p.clientId).map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ''}</option>)}
      </select>
    </div>
    <div style={T.formRow} className="form-row-2">
      <div style={T.formGroup}><label style={T.formLabel}>Business it's for</label><input style={T.formInput} value={p.prospect} onChange={e => set('prospect', e.target.value)} placeholder="MP Carpet Cleaning" /></div>
      <div style={T.formGroup}><label style={T.formLabel}>Contact name</label><input style={T.formInput} value={p.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Martin" /></div>
    </div>
    <div style={T.formRow} className="form-row-2">
      <div style={T.formGroup}><label style={T.formLabel}>Contact email (optional)</label><input style={T.formInput} type="email" value={p.contactEmail} onChange={e => set('contactEmail', e.target.value)} /></div>
      <div style={T.formGroup}><label style={T.formLabel}>Contact phone (optional)</label><input style={T.formInput} type="tel" value={p.contactPhone} onChange={e => set('contactPhone', e.target.value)} /></div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '4px 0 10px' }}>
      <div className="chip-tabs">{[['write', 'Write'], ['preview', 'Preview']].map(([k, l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={T.btnSm} disabled={importing} onClick={() => file.current?.click()}>{importing ? 'Reading PDF…' : 'Import PDF'}</button>
        <input ref={file} type="file" accept="application/pdf" hidden onChange={e => importPdf(e.target.files?.[0])} />
      </div>
    </div>
    {tab === 'write' ? <>
      <textarea style={{ ...T.formInput, minHeight: 380, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, lineHeight: 1.6, resize: 'vertical' }} value={p.body} onChange={e => set('body', e.target.value)}
        placeholder={'## En pocas palabras\n\nEscriba o pegue la propuesta aquí…\n\n- Un punto\n- Otro punto\n\n| Hoy | Con la nueva página |\n|---|---|\n| Sin reviews | Reviews de Google |'} />
      <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
        Tip: ask Claude for the proposal “in Markdown” and paste it here. <code>## Section</code> · <code>### Sub-section</code> · <code>- bullet</code> · <code>1. step</code> · <code>&gt; highlighted note</code> · <code>**bold**</code> · tables with <code>|</code>. The accept form is added at the end automatically.
      </div>
    </> : <div className="proposal-preview"><ProposalBody source={p.body || '*Nothing yet.*'} className="proposal-preview-body" /></div>}
  </Modal>
}

function ShareProposal({ proposal, setData, toast, onClose }) {
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    let on = true, timer = null, tries = 0
    const tick = async () => {
      try {
        const body = await api('/api/proposal-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: proposal.id }) })
        if (!on) return
        setState({ ...body, loading: false })
        // Bring views / acceptance into the app right away.
        setData(d => ({ ...d, proposals: d.proposals.map(x => x.id === proposal.id ? { ...x, status: body.status, viewCount: body.viewCount, viewedAt: body.viewedAt, acceptedAt: body.acceptedAt, acceptance: body.acceptance, clientId: body.clientId || x.clientId, declinedAt: body.declinedAt, declineReason: body.declineReason } : x) }))
        if (body.status === 'accepted') return
      } catch (e) {
        if (!on) return
        if (e.status === 404 && tries++ < 6) { timer = setTimeout(tick, 1000); return }
        setState(s => s.url ? s : { loading: false, error: e.message })
      }
      timer = setTimeout(tick, 6000)
    }
    tick()
    return () => { on = false; clearTimeout(timer) }
  }, [proposal.id])
  const markSent = () => { if (!proposal.sentAt) setData(d => ({ ...d, proposals: d.proposals.map(x => x.id === proposal.id ? { ...x, sentAt: new Date().toISOString(), status: x.status === 'draft' ? 'sent' : x.status } : x) })) }
  const es = proposal.language !== 'en'
  const name = (proposal.contactName || '').split(' ')[0]
  const text = es
    ? `Hola${name ? ` ${name}` : ''}, le comparto la propuesta que preparamos para ${proposal.prospect || 'su negocio'}. Puede leerla y aceptarla aquí: ${state.url}`
    : `Hi${name ? ` ${name}` : ''}, here's the proposal we prepared for ${proposal.prospect || 'your business'}. You can read and accept it here: ${state.url}`
  const copy = async (value, msg) => { try { await navigator.clipboard.writeText(value); toast(msg) } catch { toast(value) } markSent() }
  const phone = (proposal.contactPhone || '').replace(/[^\d+]/g, '')
  return <Modal title={`Share · ${proposal.title}`} onClose={onClose} footer={<button style={T.btnPrimary} onClick={onClose}>Done</button>}>
    {state.loading && <p style={{ color: C.muted }}>Creating the link…</p>}
    {state.error && <p style={{ color: C.red }}>{state.error}</p>}
    {state.url && <>
      <p style={{ color: C.muted, fontSize: 13.5, marginBottom: 12, lineHeight: 1.6 }}>Send this to {proposal.contactName || proposal.prospect || 'the client'}. They read the proposal on a 515-branded page and accept it at the bottom with their details. You'll see here when they open it.</p>
      <div className="paylink-box"><input readOnly value={state.url} onFocus={e => e.target.select()} aria-label="Proposal link" /><button style={T.btnPrimary} onClick={() => copy(state.url, 'Link copied')}>Copy</button></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {typeof navigator !== 'undefined' && navigator.share && <button style={T.btn} onClick={async () => { try { await navigator.share({ title: proposal.title, text, url: state.url }); markSent() } catch {} }}>Share…</button>}
        <a style={{ ...T.btn, textDecoration: 'none' }} onClick={markSent} href={`sms:${phone}?&body=${encodeURIComponent(text)}`}>Text message</a>
        <a style={{ ...T.btn, textDecoration: 'none' }} onClick={markSent} href={`https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        {proposal.contactEmail && <a style={{ ...T.btn, textDecoration: 'none' }} onClick={markSent} href={`mailto:${proposal.contactEmail}?subject=${encodeURIComponent(proposal.title)}&body=${encodeURIComponent(text)}`}>Email</a>}
        <button style={T.btn} onClick={() => copy(text, 'Message with link copied')}>Copy message</button>
        <a style={{ ...T.btn, textDecoration: 'none' }} href={`${state.url}?preview=1`} target="_blank" rel="noreferrer">Preview page</a>
      </div>
      <div className={`paylink-status${state.status === 'accepted' ? ' paid' : state.viewCount ? ' partial' : ''}`} role="status">
        {state.status === 'accepted' ? `✓ Accepted by ${state.acceptance?.name || 'the client'} — they're now in Clients (Inquiry)`
          : state.status === 'declined' ? `Declined${state.declineReason ? ` — “${state.declineReason}”` : ' (no reason given)'}. They can still accept while it's valid.`
          : state.viewCount ? <>Opened {state.viewCount} time{state.viewCount > 1 ? 's' : ''} — waiting for them to accept <span className="paylink-live" aria-hidden="true" /></>
          : <>Not opened yet <span className="paylink-live" aria-hidden="true" /> live</>}
      </div>
    </>}
  </Modal>
}

function ProposalDetail({ proposal: p, data, setData, toast, setView, onClose, onEdit, onShare, onDelete }) {
  const [next, setNext] = useState(null) // 'quote' | 'contract'
  const client = data.clients.find(c => c.id === p.clientId) || null
  const a = p.acceptance || {}
  if (next && client) {
    const props = { client, data, setData, toast, onClose: () => setNext(null) }
    return next === 'quote' ? <QuoteModal {...props} /> : <ContractModal {...props} />
  }
  return <Modal extraWide title={`${p.number} · ${p.title}`} onClose={onClose} footer={<>
    <button style={{ ...T.btn, color: C.red, borderColor: C.red, marginRight: 'auto' }} onClick={() => onDelete(p)}>Delete</button>
    {p.status !== 'accepted' && <button style={T.btn} onClick={() => onEdit(p)}>Edit</button>}
    <button style={T.btnPrimary} onClick={() => onShare(p)}>Share link</button>
  </>}>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
      <StatusPill status={p.status} />
      <span style={{ color: C.muted, fontSize: 13 }}>{[p.prospect, p.contactName].filter(Boolean).join(' · ')}{p.viewCount ? ` · opened ${p.viewCount}×` : ''}</span>
    </div>
    {p.status === 'declined' && <div style={{ ...T.card, background: C.redBg, borderColor: 'transparent', marginBottom: 18 }}>
      <div style={{ fontWeight: 600, color: C.red, marginBottom: 6 }}>Declined {fmtDate(p.declinedAt)}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>{p.declineReason ? `“${p.declineReason}”` : 'No reason given.'} They can still accept it while it's valid — or edit it and send a new version.</div>
    </div>}
    {isExpired(p) && <div style={{ ...T.card, background: C.amberBg, borderColor: 'transparent', marginBottom: 18, fontSize: 13.5 }}>Expired on {fmtDay(p.validUntil)} — the client can no longer accept it. Edit it to give it a new date.</div>}
    {p.status === 'accepted' && <div style={{ ...T.card, background: C.greenBg, borderColor: 'transparent', marginBottom: 18 }}>
      <div style={{ fontWeight: 600, color: C.green, marginBottom: 8 }}>Accepted {fmtDate(p.acceptedAt)}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
        {[['Name', a.name], ['Business', a.business], ['Email', a.email], ['Phone', a.phone], ['Address', [a.address, a.city].filter(Boolean).join(', ')], ['Current website', a.website], ['Message', a.message]].filter(([, v]) => v).map(([k, v]) => <div key={k}><span style={{ color: C.muted }}>{k}:</span> {v}</div>)}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {client ? <>
          <button style={T.btnPrimary} onClick={() => setNext('quote')}>Create quote</button>
          <button style={T.btn} onClick={() => setNext('contract')}>Create contract</button>
          <button style={T.btn} onClick={() => { onClose(); setView('clients') }}>Open Clients</button>
        </> : <span style={{ fontSize: 12.5, color: C.muted }}>The new client will appear in Clients within a minute (or reload the app) — then you can create the quote and contract from here.</span>}
      </div>
    </div>}
    <div className="proposal-preview"><ProposalBody source={p.body} className="proposal-preview-body" /></div>
  </Modal>
}
