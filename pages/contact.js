import { useState } from 'react'
import Head from 'next/head'
import { STORAGE_KEY, DEFAULT_FORM_SETTINGS } from '../lib/data'

const uid = () => Math.random().toString(36).slice(2, 8)

function loadSettings() {
  if (typeof window === 'undefined') return DEFAULT_FORM_SETTINGS
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) return JSON.parse(s).formSettings || DEFAULT_FORM_SETTINGS
  } catch (e) {}
  return DEFAULT_FORM_SETTINGS
}

function saveData(lead, settings) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    const leads = data.leads || []
    leads.unshift(lead)
    const clients = data.clients || []
    clients.push({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      type: lead.services?.[0] || 'Family',
      status: 'inquiry',
      date: '',
      notes: lead.message || '',
      archived: false,
      contactType: settings.contactType || 'Lead',
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, leads, clients }))
  } catch (e) {}
}

export default function ContactPage() {
  const [settings] = useState(loadSettings)
  const [form, setForm] = useState({ name: '', email: '', phone: '', services: [], message: '' })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const maxChecked = 3

  const toggleService = (svc) => {
    if (form.services.includes(svc)) {
      setForm({ ...form, services: form.services.filter(s => s !== svc) })
    } else {
      if (form.services.length >= maxChecked) return
      setForm({ ...form, services: [...form.services, svc] })
    }
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (form.services.length === 0) e.services = 'Please select at least one option'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    const lead = {
      id: uid(),
      ...form,
      submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      type: settings.contactType || 'Lead',
    }
    saveData(lead, settings)
    setTimeout(() => {
      setLoading(false)
      if (settings.afterSubmit === 'redirect' && settings.redirectUrl) {
        window.location.href = settings.redirectUrl
      } else {
        setSubmitted(true)
      }
    }, 600)
  }

  const inp = (field) => ({
    width: '100%', padding: '11px 14px',
    border: `1px solid ${errors[field] ? '#991F1F' : '#DDDCDA'}`,
    borderRadius: 8, fontSize: 15, outline: 'none', fontFamily: 'inherit',
    background: '#fff', color: '#111110',
    transition: 'border-color 0.15s',
  })

  if (submitted) {
    return (
      <>
        <Head><title>Thank you</title></Head>
        <div style={{ minHeight: '100vh', background: '#FAFAF9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 24px' }}>✓</div>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, letterSpacing: '-0.4px', marginBottom: 12, color: '#111110' }}>
              {settings.successMessage || 'Thank you for contacting us!'}
            </div>
            <div style={{ fontSize: 15, color: '#7F7E7C', lineHeight: 1.6 }}>We'll be in touch soon.</div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{settings.formTitle || 'Contact Us'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'DM Sans', sans-serif; background: #FAFAF9; color: #111110; -webkit-font-smoothing: antialiased; }
          input:focus, textarea:focus { border-color: #111110 !important; box-shadow: 0 0 0 3px rgba(17,17,16,0.08); }
  @media (max-width: 600px) {
    .form-row-2 { grid-template-columns: 1fr !important; }
    .contact-checkbox-grid { grid-template-columns: 1fr !important; }
  }
          ::placeholder { color: #B0AFAD; }
        `}</style>
      </Head>

      <div style={{ minHeight: '100vh', background: '#FAFAF9', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 20px 80px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          {/* Header */}
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 36, fontWeight: 400, letterSpacing: '-0.6px', lineHeight: 1.1, color: '#111110', marginBottom: 10 }}>
              {settings.formTitle || "Let's connect"}
            </div>
            <div style={{ fontSize: 15, color: '#7F7E7C', fontWeight: 300 }}>Fill out the form below and we'll be in touch soon.</div>
          </div>

          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '36px 40px', border: '1px solid #EAEAEA', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

            {/* Full Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7F7E7C', marginBottom: 7 }}>
                Full Name <span style={{ color: '#991F1F' }}>*</span>
              </label>
              <input style={inp('name')} placeholder="Your full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              {errors.name && <div style={{ fontSize: 12, color: '#991F1F', marginTop: 5 }}>{errors.name}</div>}
            </div>

            {/* Email + Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }} className="form-row-2">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7F7E7C', marginBottom: 7 }}>
                  Email <span style={{ color: '#991F1F' }}>*</span>
                </label>
                <input style={inp('email')} placeholder="your@email.com" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                {errors.email && <div style={{ fontSize: 12, color: '#991F1F', marginTop: 5 }}>{errors.email}</div>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7F7E7C', marginBottom: 7 }}>
                  Phone <span style={{ color: '#991F1F' }}>*</span>
                </label>
                <input style={inp('phone')} placeholder="(555) 000-0000" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                {errors.phone && <div style={{ fontSize: 12, color: '#991F1F', marginTop: 5 }}>{errors.phone}</div>}
              </div>
            </div>

            {/* Services checkboxes */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7F7E7C', marginBottom: 4 }}>
                What kind of memories would you like captured? <span style={{ color: '#991F1F' }}>*</span>
              </label>
              <div style={{ fontSize: 12, color: '#B0AFAD', marginBottom: 10 }}>Select up to {maxChecked}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} className="contact-checkbox-grid">
                {(settings.checkboxOptions || []).map((opt, i) => {
                  const checked = form.services.includes(opt)
                  const disabled = !checked && form.services.length >= maxChecked
                  return (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${checked ? '#111110' : '#EAEAEA'}`, cursor: disabled ? 'not-allowed' : 'pointer', background: checked ? '#F8F8F7' : '#fff', opacity: disabled ? 0.5 : 1, transition: 'all 0.12s' }}>
                      <input type="checkbox" checked={checked} onChange={() => !disabled && toggleService(opt)} style={{ width: 15, height: 15, cursor: disabled ? 'not-allowed' : 'pointer' }} />
                      <span style={{ fontSize: 13.5, color: '#111110', fontWeight: checked ? 500 : 400 }}>{opt}</span>
                    </label>
                  )
                })}
              </div>
              {errors.services && <div style={{ fontSize: 12, color: '#991F1F', marginTop: 8 }}>{errors.services}</div>}
            </div>

            {/* Message */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7F7E7C', marginBottom: 7 }}>Message</label>
              <textarea style={{ ...inp('message'), resize: 'none', minHeight: 100 }} placeholder="Type message here." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: loading ? '#555' : '#111110', color: '#fff', fontSize: 15, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.1px', transition: 'background 0.15s' }}>
              {loading ? 'Sending...' : (settings.buttonLabel || 'Submit')}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
