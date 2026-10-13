export const C = {
  bg: '#FFFFFF', surface: '#FFFFFF', surface2: '#F8F8F7', surface3: '#F1F1EF',
  border: '#EAEAEA', border2: '#DDDCDA',
  text: '#111110', muted: '#7F7E7C', faint: '#B0AFAD',
  green: '#1A6B3C', greenBg: '#EAF4EE',
  amber: '#7A5200', amberBg: '#FBF2DC',
  red: '#991F1F', redBg: '#FDECEA',
  blue: '#1A3D9E', blueBg: '#EDF1FB',
  purple: '#4C3594', purpleBg: '#F0ECFB',
}

export const badge = (type) => {
  const map = {
    inquiry: [C.purpleBg, C.purple], booked: [C.blueBg, C.blue],
    postpro: [C.amberBg, C.amber], done: [C.greenBg, C.green],
    paid: [C.greenBg, C.green], partial: [C.amberBg, C.amber],
    unpaid: [C.redBg, C.red], signed: [C.greenBg, C.green],
    pending: [C.amberBg, C.amber], confirmed: [C.greenBg, C.green],
    lead: [C.purpleBg, C.purple], client: [C.blueBg, C.blue], other: [C.surface3, C.muted],
  }
  const [bg, color] = map[type?.toLowerCase()] || [C.surface3, C.muted]
  return { display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: bg, color, whiteSpace: 'nowrap', letterSpacing: '0.01em' }
}

export const T = {
  // Layout
  layout: { display: 'flex', minHeight: '100vh', background: C.bg },
  sidebar: { width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20 },
  main: { marginLeft: 220, flex: 1, padding: '36px 44px', minHeight: '100vh' },
  // Typography
  pageTitle: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, fontWeight: 400, letterSpacing: '-0.4px', color: C.text, lineHeight: 1.1 },
  pageSub: { fontSize: 13, color: C.muted, marginTop: 4, fontWeight: 300 },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 },
  sectionTitle: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 15, fontWeight: 400, color: C.text, marginBottom: 12 },
  // Cards
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 26px', boxShadow: '0 10px 32px rgba(30,24,20,0.07)' },
  cardSm: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', boxShadow: '0 6px 20px rgba(30,24,20,0.06)' },
  // Metrics
  metricStrip: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 28 },
  metricCell: (last) => ({ background: C.surface, padding: '20px 24px', borderRight: last ? 'none' : `1px solid ${C.border}` }),
  metricLabel: { fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 8, letterSpacing: '0.03em', textTransform: 'uppercase' },
  metricValue: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, fontWeight: 400, letterSpacing: '-0.6px', color: C.text },
  metricSub: { fontSize: 11, color: C.faint, marginTop: 5 },
  // Rows
  dataRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${C.border}` },
  // Avatar
  avatar: (size = 36) => ({ width: size, height: size, borderRadius: '50%', background: C.surface3, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: Math.max(10, size * 0.33), flexShrink: 0 }),
  // Buttons
  btn: { padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border2}`, background: C.surface, color: C.text, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', letterSpacing: '-0.1px', whiteSpace: 'nowrap' },
  btnPrimary: { padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.text}`, background: C.text, color: '#fff', fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', letterSpacing: '-0.1px', whiteSpace: 'nowrap' },
  btnSm: { padding: '5px 11px', borderRadius: 6, border: `1px solid ${C.border2}`, background: C.surface, color: C.text, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnGhost: { padding: '4px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer' },
  btnDanger: { padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.red}`, background: C.redBg, color: C.red, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  // Forms
  formGroup: { marginBottom: 16 },
  formLabel: { display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 },
  formInput: { width: '100%', padding: '9px 12px', border: `1px solid ${C.border2}`, borderRadius: 8, background: C.surface, color: C.text, outline: 'none', fontFamily: 'inherit', fontSize: 14, transition: 'border-color 0.15s' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(24,20,18,0.38)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: C.surface, borderRadius: 16, padding: 30, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 21, fontWeight: 400, letterSpacing: '-0.3px', color: C.text },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.border}` },
  // Toast
  toast: { position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: C.text, color: '#fff', padding: '10px 22px', borderRadius: 100, fontSize: 13, fontWeight: 500, zIndex: 300, boxShadow: '0 8px 30px rgba(0,0,0,0.16)', whiteSpace: 'nowrap' },
  // Nav
  navSection: { fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, padding: '18px 22px 6px' },
  navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', margin: '1px 8px', borderRadius: 8, color: active ? C.text : C.muted, fontWeight: active ? 500 : 400, fontSize: 13.5, background: active ? C.surface3 : 'transparent', cursor: 'pointer', transition: 'all 0.1s' }),
  navBadge: { marginLeft: 'auto', background: C.text, color: '#fff', fontSize: 10, fontWeight: 500, borderRadius: 20, padding: '1px 6px', minWidth: 16, textAlign: 'center' },
  // Inbox
  msgBubble: (out) => ({ padding: '10px 14px', borderRadius: 12, maxWidth: '72%', fontSize: 13.5, lineHeight: 1.55, marginBottom: 6, alignSelf: out ? 'flex-end' : 'flex-start', background: out ? C.text : C.surface2, color: out ? '#fff' : C.text, borderBottomRightRadius: out ? 3 : 12, borderBottomLeftRadius: out ? 12 : 3 }),
  // Progress
  progress: { height: 3, background: C.surface3, borderRadius: 2, overflow: 'hidden', marginTop: 8 },
}
