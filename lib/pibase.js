import { createClient } from '@supabase/supabase-js'

// PIBASE implements the PostgREST and GoTrue protocols used by this client.
const pibaseUrl = process.env.NEXT_PUBLIC_PIBASE_URL
const pibaseAnonKey = process.env.NEXT_PUBLIC_PIBASE_ANON_KEY

if (!pibaseUrl || !pibaseAnonKey) {
  console.error('[pibase] NEXT_PUBLIC_PIBASE_URL and NEXT_PUBLIC_PIBASE_ANON_KEY are required')
}

export const pibase = pibaseUrl && pibaseAnonKey
  ? createClient(pibaseUrl, pibaseAnonKey)
  : null

export function createServiceClient() {
  const serviceKey = process.env.PIBASE_SERVICE_KEY
  if (!pibaseUrl || !serviceKey) return null
  return createClient(pibaseUrl, serviceKey)
}
