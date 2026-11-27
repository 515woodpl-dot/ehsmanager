import { useEffect, useRef, useState } from 'react'
import { T, C } from '../lib/tokens'
import { pibase } from '../lib/pibase'
import { Modal } from './UI'
import { invoiceLabel } from '../lib/invoices'
import { quoteLabel } from '../lib/documents'

// Secure client links for every document, for clients who don't receive
// email: same pages the emails open. While a link window is open the app
// checks every few seconds and shows when the client has paid / accepted /
// signed / answered.

const fmt$ = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const first = name => String(name || '').trim().split(/\s+/)[0] || ''
const collection = { invoice: 'invoices', quote: 'quotes', contract: 'contracts', questionnaire: 'questionnaires' }

export const docName = (kind, doc) => ({
  invoice: () => `Invoice ${invoiceLabel(doc)}`,
  quote: () => `Quote ${quoteLabel(doc)}`,
  contract: () => doc.type || 'Contract',
  questionnaire: () => doc.title || 'Questionnaire',
  chat: () => 'Private chat',
}[kind] || (() => 'Link'))()

const COPY = {
  invoice: { title: 'Payment link', action: 'view it and pay securely', waiting: s => `Waiting for payment · ${fmt$(Math.max(0, (s.amount || 0) - (s.paid || 0)))} due`, done: s => `✓ Paid in full — ${fmt$(s.paid)} received`, partial: s => `✓ Payment received — ${fmt$(s.paid)} paid, ${fmt$(Math.max(0, s.amount - s.paid))} still due` },
  quote: { title: 'Quote link', action: 'review and accept it', waiting: () => 'Waiting for the client to accept', done: () => '✓ Quote accepted — the invoice was created' },
  contract: { title: 'Contract link', action: 'review and sign it', waiting: () => 'Waiting for the client to sign', done: s => `✓ Signed${s.patch?.signedBy ? ` by ${s.patch.signedBy}` : ''}` },
  questionnaire: { title: 'Questionnaire link', action: 'fill it out', waiting: () => 'Waiting for answers', done: () => '✓ Answers received' },
  chat: { title: 'Chat link', action: 'message us anytime', waiting: null, done: null },
}

async function fetchLink(kind, id) {
  const { data: { session } } = await pibase.auth.getSession()
  const r = await fetch('/api/service-link', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ kind, id }) })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(body.error || 'Could not create the link'), { status: r.status })
  return body
}

// Bring the client's latest progress into the app right away.
function applyPatch(setData, kind, id, patch) {
  const key = collection[kind]
  if (!key || !patch) return
  setData(d => ({ ...d, [key]: d[key].map(item => {
    if (item.id !== id) return item
    if (kind === 'invoice') {
      const { payments, ...rest } = patch
      return { ...item, ...rest, paidAt: rest.paidAt || item.paidAt, paymentMethod: rest.paymentMethod || item.paymentMethod, lineData: { ...(item.lineData || {}), payments } }
    }
    return { ...item, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v != null)) }
  }) }))
}

