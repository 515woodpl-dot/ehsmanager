// The name and logo the manager shows for itself. "Local Manager" until the
// owner saves a business name or logo in Settings, then theirs everywhere,
// including the sign-in page.
import { useEffect, useState } from 'react'

export const DEFAULT_APP_NAME = 'Local Manager'
export const BRAND_CHANGED = 'ehs:brand-changed'
const CACHE_KEY = 'ehs-brand'

const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') } catch { return null } }
const writeCache = value => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)) } catch {} }

// Call after saving the business profile so every screen updates.
export const announceBrandChange = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(BRAND_CHANGED)) }

export function useBrand() {
  // `ready` stays false until the cached or fetched brand is known, so the
  // default name doesn't flash before a business's own.
  const [brand, setBrand] = useState({ name: '', logo: '', ready: false })
  useEffect(() => {
    let active = true
    const cached = readCache()
    if (cached) setBrand({ ...cached, ready: true })
    const load = () => fetch('/api/brand', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(body => { if (!active || !body) return; const next = { name: body.name || '', logo: body.logo || '' }; writeCache(next); setBrand({ ...next, ready: true }) })
      .catch(() => { if (active) setBrand(current => ({ ...current, ready: true })) })
    load()
    window.addEventListener(BRAND_CHANGED, load)
    return () => { active = false; window.removeEventListener(BRAND_CHANGED, load) }
  }, [])
  const custom = !!(brand.name || brand.logo)
  return { ...brand, custom, title: brand.name || DEFAULT_APP_NAME }
}

// Two letters for a small mark: "Acme Bakery" → "AB", default → "LM".
export const brandInitials = name => (String(name || DEFAULT_APP_NAME).trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('') || 'LM').toUpperCase()
