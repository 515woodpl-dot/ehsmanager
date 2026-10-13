import { createClient } from '@supabase/supabase-js'

// PiBase exposes the Supabase wire protocol. PiBase variables take priority;
// the legacy names are retained only so existing deployments can migrate
// without a code change.
const supabaseUrl  = process.env.NEXT_PUBLIC_PIBASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnon = process.env.NEXT_PUBLIC_PIBASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const usingPiBase = Boolean(process.env.NEXT_PUBLIC_PIBASE_URL)

if (!supabaseUrl || !supabaseAnon) {
  console.warn('[pibase] Missing PiBase URL/key — running in localStorage fallback mode')
} else if (!usingPiBase) {
  console.warn('[pibase] PiBase URL is not configured; using legacy database env vars')
}

export const supabase = supabaseUrl && supabaseAnon
  ? createClient(supabaseUrl, supabaseAnon)
  : null

// Server-side only (API routes)
export function createServiceClient() {
  const serviceKey = process.env.PIBASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey)
}