export function ServiceLinkModal({ kind, doc, client, setData, toast, onClose, businessName = '515Studio' }) {
  const [state, setState] = useState({ loading: true })
  const start = useRef(null)
  const copy = COPY[kind]
  useEffect(() => {
    let on = true, timer = null, tries = 0
    const tick = async () => {
      try {
        const body = await fetchLink(kind, doc.id)
        if (!on) return
        if (!start.current) start.current = body
        setState({ ...body, loading: false })
        const changed = JSON.stringify(body.patch) !== JSON.stringify(start.current.patch)
        if (changed) applyPatch(setData, kind, doc.id, body.patch)
        if (body.done || !copy.waiting) return // finished, or nothing to watch
      } catch (error) {
        if (!on) return
        // A document created a moment ago may still be saving.
        if (error.status === 404 && tries++ < 6) { timer = setTimeout(tick, 1000); return }
        if (!start.current) { setState({ loading: false, error: error.message }); return }
      }
      timer = setTimeout(tick, 5000)
    }
    tick()
    return () => { on = false; clearTimeout(timer) }
  }, [kind, doc.id])

  const url = state.url
  const name = first(client?.name || doc.client)
  const what = kind === 'chat' ? 'our private chat' : `your ${docName(kind, doc).replace(/^(Invoice|Quote) /, (m) => m.toLowerCase())}`
  const text = kind === 'chat'
    ? `Hi${name ? ` ${name}` : ''}! Here's ${what} with ${businessName} — you can ${copy.action} here: ${url}`
    : `Hi${name ? ` ${name}` : ''}, here's ${what} from ${businessName}. You can ${copy.action} here: ${url}`
  const copyLink = async () => { try { await navigator.clipboard.writeText(url); toast('Link copied') } catch { toast(url) } }
  const copyMessage = async () => { try { await navigator.clipboard.writeText(text); toast('Message with link copied') } catch { toast(text) } }
  const share = async () => { try { await navigator.share({ title: docName(kind, doc), text, url }) } catch {} }
  const finished = state.done
  const progressed = kind === 'invoice' && !finished && start.current && state.paid > start.current.paid

  return <Modal title={`${copy.title} · ${docName(kind, doc)}`} onClose={onClose} footer={<button style={T.btnPrimary} onClick={onClose}>Done</button>}>
    {state.loading && <p style={{ color: C.muted }}>Creating the link…</p>}
    {state.error && <p style={{ color: C.red }}>{state.error}</p>}
    {url && <>
      <p style={{ color: C.muted, fontSize: 13.5, marginBottom: 12, lineHeight: 1.6 }}>Send this to {client?.name || doc.client || 'your client'} by text, WhatsApp or DM. It opens the same secure page as the email{kind === 'invoice' ? ', with the Stripe Pay button' : ''}.{copy.waiting ? ' This window updates by itself when they finish.' : ''}</p>
      <div className="paylink-box"><input readOnly value={url} onFocus={e => e.target.select()} aria-label="Link" /><button style={T.btnPrimary} onClick={copyLink}>Copy</button></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        {typeof navigator !== 'undefined' && navigator.share && <button style={T.btn} onClick={share}>Share…</button>}
        <a style={{ ...T.btn, textDecoration: 'none' }} href={`sms:${client?.phone ? encodeURIComponent(client.phone) : ''}?&body=${encodeURIComponent(text)}`}>Text message</a>
        <a style={{ ...T.btn, textDecoration: 'none' }} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        <button style={T.btn} onClick={copyMessage}>Copy message</button>
        <a style={{ ...T.btn, textDecoration: 'none' }} href={url} target="_blank" rel="noreferrer">Open page</a>
      </div>
      {copy.waiting && <div className={`paylink-status${finished ? ' paid' : progressed || state.partial ? ' partial' : ''}`} role="status">
        {finished ? copy.done(state) : (progressed || state.partial) && copy.partial ? copy.partial(state) : <>{copy.waiting(state)} <span className="paylink-live" aria-hidden="true" /> live</>}
      </div>}
    </>}
  </Modal>
}

// Picker: every document the client still needs to act on, grouped by type.
export function ShareLinksModal({ client, data, setData, toast, onClose, onCreate }) {
  const [open, setOpen] = useState(null) // { kind, doc }
  const mine = list => (list || []).filter(x => x.clientId === client.id)
  const groups = [
    { kind: 'invoice', label: 'Payment', create: 'Create an invoice', items: mine(data.invoices).filter(i => i.status !== 'paid' && (Number(i.amount) || 0) > (Number(i.paid) || 0)), sub: i => `${fmt$((Number(i.amount) || 0) - (Number(i.paid) || 0))} due` },
    { kind: 'quote', label: 'Quote', create: 'Create a quote', items: mine(data.quotes).filter(q => !['accepted', 'declined'].includes(q.status)), sub: q => fmt$(q.amount) },
    { kind: 'contract', label: 'Contract', create: 'Create a contract', items: mine(data.contracts).filter(k => k.status !== 'signed'), sub: () => 'Not signed yet' },
    { kind: 'questionnaire', label: 'Questionnaire', create: 'Create a questionnaire', items: mine(data.questionnaires).filter(q => q.status !== 'completed'), sub: () => 'Not answered yet' },
  ]
  if (open) return <ServiceLinkModal {...open} client={client} setData={setData} toast={toast} onClose={() => setOpen(null)} />
  return <Modal title={`Share a link with ${first(client.name) || 'your client'}`} onClose={onClose}>
    <p style={{ color: C.muted, fontSize: 13.5, margin: '-8px 0 16px', lineHeight: 1.6 }}>For clients who don't get your emails: pick what they need, then send the link by text, WhatsApp or DM.</p>
    <div className="share-groups">
      {groups.map(g => <div key={g.kind} className="share-group">
        <div className="share-group-label">{g.label}</div>
        {g.items.map(item => <button key={item.id} className="share-row" onClick={() => setOpen({ kind: g.kind, doc: item })}>
          <span><strong>{docName(g.kind, item)}</strong><small>{g.sub(item)}</small></span><span aria-hidden="true">→</span>
        </button>)}
        {!g.items.length && <button className="share-row share-row-create" onClick={() => onCreate(g.kind)}><span>+ {g.create}</span><small>nothing waiting</small></button>}
      </div>)}
      <div className="share-group">
        <div className="share-group-label">Chat</div>
        <button className="share-row" onClick={() => setOpen({ kind: 'chat', doc: { id: client.id, client: client.name } })}><span><strong>Private chat link</strong><small>They can message you anytime</small></span><span aria-hidden="true">→</span></button>
      </div>
    </div>
  </Modal>
}
