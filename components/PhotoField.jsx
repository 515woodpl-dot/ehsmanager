import { useRef, useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'

// Shrinks a photo in the browser (longest side 1800px, JPEG) before upload,
// so phone photos of 5–10 MB become ~300 KB and load fast for clients. It
// steps quality down if needed to stay under the server's 1 MB upload limit.
const LIMIT = 950 * 1024
async function resizeToJpeg(file, max = 1800) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('That file is not a photo')); i.src = url })
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.86, 0.8, 0.72, 0.62, 0.5]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= LIMIT) return blob
    }
    throw new Error('That photo is too detailed to upload — try a smaller version')
  } finally { URL.revokeObjectURL(url) }
}

export function PhotoField({ value, onChange, toast }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const upload = async file => {
    if (!file) return
    setBusy(true)
    try {
      const blob = await resizeToJpeg(file)
      const { data: { session } } = await pibase.auth.getSession()
      const r = await fetch('/api/media-upload', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${session?.access_token || ''}` }, body: blob })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'Upload failed')
      onChange(body.url); toast?.('Photo uploaded')
    } catch (error) { toast?.(error.message) }
    setBusy(false)
    if (input.current) input.current.value = ''
  }
  return (
    <div className="photo-field">
      <div className="photo-field-preview" onClick={() => !busy && input.current?.click()} role="button" tabIndex={0} aria-label={value ? 'Replace photo' : 'Upload photo'}>
        {value ? <img src={value} alt="" /> : <span>{busy ? 'Uploading…' : '+ Add a photo'}</span>}
        {busy && value && <div className="photo-field-busy">Uploading…</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button type="button" style={T.btnSm} disabled={busy} onClick={() => input.current?.click()}>{value ? 'Replace photo' : 'Upload photo'}</button>
        {value && <button type="button" style={{ ...T.btnSm, color: C.red }} disabled={busy} onClick={() => onChange('')}>Remove</button>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" hidden onChange={e => upload(e.target.files?.[0])} />
    </div>
  )
}
