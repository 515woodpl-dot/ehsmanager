import { useEffect, useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'

function IntegrationCard({ name, description, configured, variables }) {
  return <article style={T.card} className="integration-card">
    <div className="integration-card-head"><div><h2>{name}</h2><p>{description}</p></div><span className={configured ? 'integration-ready' : 'integration-missing'}>{configured ? 'Connected' : 'Setup required'}</span></div>
    <div className="integration-vars">{variables.map(variable => <code key={variable}>{variable}</code>)}</div>
    <p className="integration-note">Keys are read from the server environment and are never stored in the browser or PIBASE.</p>
  </article>
}

export default function Settings() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    pibase.auth.getSession().then(({ data: { session } }) => fetch('/api/integration-status', { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }))
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to load integration status'); if (active) setStatus(body) })
      .catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [])
  return <div>
    <div style={T.pageHeader} className="page-header-wrap"><div><div style={T.pageTitle}>Settings</div><div style={T.pageSub}>Secure server integrations and booking configuration</div></div></div>
    {error && <div className="settings-error">{error}</div>}
    {!status && !error ? <div style={T.card}>Checking integrations…</div> : status && <div className="integration-grid">
      <IntegrationCard name="PIBASE" description="Client data, authentication, bookings, invoices and contracts." configured={status.pibase} variables={['NEXT_PUBLIC_PIBASE_URL', 'NEXT_PUBLIC_PIBASE_ANON_KEY', 'PIBASE_SERVICE_KEY']} />
      <IntegrationCard name="Resend" description="Contract, invoice and session reminder email delivery." configured={status.resend} variables={['RESEND_API_KEY']} />
      <IntegrationCard name="Stripe" description="Online payment intents and payment webhook confirmation." configured={status.stripe} variables={['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']} />
    </div>}
  </div>
}
