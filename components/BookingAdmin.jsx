import { useMemo, useState } from 'react'
import { T, C } from '../lib/tokens'
import { Modal, Badge } from './UI'
import { DEMO_SESSION_CATALOG, DEFAULT_AVAILABILITY } from '../lib/data'
import { availabilitySettings, durationLabel, money, publicBookingBase, safeImageUrl, slugify } from '../lib/booking'
import s from '../styles/BookingAdmin.module.css'

const uid = () => crypto.randomUUID()
const blankType = { name: '', slug: '', category: 'Portrait', description: '', imageUrl: '', durationMinutes: 60, price: 0, location: '', color: '#5db8be', public: false }
const blankDiscount = { name: '', code: '', kind: 'coupon', mode: 'percent', amount: 10, balance: null, uses: 0, maxUses: null, startsOn: '', endsOn: '', active: true }
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const field = (label, node) => <label className={s.field}><span>{label}</span>{node}</label>
const input = (value, onChange, props = {}) => <input className={s.input} value={value ?? ''} onChange={e => onChange(e.target.value)} {...props} />

export function SessionTypes({ data, setData, toast, setView }) {
  const [editing, setEditing] = useState(null)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [draftAvailability, setDraftAvailability] = useState(null)
  const base = publicBookingBase()
  const types = [...(data.sessionCatalog || [])].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  const saveType = () => {
    const name = editing.name.trim(), slug = slugify(editing.slug || name)
    if (!name || !slug) return toast('Enter a session name')
    if (types.some(item => item.id !== editing.id && item.slug === slug)) return toast('That page URL is already in use')
    if (editing.durationMinutes < 30 || editing.durationMinutes > 480 || editing.durationMinutes % 30 || Number(editing.price) < 0) return toast('Use a duration in 30-minute steps and a valid price')
    if (editing.imageUrl && !safeImageUrl(editing.imageUrl)) return toast('Use an HTTPS image URL')
    const row = { ...editing, id: editing.id || uid(), name, slug, durationMinutes: Number(editing.durationMinutes), price: Number(editing.price), sortOrder: editing.sortOrder ?? types.length }
    setData(current => ({ ...current, sessionCatalog: editing.id ? current.sessionCatalog.map(item => item.id === editing.id ? row : item) : [...current.sessionCatalog, row], sessionTypes: current.sessionTypes.includes(name) ? current.sessionTypes : [...current.sessionTypes, name] }))
    setEditing(null); toast('Session type saved')
  }
  const remove = item => {
    if (!confirm(`Delete “${item.name}”? Existing bookings will keep their session name.`)) return
    setData(current => ({ ...current, sessionCatalog: current.sessionCatalog.filter(row => row.id !== item.id) }))
    toast('Session type deleted')
  }
  const importSamples = () => {
    const existing = new Set(types.map(item => item.slug))
    const additions = DEMO_SESSION_CATALOG.filter(item => !existing.has(item.slug)).map((item, index) => ({ ...item, id: uid(), public: false, sortOrder: types.length + index }))
    setData(current => ({ ...current, sessionCatalog: [...current.sessionCatalog, ...additions] }))
    toast(`${additions.length} sample packages added as drafts`)
  }
  const openAvailability = () => { setDraftAvailability(availabilitySettings(data.availability)); setAvailabilityOpen(true) }
  const saveAvailability = () => {
    const a = draftAvailability
    if (a.horizonDays < 1 || a.horizonDays > 365 || a.noticeDays < 0 || a.bufferMinutes < 0 || a.bufferMinutes > 120) return toast('Review the booking window and buffer')
    for (const ranges of Object.values(a.weekdays)) for (const range of ranges) if (range.start >= range.end) return toast('Working hours must end after they start')
    setData(current => ({ ...current, availability: a }))
    setAvailabilityOpen(false); toast('Availability saved')
  }
  return <div>
    <div className={s.heading}><div><h1>Session Types</h1><p>Manage the packages shown on your public booking page. Drafts stay private until published.</p></div><div className={s.actions}><button className={s.softButton} onClick={openAvailability}>Availability Settings</button><button className={s.primaryButton} onClick={() => setEditing({ ...blankType })}>New Session Type</button></div></div>
    <div className={s.publicIntro}><h2>Public</h2><span>Available to book at <a href={base} target="_blank" rel="noreferrer">{base.replace(/^https?:\/\//, '')}</a></span></div>
    {!types.length && <div className={s.empty}><h2>Your collections start here</h2><p>Create a package from scratch or load the reference packages as private drafts to review before publishing.</p><button className={s.softButton} onClick={importSamples}>Load sample packages</button></div>}
    <div className={s.typeGrid}>{types.map(item => <article className={s.typeCard} key={item.id}>
      <div className={s.typeName}><span className={s.dot} style={{ background: item.color }} />{safeImageUrl(item.imageUrl) && <img src={item.imageUrl} alt="" />}<strong>{item.name}</strong></div>
      <div className={s.meta}>{item.public ? 'Public' : 'Draft'} &nbsp;|&nbsp; {durationLabel(item.durationMinutes)} &nbsp;|&nbsp; {money(item.price)}</div>
      <div className={s.cardActions}>{item.public ? <><a className={s.softButton} href={`${base}/${item.slug}`} target="_blank" rel="noreferrer">View Page</a><button className={s.textButton} onClick={() => { navigator.clipboard?.writeText(`${base}/${item.slug}`); toast('Page link copied') }} aria-label={`Copy link for ${item.name}`}>↗ Copy link</button></> : <span className={s.meta}>Publish to view page</span>}<button className={s.textButton} onClick={() => setEditing({ ...item })}>Edit</button><button className={s.dangerText} onClick={() => remove(item)}>Delete</button></div>
    </article>)}</div>
    {types.length > 0 && <button className={s.textButton} onClick={importSamples}>Load missing sample packages as drafts</button>}
    <div className={s.related}><button onClick={() => setView('sessions')}>View sessions →</button><button onClick={() => setView('discounts')}>Manage discounts →</button></div>
    {editing && <Modal wide title={editing.id ? 'Edit Session Type' : 'New Session Type'} onClose={() => setEditing(null)} footer={<><button style={T.btn} onClick={() => setEditing(null)}>Cancel</button><button style={T.btnPrimary} onClick={saveType}>Save Session Type</button></>}>
      <div className={s.formGrid}>{field('Name', input(editing.name, name => setEditing(v => ({ ...v, name, slug: v.id ? v.slug : slugify(name) })), { required: true }))}{field('Page URL', input(editing.slug, slug => setEditing(v => ({ ...v, slug: slugify(slug) })), { placeholder: 'maternity-classic' }))}{field('Category', input(editing.category, category => setEditing(v => ({ ...v, category }))))}{field('Duration (minutes)', input(editing.durationMinutes, durationMinutes => setEditing(v => ({ ...v, durationMinutes: Number(durationMinutes) })), { type: 'number', min: 30, max: 480, step: 30 }))}{field('Price (USD)', input(editing.price, price => setEditing(v => ({ ...v, price: Number(price) })), { type: 'number', min: 0, step: '.01' }))}{field('Location', input(editing.location, location => setEditing(v => ({ ...v, location }))))}{field('Photo URL (HTTPS)', input(editing.imageUrl, imageUrl => setEditing(v => ({ ...v, imageUrl })), { type: 'url', placeholder: 'https://...' }))}{field('Category color', input(editing.color, color => setEditing(v => ({ ...v, color })), { type: 'color' }))}</div>
      {field('Description', <textarea className={s.input} rows={4} value={editing.description} onChange={e => setEditing(v => ({ ...v, description: e.target.value }))} />)}
      <label className={s.checkbox}><input type="checkbox" checked={editing.public} onChange={e => setEditing(v => ({ ...v, public: e.target.checked }))} /> Publish on booking page</label>
    </Modal>}
    {availabilityOpen && draftAvailability && <Modal wide title="Availability Settings" onClose={() => setAvailabilityOpen(false)} footer={<><button style={T.btn} onClick={() => setAvailabilityOpen(false)}>Cancel</button><button style={T.btnPrimary} onClick={saveAvailability}>Save Availability</button></>}>
      <p className={s.hint}>All times use the studio timezone. Sessions are offered every 30 minutes within working hours.</p>
      <div className={s.formGrid}>{field('Timezone', <select className={s.input} value={draftAvailability.timezone} onChange={e => setDraftAvailability(v => ({ ...v, timezone: e.target.value }))}>{['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','UTC'].map(zone => <option key={zone}>{zone}</option>)}</select>)}{field('Minimum notice (days)', input(draftAvailability.noticeDays, noticeDays => setDraftAvailability(v => ({ ...v, noticeDays: Number(noticeDays) })), { type: 'number', min: 0, max: 30 }))}{field('Book up to (days)', input(draftAvailability.horizonDays, horizonDays => setDraftAvailability(v => ({ ...v, horizonDays: Number(horizonDays) })), { type: 'number', min: 1, max: 365 }))}{field('Buffer after sessions (minutes)', input(draftAvailability.bufferMinutes, bufferMinutes => setDraftAvailability(v => ({ ...v, bufferMinutes: Number(bufferMinutes) })), { type: 'number', min: 0, max: 120, step: 30 }))}</div>
      <h3>Weekly hours</h3>{days.map((day, index) => { const range = draftAvailability.weekdays[index]?.[0]; return <div className={s.hours} key={day}><span>{day}</span><label><input type="checkbox" checked={!!range} onChange={e => setDraftAvailability(v => ({ ...v, weekdays: { ...v.weekdays, [index]: e.target.checked ? [{ start: '09:00', end: '17:00' }] : [] } }))} /> Available</label>{range && <><input type="time" step="1800" value={range.start} onChange={e => setDraftAvailability(v => ({ ...v, weekdays: { ...v.weekdays, [index]: [{ ...range, start: e.target.value }] } }))} /><span>to</span><input type="time" step="1800" value={range.end} onChange={e => setDraftAvailability(v => ({ ...v, weekdays: { ...v.weekdays, [index]: [{ ...range, end: e.target.value }] } }))} /></>}</div> })}
      <h3>Block off dates</h3><p className={s.hint}>Blocked dates disappear from public availability and show on the calendar.</p><div className={s.inline}><input type="date" className={s.input} onChange={e => { const date = e.target.value; if (date && !draftAvailability.blockedDates.includes(date)) setDraftAvailability(v => ({ ...v, blockedDates: [...v.blockedDates, date].sort() })); e.target.value = '' }} /></div><div className={s.pills}>{draftAvailability.blockedDates.map(date => <button key={date} onClick={() => setDraftAvailability(v => ({ ...v, blockedDates: v.blockedDates.filter(d => d !== date) }))}>{date} ×</button>)}</div>
    </Modal>}
  </div>
}

export function Sessions({ data, setData, toast, setView }) {
  const [tab, setTab] = useState('All Sessions')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ clientId: '', typeId: '', date: '', time: '10:00', notes: '' })
  const today = new Date().toISOString().slice(0,10)
  const rows = useMemo(() => [...data.bookings].sort((a,b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).filter(b => {
    const client = data.clients.find(c => c.id === b.clientId)
    if (query && !`${b.client} ${client?.email || ''}`.toLowerCase().includes(query.toLowerCase())) return false
    if (tab === 'Upcoming') return b.date >= today && b.status === 'confirmed'
    if (tab === 'Inquiry') return b.status === 'inquiry'
    if (tab === 'Awaiting Client') return b.status === 'pending'
    if (tab === 'Past') return b.date < today && b.status !== 'canceled'
    if (tab === 'Canceled') return b.status === 'canceled'
    return true
  }), [data.bookings, data.clients, query, tab, today])
  const create = () => {
    const client = data.clients.find(c => c.id === form.clientId), type = data.sessionCatalog.find(t => t.id === form.typeId)
    if (!client || !type || !form.date || !form.time) return toast('Choose a client, session type, date and time')
    const start = Number(form.time.slice(0,2)) * 60 + Number(form.time.slice(3,5))
    const conflict = data.bookings.some(b => { if (b.date !== form.date || !b.time || b.status === 'canceled') return false; const other = Number(b.time.slice(0,2)) * 60 + Number(b.time.slice(3,5)); return start < other + (b.durationMinutes || 60) && start + type.durationMinutes > other })
    if (conflict) return toast('That time overlaps another session')
    const booking = { id: uid(), clientId: client.id, client: client.name, sessionTypeId: type.id, type: type.name, date: form.date, time: form.time, durationMinutes: type.durationMinutes, price: type.price, finalPrice: type.price, location: type.location, notes: form.notes, status: 'pending', source: 'manual' }
    setData(v => ({ ...v, bookings: [...v.bookings, booking] })); setCreating(false); toast('Session created')
  }
  return <div><div className={s.heading}><div><h1>Sessions</h1><p>Booking requests and scheduled sessions in one place.</p></div><button className={s.primaryButton} onClick={() => setCreating(true)}>New Session</button></div>
    <input className={s.search} placeholder="Search email or contact name" value={query} onChange={e => setQuery(e.target.value)} />
    <div className={s.tabs}>{['All Sessions','Upcoming','Inquiry','Awaiting Client','Past','Canceled'].map(t => <button key={t} className={tab === t ? s.activeTab : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {!rows.length ? <div className={s.empty}><div className={s.emptyIcon}>▦</div><h2>{tab === 'All Sessions' ? 'Book & schedule sessions easily' : `No ${tab.toLowerCase()} sessions`}</h2><p>Get started by creating a new session or a bookable session type.</p><button className={s.primaryButton} onClick={() => setCreating(true)}>New Session</button><button className={s.textButton} onClick={() => setView('sessiontypes')}>Session Types</button></div> : <div className={s.list}>{rows.map(b => <div className={s.sessionRow} key={b.id}><div><strong>{b.client}</strong><small>{b.type} · {b.date} at {b.time} · {b.location || 'Location TBD'}{b.source === 'public' ? ' · Online request' : ''}</small>{b.discountCode && <small>{b.discountCode} · {money(b.finalPrice)} after discount</small>}</div><div className={s.rowActions}><Badge type={b.status} label={b.status === 'pending' ? 'Awaiting Client' : b.status} /><select aria-label={`Status for ${b.client}`} value={b.status} onChange={e => { const status=e.target.value; if (b.source === 'public' && b.status === 'canceled' && status !== 'canceled') { toast('Create a new session to reserve another time'); return } setData(v => ({ ...v, bookings: v.bookings.map(item => item.id === b.id ? { ...item, status } : item) })); toast('Session updated') }}><option value="inquiry">Inquiry</option><option value="pending">Awaiting Client</option><option value="confirmed">Confirmed</option><option value="canceled">Canceled</option></select><button className={s.dangerText} onClick={() => { if (confirm(`Delete session for ${b.client}?`)) { setData(v => ({ ...v, bookings: v.bookings.filter(item => item.id !== b.id) })); toast('Session deleted') } }}>Delete</button></div></div>)}</div>}
    {creating && <Modal title="New Session" onClose={() => setCreating(false)} footer={<><button style={T.btn} onClick={() => setCreating(false)}>Cancel</button><button style={T.btnPrimary} onClick={create}>Create Session</button></>}>
      {field('Client', <select className={s.input} value={form.clientId} onChange={e => setForm(v => ({ ...v, clientId: e.target.value }))}><option value="">Choose a client</option>{data.clients.map(c => <option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}</select>)}
      {field('Session Type', <select className={s.input} value={form.typeId} onChange={e => setForm(v => ({ ...v, typeId: e.target.value }))}><option value="">Choose a session type</option>{data.sessionCatalog.map(t => <option key={t.id} value={t.id}>{t.name} · {money(t.price)}</option>)}</select>)}
      <div className={s.formGrid}>{field('Date', input(form.date, date => setForm(v => ({ ...v, date })), { type: 'date' }))}{field('Time', input(form.time, time => setForm(v => ({ ...v, time })), { type: 'time', step: 1800 }))}</div>
      {field('Notes', <textarea className={s.input} rows={3} value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} />)}
    </Modal>}
  </div>
}

export function Discounts({ data, setData, toast }) {
  const [tab, setTab] = useState('coupon')
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('All')
  const rows = (data.discounts || []).filter(d => d.kind === tab && (filter === 'All' || (filter === 'Active') === d.active))
  const save = () => {
    const code = editing.code.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
    if (!editing.name.trim() || !code || !(Number(editing.amount) > 0)) return toast('Enter a name, code and positive value')
    if (editing.mode === 'percent' && editing.amount > 100) return toast('Percent discount cannot exceed 100')
    if (data.discounts.some(d => d.id !== editing.id && d.code === code)) return toast('That code already exists')
    if (editing.startsOn && editing.endsOn && editing.startsOn > editing.endsOn) return toast('End date must follow start date')
    const row = { ...editing, id: editing.id || uid(), code, amount: Number(editing.amount), balance: editing.kind === 'gift_card' ? (editing.id ? Number(editing.balance) : Number(editing.amount)) : null, maxUses: editing.maxUses ? Number(editing.maxUses) : null, mode: editing.kind === 'gift_card' ? 'fixed' : editing.mode }
    setData(v => ({ ...v, discounts: editing.id ? v.discounts.map(d => d.id === editing.id ? row : d) : [...v.discounts, row] }))
    setEditing(null); toast('Discount saved')
  }
  return <div><div className={s.heading}><div><h1>Discounts</h1><p>Coupon codes and gift card balances for online booking requests.</p></div><button className={s.primaryButton} onClick={() => setEditing({ ...blankDiscount, kind: tab })}>New {tab === 'coupon' ? 'Coupon' : 'Gift Card'}</button></div>
    <div className={s.tabLine}><div className={s.tabs}>{[['coupon','Coupons'],['gift_card','Gift Cards']].map(([value,label]) => <button key={value} className={tab === value ? s.activeTab : ''} onClick={() => setTab(value)}>{label}</button>)}</div><select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select></div>
    <div className={s.list}><div className={s.discountHead}><span>Name</span><span>Code</span><span>Uses</span><span>Active</span><span></span></div>{rows.map(d => <div className={s.discountRow} key={d.id}><div><strong>{d.name}</strong><small>{d.kind === 'gift_card' ? `${money(d.balance)} balance` : d.mode === 'percent' ? `${d.amount}% off` : `${money(d.amount)} off`}</small></div><span>{d.code}</span><span>{d.uses} / {d.maxUses ?? '∞'}</span><span><Badge type={d.active ? 'confirmed' : 'canceled'} label={d.active ? 'ACTIVE' : 'INACTIVE'} /></span><div className={s.rowActions}><button className={s.textButton} onClick={() => setEditing({ ...d })}>Edit</button><button className={s.dangerText} onClick={() => { if (d.kind === 'gift_card' && d.uses > 0) { toast('Used gift cards cannot be deleted'); return } if (confirm(`Delete ${d.code}?`)) { setData(v => ({ ...v, discounts: v.discounts.filter(item => item.id !== d.id) })); toast('Discount deleted') } }}>Delete</button></div></div>)}{!rows.length && <div className={s.empty}>No {tab === 'coupon' ? 'coupons' : 'gift cards'} yet.</div>}</div>
    {editing && <Modal title={editing.id ? 'Edit Discount' : `New ${editing.kind === 'coupon' ? 'Coupon' : 'Gift Card'}`} onClose={() => setEditing(null)} footer={<><button style={T.btn} onClick={() => setEditing(null)}>Cancel</button><button style={T.btnPrimary} onClick={save}>Save Discount</button></>}>
      <div className={s.formGrid}>{field('Name', input(editing.name, name => setEditing(v => ({ ...v, name }))))}{field('Code', input(editing.code, code => setEditing(v => ({ ...v, code: code.toUpperCase() }))))}</div>
      {editing.kind === 'coupon' && field('Type', <select className={s.input} value={editing.mode} onChange={e => setEditing(v => ({ ...v, mode: e.target.value }))}><option value="percent">Percent off</option><option value="fixed">Fixed amount off</option></select>)}
      <div className={s.formGrid}>{field(editing.kind === 'gift_card' ? 'Initial value (USD)' : editing.mode === 'percent' ? 'Percent off' : 'Amount off (USD)', input(editing.amount, amount => setEditing(v => ({ ...v, amount: Number(amount) })), { type: 'number', min: 0.01, max: editing.mode === 'percent' && editing.kind === 'coupon' ? 100 : undefined, step: '.01' }))}{field('Maximum uses (optional)', input(editing.maxUses, maxUses => setEditing(v => ({ ...v, maxUses })), { type: 'number', min: 1 }))}</div>
      <div className={s.formGrid}>{field('Start date (optional)', input(editing.startsOn, startsOn => setEditing(v => ({ ...v, startsOn })), { type: 'date' }))}{field('End date (optional)', input(editing.endsOn, endsOn => setEditing(v => ({ ...v, endsOn })), { type: 'date' }))}</div>
      <label className={s.checkbox}><input type="checkbox" checked={editing.active} onChange={e => setEditing(v => ({ ...v, active: e.target.checked }))} /> Active</label>
      {editing.kind === 'gift_card' && <p className={s.hint}>Gift cards apply to bookings as credits. This page does not sell or take payment for gift cards.</p>}
    </Modal>}
  </div>
}
