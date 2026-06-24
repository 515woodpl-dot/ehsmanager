import { useState, useEffect, useMemo, useRef } from 'react'
import Head from 'next/head'
import { T, C } from '../lib/tokens'
import { loadData, seed, STORAGE_KEY } from '../lib/data'
import { supabase } from '../lib/supabase'
import { loadUserData, saveSettings, upsertClient, deleteClient, upsertInvoice, deleteInvoice, upsertBooking, deleteBooking, upsertContract, deleteContract, upsertMessage } from '../lib/db'
import { Toast } from '../components/UI'
import Projects, { CardModalExport as CardModal } from '../components/Projects'
import Clients from '../components/Clients'
import ContactFormSettings from '../components/ContactForm'
import { Dashboard, Analytics, Calendar, Invoices, Contracts, Inbox } from '../components/Pages'

const todayLabel = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

// ── Global search ─────────────────────────────────────────────────
function GlobalSearch({ data, setView }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const results = useMemo(() => {
    if (!q.trim()) return []
    const lo = q.toLowerCase(); const r = []
    data.clients.filter(c => !c.archived).forEach(c => { if (c.name.toLowerCase().includes(lo) || (c.email || '').toLowerCase().includes(lo)) r.push({ cat: 'Client', label: c.name, sub: `${c.type} · ${c.email || ''}`, view: 'clients' }) })
    data.invoices.forEach(i => { if (i.client.toLowerCase().includes(lo) || i.id.toLowerCase().includes(lo)) r.push({ cat: 'Invoice', label: `${i.id} · ${i.client}`, sub: '$' + i.amount.toLocaleString(), view: 'invoices' }) })
    data.bookings.forEach(b => { if (b.client.toLowerCase().includes(lo)) r.push({ cat: 'Booking', label: b.client, sub: b.date + ' · ' + b.location, view: 'calendar' }) })
    return r.slice(0, 7)
  }, [q, data])
  return (
    <div style={{ flex: 1, position: 'relative' }} ref={ref}>
      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.faint, fontSize: 14, pointerEvents: 'none' }}>⌕</span>
      <input
        style={{ ...T.formInput, paddingLeft: 32, paddingRight: q ? 32 : 12, background: C.surface2, fontSize: 13.5 }}
        placeholder="Search clients, invoices, bookings..."
        value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
      />
      {q && (
        <button onClick={() => { setQ(''); setOpen(false) }}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.faint, fontSize: 16, lineHeight: 1 }}>×</button>
      )}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
          {results.map((r, i) => (
            <div key={i} onClick={() => { setView(r.view); setOpen(false); setQ('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface2}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.faint, fontWeight: 600, marginBottom: 1 }}>{r.cat}</div>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{r.sub}</div>
              </div>
              <span style={{ color: C.faint }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({ active, setActive, unread, open, onClose, user, onSignOut }) {
  const nav1 = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'projects', label: 'Projects' },
    { id: 'clients', label: 'Clients' },
  ]
  const nav2 = [
    { id: 'calendar', label: 'Calendar' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'contracts', label: 'Contracts' },
    { id: 'inbox', label: 'Inbox', badge: unread },
    { id: 'contactform', label: 'Contact Form' },
  ]

  const handleNav = (id) => { setActive(id); onClose() }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 25, display: 'none' }} className="mobile-backdrop" />
      )}
      <div style={{
        width: 220,
        background: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 30,
        transition: 'transform 0.25s ease',
      }}
        className={`sidebar-nav${open ? ' sidebar-open' : ''}`}
      >
        {/* Logo */}
        <div style={{ padding: '24px 22px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, color: C.text, letterSpacing: '-0.2px', lineHeight: 1.2 }}>EHS Studio</div>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, color: C.text, letterSpacing: '-0.2px' }}>Manager</div>
            <div style={{ fontSize: 10, color: C.faint, marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Photography CRM</div>
          </div>
          {/* Mobile close button */}
          <button onClick={onClose} className="mobile-close-btn" style={{ display: 'none', background: 'none', border: 'none', fontSize: 20, color: C.muted, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        <div style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          <div style={T.navSection}>Overview</div>
          {nav1.map(n => (
            <div key={n.id} style={T.navItem(active === n.id)} onClick={() => handleNav(n.id)}
              onMouseEnter={e => { if (active !== n.id) e.currentTarget.style.background = C.surface2 }}
              onMouseLeave={e => { if (active !== n.id) e.currentTarget.style.background = 'transparent' }}>
              {n.label}
            </div>
          ))}
          <div style={T.navSection}>Workflow</div>
          {nav2.map(n => (
            <div key={n.id} style={T.navItem(active === n.id)} onClick={() => handleNav(n.id)}
              onMouseEnter={e => { if (active !== n.id) e.currentTarget.style.background = C.surface2 }}
              onMouseLeave={e => { if (active !== n.id) e.currentTarget.style.background = 'transparent' }}>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge > 0 && <span style={T.navBadge}>{n.badge}</span>}
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.text, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
              {user ? user.email.slice(0,2).toUpperCase() : 'EH'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user ? user.email : 'Ellie Heartstrings'}</div>
              <button onClick={onSignOut} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: C.faint, cursor: 'pointer', fontFamily: 'inherit' }}>Sign out</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-nav {
            transform: translateX(-100%);
          }
          .sidebar-nav.sidebar-open {
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0,0,0,0.12);
          }
          .mobile-backdrop { display: block !important; }
          .mobile-close-btn { display: block !important; }
        }
      `}</style>
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────
export default function Home() {
  const [view, setView] = useState('dashboard')
  const [data, setData] = useState(loadData)
  const [toastMsg, setToastMsg] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [calendarCardModal, setCalendarCardModal] = useState(null)
  const [user, setUser] = useState(null)
  const [dbReady, setDbReady] = useState(false)
  const toast = msg => setToastMsg(msg)

  // ── Auth + initial DB load ──────────────────────────────────────
  useEffect(() => {
    if (!supabase) { setDbReady(false); return }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setUser(session.user)
      const dbData = await loadUserData(session.user.id)
      if (dbData) { setData(d => ({ ...d, ...dbData })); setDbReady(true) }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        const dbData = await loadUserData(session.user.id)
        if (dbData) { setData(d => ({ ...d, ...dbData })); setDbReady(true) }
      }
      if (event === 'SIGNED_OUT') { setUser(null); setDbReady(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── localStorage fallback (when no Supabase) ───────────────────
  useEffect(() => {
    if (dbReady) return  // DB is active — don't also write localStorage
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch (e) {}
  }, [data, dbReady])

  // ── Settings sync ──────────────────────────────────────────────
  useEffect(() => {
    if (!dbReady || !user) return
    saveSettings(user.id, { stages: data.stages, sessionTypes: data.sessionTypes, formSettings: data.formSettings })
  }, [data.stages, data.sessionTypes, data.formSettings, dbReady, user])

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  const props = { data, setData, toast, setView }
  const unread = data.messages.filter(m => m.unread).length

  const pageTitles = {
    dashboard: ['Dashboard', todayLabel()],
    analytics: ['Analytics', 'Business overview'],
  }

  const views = {
    dashboard: <Dashboard {...props} />,
    analytics: <Analytics {...props} />,
    projects: <Projects {...props} />,
    clients: <Clients {...props} sessionTypes={data.sessionTypes} />,
    calendar: <Calendar {...props} openClientCard={c => setCalendarCardModal(c)} />,
    invoices: <Invoices {...props} />,
    contracts: <Contracts {...props} />,
    inbox: <Inbox {...props} />,
    contactform: <ContactFormSettings {...props} />,
  }

  return (
    <>
      <Head>
        <title>EHS Studio Manager</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>📷</text></svg>" />
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
        <Sidebar active={view} setActive={setView} unread={unread} open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onSignOut={handleSignOut} />

        <div className="layout-main" style={{ marginLeft: 220, flex: 1, padding: '36px 44px', minHeight: '100vh' }}>
          {/* Topbar */}
          <div className="topbar-wrap" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            {/* Hamburger — mobile only */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', fontSize: 20, color: C.text, lineHeight: 1, flexShrink: 0 }}
            >
              ☰
            </button>
            <GlobalSearch data={data} setView={setView} />
          </div>

          {/* Page title */}
          {pageTitles[view] && (
            <div className="page-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
              <div>
                <div className="page-title-text" style={T.pageTitle}>{pageTitles[view][0]}</div>
                <div style={T.pageSub}>{pageTitles[view][1]}</div>
              </div>
            </div>
          )}

          {views[view] || views.dashboard}
        </div>

        {toastMsg && <Toast msg={toastMsg} onDone={() => setToastMsg(null)} />}
        {calendarCardModal && <CardModal client={calendarCardModal} stages={data.stages || []} sessionTypes={data.sessionTypes || []} data={data} setData={setData} onClose={() => setCalendarCardModal(null)} toast={toast} />}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hamburger-btn { display: block !important; }
          .layout-main {
            margin-left: 0 !important;
            padding: 16px !important;
            padding-top: 72px !important;
          }
          .topbar-wrap {
            position: fixed !important;
            top: 0; left: 0; right: 0;
            background: #fff;
            border-bottom: 1px solid #EAEAEA;
            padding: 12px 16px !important;
            margin-bottom: 0 !important;
            z-index: 15;
          }
        }
      `}</style>
    </>
  )
}
