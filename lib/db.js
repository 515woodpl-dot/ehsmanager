/**
 * lib/db.js — Supabase data layer
 *
 * All CRUD for the app goes through these functions.
 * Falls back to localStorage if Supabase is not configured.
 */
import { supabase } from './supabase'
import { STORAGE_KEY, seed, DEFAULT_STAGES, DEFAULT_SESSION_TYPES, DEFAULT_FORM_SETTINGS, DEFAULT_AVAILABILITY } from './data'

const USE_DB = !!supabase

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
  const details = row.line_items && !Array.isArray(row.line_items) ? row.line_items : { items: row.line_items || [] }
  return { id: row.id, client: row.client_name || '', clientId: row.client_id || null,
    amount: Number(row.amount) || 0, status: row.status || 'draft', lineData: details,
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
  if (!USE_DB) return null  // signal to use localStorage

  const results = await Promise.all([
    supabase.from('studio_settings').select('*').eq('user_id', userId).single(),
    supabase.from('clients').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('bookings').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('contracts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('quotes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('questionnaires').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('messages').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('session_catalog').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
    supabase.from('discount_codes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ])
  const failed = results.find(result => result.error)
  if (failed) throw new Error(`Unable to load Supabase data: ${failed.error.message}`)
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

  return {
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
  const { error } = await supabase.from('studio_settings').upsert({
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
  const { data, error } = await supabase.from('clients').upsert({
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
  await supabase.from('clients').delete().eq('id', clientId).eq('user_id', userId)
}

// ── Invoices ──────────────────────────────────────────────────────

export async function upsertInvoice(userId, inv) {
  if (!USE_DB) return inv
  const { data, error } = await supabase.from('invoices').upsert({
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
  await supabase.from('invoices').delete().eq('id', invoiceId).eq('user_id', userId)
}

// ── Bookings ──────────────────────────────────────────────────────

export async function upsertBooking(userId, booking) {
  if (!USE_DB) return booking
  const { data, error } = await supabase.from('bookings').upsert({
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
  await supabase.from('bookings').delete().eq('id', bookingId).eq('user_id', userId)
}

// ── Contracts ─────────────────────────────────────────────────────

export async function upsertContract(userId, contract) {
  if (!USE_DB) return contract
  const { data, error } = await supabase.from('contracts').upsert({
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
  await supabase.from('contracts').delete().eq('id', contractId).eq('user_id', userId)
}

// ── Messages ──────────────────────────────────────────────────────

export async function upsertMessage(userId, message) {
  if (!USE_DB) return message
  const { data, error } = await supabase.from('messages').upsert({
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
  const { error } = await supabase.from('leads').insert({
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
// Diffs previous vs next state for each collection and persists
// the changes. Called (debounced) from pages/index.js.

function diff(prevArr = [], nextArr = []) {
  const prevMap = new Map(prevArr.map(x => [x.id, x]))
  const nextMap = new Map(nextArr.map(x => [x.id, x]))
  const upserts = nextArr.filter(x => {
    const p = prevMap.get(x.id)
    return !p || JSON.stringify(p) !== JSON.stringify(x)
  })
  const deletes = prevArr.filter(x => !nextMap.has(x.id)).map(x => x.id)
  return { upserts, deletes }
}

export async function syncCollections(userId, prev, next) {
  if (!USE_DB) return

  if (['stages', 'sessionTypes', 'formSettings', 'availability'].some(key => JSON.stringify(prev[key]) !== JSON.stringify(next[key]))) {
    await saveSettings(userId, next)
  }

  const collections = [
    { key: 'clients',        table: 'clients',        toRow: c => ({ id: c.id, user_id: userId, name: c.name, email: c.email || null, phone: c.phone || null, type: c.type || null, status: c.status || 'inquiry', date: c.date || null, notes: c.notes || null, archived: !!c.archived, updated_at: new Date().toISOString() }) },
    { key: 'sessionCatalog', table: 'session_catalog', toRow: s => ({ id: s.id, user_id: userId, name: s.name, slug: s.slug, category: s.category || 'Portrait', description: s.description || '', image_url: s.imageUrl || null, duration_minutes: s.durationMinutes || 60, price: s.price || 0, location: s.location || '', color: s.color || '#17bda5', public: !!s.public, sort_order: s.sortOrder || 0 }) },
    { key: 'invoices',       table: 'invoices',       toRow: i => ({ id: i.id, user_id: userId, client_id: i.clientId || null, client_name: i.client, number: i.number || null, amount: i.amount || 0, paid: i.paid || 0, due: i.due || null, status: i.status || 'unpaid', note: i.note || null, line_items: i.lineData || i.lineItems || [], payment_method: i.paymentMethod || null, paid_at: i.paidAt || null, payment_intent_id: i.paymentIntentId || null, updated_at: new Date().toISOString() }) },
    { key: 'bookings',       table: 'bookings',       toRow: b => ({ id: b.id, user_id: userId, client_id: b.clientId || null, client_name: b.client, type: b.type || null, date: b.date || null, time: b.time || null, location: b.location || null, status: b.status || 'pending', notes: b.notes || null, session_type_id: b.sessionTypeId || null, duration_minutes: b.durationMinutes || 60, price: b.price ?? null, discount_code: b.discountCode || null, discount_amount: b.discountAmount || 0, final_price: b.finalPrice ?? null, source: b.source || 'manual' }) },
    { key: 'discounts', table: 'discount_codes', toRow: c => ({ id: c.id, user_id: userId, name: c.name, code: c.code, kind: c.kind, mode: c.mode || 'fixed', amount: c.amount, balance: c.balance ?? null, uses: c.uses || 0, max_uses: c.maxUses ?? null, starts_on: c.startsOn || null, ends_on: c.endsOn || null, active: !!c.active }) },
    { key: 'contracts',      table: 'contracts',      toRow: k => ({ id: k.id, user_id: userId, client_id: k.clientId || null, client_name: k.client, type: k.type || null, body: k.body || null, status: k.status || 'pending', sent: k.sent || null, signed_by: k.signedBy || null, signed_at: k.signedAt || null, fields: k.fields || {} }) },
    { key: 'quotes',         table: 'quotes',         toRow: q => ({ id: q.id, user_id: userId, client_id: q.clientId || null, client_name: q.client, amount: q.amount || 0, status: q.status || 'draft', line_items: q.lineData || q.lineItems || [], note: q.validUntil || null }) },
    { key: 'questionnaires', table: 'questionnaires', toRow: q => ({ id: q.id, user_id: userId, client_id: q.clientId || null, client_name: q.client, questions: { title: q.title || '', items: q.questions || [] }, answers: q.answers || {}, status: q.status || 'sent' }) },
    { key: 'messages',       table: 'messages',       toRow: m => ({ id: m.id, user_id: userId, client_id: m.clientId || null, from_name: m.from, thread: m.thread || [], unread: !!m.unread, updated_at: new Date().toISOString() }) },
  ]

  // Parent rows must exist before linked documents are inserted. Remove the
  // parent last so PostgreSQL can clear surviving foreign keys safely.
  for (const { key, table, toRow } of collections) {
    const { upserts, deletes } = diff(prev[key], next[key])
    if (key === 'discounts') {
      // The public booking transaction owns redemptions. Admin edits must not
      // write stale use counts or gift-card balances back over a new booking.
      const priorIds = new Set((prev.discounts || []).map(item => item.id))
      for (const item of upserts) {
        const row = toRow(item)
        if (priorIds.has(item.id)) {
          delete row.uses
          delete row.balance
          const { error } = await supabase.from(table).update(row).eq('id', item.id).eq('user_id', userId)
          if (error) throw new Error(`Unable to save ${table}: ${error.message}`)
        } else {
          const { error } = await supabase.from(table).insert(row)
          if (error) throw new Error(`Unable to save ${table}: ${error.message}`)
        }
      }
      if (deletes.length) {
        const { error } = await supabase.from(table).delete().in('id', deletes).eq('user_id', userId)
        if (error) throw new Error(`Unable to delete ${table}: ${error.message}`)
      }
      continue
    }
    if (upserts.length) {
      const { error } = await supabase.from(table).upsert(upserts.map(toRow), { onConflict: 'id' })
      if (error) throw new Error(`Unable to save ${table}: ${error.message}`)
    }
    if (deletes.length && key !== 'clients') {
      const { error } = await supabase.from(table).delete().in('id', deletes).eq('user_id', userId)
      if (error) throw new Error(`Unable to delete ${table}: ${error.message}`)
    }
  }
  const clientDeletes = diff(prev.clients, next.clients).deletes
  if (clientDeletes.length) {
    const { error } = await supabase.from('clients').delete().in('id', clientDeletes).eq('user_id', userId)
    if (error) throw new Error(`Unable to delete clients: ${error.message}`)
  }
}
