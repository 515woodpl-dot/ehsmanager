import { createClient } from '@supabase/supabase-js'

// PIBASE implements the PostgREST and GoTrue protocols used by this client.
const pibaseUrl = process.env.NEXT_PUBLIC_PIBASE_URL
const pibaseAnonKey = process.env.NEXT_PUBLIC_PIBASE_ANON_KEY

if (!pibaseUrl || !pibaseAnonKey) {
  console.error('[pibase] NEXT_PUBLIC_PIBASE_URL and NEXT_PUBLIC_PIBASE_ANON_KEY are required')
}

// PIBASE answers 429 when a project goes over its request rate (about 100
// a second). The request was not carried out, so it is safe to send again:
// wait a little and retry a few times instead of failing a busy moment.
async function fetchWithRetry(input, init) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(input, init)
    if (response.status !== 429 || attempt >= 4) return response
    const wait = Number(response.headers.get('retry-after')) * 1000 || 150 * 2 ** attempt + Math.random() * 100
    await new Promise(resolve => setTimeout(resolve, Math.min(wait, 2000)))
  }
}

const options = { global: { fetch: fetchWithRetry } }

export const pibase = pibaseUrl && pibaseAnonKey
  ? createClient(pibaseUrl, pibaseAnonKey, options)
  : null

export function createServiceClient() {
  const serviceKey = process.env.PIBASE_SERVICE_KEY
  if (!pibaseUrl || !serviceKey) return null
  return createClient(pibaseUrl, serviceKey, { ...options, auth: { persistSession: false, autoRefreshToken: false } })
}
