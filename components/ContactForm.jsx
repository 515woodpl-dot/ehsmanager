import { useState } from 'react'
import { T, C } from '../lib/tokens'

export default function ContactFormSettings({ data, setData, toast }) {
  const settings = data.formSettings || {}
  const [form, setForm] = useState({ ...settings })
  const [newOption, setNewOption] = useState('')

  const save = () => {
    if (!form.buttonLabel?.trim()) return toast('Add a button label')
    if ((form.afterSubmit || 'message') === 'redirect' && !/^https:\/\//i.test(form.redirectUrl || '')) return toast('Redirect URL must start with https://')
    setData(d => ({ ...d, formSettings: { ...form } }))
    toast('Form settings saved')
  }

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); toast('Link copied!') }
    catch {
      const input = document.createElement('textarea'); input.value = publicUrl; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.appendChild(input); input.select()
      const copied = document.execCommand('copy'); input.remove(); toast(copied ? 'Link copied!' : 'Select and copy the link')
    }
  }

  const addOption = () => {
    if (!newOption.trim()) return
    setForm({ ...form, checkboxOptions: [...(form.checkboxOptions || []), newOption.trim()] })
    setNewOption('')
  }

  const removeOption = (idx) => {
    setForm({ ...form, checkboxOptions: form.checkboxOptions.filter((_, i) => i !== idx) })
  }

  const publicUrl = typeof window !== 'undefined' ? window.location.origin + '/contact' : 'https://manager.elliesheartstrings.com/contact'

  return (
    <div>
      <div style={T.pageHeader}>
        <div>
          <div style={T.pageTitle}>Contact Form</div>
          <div style={T.pageSub}>Configure your public lead capture form</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="/contact" target="_blank" style={{ ...T.btn, textDecoration: 'none' }}>↗ Preview form</a>
          <button style={T.btnPrimary} onClick={save}>Save settings</button>
        </div>
      </div>

      <div className="contact-stat-grid">
        <div style={T.cardSm}><div style={T.metricLabel}>Leads captured</div><div style={T.metricValue}>{data.leads?.length || 0}</div></div>
        <div style={T.cardSm}><div style={T.metricLabel}>Form destination</div><div style={{ fontWeight: 600, marginTop: 8 }}>PIBASE</div><div style={T.metricSub}>Clients + inquiries</div></div>
        <div style={T.cardSm}><div style={T.metricLabel}>Owner notification</div><div style={{ fontWeight: 600, marginTop: 8 }}>Resend</div><div style={T.metricSub}>When configured in Settings</div></div>
      </div>

      {/* Shareable link */}
      <div style={{ ...T.card, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>Shareable link</div>
          <div style={{ fontSize: 14, color: C.text, fontFamily: 'monospace' }}>{publicUrl}</div>
          <div style={{ fontSize: 12, color: C.faint, marginTop: 3 }}>Share this link with potential clients to capture leads</div>
        </div>
        <button style={T.btnSm} onClick={copyLink}>Copy link</button>
        <a href="/contact" target="_blank" style={{ ...T.btnSm, textDecoration: 'none', color: C.text }}>Open ↗</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* LEFT — Settings */}
        <div style={T.card}>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, marginBottom: 22 }}>Settings</div>

          <div style={T.formGroup}>
            <label style={T.formLabel}>New contact type</label>
            <select style={T.formInput} value={form.contactType || 'Lead'} onChange={e => setForm({ ...form, contactType: e.target.value })}>
              <option>Lead</option><option>Client</option><option>Other</option>
            </select>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 5 }}>New contacts submitted will be assigned this type</div>
          </div>

          <div style={T.formGroup}>
            <label style={T.formLabel}>Form title</label>
            <input style={T.formInput} value={form.formTitle || ''} onChange={e => setForm({ ...form, formTitle: e.target.value })} placeholder="Optional" />
          </div>

          <div style={T.formGroup}>
            <label style={T.formLabel}>Button label</label>
            <input style={T.formInput} value={form.buttonLabel || 'Submit'} onChange={e => setForm({ ...form, buttonLabel: e.target.value })} />
          </div>

          <div style={T.formGroup}>
            <label style={T.formLabel}>After form submission</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {[{ v: 'message', label: 'Show success message' }, { v: 'redirect', label: 'Redirect to another page' }].map(opt => (
                <label key={opt.v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5 }}>
                  <input type="radio" name="afterSubmit" value={opt.v} checked={(form.afterSubmit || 'message') === opt.v} onChange={() => setForm({ ...form, afterSubmit: opt.v })} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {(form.afterSubmit || 'message') === 'message' ? (
            <div style={T.formGroup}>
              <label style={T.formLabel}>Success message</label>
              <textarea style={{ ...T.formInput, resize: 'none' }} rows={3} value={form.successMessage || 'Thank you for contacting us!'} onChange={e => setForm({ ...form, successMessage: e.target.value })} />
              <div style={{ fontSize: 11, color: C.faint, marginTop: 5 }}>This message will be displayed after the form is submitted</div>
            </div>
          ) : (
            <div style={T.formGroup}>
              <label style={T.formLabel}>Redirect URL</label>
              <input style={T.formInput} placeholder="https://yourwebsite.com/thank-you" value={form.redirectUrl || ''} onChange={e => setForm({ ...form, redirectUrl: e.target.value })} />
            </div>
          )}

          {/* Checkbox options */}
          <div style={T.formGroup}>
            <label style={T.formLabel}>Session type checkboxes</label>
            <div style={{ marginBottom: 10 }}>
              {(form.checkboxOptions || []).map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ flex: 1, fontSize: 13.5 }}>{opt}</span>
                  <button style={{ ...T.btnGhost, color: C.red, fontSize: 15, padding: '2px 6px' }} onClick={() => removeOption(i)}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...T.formInput, flex: 1 }} placeholder="Add option..." value={newOption} onChange={e => setNewOption(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOption()} />
              <button style={T.btnSm} onClick={addOption}>Add</button>
            </div>
          </div>
        </div>

        {/* RIGHT — Live preview */}
        <div style={T.card}>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, marginBottom: 22 }}>Preview</div>
          <FormPreview settings={form} />
        </div>
      </div>

      {/* Recent leads */}
      {data.leads?.length > 0 && (
        <div style={{ ...T.card, marginTop: 20 }}>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, marginBottom: 18 }}>Recent leads ({data.leads.length})</div>
          {data.leads.map((lead, i) => (
            <div key={lead.id} style={{ ...T.dataRow, borderBottom: i === data.leads.length - 1 ? 'none' : `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontWeight: 500 }}>{lead.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{lead.email} · {lead.phone}</div>
                {lead.services?.length > 0 && <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{lead.services.join(', ')}</div>}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: C.faint }}>{lead.submittedAt}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FormPreview({ settings }) {
  return (
    <div style={{ background: C.surface2, borderRadius: 10, padding: '24px 20px' }}>
      {settings.formTitle && <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, marginBottom: 18, textAlign: 'center' }}>{settings.formTitle}</div>}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 5 }}>Full Name <span style={{ color: C.red }}>*</span></div>
        <div style={{ ...T.formInput, background: C.surface, color: C.faint, pointerEvents: 'none' }}>Your name</div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 5 }}>Email <span style={{ color: C.red }}>*</span></div>
        <div style={{ ...T.formInput, background: C.surface, color: C.faint, pointerEvents: 'none' }}>your@email.com</div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 5 }}>Phone <span style={{ color: C.red }}>*</span></div>
        <div style={{ ...T.formInput, background: C.surface, color: C.faint, pointerEvents: 'none' }}>(555) 000-0000</div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 8 }}>What memories would you like captured? <span style={{ color: C.red }}>*</span></div>
        {(settings.checkboxOptions || []).slice(0, 4).map((opt, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13, cursor: 'default' }}>
            <input type="checkbox" disabled /> {opt}
          </label>
        ))}
        {(settings.checkboxOptions || []).length > 4 && <div style={{ fontSize: 12, color: C.faint }}>+ {(settings.checkboxOptions || []).length - 4} more options</div>}
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 5 }}>Message</div>
        <div style={{ ...T.formInput, background: C.surface, color: C.faint, height: 64, pointerEvents: 'none' }}>Type message here.</div>
      </div>
      <div style={{ ...T.btnPrimary, justifyContent: 'center', opacity: 0.7, pointerEvents: 'none' }}>{settings.buttonLabel || 'Submit'}</div>
    </div>
  )
}
