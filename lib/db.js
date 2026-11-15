/**
 * lib/db.js — PIBASE data layer
 *
 * All CRUD for the app goes through these functions.
 * Uses the authenticated PIBASE project for studio data.
 */
import { pibase } from './pibase'
import { DEFAULT_STAGES, DEFAULT_SESSION_TYPES, DEFAULT_FORM_SETTINGS, DEFAULT_AVAILABILITY } from './data'
import { invoiceStatus } from './invoices'
import { DEFAULT_BUSINESS_TYPE, isBusinessType } from './businessTypes'

const USE_DB = !!pibase

// ── Helpers ───────────────────────────────────────────────────────

function mapClient(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    type: row.type || '',
    status: row.status || 'inquiry',
    date: row.date || '',
    notes: row.notes || '',
    archived: row.archived || false,
  }
}

function mapInvoice(row) {
  return {
    id: row.id,
    number: row.number || null,
    client: row.client_name || '',
    clientId: row.client_id || null,
    amount: Number(row.amount) || 0,
    paid: Number(row.paid) || 0,
    due: row.due || '',
    status: row.status || 'unpaid',
    note: row.note || '',
    lineItems: Array.isArray(row.line_items) ? row.line_items : row.line_items?.items || [],
    lineData: Array.isArray(row.line_items) ? { items: row.line_items } : row.line_items || null,
    paymentMethod: row.payment_method || null,
    paidAt: row.paid_at || null,
    paymentIntentId: row.payment_intent_id || null,
    createdAt: row.created_at || '',
  }
}

function mapBooking(row) {
  return {
    id: row.id,
    client: row.client_name || '',
    clientId: row.client_id || null,
    type: row.type || '',
    date: row.date || '',
    time: row.time || '',
    location: row.location || '',
    status: row.status || 'pending',
    notes: row.notes || '',
    sessionTypeId: row.session_type_id || null,
    durationMinutes: row.duration_minutes || 60,
    price: row.price == null ? null : Number(row.price),
    discountCode: row.discount_code || '',
    discountAmount: Number(row.discount_amount) || 0,
    finalPrice: row.final_price == null ? null : Number(row.final_price),
    source: row.source || 'manual',
    discountReversed: !!row.discount_reversed,
  }
}

function mapSessionType(row) {
  return { id: row.id, name: row.name, slug: row.slug, category: row.category,
    description: row.description || '', imageUrl: row.image_url || '',
    durationMinutes: row.duration_minutes, price: Number(row.price),
    location: row.location || '', color: row.color || '#17bda5',
    public: !!row.public, sortOrder: row.sort_order || 0 }
}

function mapDiscount(row) {
  return { id: row.id, name: row.name, code: row.code, kind: row.kind,
    mode: row.mode, amount: Number(row.amount), balance: row.balance == null ? null : Number(row.balance),
    uses: row.uses || 0, maxUses: row.max_uses, startsOn: row.starts_on || '',
    endsOn: row.ends_on || '', active: !!row.active }
}

function mapContract(row) {
  return {
    id: row.id,
    client: row.client_name || '',
    clientId: row.client_id || null,
    type: row.type || '',
    body: row.body || '',
    status: row.status || 'pending',
    sent: row.sent || '',
    signedBy: row.signed_by || null,
    signedAt: row.signed_at || null,
    fields: row.fields || {},
  }
}

function mapMessage(row) {
  return {
    id: row.id,
    from: row.from_name || '',
    clientId: row.client_id || null,
    thread: row.thread || [],
    unread: row.unread || false,
  }
}

function mapQuote(row) {
  const raw = row.line_items && !Array.isArray(row.line_items) ? row.line_items : { items: row.line_items || [] }
  // The quote number and the invoice created on acceptance live alongside
  // the line items so no schema change is needed.
  const { number = null, invoiceId = null, acceptedAt = null, ...details } = raw
  return { id: row.id, client: row.client_name || '', clientId: row.client_id || null,
    amount: Number(row.amount) || 0, status: row.status || 'draft', lineData: details,
    number, invoiceId, acceptedAt,
    validUntil: row.note || '', createdAt: row.created_at || '' }
}

