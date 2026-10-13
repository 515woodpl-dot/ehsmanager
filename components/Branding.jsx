import { useEffect, useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'
import SignaturePad from './SignaturePad'

async function call(method, body) {
  const { data: { session } } = await pibase.auth.getSession()
  const url = method === 'DELETE' ? `/api/branding?kind=${encodeURIComponent(body.kind)}` : '/api/branding'
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: method === 'PUT' ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Request failed')
  return payload
}

// Shared branding state so contract previews elsewhere in the admin show the
// studio signature without each fetching it.
let cache = null
let pending = null
const listeners = new Set()
const publish = next => { cache = next; listeners.forEach(listener => listener(next)) }
const load = () => pending || (pending = call('GET').then(publish).catch(error => { pending = null; throw error }))

export function useBranding() {
  const [state, setState] = useState(cache)
  useEffect(() => {
    listeners.add(setState)
    if (!cache) load().catch(() => {})
    return () => listeners.delete(setState)
  }, [])
  return state
}

// Downscale in the browser so uploads stay small and the server limits hold.
async function resizeImage(file, { maxSize, type, budget }) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const size = dataUrl => Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4)
  let dataUrl = canvas.toDataURL(type, 0.85)
  for (let quality = 0.75; size(dataUrl) > budget && quality > 0.4; quality -= 0.1) dataUrl = canvas.toDataURL('image/webp', quality)
  return dataUrl
}

const UPLOADS = {
  logo: { title: 'Logo', hint: 'Shown in a rounded square above your studio name. Square images work best.', maxSize: 512, type: 'image/png', budget: 380 * 1024 },
  cover: { title: 'Contract cover photo', hint: 'The wide banner at the top of every contract your clients open. Landscape photos work best.', maxSize: 2000, type: 'image/jpeg', budget: 1900 * 1024 },
}

function ImageCard({ kind, asset, busy, onUpload, onRemove }) {
  const spec = UPLOADS[kind]
  return (
    <div style={{ ...T.card, marginBottom: 20 }}>
      <div style={T.sectionTitle}>{spec.title}</div>
      <p style={{ fontSize: 13, color: C.muted, margin: '-6px 0 16px' }}>{spec.hint}</p>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: kind === 'cover' ? 260 : 96, height: 96, borderRadius: kind === 'cover' ? 8 : 18, background: C.surface2, border: `1px solid ${C.border}`, overflow: 'hidden', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {asset ? <img src={asset.url} alt={`${spec.title} preview`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, color: C.faint }}>None yet</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ ...T.btnPrimary, opacity: busy ? 0.6 : 1 }}>
            {busy === 'save' ? 'Uploading…' : asset ? 'Replace' : 'Upload'}
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={!!busy}
              onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(file) }} />
          </label>
          {asset && <button style={{ ...T.btnGhost, color: C.red }} onClick={onRemove} disabled={!!busy}>Remove</button>}
        </div>
      </div>
    </div>
  )
}

export default function Branding({ toast }) {
  const branding = useBranding()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState({})
  const [drawn, setDrawn] = useState('')
  const [padKey, setPadKey] = useState(0)

  useEffect(() => { if (!cache) load().catch(err => setError(err.message)) }, [])

  const run = async (kind, fn, message) => {
    setBusy(b => ({ ...b, [kind]: 'save' }))
    setError('')
    let ok = false
    try { publish(await fn()); toast(message); ok = true } catch (err) { setError(err.message) }
    setBusy(b => ({ ...b, [kind]: null }))
    return ok
  }
  const upload = (kind, file) => run(kind, async () => call('PUT', { kind, dataUrl: await resizeImage(file, UPLOADS[kind]) }), `${UPLOADS[kind].title} saved`)
  const remove = kind => { if (confirm('Remove this image?')) run(kind, () => call('DELETE', { kind }), 'Removed') }
  const saveSignature = () => {
    if (!drawn) { setError('Draw your signature first.'); return }
    run('signature', () => call('PUT', { kind: 'signature', dataUrl: drawn }), 'Signature saved').then(ok => { if (ok) { setDrawn(''); setPadKey(k => k + 1) } })
  }

  return (
    <div>
      <div style={T.pageHeader} className="page-header-wrap">
        <div>
          <div style={T.pageTitle}>Branding</div>
          <div style={T.pageSub}>Your logo, cover photo and signature appear on the contracts clients review and sign.</div>
        </div>
      </div>
      {error && <div role="alert" style={{ background: C.redBg, color: C.red, borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {!branding && !error && <div style={T.pageSub}>Loading…</div>}
      {branding && <>
        <ImageCard kind="logo" asset={branding.logo} busy={busy.logo} onUpload={file => upload('logo', file)} onRemove={() => remove('logo')} />
        <ImageCard kind="cover" asset={branding.cover} busy={busy.cover} onUpload={file => upload('cover', file)} onRemove={() => remove('cover')} />
        <div style={{ ...T.card, marginBottom: 20 }}>
          <div style={T.sectionTitle}>Your signature</div>
          <p style={{ fontSize: 13, color: C.muted, margin: '-6px 0 16px' }}>Draw it once. It is added as the studio signature on every contract, dated with the contract's issue date.</p>
          {branding.signature && (
            <div style={{ marginBottom: 16 }}>
              <div style={T.formLabel}>Current signature</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
                <img src={branding.signature.url} alt="Current studio signature" style={{ maxHeight: 72, maxWidth: 280, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }} />
                <button style={{ ...T.btnGhost, color: C.red }} onClick={() => remove('signature')} disabled={!!busy.signature}>Remove</button>
              </div>
            </div>
          )}
          <div style={T.formLabel}>{branding.signature ? 'Draw a new signature' : 'Draw your signature'}</div>
          <SignaturePad key={padKey} onChange={setDrawn} disabled={!!busy.signature} />
          <div style={{ marginTop: 12 }}>
            <button style={T.btnPrimary} onClick={saveSignature} disabled={!!busy.signature || !drawn}>{busy.signature ? 'Saving…' : 'Save signature'}</button>
          </div>
        </div>
      </>}
    </div>
  )
}
