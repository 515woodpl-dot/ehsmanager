import { useEffect, useRef, useState } from 'react'
import PublicDocument from '../../components/PublicDocument'

// Client-facing chat with the studio. Messages land in the studio's Inbox;
// studio replies (sent from the app) appear here and by email.
export default function ChatPage({ token }) {
  const [chat, setChat] = useState(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const load = async () => {
    try {
      const r = await fetch(`/api/chat?token=${encodeURIComponent(token)}`)
      const body = await r.json()
      if (!r.ok) throw new Error(body.error || 'Chat could not be loaded')
      setChat(body); setError('')
    } catch (err) { setError(err.message) }
  }

  useEffect(() => {
    load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load() }, 8000)
    return () => clearInterval(timer)
  }, [token])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [chat?.messages?.length])

  const send = async event => {
    event.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, text: draft }) })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'Message could not be sent')
      setChat(c => ({ ...c, messages: [...(c?.messages || []), body.message] }))
      setDraft(''); setError('')
    } catch (err) { setError(err.message) }
    setSending(false)
  }

  const business = chat?.businessName || 'Your photographer'
  return (
    <PublicDocument pageTitle={`Messages · ${business}`} eyebrow={business} title={chat ? `Hi ${chat.clientName || 'there'}` : 'Messages'} logo={chat?.logo}>
      <div className="chat-thread">
        {!chat && !error && <p className="chat-empty">Loading…</p>}
        {chat && chat.messages.length === 0 && <p className="chat-empty">Send {business} a message below.</p>}
        {chat?.messages.map(m => (
          <div key={m.id} className={`chat-bubble ${m.mine ? 'mine' : 'theirs'}`}>
            <div>{m.text}</div>
            {m.time && <small>{m.mine ? 'You' : business} · {m.time}</small>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <div className="inv-message error">{error}</div>}
      <form onSubmit={send} className="chat-form">
        <textarea rows={3} placeholder="Write a message…" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e) }} />
        <button type="submit" className="inv-button" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send message'}</button>
      </form>
      <style jsx global>{`
        .chat-thread { display: flex; flex-direction: column; gap: 8px; min-height: 220px; max-height: 60vh; overflow-y: auto; padding: 4px 2px 12px; }
        .chat-empty { color: #7F7E7C; font-size: 14px; text-align: center; margin: 40px 0; }
        .chat-bubble { max-width: 78%; padding: 10px 14px; border-radius: 14px; font-size: 15px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
        .chat-bubble small { display: block; margin-top: 4px; font-size: 11px; opacity: .6; }
        .chat-bubble.mine { align-self: flex-end; background: #111110; color: #fff; border-bottom-right-radius: 4px; }
        .chat-bubble.theirs { align-self: flex-start; background: #F1F1EF; color: #111110; border-bottom-left-radius: 4px; }
        .chat-form textarea { width: 100%; border: 1px solid #DDDCDA; border-radius: 10px; font: inherit; font-size: 16px; padding: 12px 14px; resize: vertical; margin-top: 12px; }
        .chat-form .inv-button { margin-top: 10px; }
      `}</style>
    </PublicDocument>
  )
}

export async function getServerSideProps({ params }) {
  return { props: { token: params.token } }
}