function mapQuestionnaire(row) {
  const details = row.questions && !Array.isArray(row.questions) ? row.questions : { items: row.questions || [] }
  return { id: row.id, client: row.client_name || '', clientId: row.client_id || null,
    title: details.title || 'Questionnaire', questions: details.items || [],
    answers: row.answers || {}, status: row.status || 'sent', createdAt: row.created_at || '' }
}

// ── Load all data for a user ───────────────────────────────────────

export async function loadUserData(userId) {
  if (!USE_DB) throw new Error('PIBASE is not configured')

  const results = await Promise.all([
    pibase.from('studio_settings').select('*').eq('user_id', userId).single(),
    pibase.from('clients').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    pibase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    pibase.from('bookings').select('*').eq('user_id', userId).order('date', { ascending: true }),
    pibase.from('contracts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    pibase.from('quotes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    pibase.from('questionnaires').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    pibase.from('messages').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    pibase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    pibase.from('session_catalog').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
    pibase.from('discount_codes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ])
  const failed = results.find(result => result.error)
  if (failed) throw new Error(`Unable to load PIBASE data: ${failed.error.message}`)
  const [
    { data: settingsRows },
    { data: clientRows },
    { data: invoiceRows },
    { data: bookingRows },
    { data: contractRows },
    { data: quoteRows },
    { data: questionnaireRows },
    { data: messageRows },
    { data: leadRows },
    { data: sessionCatalogRows },
    { data: discountRows },
  ] = results

  const settings = settingsRows || {}
  const branding = settings.branding || {}

  return {
    // The business type decides the app's wording; the business name and
    // contact details pre-fill contracts. Both are saved from Settings.
    businessType:     isBusinessType(branding.businessType) ? branding.businessType : DEFAULT_BUSINESS_TYPE,
    businessTypeSaved: isBusinessType(branding.businessType),
    branding:         { businessName: branding.businessName || '', studioEmail: branding.studioEmail || '', address: branding.address || '', phone: branding.phone || '', ownerName: branding.ownerName || '' },
    stages:           settings.stages         || DEFAULT_STAGES,
    sessionTypes:     settings.session_types  || DEFAULT_SESSION_TYPES,
    sessionCatalog:   (sessionCatalogRows || []).map(mapSessionType),
    availability:     settings.availability || DEFAULT_AVAILABILITY,
    discounts:        (discountRows || []).map(mapDiscount),
    formSettings:     settings.form_settings  || DEFAULT_FORM_SETTINGS,
    clients:          (clientRows || []).map(mapClient),
    invoices:         (invoiceRows || []).map(mapInvoice),
    bookings:         (bookingRows || []).map(mapBooking),
    contracts:        (contractRows || []).map(mapContract),
    quotes:           (quoteRows || []).map(mapQuote),
    questionnaires:   (questionnaireRows || []).map(mapQuestionnaire),
    messages:         (messageRows || []).map(mapMessage),
    leads:            leadRows || [],
  }
}

// ── Save settings ─────────────────────────────────────────────────

export async function saveSettings(userId, { stages, sessionTypes, formSettings, availability }) {
  if (!USE_DB) return
  const { error } = await pibase.from('studio_settings').upsert({
    user_id: userId,
    stages,
    session_types: sessionTypes,
    form_settings: formSettings,
    availability,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw new Error(`Unable to save settings: ${error.message}`)
}

// ── Clients ───────────────────────────────────────────────────────

export async function upsertClient(userId, client) {
  if (!USE_DB) return client
  const { data, error } = await pibase.from('clients').upsert({
    id: client.id,
    user_id: userId,
    name: client.name,
    email: client.email || null,
    phone: client.phone || null,
    type: client.type || null,
    status: client.status || 'inquiry',
    date: client.date || null,
    notes: client.notes || null,
    archived: client.archived || false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select().single()
  if (error) console.error('[db] upsertClient', error)
  return data ? mapClient(data) : client
}

export async function deleteClient(userId, clientId) {
  if (!USE_DB) return
  await pibase.from('clients').delete().eq('id', clientId).eq('user_id', userId)
}

// ── Invoices ──────────────────────────────────────────────────────

export async function upsertInvoice(userId, inv) {
  if (!USE_DB) return inv
  const { data, error } = await pibase.from('invoices').upsert({
    id: inv.id,
    user_id: userId,
    client_id: inv.clientId || null,
    client_name: inv.client,
    amount: inv.amount,
    paid: inv.paid || 0,
    due: inv.due || null,
    status: inv.status || 'unpaid',
    note: inv.note || null,
    line_items: inv.lineData || inv.lineItems || [],
    payment_method: inv.paymentMethod || null,
    paid_at: inv.paidAt || null,
    payment_intent_id: inv.paymentIntentId || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select().single()
  if (error) console.error('[db] upsertInvoice', error)
  return data ? mapInvoice(data) : inv
}

export async function deleteInvoice(userId, invoiceId) {
  if (!USE_DB) return
  await pibase.from('invoices').delete().eq('id', invoiceId).eq('user_id', userId)
}

// ── Bookings ──────────────────────────────────────────────────────

export async function upsertBooking(userId, booking) {
  if (!USE_DB) return booking
  const { data, error } = await pibase.from('bookings').upsert({
    id: booking.id,
    user_id: userId,
    client_id: booking.clientId || null,
    client_name: booking.client,
    type: booking.type || null,
    date: booking.date || null,
    time: booking.time || null,
    location: booking.location || null,
    status: booking.status || 'pending',
    notes: booking.notes || null,
    session_type_id: booking.sessionTypeId || null,
    duration_minutes: booking.durationMinutes || 60,
    price: booking.price ?? null,
    discount_code: booking.discountCode || null,
    discount_amount: booking.discountAmount || 0,
    final_price: booking.finalPrice ?? null,
    source: booking.source || 'manual',
  }, { onConflict: 'id' }).select().single()
  if (error) console.error('[db] upsertBooking', error)
  return data ? mapBooking(data) : booking
}

export async function deleteBooking(userId, bookingId) {
  if (!USE_DB) return
  await pibase.from('bookings').delete().eq('id', bookingId).eq('user_id', userId)
}

// ── Contracts ─────────────────────────────────────────────────────

export async function upsertContract(userId, contract) {
  if (!USE_DB) return contract
  const { data, error } = await pibase.from('contracts').upsert({
    id: contract.id,
    user_id: userId,
    client_id: contract.clientId || null,
    client_name: contract.client,
    type: contract.type || null,
    body: contract.body || null,
    status: contract.status || 'pending',
    sent: contract.sent || null,
    signed_by: contract.signedBy || null,
    signed_at: contract.signedAt || null,
    fields: contract.fields || {},
  }, { onConflict: 'id' }).select().single()
  if (error) console.error('[db] upsertContract', error)
  return data ? mapContract(data) : contract
}

export async function deleteContract(userId, contractId) {
  if (!USE_DB) return
  await pibase.from('contracts').delete().eq('id', contractId).eq('user_id', userId)
}

// ── Messages ──────────────────────────────────────────────────────

export async function upsertMessage(userId, message) {
  if (!USE_DB) return message
  const { data, error } = await pibase.from('messages').upsert({
    id: message.id,
    user_id: userId,
    client_id: message.clientId || null,
    from_name: message.from,
    thread: message.thread || [],
    unread: message.unread || false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select().single()
  if (error) console.error('[db] upsertMessage', error)
  return data ? mapMessage(data) : message
}

// ── Leads ─────────────────────────────────────────────────────────

export async function insertLead(userId, lead) {
  if (!USE_DB) return lead
  const { error } = await pibase.from('leads').insert({
    user_id: userId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    interest: lead.interest,
    message: lead.message,
    source: 'contact_form',
  })
  if (error) console.error('[db] insertLead', error)
}

// ── Sync engine ───────────────────────────────────────────────────
// Saves what changed in this tab since the last save (debounced from
// pages/index.js). Several people work on the same records at once: the
// owner in more than one tab, clients signing, paying, answering and
// messaging from their links. So this tab only ever sends the fields it
// changed, never a whole stale record:
//   • an update carries just the changed columns, and a record deleted
//     elsewhere is left deleted (never written back);
//   • fields clients and Stripe write on the server are merged, not
//     overwritten: payments, contract signatures, accepted quotes and their
//     invoice, questionnaire answers, conversation messages;
//   • settings save only the setting that changed.

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const SETTINGS_COLUMNS = { stages: 'stages', sessionTypes: 'session_types', formSettings: 'form_settings', availability: 'availability' }
const SKIP = new Set(['id', 'user_id', 'updated_at'])
const CONTRACT_SERVER_FIELDS = ['studioSignature', 'copySentAt', 'copySentTo', 'signerEmail', 'signedVia', 'signatureMethod', 'signatureData']

function changedColumns(before, after) {
  const out = {}
  for (const [column, value] of Object.entries(after)) if (!SKIP.has(column) && !same(before[column], value)) out[column] = value
  return out
}

function syncPlan(userId) {
  const now = () => new Date().toISOString()
  return [
    { key: 'clients', table: 'clients', stamp: true, toRow: c => ({ id: c.id, user_id: userId, name: c.name, email: c.email || null, phone: c.phone || null, type: c.type || null, status: c.status || 'inquiry', date: c.date || null, notes: c.notes || null, archived: !!c.archived }) },
    { key: 'sessionCatalog', table: 'session_catalog', toRow: s => ({ id: s.id, user_id: userId, name: s.name, slug: s.slug, category: s.category || 'General', description: s.description || '', image_url: s.imageUrl || null, duration_minutes: s.durationMinutes || 60, price: s.price || 0, location: s.location || '', color: s.color || '#17bda5', public: !!s.public, sort_order: s.sortOrder || 0 }) },
    { key: 'invoices', table: 'invoices', stamp: true, merge: mergeInvoice, toRow: i => ({ id: i.id, user_id: userId, client_id: i.clientId || null, client_name: i.client, number: i.number || null, amount: i.amount || 0, paid: i.paid || 0, due: i.due || null, status: i.status || 'unpaid', note: i.note || null, line_items: i.lineData || i.lineItems || [], payment_method: i.paymentMethod || null, paid_at: i.paidAt || null, payment_intent_id: i.paymentIntentId || null }) },
    { key: 'bookings', table: 'bookings', toRow: b => ({ id: b.id, user_id: userId, client_id: b.clientId || null, client_name: b.client, type: b.type || null, date: b.date || null, time: b.time || null, location: b.location || null, status: b.status || 'pending', notes: b.notes || null, session_type_id: b.sessionTypeId || null, duration_minutes: b.durationMinutes || 60, price: b.price ?? null, discount_code: b.discountCode || null, discount_amount: b.discountAmount || 0, final_price: b.finalPrice ?? null, source: b.source || 'manual' }) },
    // The public booking transaction owns redemptions: never send uses or balances back.
    { key: 'discounts', table: 'discount_codes', serverOwned: ['uses', 'balance'], toRow: c => ({ id: c.id, user_id: userId, name: c.name, code: c.code, kind: c.kind, mode: c.mode || 'fixed', amount: c.amount, balance: c.balance ?? null, uses: c.uses || 0, max_uses: c.maxUses ?? null, starts_on: c.startsOn || null, ends_on: c.endsOn || null, active: !!c.active }) },
    { key: 'contracts', table: 'contracts', merge: mergeContract, toRow: k => ({ id: k.id, user_id: userId, client_id: k.clientId || null, client_name: k.client, type: k.type || null, body: k.body || null, status: k.status || 'pending', sent: k.sent || null, signed_by: k.signedBy || null, signed_at: k.signedAt || null, fields: k.fields || {} }) },
    { key: 'quotes', table: 'quotes', merge: mergeQuote, toRow: q => ({ id: q.id, user_id: userId, client_id: q.clientId || null, client_name: q.client, amount: q.amount || 0, status: q.status || 'draft', line_items: { ...(q.lineData || { items: q.lineItems || [] }), number: q.number || null, invoiceId: q.invoiceId || null, acceptedAt: q.acceptedAt || null }, note: q.validUntil || null }) },
    { key: 'questionnaires', table: 'questionnaires', merge: mergeQuestionnaire, toRow: q => ({ id: q.id, user_id: userId, client_id: q.clientId || null, client_name: q.client, questions: { title: q.title || '', items: q.questions || [] }, answers: q.answers || {}, status: q.status || 'sent' }) },
    { key: 'messages', table: 'messages', stamp: true, merge: mergeMessages, toRow: m => ({ id: m.id, user_id: userId, client_id: m.clientId || null, from_name: m.from, thread: m.thread || [], unread: !!m.unread }) },
  ].map(item => ({ ...item, now }))
}

// ── Merges: `patch` holds this tab's changed columns, `server` the row as it
// is now. They return the patch to send.

// Payments recorded elsewhere (another tab, Stripe) are kept and added up.
function mergeInvoice(patch, server) {
  if (!('paid' in patch) && !('line_items' in patch)) return patch
  const serverData = server.line_items && !Array.isArray(server.line_items) ? server.line_items : { items: server.line_items || [] }
  const localData = patch.line_items !== undefined ? (patch.line_items && !Array.isArray(patch.line_items) ? patch.line_items : { items: patch.line_items || [] }) : serverData
  const local = new Set((localData.payments || []).map(p => p.id))
  const missing = (serverData.payments || []).filter(p => p.id && !local.has(p.id))
  if (!missing.length) return patch
  const amount = Number(patch.amount ?? server.amount) || 0
  const paidLocal = patch.paid !== undefined ? Number(patch.paid) || 0 : Number(server.paid) || 0
  const paid = Math.min(amount, Math.round((paidLocal + missing.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)) * 100) / 100)
  return { ...patch, line_items: { ...localData, payments: [...(localData.payments || []), ...missing] }, paid, status: invoiceStatus(amount, paid) }
}

// Signatures and copy markers written on the server are kept; a signed
// contract never goes back to pending.
function mergeContract(patch, server) {
  const out = { ...patch }
  if (out.fields) {
    const fields = { ...out.fields }
    for (const name of CONTRACT_SERVER_FIELDS) if (server.fields?.[name] && !fields[name]) fields[name] = server.fields[name]
    out.fields = fields
  }
  if (server.status === 'signed' && 'status' in out && out.status !== 'signed') {
    delete out.status; delete out.signed_by; delete out.signed_at
  }
  return out
}

// A quote the client accepted stays accepted, with its invoice.
function mergeQuote(patch, server) {
  const out = { ...patch }
  const serverData = server.line_items && !Array.isArray(server.line_items) ? server.line_items : {}
  if (server.status === 'accepted' && 'status' in out && out.status !== 'accepted') delete out.status
  if (out.line_items && serverData.invoiceId && !out.line_items.invoiceId) {
    out.line_items = { ...out.line_items, invoiceId: serverData.invoiceId, acceptedAt: serverData.acceptedAt || out.line_items.acceptedAt || null }
  }
  return out
}

// A client's submitted answers are never replaced by this tab's copy.
function mergeQuestionnaire(patch, server) {
  if (server.status !== 'completed') return patch
  const out = { ...patch }
  if ('status' in out && out.status !== 'completed') delete out.status
  if ('answers' in out) delete out.answers
  return out
}

// Messages that arrived on the server (client chat, email replies) are kept.
function mergeMessages(patch, server) {
  if (!('thread' in patch)) return patch
  const local = new Set((patch.thread || []).map(entry => entry.id))
  const missing = (Array.isArray(server.thread) ? server.thread : []).filter(entry => !local.has(entry.id))
  if (!missing.length) return patch
  return { ...patch, thread: [...patch.thread, ...missing].sort((a, b) => (a.at || '').localeCompare(b.at || '')), unread: true }
}

async function insertRows(table, rows, update) {
  if (!rows.length) return
  const { error } = await pibase.from(table).insert(rows)
  if (!error) return
  // One bad row shouldn't hold the rest back: retry them one by one.
  for (const row of rows) {
    let { error: rowError } = await pibase.from(table).insert(row)
    if (!rowError) continue
    if (rowError.code === '23505') { await update(row); continue }  // saved by an earlier try
    if (rowError.code === '23503' && row.client_id) {
      // Its client was deleted elsewhere: keep the document without the link.
      ;({ error: rowError } = await pibase.from(table).insert({ ...row, client_id: null }))
      if (!rowError) continue
    }
    throw new Error(`Unable to save ${table}: ${rowError.message}`)
  }
}

export async function syncCollections(userId, prev, next) {
  if (!USE_DB) return
  const failures = []

  const settingsPatch = {}
  for (const [key, column] of Object.entries(SETTINGS_COLUMNS)) if (!same(prev[key], next[key])) settingsPatch[column] = next[key]
  if (Object.keys(settingsPatch).length) {
    const { data, error } = await pibase.from('studio_settings').update({ ...settingsPatch, updated_at: new Date().toISOString() }).eq('user_id', userId).select('user_id')
    if (error) failures.push(`settings: ${error.message}`)
    else if (!data?.length) await saveSettings(userId, next)
  }

  const plan = syncPlan(userId)
  // Parents first (clients before their documents); client deletes last.
  for (const { key, table, toRow, merge, serverOwned = [], stamp, now } of plan) {
    try {
      const before = new Map((prev[key] || []).map(item => [item.id, item]))
      const after = new Map((next[key] || []).map(item => [item.id, item]))
      const added = (next[key] || []).filter(item => !before.has(item.id))
      const changed = (next[key] || []).filter(item => before.has(item.id) && !same(before.get(item.id), item))
      const removed = (prev[key] || []).filter(item => !after.has(item.id)).map(item => item.id)

      const sendPatch = async (id, patch) => {
        if (!Object.keys(patch).length) return
        const { error } = await pibase.from(table).update(stamp ? { ...patch, updated_at: now() } : patch).eq('id', id).eq('user_id', userId).select('id')
        if (error) throw new Error(`Unable to save ${table}: ${error.message}`)
        // No row updated: it was deleted elsewhere. Leave it deleted.
      }
      const patches = changed.map(item => {
        const patch = changedColumns(toRow(before.get(item.id)), toRow(item))
        for (const column of serverOwned) delete patch[column]
        return { id: item.id, patch }
      }).filter(entry => Object.keys(entry.patch).length)

      if (merge && patches.length) {
        const { data: current, error } = await pibase.from(table).select('*').in('id', patches.map(entry => entry.id)).eq('user_id', userId)
        if (error) throw new Error(`Unable to save ${table}: ${error.message}`)
        const server = new Map((current || []).map(row => [row.id, row]))
        for (const { id, patch } of patches) if (server.has(id)) await sendPatch(id, merge(patch, server.get(id)))
      } else {
        // The same change to many rows (e.g. a stage switch) goes in one request.
        const groups = new Map()
        for (const { id, patch } of patches) {
          const groupKey = JSON.stringify(patch)
          groups.set(groupKey, [...(groups.get(groupKey) || []), id])
        }
        for (const [groupKey, ids] of groups) {
          const patch = JSON.parse(groupKey)
          for (let i = 0; i < ids.length; i += 100) {
            const { error } = await pibase.from(table).update(stamp ? { ...patch, updated_at: now() } : patch).in('id', ids.slice(i, i + 100)).eq('user_id', userId)
            if (error) throw new Error(`Unable to save ${table}: ${error.message}`)
          }
        }
      }

      const fullRow = item => { const row = toRow(item); return stamp ? { ...row, updated_at: now() } : row }
      await insertRows(table, added.map(fullRow), async row => {
        const existing = before.get(row.id) || null
        const patch = changedColumns(existing ? toRow(existing) : {}, row)
        for (const column of serverOwned) delete patch[column]
        await sendPatch(row.id, patch)
      })

      if (removed.length && key !== 'clients') {
        const { error } = await pibase.from(table).delete().in('id', removed).eq('user_id', userId)
        if (error) throw new Error(`Unable to delete ${table}: ${error.message}`)
      }
    } catch (error) {
      failures.push(error.message)
    }
  }
  const clientDeletes = (prev.clients || []).filter(c => !(next.clients || []).some(n => n.id === c.id)).map(c => c.id)
  if (clientDeletes.length) {
    const { error } = await pibase.from('clients').delete().in('id', clientDeletes).eq('user_id', userId)
    if (error) failures.push(`Unable to delete clients: ${error.message}`)
  }
  if (failures.length) throw new Error(failures.join('; '))
}
