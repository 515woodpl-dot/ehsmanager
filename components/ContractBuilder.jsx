import { useState, useMemo } from 'react'
import { T, C } from '../lib/tokens'
import { AGREEMENTS, contractTemplateFor, fillContract, highlightValues } from '../lib/contractTemplate'
import { WEB_PHOTO_SECTIONS, webPhotoDefaults, webPhotoValues } from '../lib/webPhotoContract'
import { CREATIVE_SECTIONS, CREATIVE_SERVICES, appliesTo, creativeAgreement, creativeDefaults } from '../lib/creativeContract'
import { businessTerms, useTerms } from '../lib/businessTypes'
import ContractDocument from './ContractDocument'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })

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

// Find a client's most relevant booking (next upcoming, else most recent)
function pickBooking(bookings = [], c) {
  const mine = bookings.filter(b => b.clientId === c?.id || (c?.name && b.client === c.name))
  if (!mine.length) return null
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = mine.filter(b => b.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  if (upcoming.length) return upcoming[0]
  return [...mine].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
}

// Find a client's most relevant invoice (latest unpaid/partial, else latest)
function pickInvoice(invoices = [], c) {
  const mine = invoices.filter(i => i.clientId === c?.id || (c?.name && i.client === c.name))
  if (!mine.length) return null
  const open = mine.filter(i => i.status !== 'paid')
  return (open.length ? open : mine)[0]
}

const isWeb = terms => terms.id === 'webdesign'
// The wording (meeting / session…) for an agreement: the combined web design
// and photography agreement reads as a web design project.
const termsFor = agreement => businessTerms(agreement === 'photography' || agreement === 'creative' ? agreement : 'webdesign')

// Build the full field set for a client (or blank defaults)
function buildFields(c, data, terms, agreement) {
  const booking = c ? pickBooking(data?.bookings, c) : null
  const invoice = c ? pickInvoice(data?.invoices, c) : null
  const sessionType = booking ? (data?.sessionCatalog || []).find(item => item.id === booking.sessionTypeId || item.name === booking.type) : null
  const today = new Date().toISOString().slice(0, 10)
  return {
    fields: {
      contractTitle: AGREEMENTS[agreement]?.title || terms.contractTitle,
      businessName: data?.branding?.businessName || '',
      effectiveDate: today,
      clientName: c?.name || '',
      clientEmail: c?.email || '',
      sessionType: (isWeb(terms) ? c?.type || booking?.type : booking?.type || c?.type) || terms.projectTypes[0] || '',
      sessionDate: (isWeb(terms) ? c?.date || booking?.date : booking?.date || c?.date) || '',
      sessionTime: booking?.time || '',
      location: booking?.location || '',
      totalFee: invoice?.amount ? String(invoice.amount) : '',
      retainerPct: '50',
      remainingDueDate: invoice?.due || terms.remainingDue,
      governingState: 'New Jersey',
      photographerEmail: data?.branding?.studioEmail || '',
      photographerCity: data?.branding?.address || '',
      projectScope: '',
      websiteAddress: '',
      // Which agreement this is, so reopening it keeps the same wording.
      template: agreement,
      agreement,
      ...(agreement === 'webphoto' ? webPhotoDefaults({ client: c, booking, invoice, branding: data?.branding }) : {}),
      ...(agreement === 'creative' ? creativeDefaults({ client: c, booking, invoice, branding: data?.branding }) : {}),
      headerImageUrl: sessionType?.imageUrl || '',
    },
    sources: { booking, invoice },
  }
}

export default function ContractBuilder({ client, contract = null, data, onSave, onClose }) {
  // Editing keeps what was saved; a new contract auto-fills from the client.
  // A saved contract keeps the agreement it was written with (contracts from
  // before business types are photography agreements).
  const currentTerms = useTerms()
  const [agreement, setAgreement] = useState(contract?.fields ? (AGREEMENTS[contract.fields.agreement] ? contract.fields.agreement : AGREEMENTS[contract.fields.template] ? contract.fields.template : 'photography') : AGREEMENTS[currentTerms.id] ? currentTerms.id : 'photography')
  const terms = termsFor(agreement)
  const web = isWeb(terms)
  // Agreements with their own field list (the rest use the classic form).
  const wp = agreement === 'webphoto' || agreement === 'creative'
  const built = buildFields(client, data, terms, agreement)
  const initial = contract?.fields ? { fields: { ...built.fields, ...contract.fields, template: agreement, agreement }, sources: built.sources } : built
  const [selectedClientId, setSelectedClientId] = useState(client?.id || '')
  const [fields, setFields] = useState(initial.fields)
  const [sources, setSources] = useState(initial.sources)
  const [touched, setTouched] = useState(!!contract) // has the user hand-edited?

  const [tab, setTab] = useState('fields')
  const set = (k, v) => { setTouched(true); setFields(f => ({ ...f, [k]: v })) }

  const activeClient = data?.clients?.find(c => c.id === selectedClientId) || client || null

  const selectClient = (id) => {
    if (touched && !confirm('Switching client will refill the form and overwrite your edits. Continue?')) return
    setSelectedClientId(id)
    const c = data?.clients?.find(x => x.id === id) || null
    const next = buildFields(c, data, terms, agreement)
    setFields(next.fields)
    setSources(next.sources)
    setTouched(false)
  }

  const chooseAgreement = next => {
    if (next === agreement) return
    if (touched && !confirm('Switching the agreement will refill the form and overwrite your edits. Continue?')) return
    const c = data?.clients?.find(x => x.id === selectedClientId) || null
    const built = buildFields(c, data, termsFor(next), next)
    setAgreement(next); setFields(built.fields); setSources(built.sources); setTouched(false)
  }

  // Human-readable summary of what auto-filled
  const fillSummary = (() => {
    if (!activeClient) return null
    const bits = ['contact details']
    if (sources.booking) {
      const d = sources.booking.date ? new Date(sources.booking.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
      bits.push(d ? `${terms.sessionLower} on ${d}` : `${terms.sessionLower} details`)
    }
    if (sources.invoice) bits.push(`fee from invoice ${sources.invoice.number || sources.invoice.id}`)
    return `Auto-filled ${bits.join(' · ')}`
  })()

  const totalFee = Number(fields.totalFee)
  const retainerPct = Number(fields.retainerPct)
  const retainerAmt = Math.round(totalFee * retainerPct) / 100
  const remainingAmt = Math.round((totalFee - retainerAmt) * 100) / 100
  const money = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

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

  // For agreements with their own fields: the text, what's missing, what
  // doesn't add up, the money summary and the details to highlight.
  const wpResult = useMemo(() => {
    if (agreement === 'creative') {
      const result = creativeAgreement(fields)
      return { ...result, sections: CREATIVE_SECTIONS.filter(section => appliesTo(section, result.services)).map(section => ({ ...section, fields: section.fields.filter(field => appliesTo(field, result.services)) })) }
    }
    if (agreement !== 'webphoto') return null
    const result = webPhotoValues(fields)
    const values = { ...result.values, contractTitle: fields.contractTitle || '[Contract Title]', effectiveDate: fmtD(fields.effectiveDate), clientName: fields.clientName || '[Client Name]', businessName: fields.businessName || '[Business Name]', governingState: fields.governingState || '[Governing State]' }
    return { ...result, sections: WEB_PHOTO_SECTIONS, text: fillContract(contractTemplateFor('webphoto'), values), highlights: [...result.highlights, fmtD(fields.effectiveDate)],
      money: { total: values.totalFee, deposit: values.depositAmount, milestone: values.milestoneAmount, final: values.finalAmount } }
  }, [fields, agreement])
  const contractFields = useMemo(() => wp ? {} : ({
    contractTitle: fields.contractTitle || '[Contract Title]',
    effectiveDate: fmtD(fields.effectiveDate),
    clientName: fields.clientName || '[Client Name]',
    clientEmail: fields.clientEmail || '[Client Email]',
    businessName: fields.businessName || '[Business Name]',
    sessionType: fields.sessionType || `[${terms.typeLabel}]`,
    projectScope: (fields.projectScope || '').trim() || `${fields.sessionType || 'Website'}, as described in the quote or proposal accepted by Client.`,
    websiteAddress: (fields.websiteAddress || '').trim() || 'To be confirmed',
    sessionDate: fmtD(fields.sessionDate),
    sessionTime: fmtT(fields.sessionTime),
    location: fields.location || '[Location]',
    totalFee: totalFee > 0 ? money(totalFee) : '[Total Fee]',
    retainerAmount: totalFee > 0 ? money(retainerAmt) : '[Retainer]',
    remainingAmount: totalFee > 0 ? money(remainingAmt) : '[Remaining]',
    remainingDueDate: fmtD(fields.remainingDueDate),
    photographerEmail: fields.photographerEmail || `[${terms.provider} Email]`,
    photographerCity: fields.photographerCity || `[${terms.provider} City]`,
    governingState: fields.governingState || '[Governing State]',
  }), [fields, totalFee, retainerAmt, remainingAmt, terms, wp, wpResult])

  const previewText = useMemo(() => wp ? wpResult.text : fillContract(contractTemplateFor(agreement), contractFields), [contractFields, agreement, wp, wpResult])
  const highlights = wp ? wpResult.highlights : highlightValues(contractFields)

  const save = () => {
    if (fields.headerImageUrl && !/^https:\/\//i.test(fields.headerImageUrl)) {
      alert('Contract header image must use a secure https:// URL, or be left blank.')
      setTab('fields')
      return
    }
    if (wp) {
      const issues = [
        ...(!activeClient ? ['a client'] : []),
        ...['clientName', 'clientEmail', 'businessName', 'photographerEmail', 'governingState'].filter(key => !(fields[key] || '').trim()).map(key => ({ clientName: 'the client name', clientEmail: 'the client email', businessName: 'your business name', photographerEmail: 'your business email', governingState: 'the governing state' })[key]),
        ...wpResult.missing.map(label => label.toLowerCase()),
        ...(wpResult.money.total.startsWith('[') && !wpResult.missing.some(label => /fee/i.test(label)) ? ['the fees'] : []),
      ]
      if (issues.length || wpResult.problems.length) {
        alert(`${issues.length ? `Please fill in: ${issues.slice(0, 6).join(', ')}${issues.length > 6 ? ` and ${issues.length - 6} more` : ''}.` : ''}${wpResult.problems.length ? `\n${wpResult.problems.join('. ')}.` : ''}`.trim())
        setTab('fields')
        return
      }
      onSave({
        ...(contract || {}), id: contract?.id || uid(), client: fields.clientName || 'Unknown', clientId: activeClient?.id || null, type: fields.contractTitle,
        sent: contract?.sent || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: contract?.status || 'pending', body: previewText,
        fields: { ...(contract?.fields || {}), ...fields, highlights },
      })
      return
    }
    // A photo session needs a time and place; a web project only a start date.
    const detailsMissing = !fields.sessionDate || (!web && (!fields.sessionTime || !fields.location.trim()))
    if (!activeClient || !fields.clientName.trim() || !fields.clientEmail.trim() || !(fields.businessName || '').trim() || !(fields.photographerEmail || '').trim() || detailsMissing || !fields.remainingDueDate || !Number.isFinite(totalFee) || totalFee <= 0 || !Number.isFinite(retainerPct) || retainerPct < 0 || retainerPct > 100) {
      alert(`Select a client and complete the client, ${web ? 'project' : 'session'}, payment and business details before saving.`)
      setTab('fields')
      return
    }
    const k = {
      ...(contract || {}),
      id: contract?.id || uid(),
      client: fields.clientName || 'Unknown',
      clientId: activeClient?.id || null,
      type: fields.contractTitle,
      sent: contract?.sent || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: contract?.status || 'pending',
      body: previewText,
      fields: { ...(contract?.fields || {}), ...fields, highlights },
    }
    onSave(k)
  }

  const inp = { ...T.formInput, fontSize: 13.5 }
  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={T.modalTitle}>{activeClient ? `Contract — ${activeClient.name}` : 'New Contract'}</div>
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
          {/* Client picker — auto-fills everything below */}
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>Client</label>
            <select
              style={{ ...T.formInput, fontSize: 13.5, background: C.surface }}
              value={selectedClientId}
              onChange={e => selectClient(e.target.value)}
            >
              <option value="">— Select a client to auto-fill —</option>
              {(data?.clients || []).filter(c => !c.archived).map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.type ? ` · ${c.type}` : ''}</option>
              ))}
            </select>
            {fillSummary && (
              <div style={{ fontSize: 12, color: C.green, marginTop: 8, fontWeight: 500 }}>{fillSummary}</div>
            )}
            {selectedClientId && (web ? !activeClient?.date : !sources.booking) && (
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 4 }}>{web ? 'Enter the project details below.' : 'No booking found — enter session date, time and location below.'}</div>
            )}
            {selectedClientId && !sources.invoice && (
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>No invoice found — enter the total fee below.</div>
            )}
          </div>

          {!contract && (
            <Field label="Agreement">
              <select style={inp} value={agreement} onChange={e => chooseAgreement(e.target.value)}>
                {Object.entries(AGREEMENTS).filter(([, item]) => !item.retired).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
              </select>
            </Field>
          )}

          {/* Contract title */}
          <Field label="Contract title">
            <input style={inp} value={fields.contractTitle} onChange={e => set('contractTitle', e.target.value)} />
          </Field>
          <Field label="Contract header image URL" hint={`Optional · auto-filled from the booked ${terms.serviceLower}. Use any HTTPS image or leave blank.`}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={inp} type="url" placeholder="https://…" value={fields.headerImageUrl || ''} onChange={e => set('headerImageUrl', e.target.value)} />
              {!!fields.headerImageUrl && <button type="button" style={T.btn} onClick={() => set('headerImageUrl', '')}>Remove</button>}
            </div>
          </Field>

          {!wp && <>
          <Section title={web ? 'Project details' : 'Session details'}>
            <div style={row2} className="form-row-2">
              <Field label="Effective date">
                <input style={inp} type="date" value={fields.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} />
              </Field>
              <Field label={terms.typeLabel}>
                <input style={inp} value={fields.sessionType} onChange={e => set('sessionType', e.target.value)} />
              </Field>
            </div>
            {web ? (
              <>
                <div style={row2} className="form-row-2">
                  <Field label="Project start date">
                    <input style={inp} type="date" value={fields.sessionDate} onChange={e => set('sessionDate', e.target.value)} />
                  </Field>
                  <Field label="Website address">
                    <input style={inp} placeholder="example.com · leave blank if not chosen yet" value={fields.websiteAddress || ''} onChange={e => set('websiteAddress', e.target.value)} />
                  </Field>
                </div>
                <Field label="Scope of work">
                  <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder="e.g. Design and build of a 5-page website with a contact form, mobile layouts and basic SEO setup. Leave blank to refer to the accepted quote." value={fields.projectScope || ''} onChange={e => set('projectScope', e.target.value)} />
                </Field>
              </>
            ) : (
              <>
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
              </>
            )}
          </Section>

          </>}

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

          {!wp && (
          <Section title="Fees and payment">
            <div style={row2} className="form-row-2">
              <Field label="Total fee ($)">
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13, pointerEvents: 'none' }}>$</span>
                  <input style={{ ...inp, paddingLeft: 22 }} type="number" placeholder="0.00" value={fields.totalFee} onChange={e => set('totalFee', e.target.value)} />
                </div>
              </Field>
              <Field
                label={web ? 'Deposit %' : 'Retainer %'}
                hint={totalFee > 0 ? `${money(retainerAmt)} due on signing · ${money(remainingAmt)} remaining` : ''}
              >
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inp, paddingRight: 28 }} type="number" min="0" max="100" value={fields.retainerPct} onChange={e => set('retainerPct', e.target.value)} />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13, pointerEvents: 'none' }}>%</span>
                </div>
              </Field>
            </div>
            <Field label="Remaining balance due date or milestone">
              <input style={{ ...inp, maxWidth: 300 }} type="text" value={fields.remainingDueDate} onChange={e => set('remainingDueDate', e.target.value)} />
            </Field>
          </Section>
          )}

          <Section title="Your business and terms">
            <div style={row2} className="form-row-2">
              <Field label="Business name">
                <input style={inp} value={fields.businessName || ''} onChange={e => set('businessName', e.target.value)} />
              </Field>
              <Field label="Business email">
                <input style={inp} value={fields.photographerEmail} onChange={e => set('photographerEmail', e.target.value)} />
              </Field>
            </div>
            <div style={row2} className="form-row-2">
              {!web && <Field label="Business city">
                <input style={inp} value={fields.photographerCity} onChange={e => set('photographerCity', e.target.value)} />
              </Field>}
              <Field label="Governing state">
                <input style={inp} value={fields.governingState} onChange={e => set('governingState', e.target.value)} />
              </Field>
            </div>
          </Section>
          {agreement === 'creative' && (
            <Section title="Services in this agreement">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {CREATIVE_SERVICES.map(item => {
                  const on = wpResult.services.includes(item.id)
                  return (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1px solid ${on ? C.text : C.border}`, background: on ? C.surface2 : C.surface, fontSize: 13.5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={on} onChange={() => set('services', on ? wpResult.services.filter(id => id !== item.id) : [...wpResult.services, item.id])} />
                      {item.label}
                    </label>
                  )
                })}
              </div>
              <div style={{ fontSize: 12, color: C.faint, marginBottom: 6 }}>Only the ticked services' sections, fees, timeline steps and clauses appear in the agreement.</div>
            </Section>
          )}
          {wp && wpResult.sections.map(section => (
            <Section key={section.title} title={section.title}>
              {section.hint && <div style={{ fontSize: 12, color: C.faint, margin: '-4px 0 10px' }}>{section.hint}</div>}
              <div style={row2} className="form-row-2">
                {section.fields.map(field => {
                  const value = fields[field.key] ?? ''
                  const empty = !String(value).trim()
                  return (
                    <Field key={field.key} label={field.label + (field.required ? ' *' : '')}>
                      {field.type === 'textarea'
                        ? <textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={value} placeholder={field.placeholder} onChange={e => set(field.key, e.target.value)} />
                        : <input style={{ ...inp, ...(field.required && empty ? { borderColor: C.amber } : {}) }} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? 'any' : undefined} value={value} placeholder={field.placeholder} onChange={e => set(field.key, e.target.value)} />}
                      {field.hint && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{field.hint}</div>}
                    </Field>
                  )
                })}
              </div>
            </Section>
          ))}
          {wp && wpResult.problems.length > 0 && <div style={{ fontSize: 12.5, color: C.red, marginBottom: 12 }}>{wpResult.problems.join('. ')}.</div>}
          {wp && <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>Fields marked * are needed before the agreement can be saved. Total {wpResult.money.total} · deposit {wpResult.money.deposit} · {agreement === 'creative' ? 'first approval' : 'design approval'} {wpResult.money.milestone} · final {wpResult.money.final}.</div>}
        </div>
      ) : (
        <div style={{ background: C.surface2, borderRadius: 10, padding: 12, border: `1px solid ${C.border}`, maxHeight: '65vh', overflowY: 'auto' }}>
          <ContractDocument body={previewText} headerImageUrl={fields.headerImageUrl} highlights={highlights} />
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
