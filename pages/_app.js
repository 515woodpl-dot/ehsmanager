import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import { supabase } from '../lib/supabase'

const PUBLIC_ROUTES = ['/login', '/contact', '/booking']

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [ready, setReady] = useState(!supabase) // if no supabase, skip auth check

  useEffect(() => {
    if (!supabase) return

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const isPublic = PUBLIC_ROUTES.some(r => router.pathname.startsWith(r))
      if (!session && !isPublic) {
        router.push('/login')
      } else {
        setReady(true)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isPublic = PUBLIC_ROUTES.some(r => router.pathname.startsWith(r))
      if (event === 'SIGNED_OUT' && !isPublic) {
        router.push('/login')
      }
      if (event === 'SIGNED_IN') {
        setReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return null  // avoid flash of unauthenticated content

  return <Component {...pageProps} />
}
