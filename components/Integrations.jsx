import { useEffect, useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'

async function call(method, body) {
  const { data: { session } } = await pibase.auth.getSession()
  const url = method === 'DELETE' ? `/api/integrations?provider=${encodeURIComponent(body.provider)}` : '/api/integrations'
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Request failed')
  return payload
}

const fmtUpdated = iso => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''

function StatusPill({ ok, label }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: ok ? C.greenBg : C.surface3, color: ok ? C.green : C.muted }}>{label}</span>
}

function Notice({ tone = 'amber', children }) {
  const [bg, color] = tone === 'red' ? [C.redBg, C.red] : [C.amberBg, C.amber]
  return <div role="alert" style={{ background: bg, color, borderRadius: 10, padding: '12px 16px', fontSize: 13, lineHeight: 1.55, marginBottom: 16 }}>{children}</div>
}

function SecretInput({ label, hint, value, onChange, placeholder }) {
  return (
    <div style={T.formGroup}>
      <label style={T.formLabel}>{label}</label>
      <input style={T.formInput} type="password" autoComplete="new-password" spellCheck={false}
        placeholder={hint ? `Saved (${hint}) — leave blank to keep` : placeholder}
        value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function ProviderCard({ title, subtitle, info, busy, onSave, onTest, onRemove, children, result }) {
  return (
    <div style={{ ...T.card, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={T.sectionTitle}>{title}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: -6 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{info}</div>
      </div>
      {children}
      {result && <div style={{ fontSize: 13, marginTop: 4, marginBottom: 12, color: result.ok ? C.green : C.red }}>{result.message}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button style={T.btnPrimary} onClick={onSave} disabled={busy}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
        {onTest && <button style={T.btn} onClick={onTest} disabled={busy}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button>}
        {onRemove && <button style={{ ...T.btnGhost, color: C.red }} onClick={onRemove} disabled={busy}>Remove saved keys</button>}
      </div>
    </div>
  )
}

export default function Integrations({ toast }) {
  const [state, setState] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState({})
  const [results, setResults] = useState({})
  const [resend, setResend] = useState({ apiKey: '', fromEmail: '', fromName: '', replyTo: '' })
  const [stripe, setStripe] = useState({ secretKey: '', webhookSecret: '' })

  const apply = next => {
    setState(next)
    setResend(r => ({ ...r, apiKey: '', fromEmail: next.resend.fromEmail || '', fromName: next.resend.fromName || '', replyTo: next.resend.replyTo || '' }))
    setStripe({ secretKey: '', webhookSecret: '' })
  }

  useEffect(() => { call('GET').then(apply).catch(error => setLoadError(error.message)) }, [])

  const run = async (provider, kind, fn) => {
    setBusy(b => ({ ...b, [provider]: kind }))
    setResults(r => ({ ...r, [provider]: null }))
    try { await fn() } catch (error) { setResults(r => ({ ...r, [provider]: { ok: false, message: error.message } })) }
    setBusy(b => ({ ...b, [provider]: null }))
  }
  const save = (provider, values) => run(provider, 'save', async () => { apply(await call('PUT', { provider, values })); toast(`${provider === 'stripe' ? 'Stripe' : 'Resend'} settings saved`) })
  const test = provider => run(provider, 'test', async () => {
    const result = await call('POST', { provider, action: 'test' })
    setResults(r => ({ ...r, [provider]: result }))
  })
  const remove = provider => {
    if (!confirm('Remove the saved keys? Emails or payments for this provider will stop working until new keys are added.')) return
    run(provider, 'save', async () => { apply(await call('DELETE', { provider })); toast('Keys removed') })
  }

  if (loadError) return <div><div style={T.pageTitle}>Integrations</div><div style={{ marginTop: 20 }}><Notice tone="red">{loadError}</Notice></div></div>
  if (!state) return <div><div style={T.pageTitle}>Integrations</div><div style={{ ...T.pageSub, marginTop: 12 }}>Loading…</div></div>

  const sourceLabel = source => source === 'environment' ? 'Using server env key' : source === 'studio' ? 'Using saved key' : 'Not connected'
  const copy = value => { navigator.clipboard?.writeText(value); toast('Copied') }

  return (
    <div>
      <div style={T.pageHeader} className="page-header-wrap">
        <div>
          <div style={T.pageTitle}>Integrations</div>
          <div style={T.pageSub}>Keys are encrypted with AES-256-GCM before they are stored and are never sent back to the browser.</div>
        </div>
      </div>

      {!state.encryptionReady && <Notice tone="red">The server is missing <code>INTEGRATIONS_ENCRYPTION_KEY</code>. Set it to a long random value (for example <code>openssl rand -base64 32</code>) and restart before saving keys.</Notice>}
      {!state.tableReady && <Notice tone="red">The <code>integration_secrets</code> table is missing. Apply <code>supabase-migration-003-integrations.sql</code> to your PIBASE project.</Notice>}

      <ProviderCard
        title="Resend — email"
        subtitle="Sends invoices, contracts, session reminders and contact-form alerts."
        info={<><StatusPill ok={state.resend.configured} label={sourceLabel(state.resend.source)} />{state.resend.updatedAt && <span style={{ fontSize: 11, color: C.faint, alignSelf: 'center' }}>Updated {fmtUpdated(state.resend.updatedAt)}</span>}</>}
        busy={busy.resend} result={results.resend}
        onSave={() => save('resend', resend)}
        onTest={state.resend.configured ? () => test('resend') : null}
        onRemove={state.resend.source === 'studio' ? () => remove('resend') : null}>
        {state.resend.unreadable && <Notice tone="red">The saved key can't be decrypted (the encryption key changed). Enter it again.</Notice>}
        <SecretInput label="API key" hint={state.resend.apiKeyHint} placeholder="re_…" value={resend.apiKey} onChange={apiKey => setResend({ ...resend, apiKey })} />
        <div style={T.formRow} className="form-row-2">
          <div style={T.formGroup}><label style={T.formLabel}>From address</label><input style={T.formInput} type="email" placeholder="hello@yourdomain.com" value={resend.fromEmail} onChange={e => setResend({ ...resend, fromEmail: e.target.value })} /></div>
          <div style={T.formGroup}><label style={T.formLabel}>From name</label><input style={T.formInput} placeholder="Defaults to your business name" value={resend.fromName} onChange={e => setResend({ ...resend, fromName: e.target.value })} /></div>
        </div>
        <div style={T.formGroup}><label style={T.formLabel}>Reply-to (optional)</label><input style={T.formInput} type="email" placeholder="Defaults to your account email" value={resend.replyTo} onChange={e => setResend({ ...resend, replyTo: e.target.value })} /></div>
        <p style={{ fontSize: 12, color: C.muted, margin: '0 0 16px', lineHeight: 1.6 }}>The from address must be on a domain verified in your Resend dashboard. A sending-only API key is enough.</p>
      </ProviderCard>

      <ProviderCard
        title="Stripe — online payments"
        subtitle="Lets clients pay invoices through Stripe Checkout. Paid invoices update automatically."
        info={<><StatusPill ok={state.stripe.configured} label={sourceLabel(state.stripe.source)} />{state.stripe.mode && <StatusPill ok={state.stripe.mode === 'live'} label={state.stripe.mode === 'live' ? 'Live mode' : 'Test mode'} />}<StatusPill ok={state.stripe.webhookConfigured} label={state.stripe.webhookConfigured ? 'Webhook set' : 'Webhook missing'} /></>}
        busy={busy.stripe} result={results.stripe}
        onSave={() => save('stripe', stripe)}
        onTest={state.stripe.configured ? () => test('stripe') : null}
        onRemove={state.stripe.source === 'studio' ? () => remove('stripe') : null}>
        {state.stripe.unreadable && <Notice tone="red">The saved keys can't be decrypted (the encryption key changed). Enter them again.</Notice>}
        <SecretInput label="Secret or restricted key" hint={state.stripe.secretKeyHint} placeholder="sk_live_… or rk_live_…" value={stripe.secretKey} onChange={secretKey => setStripe({ ...stripe, secretKey })} />
        <SecretInput label="Webhook signing secret" hint={state.stripe.webhookSecretHint} placeholder="whsec_…" value={stripe.webhookSecret} onChange={webhookSecret => setStripe({ ...stripe, webhookSecret })} />
        <div style={{ background: C.surface2, borderRadius: 10, padding: '14px 16px', fontSize: 12.5, color: C.muted, lineHeight: 1.65, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: C.text, marginBottom: 6 }}>Webhook setup</div>
          In Stripe → Developers → Webhooks, add an endpoint with this URL and paste its signing secret above:
          {state.webhookUrl
            ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0', flexWrap: 'wrap' }}><code style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', color: C.text, wordBreak: 'break-all' }}>{state.webhookUrl}</code><button style={T.btnSm} onClick={() => copy(state.webhookUrl)}>Copy</button></div>
            : <div style={{ color: C.red, margin: '8px 0' }}>Set NEXT_PUBLIC_APP_URL on the server to generate the webhook URL.</div>}
          Events: <code>checkout.session.completed</code> and <code>checkout.session.async_payment_succeeded</code>.
          A restricted key needs write access to Checkout Sessions only. No publishable key is needed.
        </div>
      </ProviderCard>
    </div>
  )
}
