import { useEffect, useRef, useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'
import { canPromptInstall, isIOS, isStandalone, promptInstall, subscribe } from '../lib/pwa'

async function api(path, options = {}) {
  const { data: { session } } = await pibase.auth.getSession()
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}`, ...(options.headers || {}) } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Something went wrong')
  return body
}

// Shrinks an uploaded logo so it stays small enough to store and email.
function resizeLogo(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error('Use a PNG, JPG or WebP image'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the image'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not read the image'))
      img.onload = () => {
        const scale = Math.min(1, 600 / img.width, 240 / img.height)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const url = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9)
        if (url.length > 400 * 1024 * 1.3) return reject(new Error('That logo is too large — try a smaller image'))
        resolve(url)
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function Section({ title, subtitle, status, children }) {
  return (
    <section style={{ ...T.card, marginBottom: 18 }} className="settings-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400, fontSize: 19, margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0', maxWidth: 620 }}>{subtitle}</p>}
        </div>
        {status !== undefined && <span className={status ? 'integration-ready' : 'integration-missing'}>{status ? 'Connected' : 'Setup required'}</span>}
      </div>
      {children}
    </section>
  )
}

const Field = ({ label, hint, children }) => (
  <div style={T.formGroup}>
    <label style={T.formLabel}>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 11.5, color: C.faint, marginTop: 5 }}>{hint}</div>}
  </div>
)

// A write-only key box: shows whether a key is saved (never the key) and
// lets the studio paste a new one or remove the saved one.
function KeyField({ label, field, info, value, onChange, onRemove, placeholder, hint }) {
  return (
    <Field label={label} hint={hint}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={{ ...T.formInput, flex: 1, minWidth: 220, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }} type="password" autoComplete="off"
          placeholder={info?.set ? `Saved · ends in ${info.last4}${info.source === 'server' ? ' (from server settings)' : ''}` : placeholder}
          value={value || ''} onChange={e => onChange(field, e.target.value)} />
        {info?.source === 'app' && <button type="button" style={{ ...T.btnSm, color: C.red, borderColor: C.red }} onClick={() => onRemove(field)}>Remove</button>}
      </div>
    </Field>
  )
}

function CopyField({ label, value, toast, hint }) {
  return (
    <Field label={label} hint={hint}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...T.formInput, flex: 1, fontSize: 12.5, fontFamily: 'ui-monospace, Menlo, monospace' }} readOnly value={value} onFocus={e => e.currentTarget.select()} />
        <button type="button" style={T.btnSm} onClick={async () => { try { await navigator.clipboard.writeText(value); toast('Copied') } catch { toast('Select the text and copy it') } }}>Copy</button>
      </div>
    </Field>
  )
}

// Install status and button for the home-screen app.
function InstallSection({ toast }) {
  const [, rerender] = useState(0)
  const [installed, setInstalled] = useState(false)
  useEffect(() => { setInstalled(isStandalone()); return subscribe(() => rerender(n => n + 1)) }, [])
  const ios = typeof navigator !== 'undefined' && isIOS()
  return (
    <Section title="App" subtitle="Install EHS Studio on your phone, tablet or computer to open it from your home screen, full-screen, like a regular app." status={installed ? true : undefined}>
      {installed ? (
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>You're using the installed app. 🎉</p>
      ) : canPromptInstall() ? (
        <button style={T.btnPrimary} onClick={async () => { if (await promptInstall() === 'accepted') toast('Installing EHS Studio…') }}>Install app</button>
      ) : ios ? (
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>In Safari, tap <strong>Share</strong> and choose <strong>Add to Home Screen</strong>.</p>
      ) : (
        <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. (Chrome, Edge and Safari support this.)</p>
      )}
    </Section>
  )
}

export default function Settings({ toast = () => {} }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [branding, setBranding] = useState(null)
  const [integrations, setIntegrations] = useState(null)
  const [keys, setKeys] = useState({})
  const [busy, setBusy] = useState('')
  const fileRef = useRef()

  const apply = body => { setState(body); setBranding(body.branding); setIntegrations(body.integrations); setKeys({}) }

  useEffect(() => {
    let active = true
    api('/api/settings').then(body => { if (active) apply(body) }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [])

  const save = async (section, payload) => {
    setBusy(section)
    try {
      apply(await api('/api/settings', { method: 'POST', body: JSON.stringify(payload) }))
      toast('Settings saved')
    } catch (err) { toast(err.message) }
    setBusy('')
  }

  const test = async kind => {
    setBusy(`test-${kind}`)
    try { toast((await api('/api/settings-test', { method: 'POST', body: JSON.stringify({ kind }) })).message) } catch (err) { toast(err.message) }
    setBusy('')
  }

  const setKey = (field, value) => setKeys(k => ({ ...k, [field]: value }))
  const removeKey = field => { if (confirm('Remove this saved key?')) save('keys', { keys: { [field]: null } }) }
  const keysFor = fields => Object.fromEntries(fields.filter(f => keys[f]?.trim()).map(f => [f, keys[f]]))

  const uploadLogo = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try { setBranding(b => ({ ...b, logo: '' })); const logo = await resizeLogo(file); setBranding(b => ({ ...b, logo })) } catch (err) { toast(err.message) }
  }

  const header = <div style={T.pageHeader} className="page-header-wrap"><div><div style={T.pageTitle}>Settings</div><div style={T.pageSub}>Business details, logo, email and payments</div></div></div>
  if (error) return <div>{header}<div className="settings-error">{error}</div></div>
  if (!state || !branding) return <div>{header}<div style={T.card}>Loading settings…</div></div>

  const b = (field, props = {}) => <input style={T.formInput} value={branding[field] || ''} onChange={e => setBranding({ ...branding, [field]: e.target.value })} {...props} />
  const saveButton = (section, payload, label = 'Save') => <button style={{ ...T.btnPrimary, opacity: busy === section ? 0.6 : 1 }} disabled={!!busy} onClick={() => save(section, payload)}>{busy === section ? 'Saving…' : label}</button>

  return (
    <div className="settings-page">
      {header}

      {state.migrationNeeded && (
        <div className="settings-error">Your database needs one update before settings can be saved: apply <code>pibase-migration-003-settings-inbox.sql</code> in PIBASE.</div>
      )}
      {!state.canStoreSecrets && (
        <div className="settings-error">To save API keys here, the server needs a <code>SETTINGS_ENCRYPTION_KEY</code> (a long random value). Until then, keys come from the server environment.</div>
      )}

      <Section title="Business profile" subtitle="Shown on every email, invoice, quote, questionnaire and chat page your clients see.">
        <Field label="Logo" hint="PNG, JPG or WebP. It's resized automatically. Shown at the top of emails and client pages.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 200, height: 80, border: `1px dashed ${C.border2}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface2, overflow: 'hidden' }}>
              {branding.logo ? <img src={branding.logo} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <span style={{ fontSize: 12, color: C.faint }}>No logo</span>}
            </div>
            <button type="button" style={T.btn} onClick={() => fileRef.current.click()}>{branding.logo ? 'Replace logo' : 'Upload logo'}</button>
            {branding.logo && <button type="button" style={{ ...T.btnSm, color: C.red, borderColor: C.red }} onClick={() => setBranding({ ...branding, logo: '' })}>Remove</button>}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={uploadLogo} />
          </div>
        </Field>
        <div style={T.formRow} className="form-row-2">
          <Field label="Business name">{b('businessName')}</Field>
          <Field label="Your name">{b('ownerName')}</Field>
        </div>
        <div style={T.formRow} className="form-row-2">
          <Field label="Studio email" hint="Where client replies (copies) and notifications go.">{b('studioEmail', { type: 'email' })}</Field>
          <Field label="Phone">{b('phone')}</Field>
        </div>
        <div style={T.formRow} className="form-row-2">
          <Field label="Website">{b('website', { placeholder: 'https://' })}</Field>
          <Field label="Address">{b('address')}</Field>
        </div>
        <Field label="Email signature" hint="Ends every email. Leave blank for “Warmly, [your first name]”.">
          <textarea style={{ ...T.formInput, resize: 'vertical' }} rows={3} value={branding.signature || ''} onChange={e => setBranding({ ...branding, signature: e.target.value })} placeholder={`Warmly,\n${branding.ownerName || 'Ellie'}`} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{saveButton('branding', { branding })}</div>
      </Section>

      <Section title="Email (Resend)" status={state.status.email} subtitle="Sends invoices, quotes, contracts, questionnaires, reminders and messages to your clients.">
        <KeyField label="Resend API key" field="resendApiKey" info={state.keys.resendApiKey} value={keys.resendApiKey} onChange={setKey} onRemove={removeKey} placeholder="re_…" hint="resend.com → API Keys → Create API key (Sending access is enough)." />
        <Field label="Send emails from" hint="Must be on a domain you've verified in Resend → Domains. Leave blank to use the default address.">
          <input style={T.formInput} type="email" placeholder="hello@yourstudio.com" value={integrations.fromEmail || ''} onChange={e => setIntegrations({ ...integrations, fromEmail: e.target.value })} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" style={T.btn} disabled={!!busy} onClick={() => test('email')}>{busy === 'test-email' ? 'Sending…' : 'Send test email'}</button>
          {saveButton('email', { keys: keysFor(['resendApiKey']), integrations: { fromEmail: integrations.fromEmail || '' } })}
        </div>
      </Section>

      <Section title="Client replies in the app" status={state.status.replies}
        subtitle="When a client replies to any email, the reply shows up in your Inbox and in their Activity. Clients can also message you from the chat link included in your messages.">
        <ol className="settings-steps">
          <li>In Resend → <strong>Domains</strong>, add a receiving subdomain such as <code>replies.yourstudio.com</code> and add the MX record it shows to your DNS. You can use the free <code>…resend.app</code> address Resend gives you instead.</li>
          <li>In Resend → <strong>Webhooks</strong>, add the URL below and pick the <code>email.received</code> event.</li>
          <li>Copy that webhook's <strong>signing secret</strong> into the box below, enter your receiving domain, and save.</li>
        </ol>
        <CopyField label="Webhook URL for Resend" value={state.webhooks.inbound} toast={toast} />
        <Field label="Receiving domain" hint="Replies will go to reply+…@this-domain.">
          <input style={T.formInput} placeholder="replies.yourstudio.com" value={integrations.inboundDomain || ''} onChange={e => setIntegrations({ ...integrations, inboundDomain: e.target.value })} />
        </Field>
        <KeyField label="Webhook signing secret" field="resendWebhookSecret" info={state.keys.resendWebhookSecret} value={keys.resendWebhookSecret} onChange={setKey} onRemove={removeKey} placeholder="whsec_…" />
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, margin: '4px 0 16px', cursor: 'pointer' }}>
          <input type="checkbox" checked={integrations.copyRepliesToStudio !== false} onChange={e => setIntegrations({ ...integrations, copyRepliesToStudio: e.target.checked })} style={{ marginTop: 3 }} />
          <span>Also send client replies to my studio email{branding.studioEmail ? ` (${branding.studioEmail})` : ''}<br /><span style={{ color: C.faint, fontSize: 12 }}>Replies then appear in both places. New chat messages always notify your studio email.</span></span>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {saveButton('replies', { keys: keysFor(['resendWebhookSecret']), integrations: { inboundDomain: integrations.inboundDomain || '', copyRepliesToStudio: integrations.copyRepliesToStudio !== false } })}
        </div>
      </Section>

      <Section title="Payments (Stripe)" status={state.status.payments} subtitle="Lets clients pay online and marks invoices paid automatically.">
        <KeyField label="Publishable key" field="stripePublishableKey" info={state.keys.stripePublishableKey} value={keys.stripePublishableKey} onChange={setKey} onRemove={removeKey} placeholder="pk_live_… or pk_test_…" hint="Stripe Dashboard → Developers → API keys." />
        <KeyField label="Secret key" field="stripeSecretKey" info={state.keys.stripeSecretKey} value={keys.stripeSecretKey} onChange={setKey} onRemove={removeKey} placeholder="sk_live_… or sk_test_…" />
        <CopyField label="Webhook URL for Stripe" value={state.webhooks.stripe} toast={toast} hint="Stripe → Developers → Webhooks → Add endpoint. Events: payment_intent.succeeded and payment_intent.payment_failed." />
        <KeyField label="Webhook signing secret" field="stripeWebhookSecret" info={state.keys.stripeWebhookSecret} value={keys.stripeWebhookSecret} onChange={setKey} onRemove={removeKey} placeholder="whsec_…" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" style={T.btn} disabled={!!busy} onClick={() => test('stripe')}>{busy === 'test-stripe' ? 'Checking…' : 'Test connection'}</button>
          {saveButton('stripe', { keys: keysFor(['stripePublishableKey', 'stripeSecretKey', 'stripeWebhookSecret']) })}
        </div>
      </Section>

      <InstallSection toast={toast} />

      <p style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>Keys are encrypted on the server and never shown again after saving — only their last 4 characters.</p>
    </div>
  )
}
