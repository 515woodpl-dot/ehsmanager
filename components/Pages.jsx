import { useState, useRef, useEffect } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'
import { Modal, Badge, Avatar, SearchBar } from './UI'
import { InvoiceModal, SendInvoiceModal } from './InvoiceModals'
import { invoiceLabel } from '../lib/invoices'
import { docTone } from '../lib/documents'
import { ContractModal } from './ActionModals'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })
const fmtDate = iso => { if (!iso) return 'TBD'; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}` }
const todayLabel = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const fmt$ = n => '$' + Number(n || 0).toLocaleString()

function MiniCalendar({ bookings, onOpen }) {
  const now = new Date(), year = now.getFullYear(), month = now.getMonth()
  const first = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate()
  const dateFor = day => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const next = [...bookings].filter(item => item.date >= new Date().toLocaleDateString('en-CA') && item.status !== 'canceled').sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0]
  return <div style={T.card} className="dashboard-calendar-card">
    <div className="dashboard-card-title"><strong>{now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><button style={T.btnGhost} onClick={onOpen}>Full calendar</button></div>
    <div className="mini-calendar-grid">{['S','M','T','W','T','F','S'].map((day,index) => <small key={`${day}-${index}`}>{day}</small>)}
      {Array(first).fill(null).map((_, index) => <span key={`blank-${index}`} />)}
      {Array.from({ length: days }, (_, index) => index + 1).map(day => { const count = bookings.filter(item => item.date === dateFor(day) && item.status !== 'canceled').length; return <button key={day} className={`${dateFor(day) === new Date().toLocaleDateString('en-CA') ? 'today' : ''} ${count ? 'booked' : ''}`} onClick={onOpen}>{day}{count > 0 && <i>{count}</i>}</button> })}
    </div>
    <div className="mini-calendar-next">{next ? <><small>Next session</small><strong>{next.client}</strong><span>{fmtDate(next.date)} · {fmtTime(next.time)}</span></> : <span>No upcoming sessions</span>}</div>
  </div>
}

// ── Dashboard ─────────────────────────────────────────────────────
export function Dashboard({ data, setView, openClientCard }) {
  const totalRevenue = data.invoices.reduce((s, i) => s + i.paid, 0)
  const outstanding = data.invoices.reduce((s, i) => s + (i.amount - i.paid), 0)
  const active = data.clients.filter(c => !c.archived && c.status !== 'done').length
  const upcoming = data.bookings.filter(b => b.status === 'confirmed').length
  return (
    <div>
      <div className="dashboard-metric-grid metric-strip">
        {[
          { label: 'Revenue collected', value: fmt$(totalRevenue), sub: 'all time' },
          { label: 'Outstanding', value: fmt$(outstanding), sub: `${data.invoices.filter(i => i.status !== 'paid').length} invoices` },
          { label: 'Active clients', value: active, sub: `of ${data.clients.filter(c => !c.archived).length} total` },
          { label: 'Sessions confirmed', value: upcoming, sub: 'upcoming' },
        ].map((m, i) => (
          <button key={m.label} className="dashboard-metric-card" onClick={() => setView(i === 0 || i === 1 ? 'invoices' : i === 2 ? 'clients' : 'sessions')}>
            <div style={T.metricLabel}>{m.label}</div>
            <div style={T.metricValue}>{m.value}</div>
            <div style={T.metricSub}>{m.sub}</div>
          </button>
        ))}
      </div>
      <div className="dashboard-content-grid">
        <div style={T.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Recent clients</div>
            <button style={{ ...T.btnGhost, color: C.muted, fontSize: 12 }} onClick={() => setView('clients')}>View all</button>
          </div>
          {data.clients.filter(c => !c.archived).slice(0, 5).map((c, i, arr) => (
            <div key={c.id} className="data-row-mobile" onClick={() => openClientCard?.(c)} role={openClientCard ? 'button' : undefined} tabIndex={openClientCard ? 0 : undefined} onKeyDown={e => { if (openClientCard && (e.key === 'Enter' || e.key === ' ')) openClientCard(c) }} style={{ ...T.dataRow, borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.border}`, cursor: openClientCard ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <Avatar name={c.name} size={32} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{c.type} · {fmtDate(c.date)}</div>
                </div>
              </div>
              <Badge type={c.status} label={c.status} />
            </div>
          ))}
        </div>
        <div style={T.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Upcoming sessions</div>
            <button style={{ ...T.btnGhost, color: C.muted, fontSize: 12 }} onClick={() => setView('calendar')}>Calendar</button>
          </div>
          {data.bookings.slice(0, 5).map((b, i, arr) => (
            <div key={b.id} className="data-row-mobile" onClick={() => { const client = data.clients.find(c => c.id === b.clientId || c.name === b.client); if (client) openClientCard?.(client) }} style={{ ...T.dataRow, borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.border}`, cursor: openClientCard ? 'pointer' : 'default' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{b.client}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{fmtDate(b.date)} · {fmtTime(b.time)}</div>
              </div>
              <Badge type={b.status} label={b.status} />
            </div>
          ))}
          {data.bookings.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: C.faint, fontSize: 13 }}>No sessions yet</div>}
        </div>
        <MiniCalendar bookings={data.bookings} onOpen={() => setView('calendar')} />
      </div>
    </div>
  )
}

// ── Analytics helpers ──────────────────────────────────────────────
function buildRevenueByMonth(invoices) {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() })
  }
  return months.map(m => ({
    label: m.label,
    value: invoices
      .filter(inv => {
        if (!inv.due) return false
        const d = new Date(inv.due)
        return d.getFullYear() === m.year && d.getMonth() === m.month && inv.status === 'paid'
      })
      .reduce((s, inv) => s + (inv.paid || 0), 0)
  }))
}

function buildSessionTypeBreakdown(clients, sessionTypes) {
  return (sessionTypes || []).map(t => ({
    label: t,
    value: clients.filter(c => !c.archived && c.type === t).length
  })).filter(x => x.value > 0)
}

const sessionTypePastels = ['#E8D7CF', '#D8E7DD', '#E8E0C8', '#DCE2F3', '#E7DDF0', '#F2DDDA', '#D7E7E8']

// ── Analytics ─────────────────────────────────────────────────────
export function Analytics({ data }) {
  const canvasRef = useRef(); const barRef = useRef(); const typeRef = useRef()

  // Compute real data outside effect so we can use it in deps
  const revenueData = buildRevenueByMonth(data.invoices)
  const stageData = { stages: data.stages || [], clients: data.clients }
  const typeData = buildSessionTypeBreakdown(data.clients, data.sessionTypes)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const charts = []
    import('chart.js/auto').then(({ default: Chart }) => {
      const gridColor = C.border
      const baseOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: C.text, titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.7)', padding: 10, cornerRadius: 8 } } }

      // Revenue trend — real paid invoice data grouped by month
      if (canvasRef.current) {
        const hasRevenue = revenueData.some(m => m.value > 0)
        charts.push(new Chart(canvasRef.current, {
          type: 'line',
          data: {
            labels: revenueData.map(m => m.label),
            datasets: [{
              data: revenueData.map(m => m.value),
              borderColor: C.text,
              backgroundColor: 'rgba(17,17,16,0.04)',
              fill: true, tension: 0.4, borderWidth: 1.5,
              pointBackgroundColor: C.text, pointRadius: 3
            }]
          },
          options: {
            ...baseOpts,
            scales: {
              y: {
                grid: { color: gridColor }, border: { display: false },
                ticks: { color: C.muted, callback: v => v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'k' : '$' + v, font: { size: 11 } },
                beginAtZero: true
              },
              x: { grid: { display: false }, border: { display: false }, ticks: { color: C.muted, font: { size: 11 } } }
            }
          }
        }))
      }

      // Clients by stage — real pipeline data
      if (barRef.current) {
        const stages = stageData.stages
        const vals = stages.map(s => stageData.clients.filter(c => c.status === s.id && !c.archived).length)
        charts.push(new Chart(barRef.current, {
          type: 'bar',
          data: {
            labels: stages.map(s => s.label),
            datasets: [{ data: vals, backgroundColor: C.surface3, borderRadius: 6, barThickness: 28 }]
          },
          options: {
            ...baseOpts,
            scales: {
              y: { grid: { color: gridColor }, border: { display: false }, ticks: { color: C.muted, font: { size: 11 }, stepSize: 1 }, beginAtZero: true },
              x: { grid: { display: false }, border: { display: false }, ticks: { color: C.muted, font: { size: 11 } } }
            }
          }
        }))
      }

      // Session types breakdown — doughnut
      if (typeRef.current && typeData.length > 0) {
        charts.push(new Chart(typeRef.current, {
          type: 'doughnut',
          data: {
            labels: typeData.map(t => t.label),
            datasets: [{
              data: typeData.map(t => t.value),
              backgroundColor: typeData.map((_, i) => sessionTypePastels[i % sessionTypePastels.length]),
              borderColor: '#fff',
              borderWidth: 2,
              hoverOffset: 4
            }]
          },
          options: {
            ...baseOpts,
            cutout: '68%',
            plugins: {
              ...baseOpts.plugins,
              legend: { display: true, position: 'bottom', labels: { color: C.muted, font: { size: 11 }, boxWidth: 10, padding: 12 } }
            }
          }
        }))
      }
    })
    return () => charts.forEach(ch => ch.destroy())
  }, [data.invoices, data.clients, data.stages, data.sessionTypes])

  const totalRevenue = data.invoices.reduce((s, i) => s + (i.paid || 0), 0)
  const outstanding = data.invoices.reduce((s, i) => s + (i.amount - (i.paid || 0)), 0)
  const activeClients = data.clients.filter(c => !c.archived)
  const avg = data.invoices.length ? Math.round(data.invoices.reduce((s, i) => s + i.amount, 0) / data.invoices.length) : 0
  const inquiryClients = activeClients.filter(c => c.status === 'inquiry')
  const bookedClients = activeClients.filter(c => c.status !== 'inquiry')
  const conv = activeClients.length ? Math.round(bookedClients.length / activeClients.length * 100) : 0
  const paidInvoices = data.invoices.filter(i => i.status === 'paid').length
  const now = new Date(); const inThirtyDays = new Date(now.getTime() + 30 * 86400000)
  const upcomingThirty = data.bookings.filter(b => { const date = new Date(`${b.date}T12:00:00`); return b.status !== 'canceled' && date >= now && date <= inThirtyDays }).length

  return (
    <div>
      <div style={{ ...T.metricStrip, gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }} className="metric-strip">
        {[
          { label: 'Total collected', value: fmt$(totalRevenue), sub: `${paidInvoices} paid invoices` },
          { label: 'Outstanding', value: fmt$(outstanding), sub: `${data.invoices.filter(i => i.status !== 'paid').length} open` },
          { label: 'Avg invoice value', value: fmt$(avg), sub: `${data.invoices.length} invoices` },
          { label: 'Conversion rate', value: conv + '%', sub: `${bookedClients.length} booked · ${inquiryClients.length} inquiries` },
        ].map((m, i) => (
          <div key={m.label} style={T.metricCell(i === 3)}>
            <div style={T.metricLabel}>{m.label}</div>
            <div style={T.metricValue}>{m.value}</div>
            {m.sub && <div style={T.metricSub}>{m.sub}</div>}
          </div>
        ))}
      </div>
      <div style={{ ...T.cardSm, marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <div><strong>{upcomingThirty}</strong> session{upcomingThirty === 1 ? '' : 's'} scheduled in the next 30 days</div>
        <div style={{ color: C.muted, fontSize: 12 }}>{activeClients.length} active clients · {data.bookings.filter(b => b.status === 'canceled').length} canceled sessions</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }} className="two-col-grid">
        <div style={T.card}>
          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>Revenue collected</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Paid invoices · last 6 months</div>
          <div style={{ height: 230 }}><canvas ref={canvasRef} /></div>
        </div>
        <div style={T.card}>
          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>Clients by stage</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Current pipeline</div>
          <div style={{ height: 230 }}><canvas ref={barRef} /></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }} className="two-col-grid">
        <div style={T.card}>
          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>Session types</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Active clients</div>
          <div style={{ height: 200 }}>
            {typeData.length > 0
              ? <canvas ref={typeRef} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.faint, fontSize: 13 }}>No client data yet</div>}
          </div>
        </div>
        <div style={T.card}>
          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 16 }}>Invoice breakdown</div>
          {data.invoices.length === 0
            ? <div style={{ color: C.faint, fontSize: 13 }}>No invoices yet</div>
            : data.invoices.map((inv, i, arr) => (
              <div key={inv.id} style={{ ...T.dataRow, borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{inv.client}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{invoiceLabel(inv)} · Due {fmtDate(inv.due)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{fmt$(inv.amount)}</div>
                  <Badge type={inv.status} label={inv.status} />
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ── Calendar ──────────────────────────────────────────────────────
export function Calendar({ data, setData, toast, openClientCard }) {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [modal, setModal] = useState(false)
  const [calView, setCalView] = useState('month')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [blockDate, setBlockDate] = useState('')
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')
  const [filterType, setFilterType] = useState('all')
  const blank = { client: '', type: data.sessionTypes?.[0] || 'Family', date: '', time: '', location: '', notes: '' }
  const [form, setForm] = useState(blank)
  const y = cursor.getFullYear(), mo = cursor.getMonth()
  const first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate()
  const todayStr = new Date().toLocaleDateString('en-CA')
  const shiftDate = (date, amount) => new Date(Date.parse(`${date}T12:00:00Z`) + amount * 86400000).toISOString().slice(0, 10)
  const weekStart = shiftDate(selectedDate, -new Date(`${selectedDate}T12:00:00Z`).getUTCDay())
  const weekEnd = shiftDate(weekStart, 6)
  const ds = d => `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const add = () => {
    const client = data.clients.find(c => c.name === form.client)
    if (!client) { toast('Select an existing client'); return }
    if (!form.date || !form.time) { toast('Choose a date and time'); return }
    const start = Number(form.time.slice(0,2)) * 60 + Number(form.time.slice(3,5))
    if (data.bookings.some(b => { if (b.date !== form.date || !b.time || b.status === 'canceled') return false; const other = Number(b.time.slice(0,2)) * 60 + Number(b.time.slice(3,5)); return start < other + (b.durationMinutes || 60) && start + 60 > other })) { toast('That time overlaps another session'); return }
    setData(d => ({ ...d, bookings: [...d.bookings, { id: uid(), ...form, clientId: client.id, status: 'pending' }] })); toast('Booking added'); setModal(false); setForm(blank)
  }
  const toggle = id => { setData(d => ({ ...d, bookings: d.bookings.map(b => b.id === id ? { ...b, status: b.status === 'confirmed' ? 'pending' : 'confirmed' } : b) })); toast('Status updated') }
  const del = id => { if (!confirm('Delete booking?')) return; setData(d => ({ ...d, bookings: d.bookings.filter(b => b.id !== id) })); toast('Deleted') }
  const [sendingReminder, setSendingReminder] = useState(null)
  const sendReminder = async (b) => {
    const client = data.clients.find(c => c.id === b.clientId || c.name === b.client)
    if (!client?.email) { toast('No email address for this client'); return }
    setSendingReminder(b.id)
    try {
      const { data: { session } } = await pibase.auth.getSession()
      const r = await fetch('/api/email-reminder', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ booking: b, clientEmail: client.email, clientName: client.name }) })
      if (r.ok) { toast('Reminder sent to ' + client.email) } else { toast('Failed to send') }
    } catch { toast('Failed to send') }
    setSendingReminder(null)
  }
  const types = data.sessionTypes || ['Family', 'Maternity', 'Newborn', 'Portrait']
  const blocked = data.availability?.blockedDates || []
  const blockedTimes = data.availability?.blockedTimes || []
  const matchesFilter = booking => filterType === 'all' || booking.type === filterType
  const toggleBlock = date => {
    if (!date) return
    if (blockStart || blockEnd) {
      if (!blockStart || !blockEnd || blockStart >= blockEnd) return toast('Choose a valid start and end time')
      setData(current => ({ ...current, availability: { ...current.availability, blockedTimes: [...(current.availability?.blockedTimes || []), { date, start: blockStart, end: blockEnd }] } }))
      setBlockDate(''); setBlockStart(''); setBlockEnd(''); toast('Time blocked'); return
    }
    setData(current => ({ ...current, availability: { ...current.availability, blockedDates: (current.availability?.blockedDates || []).includes(date) ? current.availability.blockedDates.filter(item => item !== date) : [...(current.availability?.blockedDates || []), date].sort() } }))
    setBlockDate(''); toast('Blocked dates updated')
  }
  const downloadCalendar = () => {
    const escape = value => String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
    const dt = (date, time) => `${date.replaceAll('-', '')}T${(time || '00:00').replace(':', '')}00`
    const events = data.bookings.filter(b => b.date && b.status !== 'canceled').map(b => {
      const start = new Date(`${b.date}T${b.time || '00:00'}:00`)
      const end = new Date(start.getTime() + (b.durationMinutes || 60) * 60000)
      const pad = value => String(value).padStart(2, '0')
      const endDate = `${end.getFullYear()}${pad(end.getMonth()+1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`
      return `BEGIN:VEVENT\r\nUID:${b.id}@elliesheartstrings.com\r\nDTSTART;TZID=${data.availability?.timezone || 'America/New_York'}:${dt(b.date,b.time)}\r\nDTEND;TZID=${data.availability?.timezone || 'America/New_York'}:${endDate}\r\nSUMMARY:${escape(`${b.type} - ${b.client}`)}\r\nLOCATION:${escape(b.location)}\r\nEND:VEVENT`
    })
    const file = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Ellies Heartstrings//Studio Manager//EN\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`
    const url = URL.createObjectURL(new Blob([file], { type: 'text/calendar;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'ellies-heartstrings-sessions.ics'; link.click(); URL.revokeObjectURL(url)
  }
  return (
    <div>
      <div style={T.pageHeader} className="page-header-wrap">
        <div><div style={T.pageTitle}>Calendar</div><div style={T.pageSub}>{data.bookings.length} sessions</div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={T.btnSm} onClick={downloadCalendar}>Calendar Sync (.ics export)</button>
          <select aria-label="Filter by session type" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...T.formInput, width: 150 }}><option value="all">All types</option>{[...new Set(data.bookings.map(b => b.type).filter(Boolean))].map(type => <option key={type} value={type}>{type}</option>)}</select>
          <div style={{ display: 'inline-flex', background: C.surface2, borderRadius: 8, padding: 3, gap: 2 }}>
            {[['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['list', 'List']].map(([v, l]) => <button key={v} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: calView === v ? C.surface : 'transparent', color: C.text, fontWeight: calView === v ? 500 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setCalView(v)}>{l}</button>)}
          </div>
          <button style={T.btnPrimary} onClick={() => setModal(true)}>+ New booking</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}><label style={{ fontSize: 13, color: C.muted }}>Block Off Time</label><input aria-label="Block date" type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} style={{ ...T.formInput, width: 170 }} /><input aria-label="Block start time" type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} style={{ ...T.formInput, width: 110 }} /><span style={{ color: C.faint }}>to</span><input aria-label="Block end time" type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} style={{ ...T.formInput, width: 110 }} /><button style={T.btnSm} onClick={() => toggleBlock(blockDate)} disabled={!blockDate}>{blockStart || blockEnd ? 'Block time' : blocked.includes(blockDate) ? 'Unblock date' : 'Block date'}</button><span style={{ fontSize: 12, color: C.faint }}>{blocked.length} blocked date{blocked.length === 1 ? '' : 's'} · {blockedTimes.length} time block{blockedTimes.length === 1 ? '' : 's'}</span></div>
      {!!blockedTimes.length && <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>{blockedTimes.map((block, index) => <button key={`${block.date}-${block.start}-${index}`} style={T.btnSm} onClick={() => { setData(current => ({ ...current, availability: { ...current.availability, blockedTimes: (current.availability?.blockedTimes || []).filter((_, i) => i !== index) } })); toast('Time block removed') }}>{block.date} {block.start}–{block.end} ×</button>)}</div>}
      {calView === 'month' ? (
        <div style={T.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18 }}>{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={T.btnSm} onClick={() => setCursor(new Date(y, mo - 1, 1))}>‹</button>
              <button style={T.btnSm} onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
              <button style={T.btnSm} onClick={() => setCursor(new Date(y, mo + 1, 1))}>›</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 1 }} className="cal-head-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ fontSize: 10, fontWeight: 600, color: C.faint, textAlign: 'center', padding: '6px 0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{d}</div>)}
          </div>
          <div className="calendar-month-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: C.border, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="calendar-month-cell calendar-month-cell-empty" style={{ background: C.surface2, minHeight: 76 }} />
              const dateStr = ds(d), evts = data.bookings.filter(b => b.date === dateStr && b.status !== 'canceled' && matchesFilter(b)), isToday = dateStr === todayStr
              const hasBooking = evts.length > 0
              return (
                <div key={i} role="button" tabIndex={0} title="Open this day's agenda" onClick={() => { setSelectedDate(dateStr); setCalView('day') }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { setSelectedDate(dateStr); setCalView('day') } }} className={`calendar-month-cell calendar-month-cell-action${hasBooking ? ' calendar-month-cell-booked' : ''}${isToday ? ' calendar-month-cell-today' : ''}`} style={{ background: blocked.includes(dateStr) ? '#f2f1ef' : hasBooking ? '#FFF8F5' : isToday ? '#FAFAFA' : C.surface, minHeight: 76, padding: '7px 8px' }}>
                  <div style={{ fontSize: 12, fontWeight: hasBooking || isToday ? 700 : 400, color: hasBooking ? '#7A3B2E' : isToday ? C.text : C.muted }}>{d}</div>
                  {blocked.includes(dateStr) && <div style={{ fontSize: 10, color: C.muted }}>Blocked</div>}
                  {blockedTimes.some(block => block.date === dateStr) && <div style={{ fontSize: 10, color: C.muted }}>Time blocked</div>}
                  {evts.map(e => {
                    const clientObj = data.clients.find(c => c.id === e.clientId || c.name === e.client)
                    return <div key={e.id} onClick={event => { event.stopPropagation(); clientObj ? openClientCard(clientObj) : toggle(e.id) }} style={{ fontSize: 10, fontWeight: 500, background: e.status === 'confirmed' ? C.text : C.surface3, color: e.status === 'confirmed' ? '#fff' : C.muted, borderRadius: 4, padding: '2px 5px', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} title={clientObj ? `Open ${e.client}'s project` : 'Click to toggle status'}>{e.client}</div>
                  })}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={T.card}>
          {calView !== 'list' && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}><button style={T.btnSm} onClick={() => setSelectedDate(shiftDate(selectedDate, calView === 'week' ? -7 : -1))}>‹</button><button style={T.btnSm} onClick={() => setSelectedDate(todayStr)}>Today</button><button style={T.btnSm} onClick={() => setSelectedDate(shiftDate(selectedDate, calView === 'week' ? 7 : 1))}>›</button><strong style={{ marginLeft: 8 }}>{calView === 'week' ? `${weekStart} – ${weekEnd}` : selectedDate}</strong><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ ...T.formInput, width: 165, marginLeft: 'auto' }} /></div>}
          {[...data.bookings].filter(b => matchesFilter(b) && (calView === 'list' || (calView === 'day' ? b.date === selectedDate : b.date >= weekStart && b.date <= weekEnd))).sort((a, b) => a.date.localeCompare(b.date)).map((b, i) => (
            <div key={b.id} style={{ ...T.dataRow, borderBottom: i === data.bookings.length - 1 ? 'none' : `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: C.surface2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 500, color: C.faint, textTransform: 'uppercase' }}>{b.date ? new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }) : ''}</div>
                  <div style={{ fontSize: 16, fontWeight: 400, fontFamily: "'DM Serif Display', Georgia, serif", color: C.text, lineHeight: 1.1 }}>{b.date ? new Date(b.date + 'T00:00:00').getDate() : '?'}</div>
                </div>
                <div><div style={{ fontWeight: 500 }}>{b.client}</div><div style={{ fontSize: 12, color: C.muted }}>{b.type} · {b.location} · {fmtTime(b.time)}</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {(() => { const clientObj = data.clients.find(c => c.id === b.clientId || c.name === b.client); return clientObj ? <button style={T.btnSm} onClick={() => openClientCard(clientObj)}>Open project</button> : null })()}
                <button style={T.btnSm} onClick={() => sendReminder(b)} disabled={sendingReminder === b.id}>{sendingReminder === b.id ? 'Sending...' : 'Remind'}</button>
                <Badge type={b.status} label={b.status} />
                <button style={{ ...T.btnGhost, color: C.red }} onClick={() => del(b.id)}>×</button>
              </div>
            </div>
          ))}
          {!data.bookings.some(b => matchesFilter(b) && (calView === 'list' || (calView === 'day' ? b.date === selectedDate : b.date >= weekStart && b.date <= weekEnd))) && <div style={{ padding: 30, textAlign: 'center', color: C.faint }}>No sessions in this view</div>}
        </div>
      )}
      {modal && (
        <Modal title="New booking" onClose={() => setModal(false)} footer={<><button style={T.btn} onClick={() => setModal(false)}>Cancel</button><button style={T.btnPrimary} onClick={add}>Add</button></>}>
          <div style={T.formRow}>
            <div style={T.formGroup}><label style={T.formLabel}>Client</label><input style={T.formInput} list="cl1" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /><datalist id="cl1">{data.clients.map(c => <option key={c.id} value={c.name} />)}</datalist></div>
            <div style={T.formGroup}><label style={T.formLabel}>Type</label><select style={T.formInput} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{types.map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div style={T.formRow}>
            <div style={T.formGroup}><label style={T.formLabel}>Date</label><input style={T.formInput} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div style={T.formGroup}><label style={T.formLabel}>Time</label><input style={T.formInput} type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
          </div>
          <div style={T.formGroup}><label style={T.formLabel}>Location</label><input style={T.formInput} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
          <div style={T.formGroup}><label style={T.formLabel}>Notes</label><textarea style={{ ...T.formInput, resize: 'none' }} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </Modal>
      )}
    </div>
  )
}

// ── Invoices ──────────────────────────────────────────────────────
export function Invoices({ data, setData, toast }) {
  const [modal, setModal] = useState(false)
  const [payModal, setPayModal] = useState(null) // invoice being marked paid
  const [payMethod, setPayMethod] = useState(null)
  const [sendFor, setSendFor] = useState(null) // invoice being emailed
  const [editFor, setEditFor] = useState(null) // invoice being edited
  const [viewId, setViewId] = useState(null)
  const [show, setShow] = useState('all') // all | open | paid
  const viewInvoice = viewId ? data.invoices.find(i => i.id === viewId) : null
  const clientFor = inv => data.clients.find(c => c.id === inv.clientId) || data.clients.find(c => c.name === inv.client)
  const confirmPaid = () => {
    if (!payMethod) { toast('Select a payment method'); return }
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    setData(d => ({ ...d, invoices: d.invoices.map(i => i.id === payModal.id ? { ...i, status: 'paid', paid: i.amount, paymentMethod: payMethod, paidAt: now } : i) }))
    toast(`Marked as paid · ${payMethod}`); setPayModal(null); setPayMethod(null)
  }
  const del = inv => { if (!confirm(`Delete ${invoiceLabel(inv)}? This cannot be undone.`)) return; setData(d => ({ ...d, invoices: d.invoices.filter(i => i.id !== inv.id) })); setViewId(null); toast(`${invoiceLabel(inv)} deleted`) }
  const total = data.invoices.reduce((s, i) => s + i.amount, 0)
  const collected = data.invoices.reduce((s, i) => s + i.paid, 0)
  return (
    <div>
      <div style={T.pageHeader} className="page-header-wrap"><div><div style={T.pageTitle}>Invoices</div><div style={T.pageSub}>{fmt$(collected)} collected · {fmt$(total - collected)} outstanding</div></div><button style={T.btnPrimary} onClick={() => setModal(true)}>+ New invoice</button></div>
      <div className="chip-tabs" role="tablist" style={{ marginBottom: 16 }}>
        {[['all', 'All', data.invoices.length], ['open', 'Waiting', data.invoices.filter(i => i.status !== 'paid').length], ['paid', 'Paid', data.invoices.filter(i => i.status === 'paid').length]].map(([value, label, count]) => (
          <button key={value} role="tab" aria-selected={show === value} className={show === value ? 'active' : ''} onClick={() => setShow(value)}>{label} <span>{count}</span></button>
        ))}
      </div>
      <div className="invoice-card-grid">
        {data.invoices.filter(i => show === 'all' || (show === 'paid') === (i.status === 'paid')).map(inv => {
          const pct = inv.amount > 0 ? Math.round(inv.paid / inv.amount * 100) : 0
          const owing = inv.amount - inv.paid
          return (
            <article key={inv.id} className={`invoice-summary-card doc-card-${docTone('invoice', inv)}`} onClick={() => setViewId(inv.id)}>
              <div className="inv-card-top">
                <div style={{ minWidth: 0 }}>
                  <div className="inv-card-num">{invoiceLabel(inv)} <Badge type={inv.status} label={inv.status} /></div>
                  <div className="inv-card-client">{inv.client}</div>
                  <div className="inv-card-meta">Due {fmtDate(inv.due)}{inv.paymentMethod ? ` · Paid via ${inv.paymentMethod}` : ''}</div>
                </div>
                <div className="inv-card-amount">
                  <div>{fmt$(inv.amount)}</div>
                  {inv.status === 'partial' && <small>{fmt$(inv.paid)} paid</small>}
                </div>
              </div>
              <div style={T.progress}><div style={{ height: '100%', borderRadius: 2, background: inv.status === 'paid' ? C.green : inv.status === 'partial' ? C.amber : C.border2, width: pct + '%', transition: 'width 0.4s' }} /></div>
              <div className="card-actions">
                {inv.status !== 'paid' && owing > 0 && <button style={{ ...T.btnSm, color: C.green, borderColor: C.green }} onClick={event => { event.stopPropagation(); setPayModal(inv); setPayMethod(null) }}>Mark paid</button>}
                <button style={T.btnSm} onClick={event => { event.stopPropagation(); setEditFor(inv) }}>Edit</button>
                <button style={T.btnSm} onClick={event => { event.stopPropagation(); setSendFor(inv) }}>Send</button>
              </div>
            </article>
          )
        })}
      </div>
      {modal && <InvoiceModal data={data} setData={setData} toast={toast} onClose={() => setModal(false)} />}
      {editFor && <InvoiceModal invoice={editFor} client={clientFor(editFor)} data={data} setData={setData} toast={toast} onClose={() => setEditFor(null)} />}
      {sendFor && <SendInvoiceModal invoice={sendFor} client={clientFor(sendFor)} toast={toast} onClose={() => setSendFor(null)} />}
      {viewInvoice && <Modal title={`${invoiceLabel(viewInvoice)} · ${viewInvoice.client}`} onClose={() => setViewId(null)} wide footer={<><button style={{ ...T.btn, color: C.red, borderColor: C.red }} onClick={() => del(viewInvoice)}>Delete</button><div style={{ flex: 1 }} /><button style={T.btn} onClick={() => { setEditFor(viewInvoice); setViewId(null) }}>Edit</button><button style={T.btn} onClick={() => { setSendFor(viewInvoice); setViewId(null) }}>Email client</button>{viewInvoice.status !== 'paid' && <button style={T.btnPrimary} onClick={() => { setPayModal(viewInvoice); setPayMethod(null); setViewId(null) }}>Record payment</button>}</>}>
        <div className="invoice-detail-grid"><div><span>Status</span><Badge type={viewInvoice.status} label={viewInvoice.status} /></div><div><span>Total</span><strong>{fmt$(viewInvoice.amount)}</strong></div><div><span>Paid</span><strong>{fmt$(viewInvoice.paid)}</strong></div><div><span>Balance</span><strong>{fmt$(viewInvoice.amount - viewInvoice.paid)}</strong></div><div><span>Due date</span><strong>{fmtDate(viewInvoice.due)}</strong></div><div><span>Payment</span><strong>{viewInvoice.paymentMethod || 'Not recorded'}</strong></div></div>
        {viewInvoice.note && <div className="invoice-note"><span>Invoice note</span><p>{viewInvoice.note}</p></div>}
        {!!viewInvoice.lineData?.items?.length && <div className="invoice-line-items"><h3>Items</h3>{viewInvoice.lineData.items.map(item => <div key={item.id}><span><strong style={{ fontWeight: 500 }}>{item.name || 'Item'}</strong>{item.description ? <><br /><small style={{ color: C.muted, whiteSpace: 'pre-wrap' }}>{item.description}</small></> : null}</span><strong>{item.qty} × {fmt$(item.price)}</strong></div>)}</div>}
      </Modal>}

      {/* 1.6 — Payment method modal */}
      {payModal && (
        <Modal title="How was this payment received?" onClose={() => { setPayModal(null); setPayMethod(null) }}
          footer={<><button style={T.btn} onClick={() => { setPayModal(null); setPayMethod(null) }}>Cancel</button><button style={T.btnPrimary} onClick={confirmPaid}>Confirm payment</button></>}>
          <div style={{ marginBottom: 16, padding: '12px 16px', background: C.surface2, borderRadius: 10, fontSize: 13 }}>
            <div style={{ fontWeight: 500 }}>{invoiceLabel(payModal)} · {payModal.client}</div>
            <div style={{ color: C.muted, marginTop: 2 }}>Amount: <strong style={{ color: C.text }}>${payModal.amount.toLocaleString()}</strong></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { value: 'Cash', label: 'Cash', desc: 'Payment received in cash' },
              { value: 'Credit Card', label: 'Credit Card', desc: 'Manual card payment (not via Stripe)' },
              { value: 'Gift / Complimentary', label: 'Gift / Complimentary', desc: 'No charge — gift or comp session' },
            ].map(opt => (
              <div key={opt.value} onClick={() => setPayMethod(opt.value)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${payMethod === opt.value ? C.text : C.border}`, background: payMethod === opt.value ? C.surface3 : C.surface, cursor: 'pointer', transition: 'all 0.12s' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${payMethod === opt.value ? C.text : C.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {payMethod === opt.value && <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.text }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: C.faint, padding: '10px 14px', background: C.surface2, borderRadius: 8 }}>
            Use this form to record a payment you have already received.
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Contracts ─────────────────────────────────────────────────────
export function Contracts({ data, setData, toast }) {
  const [modal, setModal] = useState(false)
  const [viewModal, setViewModal] = useState(null)
  const [sendModal, setSendModal] = useState(null)
  const [signModal, setSignModal] = useState(null)
  const [signName, setSignName] = useState('')
  const confirmSign = () => {
    if (!signName.trim()) { toast('Please type your full name to sign'); return }
    const signedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    setData(d => ({ ...d, contracts: d.contracts.map(k => k.id === signModal.id ? { ...k, status: 'signed', signedBy: signName.trim(), signedAt } : k) }))
    toast('Contract signed'); setSignModal(null); setSignName('')
  }
  return (
    <div>
      <div style={T.pageHeader} className="page-header-wrap"><div><div style={T.pageTitle}>Contracts</div><div style={T.pageSub}>{data.contracts.filter(k => k.status === 'signed').length} signed · {data.contracts.filter(k => k.status === 'pending').length} pending</div></div><button style={T.btnPrimary} onClick={() => setModal(true)}>+ New contract</button></div>
      <div className="invoice-card-grid">
        {data.contracts.length === 0 && <div style={{ ...T.card, color: C.faint, textAlign: 'center' }}>No contracts yet</div>}
        {data.contracts.map(k => (
          <article key={k.id} className={`invoice-summary-card doc-card-${docTone('contract', k)}`} onClick={() => setViewModal(k)}>
            <div className="inv-card-top">
              <div style={{ minWidth: 0 }}>
                <div className="inv-card-num">{k.type || 'Contract'}</div>
                <div className="inv-card-client">{k.client}</div>
                <div className="inv-card-meta">{k.status === 'signed' ? `Signed${k.signedBy ? ` by ${k.signedBy}` : ''}${k.signedAt ? ` · ${k.signedAt}` : ''}` : `Created ${k.sent || '—'} · waiting for signature`}</div>
              </div>
              <Badge type={k.status} label={k.status === 'signed' ? 'signed' : 'awaiting'} />
            </div>
            <div className="card-actions">
              <button style={T.btnSm} onClick={e => { e.stopPropagation(); setViewModal(k) }}>View</button>
              {k.status === 'pending' && <button style={T.btnSm} onClick={e => { e.stopPropagation(); setSendModal(k) }}>Send to sign</button>}
              {k.status === 'pending' && <button style={{ ...T.btnSm, color: C.green, borderColor: C.green }} onClick={e => { e.stopPropagation(); setSignModal(k); setSignName('') }}>Sign in person</button>}
            </div>
          </article>
        ))}
      </div>
      {modal && <ContractModal data={data} setData={setData} toast={toast} onClose={() => setModal(false)} />}
      {viewModal && <ContractModal contract={viewModal} data={data} setData={setData} toast={toast} onClose={() => setViewModal(null)} />}
      {sendModal && <ContractModal contract={sendModal} startMode="send" data={data} setData={setData} toast={toast} onClose={() => setSendModal(null)} />}
      {signModal && (
        <Modal title="Sign contract" onClose={() => { setSignModal(null); setSignName('') }}
          footer={<><button style={T.btn} onClick={() => { setSignModal(null); setSignName('') }}>Cancel</button><button style={T.btnPrimary} onClick={confirmSign}>Sign contract</button></>}>
          <div style={{ marginBottom: 20, padding: '14px 16px', background: C.surface2, borderRadius: 10, fontSize: 13 }}>
            <div style={{ fontWeight: 500 }}>{signModal.type || 'Contract'}</div>
            <div style={{ color: C.muted, marginTop: 2 }}>{signModal.client} · Sent {signModal.sent}</div>
          </div>
          <div style={T.formGroup}>
            <label style={T.formLabel}>Type your full legal name to sign</label>
            <input style={{ ...T.formInput, fontSize: 18, fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: '0.01em' }}
              placeholder="Your full name"
              value={signName}
              onChange={e => setSignName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmSign()}
              autoFocus
            />
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: C.faint, padding: '10px 14px', background: C.surface2, borderRadius: 8, lineHeight: 1.6 }}>
            By typing your name above, you agree this constitutes a valid electronic signature and that you have read and agree to the terms of this contract.
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Inbox ─────────────────────────────────────────────────────────
// One conversation per client: emails you send, their email replies and
// their chat messages. On phones the list and the conversation are two
// screens, like a messaging app.
const QUICK_REPLIES = [
  'Thank you so much! I\'ll get back to you shortly.',
  'Your gallery is ready! 🎉',
  'Looking forward to your session!',
  'Could you share a few dates and times that work for you?',
]
const initials = name => (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

export function Inbox({ data, setData, toast, openClientCard }) {
  const [activeId, setActiveId] = useState(null)
  const [mobileThread, setMobileThread] = useState(false)
  const [filter, setFilter] = useState('all') // all | unread
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [newModal, setNewModal] = useState(false)
  const [nf, setNf] = useState({ clientId: '', body: '' })
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const lastOf = m => m.thread?.[m.thread.length - 1]
  const conversations = [...data.messages]
    .sort((a, b) => (lastOf(b)?.at || '').localeCompare(lastOf(a)?.at || ''))
    .filter(m => filter === 'all' || m.unread)
    .filter(m => !search.trim() || `${m.from} ${lastOf(m)?.text || ''}`.toLowerCase().includes(search.toLowerCase()))
  // Desktop shows the newest conversation straight away; phones start on the list.
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 769px)')
    const update = () => setWide(query.matches)
    update(); query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const active = data.messages.find(m => m.id === activeId) || (wide ? conversations[0] : null)
  const activeClient = active ? data.clients.find(c => c.id === active.clientId) || data.clients.find(c => c.name === active.from) : null
  const unreadCount = data.messages.filter(m => m.unread).length

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [active?.id, active?.thread?.length])

  const deliver = async ({ clientId, clientName, message }) => {
    const { data: { session } } = await pibase.auth.getSession()
    const response = await fetch('/api/email-message', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ clientId, clientName, message }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'Message could not be sent')
    return payload.client
  }
  const entry = text => ({ id: uid(), from: 'You', text, time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), at: new Date().toISOString(), out: true, via: 'email' })
  const open = m => {
    setActiveId(m.id); setMobileThread(true)
    if (m.unread) setData(d => ({ ...d, messages: d.messages.map(x => x.id === m.id ? { ...x, unread: false } : x) }))
  }
  const send = async () => {
    if (!draft.trim() || !active || sending) return
    setSending(true)
    try {
      await deliver({ clientId: activeClient?.id, clientName: active.from, message: draft })
      setData(d => ({ ...d, messages: d.messages.map(m => m.id === active.id ? { ...m, clientId: activeClient?.id || m.clientId, thread: [...m.thread, entry(draft)], unread: false } : m) }))
      setDraft(''); toast('Email sent')
    } catch (error) { toast(error.message) }
    setSending(false)
  }
  const sendNew = async () => {
    const selected = data.clients.find(c => c.id === nf.clientId)
    if (!selected) return toast('Choose a client')
    if (!nf.body.trim() || sending) return
    setSending(true)
    try {
      await deliver({ clientId: selected.id, clientName: selected.name, message: nf.body })
      const existing = data.messages.find(m => m.clientId === selected.id)
      if (existing) {
        setData(d => ({ ...d, messages: d.messages.map(m => m.id === existing.id ? { ...m, thread: [...m.thread, entry(nf.body)] } : m) }))
        setActiveId(existing.id)
      } else {
        const nm = { id: uid(), clientId: selected.id, from: selected.name, thread: [entry(nf.body)], unread: false }
        setData(d => ({ ...d, messages: [nm, ...d.messages] })); setActiveId(nm.id)
      }
      setMobileThread(true); setNewModal(false); setNf({ clientId: '', body: '' }); toast('Email sent')
    } catch (error) { toast(error.message) }
    setSending(false)
  }
  const copyChat = async () => {
    if (!activeClient) return toast('This conversation has no linked client')
    try {
      const { data: { session } } = await pibase.auth.getSession()
      const response = await fetch('/api/chat-link', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ clientId: activeClient.id }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Could not create chat link')
      try { await navigator.clipboard.writeText(body.url); toast('Chat link copied') } catch { toast(body.url) }
    } catch (error) { toast(error.message) }
  }

  return (
    <div className={`inbox${mobileThread && active ? ' inbox-thread-open' : ''}`}>
      <div style={T.pageHeader} className="page-header-wrap inbox-header">
        <div><div style={T.pageTitle}>Inbox</div><div style={T.pageSub}>{unreadCount ? `${unreadCount} unread · ` : ''}Email and chat with your clients, all in one place</div></div>
        <button style={T.btnPrimary} onClick={() => setNewModal(true)}>+ New message</button>
      </div>
      <div className="inbox-shell">
        {/* Conversation list */}
        <aside className="inbox-list">
          <div className="inbox-list-tools">
            <input aria-label="Search conversations" placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="chip-tabs">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All <span>{data.messages.length}</span></button>
              <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Unread <span>{unreadCount}</span></button>
            </div>
          </div>
          {conversations.length === 0 && <div className="inbox-empty-list">{filter === 'unread' ? 'You\'re all caught up ✨' : 'No conversations yet'}</div>}
          {conversations.map(m => {
            const last = lastOf(m)
            return (
              <button key={m.id} className={`inbox-row${active?.id === m.id ? ' active' : ''}${m.unread ? ' unread' : ''}`} onClick={() => open(m)}>
                <span className="inbox-avatar">{initials(m.from)}</span>
                <span className="inbox-row-body">
                  <span className="inbox-row-top"><strong>{m.from}</strong><small>{last?.time || ''}</small></span>
                  <span className="inbox-row-preview">{last?.via === 'chat' ? '💬 ' : last && !last.out ? '✉ ' : ''}{last ? `${last.out ? 'You: ' : ''}${last.text}` : 'No messages yet'}</span>
                </span>
                {m.unread && <span className="inbox-dot" aria-label="Unread" />}
              </button>
            )
          })}
        </aside>

        {/* Conversation */}
        <section className="inbox-thread">
          {active ? (
            <>
              <header className="inbox-thread-head">
                <button className="inbox-back" onClick={() => setMobileThread(false)} aria-label="Back to conversations">‹</button>
                <span className="inbox-avatar">{initials(active.from)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{active.from}</strong>
                  <small>{activeClient?.email || 'No email on file'}</small>
                </div>
                <button style={T.btnSm} onClick={copyChat} title="Copy this client's private chat link">Chat link</button>
                {activeClient && openClientCard && <button style={T.btnSm} onClick={() => openClientCard(activeClient)}>Client</button>}
              </header>
              <div className="inbox-messages">
                {active.thread.map(msg => (
                  <div key={msg.id} className={`inbox-bubble ${msg.out ? 'out' : 'in'}`}>
                    <div>{msg.text}</div>
                    <small>{msg.time}{msg.via ? ` · ${msg.via === 'chat' ? 'chat' : 'email'}` : ''}</small>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="inbox-compose">
                <div className="inbox-quick">
                  {QUICK_REPLIES.map(text => <button key={text} onClick={() => setDraft(d => d ? `${d} ${text}` : text)}>{text}</button>)}
                </div>
                <div className="inbox-compose-row">
                  <textarea rows={2} placeholder={`Reply to ${active.from.split(' ')[0]}…`} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }} />
                  <button aria-label="Send email" disabled={sending || !draft.trim()} style={{ ...T.btnPrimary, opacity: sending || !draft.trim() ? 0.5 : 1 }} onClick={send}>{sending ? '…' : 'Send'}</button>
                </div>
                <small className="inbox-hint">Sent by email with a link to their private chat. Replies show up here.</small>
              </div>
            </>
          ) : (
            <div className="inbox-placeholder">
              <div style={{ fontSize: 34 }}>💬</div>
              <strong>Pick a conversation</strong>
              <span>or start a new message to a client.</span>
            </div>
          )}
        </section>
      </div>

      {newModal && (
        <Modal title="New message" onClose={() => setNewModal(false)} footer={<><button style={T.btn} onClick={() => setNewModal(false)}>Cancel</button><button style={T.btnPrimary} disabled={sending} onClick={sendNew}>{sending ? 'Sending…' : 'Send email'}</button></>}>
          <div style={T.formGroup}><label style={T.formLabel}>To</label>
            <select style={T.formInput} value={nf.clientId} onChange={e => setNf({ ...nf, clientId: e.target.value })}>
              <option value="">Choose a client…</option>
              {data.clients.filter(c => !c.archived).map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ' · no email'}</option>)}
            </select>
          </div>
          <div style={T.formGroup}><label style={T.formLabel}>Message</label><textarea style={{ ...T.formInput, resize: 'vertical' }} rows={6} value={nf.body} onChange={e => setNf({ ...nf, body: e.target.value })} /></div>
          <div className="inbox-quick" style={{ marginTop: -4 }}>{QUICK_REPLIES.map(text => <button key={text} onClick={() => setNf(v => ({ ...v, body: v.body ? `${v.body} ${text}` : text }))}>{text}</button>)}</div>
        </Modal>
      )}
    </div>
  )
}
