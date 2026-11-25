import { useEffect, useState } from 'react'
import { T, C } from '../lib/tokens'

export function Toast({ msg, onDone }) {
  useEffect(() => { const id = setTimeout(onDone, 2600); return () => clearTimeout(id) }, [])
  return <div style={T.toast}>✓ {msg}</div>
}

export function Modal({ title, onClose, children, footer, wide, extraWide }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', h)
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = previous }
  }, [])
  return (
    <div style={T.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-inner" role="dialog" aria-modal="true" aria-label={title} style={{ ...T.modal, maxWidth: extraWide ? 900 : wide ? 640 : 520 }}>
        <div style={T.modalHeader}>
          <div style={T.modalTitle}>{title}</div>
          <button onClick={onClose} style={{ ...T.btnGhost, fontSize: 20, lineHeight: 1, padding: '2px 6px', color: C.muted }}>×</button>
        </div>
        {children}
        {footer && <div style={T.modalFooter}>{footer}</div>}
      </div>
    </div>
  )
}

// ── Styled replacements for window.confirm / window.alert ─────────
// askConfirm(message, opts) → Promise<boolean>; notify(message) → Promise<void>.
// <DialogHost /> (mounted once in _app) renders them with ConfirmModal.
let pushDialog = null
const openDialog = d => new Promise(resolve => {
  if (!pushDialog) { resolve(d.alert ? undefined : window.confirm(d.message)); return }
  pushDialog({ ...d, resolve })
})
export const askConfirm = (message, { title, confirmLabel, danger } = {}) => {
  const isDelete = /^(delete|remove)\b/i.test(message)
  return openDialog({ message, title: title || (isDelete ? 'Are you sure?' : 'Please confirm'), confirmLabel: confirmLabel || (isDelete ? 'Delete' : 'Continue'), danger: danger ?? isDelete })
}
export const notify = (message, title = 'Heads up') => openDialog({ message, title, alert: true })

export function DialogHost() {
  const [dialog, setDialog] = useState(null)
  useEffect(() => { pushDialog = setDialog; return () => { pushDialog = null } }, [])
  if (!dialog) return null
  const close = value => { dialog.resolve(value); setDialog(null) }
  if (dialog.alert) return <Modal title={dialog.title} onClose={() => close()} footer={<button style={T.btnPrimary} onClick={() => close()}>OK</button>}>
    <div className="brand-confirm"><div className="brand-confirm-mark">EH</div><div><p style={{ marginTop: 0 }}>{dialog.message}</p></div></div>
  </Modal>
  return <ConfirmModal title={dialog.title} message={dialog.message} confirmLabel={dialog.confirmLabel} danger={dialog.danger} onConfirm={() => close(true)} onClose={() => close(false)} />
}

export function ConfirmModal({ title, message, confirmLabel = 'Confirm', onConfirm, onClose, danger = false }) {
  return <Modal title={title} onClose={onClose} footer={<>
    <button style={T.btn} onClick={onClose}>Keep it</button>
    <button style={danger ? T.btnDanger : T.btnPrimary} onClick={onConfirm}>{confirmLabel}</button>
  </>}>
    <div className="brand-confirm">
      <div className="brand-confirm-mark">EH</div>
      <div><strong>{title}</strong><p>{message}</p></div>
    </div>
  </Modal>
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg-control" style={{ display: 'inline-flex', background: C.surface2, borderRadius: 8, padding: 3, gap: 2 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: value === o.value ? C.surface : 'transparent', color: C.text, fontWeight: value === o.value ? 500 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({ type, label }) {
  const map = {
    inquiry: [C.purpleBg, C.purple], booked: [C.blueBg, C.blue],
    postpro: [C.amberBg, C.amber], 'post-production': [C.amberBg, C.amber],
    done: [C.greenBg, C.green], paid: [C.greenBg, C.green],
    partial: [C.amberBg, C.amber], unpaid: [C.redBg, C.red],
    signed: [C.greenBg, C.green], pending: [C.amberBg, C.amber],
    confirmed: [C.greenBg, C.green], lead: [C.purpleBg, C.purple],
    client: [C.blueBg, C.blue], other: [C.surface3, C.muted],
  }
  const key = (type || '').toLowerCase().replace(/\s/g, '-')
  const [bg, color] = map[key] || [C.surface3, C.muted]
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: bg, color, whiteSpace: 'nowrap' }}>{label || type}</span>
}

export function Avatar({ name, size = 36 }) {
  const initials = name ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'
  return <div style={T.avatar(size)}>{initials}</div>
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.faint, fontSize: 14, pointerEvents: 'none' }}>⌕</span>
      <input
        style={{ ...T.formInput, paddingLeft: 32, paddingRight: value ? 32 : 12, background: C.surface2 }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button onClick={() => onChange('')}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.faint, fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
      )}
    </div>
  )
}

export function Divider({ margin = '20px 0' }) {
  return <div style={{ height: 1, background: C.border, margin }} />
}
