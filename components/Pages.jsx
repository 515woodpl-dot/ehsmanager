import { useState, useRef, useEffect } from 'react'
import { T, C } from '../lib/tokens'
import { supabase } from '../lib/supabase'
import { Modal, Badge, Avatar, SearchBar } from './UI'
import ContractBuilder from './ContractBuilder'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })
const fmtDate = iso => { if (!iso) return 'TBD'; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}` }
const todayLabel = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const fmt$ = n => '$' + Number(n || 0).toLocaleString()

function ContractBody({ body }) {
  const lines = String(body || 'No contract body.').split('\n')
  return (
    <div className="contract-body-render">
      {lines.map((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={index} className="contract-body-space" />
        const isHeading = /^\d+\.\s+/.test(trimmed) || trimmed === 'Signatures'
        return <p key={index} className={isHeading ? 'contract-body-heading' : ''}>{line}</p>
      })}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────
export function Dashboard({ data, setView, openClientCard }) {
  const totalRevenue = data.invoices.reduce((s, i) => s + i.paid, 0)
  const outstanding = data.invoices.reduce((s, i) => s + (i.amount - i.paid), 0)
  const active = data.clients.filter(c => !c.archived && c.status !== 'done').length
  const upcoming = data.bookings.filter(b => b.status === 'confirmed').length
  return (
    <div>
      <div style={T.metricStrip} className="metric-strip">
        {[
          { label: 'Revenue collected', value: fmt$(totalRevenue), sub: 'all time' },
          { label: 'Outstanding', value: fmt$(outstanding), sub: `${data.invoices.filter(i => i.status !== 'paid').length} invoices` },
          { label: 'Active clients', value: active, sub: `of ${data.clients.filter(c => !c.archived).length} total` },
          { label: 'Sessions confirmed', value: upcoming, sub: 'upcoming' },
        ].map((m, i) => (
          <div key={m.label} style={T.metricCell(i === 3)}>
            <div style={T.metricLabel}>{m.label}</div>
            <div style={T.metricValue}>{m.value}</div>
            <div style={T.metricSub}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="two-col-grid">
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
  const avg = activeClients.length ? Math.round(data.invoices.reduce((s, i) => s + i.amount, 0) / activeClients.length) : 0
  const conv = data.clients.length ? Math.round(data.clients.filter(c => c.status !== 'inquiry').length / data.clients.length * 100) : 0
  const paidInvoices = data.invoices.filter(i => i.status === 'paid').length

  return (
    <div>
      <div style={{ ...T.metricStrip, gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }} className="metric-strip">
        {[
          { label: 'Total collected', value: fmt$(totalRevenue), sub: `${paidInvoices} paid invoices` },
          { label: 'Outstanding', value: fmt$(outstanding), sub: `${data.invoices.filter(i => i.status !== 'paid').length} open` },
          { label: 'Avg invoice value', value: fmt$(avg), sub: 'per client' },
          { label: 'Conversion rate', value: conv + '%', sub: 'inquiry → booked' },
        ].map((m, i) => (
          <div key={m.label} style={T.metricCell(i === 3)}>
            <div style={T.metricLabel}>{m.label}</div>
            <div style={T.metricValue}>{m.value}</div>
            {m.sub && <div style={T.metricSub}>{m.sub}</div>}
          </div>
        ))}
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
              <div key={inv.number || inv.id} style={{ ...T.dataRow, borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{inv.client}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{inv.number || inv.id} · Due {fmtDate(inv.due)}</div>
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
      const { data: { session } } = await supabase.auth.getSession()
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
                <div key={i} className={`calendar-month-cell${hasBooking ? ' calendar-month-cell-booked' : ''}${isToday ? ' calendar-month-cell-today' : ''}`} style={{ background: blocked.includes(dateStr) ? '#f2f1ef' : hasBooking ? '#FFF8F5' : isToday ? '#FAFAFA' : C.surface, minHeight: 76, padding: '7px 8px' }}>
                  <div style={{ fontSize: 12, fontWeight: hasBooking || isToday ? 700 : 400, color: hasBooking ? '#7A3B2E' : isToday ? C.text : C.muted }}>{d}</div>
                  {blocked.includes(dateStr) && <div style={{ fontSize: 10, color: C.muted }}>Blocked</div>}
                  {blockedTimes.some(block => block.date === dateStr) && <div style={{ fontSize: 10, color: C.muted }}>Time blocked</div>}
                  {evts.map(e => {
                    const clientObj = data.clients.find(c => c.id === e.clientId || c.name === e.client)
                    return <div key={e.id} onClick={() => clientObj ? openClientCard(clientObj) : toggle(e.id)} style={{ fontSize: 10, fontWeight: 500, background: e.status === 'confirmed' ? C.text : C.surface3, color: e.status === 'confirmed' ? '#fff' : C.muted, borderRadius: 4, padding: '2px 5px', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} title={clientObj ? `Open ${e.client}'s project` : 'Click to toggle status'}>{e.client}</div>
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
  const [sending, setSending] = useState(null) // invoiceId being emailed
  const blank = { client: '', amount: '', due: '', note: '' }
  const [form, setForm] = useState(blank)
  const sendInvoice = async (inv) => {
    const client = data.clients.find(c => c.id === inv.clientId || c.name === inv.client)
    if (!client?.email) { toast('No email address for this client'); return }
    setSending(inv.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/email-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ invoice: inv, clientEmail: client.email, clientName: client.name }) })
      if (r.ok) { toast('Invoice sent to ' + client.email) } else { toast('Failed to send email') }
    } catch { toast('Failed to send email') }
    setSending(null)
  }
  const add = () => { const client = data.clients.find(c => c.name === form.client); if (!client) { toast('Select an existing client'); return }; if (!(Number(form.amount) > 0)) { toast('Enter a positive amount'); return }; setData(d => ({ ...d, invoices: [...d.invoices, { id: uid(), number: 'INV-' + String(d.invoices.length + 1).padStart(3, '0'), client: form.client, clientId: client.id, amount: Number(form.amount), due: form.due, status: 'unpaid', paid: 0, note: form.note, paymentIntentId: null }] })); toast('Invoice created'); setModal(false); setForm(blank) }
  const confirmPaid = () => {
    if (!payMethod) { toast('Select a payment method'); return }
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    setData(d => ({ ...d, invoices: d.invoices.map(i => i.id === payModal.id ? { ...i, status: 'paid', paid: i.amount, paymentMethod: payMethod, paidAt: now } : i) }))
    toast(`Marked as paid · ${payMethod}`); setPayModal(null); setPayMethod(null)
  }
  const del = id => { if (!confirm('Delete invoice?')) return; setData(d => ({ ...d, invoices: d.invoices.filter(i => i.id !== id) })); toast('Deleted') }
  const total = data.invoices.reduce((s, i) => s + i.amount, 0)
  const collected = data.invoices.reduce((s, i) => s + i.paid, 0)
  return (
    <div>
      <div style={T.pageHeader} className="page-header-wrap"><div><div style={T.pageTitle}>Invoices</div><div style={T.pageSub}>{fmt$(collected)} collected · {fmt$(total - collected)} outstanding</div></div><button style={T.btnPrimary} onClick={() => setModal(true)}>+ New invoice</button></div>
      <div style={T.card}>
        {data.invoices.map((inv, i) => {
          const pct = inv.amount > 0 ? Math.round(inv.paid / inv.amount * 100) : 0
          const owing = inv.amount - inv.paid
          return (
            <div key={inv.number || inv.id} className="data-row-mobile" style={{ ...T.dataRow, alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16, borderBottom: i === data.invoices.length - 1 ? 'none' : `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <div style={{ fontWeight: 500 }}>{inv.number || inv.id}</div>
                  <div style={{ color: C.text }}>{inv.client}</div>
                  <Badge type={inv.status} label={inv.status} />
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>Due {fmtDate(inv.due)}{inv.note ? ` · ${inv.note}` : ''}{inv.paymentMethod ? ` · Paid via ${inv.paymentMethod}` : ''}{inv.paidAt ? ` · ${inv.paidAt}` : ''}</div>
                <div style={{ width: 160 }}><div style={T.progress}><div style={{ height: '100%', borderRadius: 2, background: inv.status === 'paid' ? C.green : inv.status === 'partial' ? C.amber : C.border2, width: pct + '%', transition: 'width 0.4s' }} /></div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 24 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, letterSpacing: '-0.3px' }}>{fmt$(inv.amount)}</div>
                  {inv.status === 'partial' && <div style={{ fontSize: 11, color: C.muted }}>{fmt$(inv.paid)} paid</div>}
                </div>
                {inv.status !== 'paid' && owing > 0 && <button style={{ ...T.btnSm, color: C.green, borderColor: C.green }} onClick={() => { setPayModal(inv); setPayMethod(null) }}>Mark paid</button>}
                <button style={T.btnSm} onClick={() => sendInvoice(inv)} disabled={sending === inv.id}>{sending === inv.id ? 'Sending...' : 'Send'}</button>
                <button style={{ ...T.btnGhost, color: C.faint }} onClick={() => del(inv.id)}>×</button>
              </div>
            </div>
          )
        })}
      </div>
      {modal && (
        <Modal title="New invoice" onClose={() => setModal(false)} footer={<><button style={T.btn} onClick={() => setModal(false)}>Cancel</button><button style={T.btnPrimary} onClick={add}>Create</button></>}>
          <div style={T.formRow} className="form-row-2">
            <div style={T.formGroup}><label style={T.formLabel}>Client</label><input style={T.formInput} list="cl2" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /><datalist id="cl2">{data.clients.map(c => <option key={c.id} value={c.name} />)}</datalist></div>
            <div style={T.formGroup}><label style={T.formLabel}>Amount ($)</label><input style={T.formInput} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
          </div>
          <div style={T.formGroup}><label style={T.formLabel}>Due date</label><input style={T.formInput} type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></div>
          <div style={T.formGroup}><label style={T.formLabel}>Note</label><input style={T.formInput} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
        </Modal>
      )}

      {/* 1.6 — Payment method modal */}
      {payModal && (
        <Modal title="How was this payment received?" onClose={() => { setPayModal(null); setPayMethod(null) }}
          footer={<><button style={T.btn} onClick={() => { setPayModal(null); setPayMethod(null) }}>Cancel</button><button style={T.btnPrimary} onClick={confirmPaid}>Confirm payment</button></>}>
          <div style={{ marginBottom: 16, padding: '12px 16px', background: C.surface2, borderRadius: 10, fontSize: 13 }}>
            <div style={{ fontWeight: 500 }}>{payModal.id} · {payModal.client}</div>
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
  const [signModal, setSignModal] = useState(null)
  const [signName, setSignName] = useState('')
  const [sending, setSending] = useState(null)
  const blank = { client: '', type: '', body: '' }
  const [form, setForm] = useState(blank)
  const sendContract = async (k) => {
    const client = data.clients.find(c => c.id === k.clientId || c.name === k.client)
    if (!client?.email) { toast('No email address for this client'); return }
    setSending(k.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/email-contract', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ contract: k, clientEmail: client.email, clientName: client.name }) })
      if (r.ok) { toast('Contract sent to ' + client.email) } else { toast('Failed to send email') }
    } catch { toast('Failed to send email') }
    setSending(null)
  }
  const add = () => { if (!form.client.trim()) return; setData(d => ({ ...d, contracts: [...d.contracts, { id: uid(), ...form, clientId: null, sent: todayLabel(), status: 'pending' }] })); toast('Contract created'); setModal(false); setForm(blank) }
  const confirmSign = () => {
    if (!signName.trim()) { toast('Please type your full name to sign'); return }
    const signedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    setData(d => ({ ...d, contracts: d.contracts.map(k => k.id === signModal.id ? { ...k, status: 'signed', signedBy: signName.trim(), signedAt } : k) }))
    toast('Contract signed'); setSignModal(null); setSignName('')
  }
  const del = id => { if (!confirm('Delete contract?')) return; setData(d => ({ ...d, contracts: d.contracts.filter(k => k.id !== id) })); toast('Deleted') }
  return (
    <div>
      <div style={T.pageHeader} className="page-header-wrap"><div><div style={T.pageTitle}>Contracts</div><div style={T.pageSub}>{data.contracts.filter(k => k.status === 'signed').length} signed · {data.contracts.filter(k => k.status === 'pending').length} pending</div></div><button style={T.btnPrimary} onClick={() => setModal(true)}>+ New contract</button></div>
      <div style={T.card}>
        {data.contracts.map((k, i) => (
            <div key={k.id} className="data-row-mobile" onClick={() => setViewModal(k)} style={{ ...T.dataRow, borderBottom: i === data.contracts.length - 1 ? 'none' : `1px solid ${C.border}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: k.status === 'signed' ? C.greenBg : C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: k.status === 'signed' ? C.green : C.muted, flexShrink: 0 }}>{k.status === 'signed' ? '✓' : '✎'}</div>
              <div><div style={{ fontWeight: 500 }}>{k.type || 'Contract'}</div><div style={{ fontSize: 12, color: C.muted }}>{k.client} · Sent {k.sent}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge type={k.status} label={k.status} />
              <button style={T.btnSm} onClick={e => { e.stopPropagation(); setViewModal(k) }}>View</button>
              <button style={T.btnSm} onClick={e => { e.stopPropagation(); sendContract(k) }} disabled={sending === k.id}>{sending === k.id ? 'Sending...' : 'Send'}</button>
              {k.status === 'pending' && <button style={{ ...T.btnSm, color: C.green, borderColor: C.green }} onClick={e => { e.stopPropagation(); setSignModal(k); setSignName('') }}>Sign</button>}
              {k.status === 'signed' && k.signedBy && <div style={{ fontSize: 11, color: C.muted }}>Signed by {k.signedBy} · {k.signedAt}</div>}
              <button style={{ ...T.btnGhost, color: C.faint }} onClick={e => { e.stopPropagation(); del(k.id) }}>×</button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} className="modal-wrap"
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 740, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.14)' }} className="modal-inner">
            <ContractBuilder
              client={null}
              data={data}
              onSave={k => { setData(d => ({ ...d, contracts: [...d.contracts, k] })); toast('Contract created'); setModal(false) }}
              onClose={() => setModal(false)}
            />
          </div>
        </div>
      )}
      {viewModal && (
        <Modal title={viewModal.type || 'Contract'} onClose={() => setViewModal(null)} wide footer={<><div style={{ fontSize: 12, color: C.muted }}>Sent {viewModal.sent}{viewModal.signedAt ? ` · Signed ${viewModal.signedAt}` : ''}</div><div style={{ flex: 1 }} /><button style={T.btn} onClick={() => setViewModal(null)}>Close</button></>}>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge type={viewModal.status} label={viewModal.status} />
            {viewModal.signedBy && <span style={{ fontSize: 12, color: C.muted }}>Signed by {viewModal.signedBy} · {viewModal.signedAt}</span>}
          </div>
          <div style={{ background: C.surface2, borderRadius: 10, padding: '18px 20px', fontSize: 14, lineHeight: 1.8, color: C.text, fontWeight: 300 }}>
            <ContractBody body={viewModal.body} />
          </div>
        </Modal>
      )}
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
export function Inbox({ data, setData, toast }) {
  const [activeId, setActiveId] = useState(data.messages[0]?.id || null)
  const [draft, setDraft] = useState('')
  const [newModal, setNewModal] = useState(false)
  const [nf, setNf] = useState({ to: '', body: '' })
  const active = data.messages.find(m => m.id === activeId)
  const send = () => { if (!draft.trim()) return; setData(d => ({ ...d, messages: d.messages.map(m => m.id === activeId ? { ...m, thread: [...m.thread, { id: uid(), from: 'You', text: draft, time: 'Just now', out: true }], unread: false } : m) })); setDraft(''); toast('Sent') }
  const markRead = id => setData(d => ({ ...d, messages: d.messages.map(m => m.id === id ? { ...m, unread: false } : m) }))
  const sendNew = () => { if (!nf.to.trim()) return; const nm = { id: uid(), from: nf.to, thread: [{ id: uid(), from: 'You', text: nf.body, time: 'Just now', out: true }], unread: false }; setData(d => ({ ...d, messages: [nm, ...d.messages] })); setActiveId(nm.id); setNewModal(false); setNf({ to: '', body: '' }); toast('Sent') }
  return (
    <div>
      <div style={T.pageHeader} className="page-header-wrap"><div><div style={T.pageTitle}>Inbox</div><div style={T.pageSub}>{data.messages.filter(m => m.unread).length} unread</div></div><button style={T.btnPrimary} onClick={() => setNewModal(true)}>+ Compose</button></div>
      <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', minHeight: 500 }} className="inbox-grid-wrap">
        <div style={{ borderRight: `1px solid ${C.border}`, overflowY: 'auto' }}>
          {data.messages.map(m => (
            <div key={m.id} onClick={() => { setActiveId(m.id); markRead(m.id) }} style={{ padding: '13px 16px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', background: activeId === m.id ? C.surface2 : C.surface }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ fontWeight: m.unread ? 600 : 400, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.unread && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: C.text, flexShrink: 0 }} />}
                  {m.from}
                </div>
                <span style={{ fontSize: 11, color: C.faint }}>{m.thread[m.thread.length - 1]?.time}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.thread[m.thread.length - 1]?.text}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', background: C.surface }}>
          {active ? (
            <>
              <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}` }}><div style={{ fontWeight: 500, fontSize: 14 }}>{active.from}</div></div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '18px 22px', gap: 2 }}>
                {active.thread.map(msg => <div key={msg.id} style={T.msgBubble(msg.out)}>{msg.text}<div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: msg.out ? 'right' : 'left' }}>{msg.time}</div></div>)}
              </div>
              <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
                <textarea rows={2} style={{ ...T.formInput, flex: 1, resize: 'none', background: C.surface2 }} placeholder="Reply... (Ctrl+Enter)" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }} />
                <button style={{ ...T.btnPrimary, alignSelf: 'flex-end', padding: '8px 14px' }} onClick={send}>→</button>
              </div>
            </>
          ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.faint, fontSize: 13 }}>Select a conversation</div>}
        </div>
      </div>
      {newModal && (
        <Modal title="New message" onClose={() => setNewModal(false)} footer={<><button style={T.btn} onClick={() => setNewModal(false)}>Cancel</button><button style={T.btnPrimary} onClick={sendNew}>Send</button></>}>
          <div style={T.formGroup}><label style={T.formLabel}>To</label><input style={T.formInput} list="cl4" value={nf.to} onChange={e => setNf({ ...nf, to: e.target.value })} /><datalist id="cl4">{data.clients.map(c => <option key={c.id} value={c.name} />)}</datalist></div>
          <div style={T.formGroup}><label style={T.formLabel}>Message</label><textarea style={{ ...T.formInput, resize: 'none' }} rows={5} value={nf.body} onChange={e => setNf({ ...nf, body: e.target.value })} /></div>
        </Modal>
      )}
    </div>
  )
}
