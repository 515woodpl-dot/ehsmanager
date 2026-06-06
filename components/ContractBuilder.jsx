import { useState, useMemo } from 'react'
import { T, C } from '../lib/tokens'
import { CONTRACT_TEMPLATE, fillContract } from '../lib/contractTemplate'

const uid = () => Math.random().toString(36).slice(2, 8)

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: C.green, marginTop: 4, fontWeight: 500 }}>{hint}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>{title}</div>
      {children}
    </div>
  )
}

export default function ContractBuilder({ client, data, onSave, onClose }) {
  const clientBooking = data?.bookings?.find(b => b.clientId === client?.id)
  const clientInvoice = data?.invoices?.find(i => i.clientId === client?.id)
  const today = new Date().toISOString().slice(0, 10)

  const [fields, setFields] = useState({
    contractTitle: `${client?.type || 'Portrait'} Photography Services Agreement`,
    effectiveDate: today,
    clientName: client?.name || '',
    clientEmail: client?.email || '',
    sessionType: client?.type || 'Portrait',
    sessionDate: clientBooking?.date || client?.date || '',
    sessionTime: clientBooking?.time || '',
    location: clientBooking?.location || 'EHS Studio',
    totalFee: clientInvoice?.amount ? String(clientInvoice.amount) : '',
    retainerPct: '50',
    remainingDueDate: clientInvoice?.due || '',
    governingState: 'New Jersey',
    photographerEmail: 'hello@elliesheartstrings.com',
    photographerCity: 'Linden, NJ',
  })

  const [tab, setTab] = useState('fields')
  const set = (k, v) => setFields(f => ({ ...f, [k]: v }))

  const totalFee = parseFloat(fields.totalFee) || 0
  const retainerAmt = Math.round(totalFee * (parseFloat(fields.retainerPct) || 50) / 100 * 100) / 100
  const remainingAmt = Math.round((totalFee - retainerAmt) * 100) / 100

  const fmtD = iso => {
    if (!iso) return '[Date]'
    const d = new Date(iso + 'T00:00:00')
    return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }
  const fmtT = t => {
    if (!t) return 'TBD'
    const [h, m] = t.split(':'); const hr = parseInt(h)
    return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`
  }

  const contractFields = useMemo(() => ({
    effectiveDate: fmtD(fields.effectiveDate),
    clientName: fields.clientName || '[Client Name]',
    clientEmail: fields.clientEmail || '[Client Email]',
    sessionType: fields.sessionType || '[Session Type]',
    sessionDate: fmtD(fields.sessionDate),
    sessionTime: fmtT(fields.sessionTime),
    location: fields.location || '[Location]',
    totalFee: totalFee ? `$${totalFee.toLocaleString()}.00` : '[Total Fee]',
    retainerAmount: totalFee ? `$${retainerAmt.toLocaleString()}.00` : '[Retainer]',
    remainingAmount: totalFee ? `$${remainingAmt.toLocaleString()}.00` : '[Remaining]',
    remainingDueDate: fmtD(fields.remainingDueDate),
  }), [fields, totalFee, retainerAmt, remainingAmt])

  const previewText = useMemo(() => fillContract(CONTRACT_TEMPLATE, contractFields), [contractFields])

  const save = () => {
    const k = {
      id: uid(),
      client: fields.clientName || 'Unknown',
      clientId: client?.id || null,
      type: fields.contractTitle,
      sent: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'pending',
      body: previewText,
    }
    onSave(k)
  }

  const inp = { ...T.formInput, fontSize: 13.5 }
  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={T.modalTitle}>{client ? `Contract — ${client.name}` : 'New Contract'}</div>
        <button onClick={onClose} style={{ ...T.btnGhost, fontSize: 20, color: C.muted }}>×</button>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'inline-flex', background: C.surface2, borderRadius: 8, padding: 3, gap: 2, marginBottom: 20 }}>
        {[['fields', 'Fill in details'], ['preview', 'Preview']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: tab === v ? C.surface : 'transparent', color: C.text, fontWeight: tab === v ? 500 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
        ))}
      </div>

      {tab === 'fields' ? (
        <div>
          {/* Contract title */}
          <Field label="Contract title">
            <input style={inp} value={fields.contractTitle} onChange={e => set('contractTitle', e.target.value)} />
          </Field>

          <Section title="Session details">
            <div style={row2} className="form-row-2">
              <Field label="Effective date">
                <input style={inp} type="date" value={fields.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} />
              </Field>
              <Field label="Session type">
                <input style={inp} value={fields.sessionType} onChange={e => set('sessionType', e.target.value)} />
              </Field>
            </div>
            <div style={row2} className="form-row-2">
              <Field label="Session date">
                <input style={inp} type="date" value={fields.sessionDate} onChange={e => set('sessionDate', e.target.value)} />
              </Field>
              <Field label="Session time">
                <input style={inp} type="time" value={fields.sessionTime} onChange={e => set('sessionTime', e.target.value)} />
              </Field>
            </div>
            <Field label="Location">
              <input style={inp} value={fields.location} onChange={e => set('location', e.target.value)} />
            </Field>
          </Section>

          <Section title="Client information">
            <div style={row2} className="form-row-2">
              <Field label="Client full name">
                <input style={inp} value={fields.clientName} onChange={e => set('clientName', e.target.value)} />
              </Field>
              <Field label="Client email">
                <input style={inp} type="email" value={fields.clientEmail} onChange={e => set('clientEmail', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Fees and payment">
            <div style={row2} className="form-row-2">
              <Field label="Total fee ($)">
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13, pointerEvents: 'none' }}>$</span>
                  <input style={{ ...inp, paddingLeft: 22 }} type="number" placeholder="0.00" value={fields.totalFee} onChange={e => set('totalFee', e.target.value)} />
                </div>
              </Field>
              <Field
                label="Retainer %"
                hint={totalFee > 0 ? `$${retainerAmt.toLocaleString()} due on signing · $${remainingAmt.toLocaleString()} remaining` : ''}
              >
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inp, paddingRight: 28 }} type="number" min="0" max="100" value={fields.retainerPct} onChange={e => set('retainerPct', e.target.value)} />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13, pointerEvents: 'none' }}>%</span>
                </div>
              </Field>
            </div>
            <Field label="Remaining balance due date">
              <input style={{ ...inp, maxWidth: 220 }} type="date" value={fields.remainingDueDate} onChange={e => set('remainingDueDate', e.target.value)} />
            </Field>
          </Section>

          <Section title="Terms and contact">
            <div style={row2} className="form-row-2">
              <Field label="Photographer email">
                <input style={inp} value={fields.photographerEmail} onChange={e => set('photographerEmail', e.target.value)} />
              </Field>
              <Field label="Governing state">
                <input style={inp} value={fields.governingState} onChange={e => set('governingState', e.target.value)} />
              </Field>
            </div>
          </Section>
        </div>
      ) : (
        <div style={{ background: C.surface2, borderRadius: 10, padding: '20px 24px', fontSize: 13, lineHeight: 1.85, color: C.text, whiteSpace: 'pre-wrap', fontWeight: 300, border: `1px solid ${C.border}`, maxHeight: 420, overflowY: 'auto' }}>
          {previewText}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
        <button style={T.btn} onClick={onClose}>Cancel</button>
        {tab === 'fields' && <button style={T.btn} onClick={() => setTab('preview')}>Preview</button>}
        <button style={T.btnPrimary} onClick={save}>Save contract</button>
      </div>
    </div>
  )
}
