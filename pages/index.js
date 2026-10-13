import { useState, useEffect, useMemo, useRef } from 'react'
import Head from 'next/head'
import { T, C } from '../lib/tokens'
import { seed } from '../lib/data'
import { pibase } from '../lib/pibase'
import { loadUserData, syncCollections } from '../lib/db'
import { Toast } from '../components/UI'
import Projects, { CardModalExport as CardModal } from '../components/Projects'
import Clients from '../components/Clients'
import ContactFormSettings from '../components/ContactForm'
import Integrations from '../components/Integrations'
import { Dashboard, Analytics, Calendar, Invoices, Contracts, Inbox } from '../components/Pages'
import { SessionTypes, Sessions, Discounts } from '../components/BookingAdmin'

const todayLabel = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const VIEW_STORAGE_KEY = 'ehs-studio-active-view'
const VALID_VIEWS = new Set(['dashboard', 'analytics', 'projects', 'clients', 'sessiontypes', 'sessions', 'calendar', 'discounts', 'invoices', 'contracts', 'inbox', 'contactform', 'integrations'])

function getInitialView() {
  if (typeof window === 'undefined') return 'dashboard'
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('view')
  if (VALID_VIEWS.has(fromUrl)) return fromUrl
  const fromStorage = window.localStorage.getItem(VIEW_STORAGE_KEY)
  return VALID_VIEWS.has(fromStorage) ? fromStorage : 'dashboard'
}

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
    { id: 'sessiontypes', label: 'Session Types' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'discounts', label: 'Discounts' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'contracts', label: 'Contracts' },
    { id: 'inbox', label: 'Inbox', badge: unread },
    { id: 'contactform', label: 'Contact Form' },
    { id: 'integrations', label: 'Integrations' },
  ]

  const handleNav = (id) => { setActive(id); onClose() }

  return (
    <>
      {/* Mobile backdrop */}
      <div onClick={onClose} className={`mobile-backdrop${open ? ' mobile-backdrop-open' : ''}`} />
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
            backface-visibility: hidden;
            transform: translate3d(-100%, 0, 0);
            will-change: transform;
          }
          .sidebar-nav.sidebar-open {
            transform: translate3d(0, 0, 0);
            box-shadow: 4px 0 24px rgba(0,0,0,0.12);
          }
          .mobile-backdrop {
            background: rgba(17, 17, 16, 0.28);
            display: block !important;
            inset: 0;
            opacity: 0;
            pointer-events: none;
            position: fixed;
            transition: opacity 0.2s ease, visibility 0.2s ease;
            visibility: hidden;
            z-index: 25;
          }
          .mobile-backdrop.mobile-backdrop-open {
            opacity: 1;
            pointer-events: auto;
            visibility: visible;
          }
          .mobile-close-btn { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-backdrop { display: none; }
        }
      `}</style>
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────
export default function Home() {
  const [view, setView] = useState('dashboard')
  const [data, setData] = useState(seed)
  const [localReady, setLocalReady] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [calendarCardModal, setCalendarCardModal] = useState(null)
  const [user, setUser] = useState(null)
  const [dbReady, setDbReady] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [retryTick, setRetryTick] = useState(0)
  const toast = msg => setToastMsg(msg)

  useEffect(() => {
    setView(getInitialView())
    setLocalReady(true)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const setActiveView = (nextView) => {
    const safeView = VALID_VIEWS.has(nextView) ? nextView : 'dashboard'
    setView(safeView)
    if (typeof window === 'undefined') return
    window.localStorage.setItem(VIEW_STORAGE_KEY, safeView)
    const url = new URL(window.location.href)
    url.searchParams.set('view', safeView)
    window.history.replaceState({}, '', url)
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !localReady) return
    window.localStorage.setItem(VIEW_STORAGE_KEY, view)
    const url = new URL(window.location.href)
    if (url.searchParams.get('view') !== view) {
      url.searchParams.set('view', view)
      window.history.replaceState({}, '', url)
    }
  }, [view, localReady])

  // ── Auth + initial DB load ──────────────────────────────────────
  useEffect(() => {
    if (!pibase) { setDbReady(false); setLoadError('PIBASE is not configured. Set NEXT_PUBLIC_PIBASE_URL and NEXT_PUBLIC_PIBASE_ANON_KEY.'); return }

    let loadGeneration = 0

    const loadSession = async session => {
      const generation = ++loadGeneration
      if (!session) { setUser(null); setDbReady(false); setData(seed); setAuthChecked(true); return }
      setUser(session.user)
      try {
        const dbData = await loadUserData(session.user.id)
        if (generation !== loadGeneration) return
        setData(dbData)
        setLoadError('')
        setDbReady(true)
      } catch (error) {
        if (generation !== loadGeneration) return
        console.error('[db] initial load', error)
        setLoadError(error.message)
        setDbReady(false)
      }
      setAuthChecked(true)
    }

    pibase.auth.getSession().then(({ data: { session } }) => loadSession(session))

    const { data: { subscription } } = pibase.auth.onAuthStateChange((event, session) => {
      // The auth client holds a lock during this callback. Database queries
      // must run after it returns, or session lookup can deadlock.
      if (event === 'SIGNED_IN' && session) setTimeout(() => loadSession(session), 0)
      if (event === 'SIGNED_OUT') setTimeout(() => loadSession(null), 0)
    })
    return () => { ++loadGeneration; subscription.unsubscribe() }
  }, [])

  // ── Collection sync engine ─────────────────────────────────────
  // Diffs current data vs last-synced snapshot and persists adds,
  // edits, and deletes to PIBASE. Debounced to batch rapid changes.
  const snapshotRef = useRef(null)
  const syncPromiseRef = useRef(Promise.resolve())
  const syncUserRef = useRef(null)
  const latestDataRef = useRef(data)
  const retryTimerRef = useRef(null)
  latestDataRef.current = data
  useEffect(() => {
    if (!dbReady || !user) {
      snapshotRef.current = null
      syncUserRef.current = null
      clearTimeout(retryTimerRef.current)
      return
    }
    syncUserRef.current = user.id
    if (snapshotRef.current === null) {
      // First run after DB load — take the baseline, don't sync
      snapshotRef.current = data
      setSaveStatus('saved')
      return
    }
    if (JSON.stringify(snapshotRef.current) === JSON.stringify(data)) return
    setSaveStatus('saving')
    const timer = setTimeout(() => {
      syncPromiseRef.current = syncPromiseRef.current.then(async () => {
        if (syncUserRef.current !== user.id || !snapshotRef.current) return
        await syncCollections(user.id, snapshotRef.current, data)
        snapshotRef.current = data
        if (JSON.stringify(latestDataRef.current) === JSON.stringify(data)) setSaveStatus('saved')
      }).catch(error => {
        console.error('[sync]', error)
        if (syncUserRef.current !== user.id) return
        setSaveStatus('retrying')
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = setTimeout(() => setRetryTick(tick => tick + 1), 3000)
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [data, dbReady, user?.id, retryTick])

  useEffect(() => {
    if (!pibase) return
    const warnOnExit = event => {
      if (!dbReady || !snapshotRef.current || JSON.stringify(snapshotRef.current) === JSON.stringify(latestDataRef.current)) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnOnExit)
    return () => window.removeEventListener('beforeunload', warnOnExit)
  }, [dbReady])

  const handleSignOut = async () => {
    if (saveStatus !== 'saved' && !window.confirm('Changes are still saving. Sign out anyway?')) return
    if (pibase) await pibase.auth.signOut()
  }

  if (!dbReady) {
    return <main style={{ maxWidth: 520, margin: '12vh auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>EHS Studio Manager</h1>
      <p>{loadError || (authChecked ? 'Sign in to access your studio data.' : 'Loading studio data...')}</p>
      {authChecked && <a href="/login">Go to sign in</a>}
    </main>
  }

  const props = { data, setData, toast, setView: setActiveView }
  const unread = data.messages.filter(m => m.unread).length

  const pageTitles = {
    dashboard: ['Dashboard', todayLabel()],
    analytics: ['Analytics', 'Business overview'],
  }

  const views = {
    dashboard: <Dashboard {...props} openClientCard={c => setCalendarCardModal(c)} />,
    analytics: <Analytics {...props} />,
    projects: <Projects {...props} />,
    clients: <Clients {...props} sessionTypes={data.sessionTypes} />,
    sessiontypes: <SessionTypes {...props} />,
    sessions: <Sessions {...props} />,
    calendar: <Calendar {...props} openClientCard={c => setCalendarCardModal(c)} />,
    discounts: <Discounts {...props} />,
    invoices: <Invoices {...props} />,
    contracts: <Contracts {...props} />,
    inbox: <Inbox {...props} />,
    contactform: <ContactFormSettings {...props} />,
    integrations: <Integrations {...props} />,
  }

  return (
    <>
      <Head>
        <title>EHS Studio Manager</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&family=Figtree:wght@400;500;600&family=Mrs+Saint+Delafield&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>📷</text></svg>" />
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
        <Sidebar active={view} setActive={setActiveView} unread={unread} open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onSignOut={handleSignOut} />

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
            <GlobalSearch data={data} setView={setActiveView} />
            {pibase && <span role="status" style={{ fontSize: 12, color: saveStatus === 'retrying' ? '#991F1F' : C.muted, whiteSpace: 'nowrap' }}>
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'retrying' ? 'Save failed · retrying' : 'Saving…'}
            </span>}
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
