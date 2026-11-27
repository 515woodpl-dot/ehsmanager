import { useEffect, useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'

// Studio address: Settings → Business → Address, falling back to the studio's known address.
export const DEFAULT_STUDIO_ADDRESS = '515 Wood Pl, Linden NJ 07036'
let cached = null
let loading = null

function loadStudioAddress() {
  if (cached || !pibase) return Promise.resolve(cached || DEFAULT_STUDIO_ADDRESS)
  loading ||= (async () => {
    try {
      const { data: { session } } = await pibase.auth.getSession()
      const res = await fetch('/api/settings', { headers: { Authorization: `Bearer ${session?.access_token || ''}` } })
      const body = res.ok ? await res.json() : {}
      cached = body.branding?.address?.trim() || DEFAULT_STUDIO_ADDRESS
    } catch { cached = DEFAULT_STUDIO_ADDRESS }
    return cached
  })()
  return loading
}

export function studioAddressNow() { return cached || DEFAULT_STUDIO_ADDRESS }

export function useStudioAddress() {
  const [address, setAddress] = useState(studioAddressNow)
  useEffect(() => { let on = true; loadStudioAddress().then(a => { if (on) setAddress(a) }); return () => { on = false } }, [])
  return address
}

// Location picker: the studio address by default, or a different place typed in.
// `value` empty means "use the studio address" — the parent should store the
// studio address itself (see initial values), so saved records always hold a real place.
export function LocationField({ value, onChange, inputStyle = T.formInput, placeholder = 'Park, client’s home, venue…' }) {
  const studio = useStudioAddress()
  const isStudio = !value || value.trim() === studio || value.trim() === DEFAULT_STUDIO_ADDRESS
  const [other, setOther] = useState(!isStudio)
  // Fill the studio address once it has loaded, so an untouched field saves it.
  useEffect(() => { if (!other && value !== studio) onChange(studio) }, [studio, other])
  const pill = active => ({ ...T.btnSm, padding: '7px 12px', fontSize: 13, ...(active ? { background: C.text, color: '#fff', borderColor: C.text } : {}) })
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button type="button" style={pill(!other)} onClick={() => { setOther(false); onChange(studio) }}>Studio</button>
        <button type="button" style={pill(other)} onClick={() => { setOther(true); if (isStudio) onChange('') }}>Another location</button>
      </div>
      {other
        ? <input style={inputStyle} autoFocus placeholder={placeholder} value={value || ''} onChange={e => onChange(e.target.value)} />
        : <div style={{ ...inputStyle, background: C.surface2, color: C.muted }}>{studio}</div>}
    </div>
  )
}
