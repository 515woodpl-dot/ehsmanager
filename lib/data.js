export const STORAGE_KEY = 'ehs-studio-v1'

export function removeClient(data, clientId) {
  const unlink = rows => rows.map(row => row.clientId === clientId ? { ...row, clientId: null } : row)
  return {
    ...data,
    clients: data.clients.filter(client => client.id !== clientId),
    invoices: unlink(data.invoices),
    bookings: unlink(data.bookings),
    contracts: unlink(data.contracts),
    quotes: unlink(data.quotes),
    questionnaires: unlink(data.questionnaires),
    messages: unlink(data.messages),
  }
}

export const DEFAULT_SESSION_TYPES = ['Family', 'Maternity', 'Newborn', 'Portrait']

export const DEFAULT_AVAILABILITY = {
  timezone: 'America/New_York', noticeDays: 1, horizonDays: 90, bufferMinutes: 0,
  weekdays: { 0: [], 1: [{ start: '09:00', end: '17:00' }], 2: [{ start: '09:00', end: '17:00' }], 3: [{ start: '09:00', end: '17:00' }], 4: [{ start: '09:00', end: '17:00' }], 5: [{ start: '09:00', end: '17:00' }], 6: [] },
  blockedDates: [], blockedTimes: [],
}

const demoType = (id, name, category, durationMinutes, price, color) => ({
  id, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), category,
  description: `A ${category.toLowerCase()} session tailored to your story.`, imageUrl: '',
  durationMinutes, price, location: 'Linden, NJ', color, public: true, sortOrder: Number(id.slice(1)),
})

export const DEMO_SESSION_CATALOG = [
  demoType('s1', 'Portrait Signature', 'Portrait', 60, 375, '#5db8be'),
  demoType('s2', 'Maternity Simple', 'Maternity', 120, 375, '#d72650'),
  demoType('s3', 'Maternity Classic', 'Maternity', 120, 540, '#d72650'),
  demoType('s4', 'Maternity Signature', 'Maternity', 120, 820, '#d72650'),
  demoType('s5', 'Maternity Heirloom', 'Maternity', 120, 1100, '#d72650'),
  demoType('s6', 'Milestone Classic', 'Milestone', 120, 375, '#429de0'),
  demoType('s7', 'Milestone Signature', 'Milestone', 120, 550, '#429de0'),
  demoType('s8', 'Milestone Heirloom', 'Milestone', 120, 800, '#429de0'),
  demoType('s9', 'Growing Together Simple', 'Family', 120, 450, '#d72650'),
]

export const DEFAULT_STAGES = [
  { id: 'inquiry', label: 'Inquiry' },
  { id: 'booked', label: 'Booked' },
  { id: 'postpro', label: 'Post-production' },
  { id: 'done', label: 'Done' },
]

export const DEFAULT_FORM_SETTINGS = {
  contactType: 'Lead',
  buttonLabel: 'Submit',
  formTitle: '',
  afterSubmit: 'message',
  successMessage: 'Thank you for contacting us!',
  redirectUrl: '',
  checkboxOptions: [
    'Family Portraits',
    'Maternity Photography',
    'Newborn Photography',
    'Personal Portraits',
    'Kids Portraits',
    'Engagement / Couples Session',
    'Other',
  ],
}

export const seed = {
  clients: [
    { id: 'c1', name: 'Emma Lawson', email: 'emma@example.com', phone: '(212) 555-0181', type: 'Newborn', status: 'booked', date: '2026-06-28', notes: 'Prefers candid shots.', archived: false },
    { id: 'c2', name: 'Marcus & Tara Webb', email: 'marcus@example.com', phone: '(646) 555-0234', type: 'Maternity', status: 'inquiry', date: '2026-07-04', notes: 'Golden hour session.', archived: false },
    { id: 'c3', name: 'Priya Nair', email: 'priya@example.com', phone: '(917) 555-0099', type: 'Newborn', status: 'postpro', date: '2026-05-15', notes: 'Gallery delivered.', archived: false },
    { id: 'c4', name: 'Jordan Kim', email: 'jkim@example.com', phone: '(347) 555-0312', type: 'Portrait', status: 'done', date: '2026-04-10', notes: 'Completed.', archived: false },
    { id: 'c5', name: 'Sofia Reyes', email: 'sofia@example.com', phone: '(718) 555-0440', type: 'Family', status: 'inquiry', date: '2026-09-12', notes: 'Hudson Valley location.', archived: false },
  ],
  stages: DEFAULT_STAGES,
  sessionTypes: DEFAULT_SESSION_TYPES,
  sessionCatalog: DEMO_SESSION_CATALOG,
  availability: DEFAULT_AVAILABILITY,
  discounts: [{ id: 'demo-coupon', name: 'Something New', code: 'SOMETHINGNEW', kind: 'coupon', mode: 'percent', amount: 30, balance: null, uses: 0, maxUses: 30, startsOn: '', endsOn: '', active: true }],
  invoices: [
    { id: 'INV-001', client: 'Emma Lawson', clientId: 'c1', amount: 3200, due: '2026-07-05', status: 'partial', paid: 1600, note: '50% deposit', paymentIntentId: null },
    { id: 'INV-002', client: 'Marcus & Tara Webb', clientId: 'c2', amount: 850, due: '2026-06-20', status: 'unpaid', paid: 0, note: '', paymentIntentId: null },
    { id: 'INV-003', client: 'Priya Nair', clientId: 'c3', amount: 600, due: '2026-05-30', status: 'paid', paid: 600, note: 'Paid in full', paymentIntentId: null },
    { id: 'INV-004', client: 'Jordan Kim', clientId: 'c4', amount: 400, due: '2026-04-15', status: 'paid', paid: 400, note: '', paymentIntentId: null },
  ],
  bookings: [
    { id: 'b1', client: 'Emma Lawson', clientId: 'c1', type: 'Newborn', date: '2026-06-28', time: '10:00', location: 'Studio A', status: 'confirmed', notes: '' },
    { id: 'b2', client: 'Marcus & Tara Webb', clientId: 'c2', type: 'Maternity', date: '2026-07-04', time: '19:00', location: 'Central Park', status: 'pending', notes: '' },
  ],
  contracts: [
    { id: 'k1', client: 'Emma Lawson', clientId: 'c1', type: 'Photography Agreement', sent: 'May 1, 2026', status: 'signed', body: 'Full-day coverage, gallery within 6 weeks.' },
    { id: 'k2', client: 'Marcus & Tara Webb', clientId: 'c2', type: 'Session Contract', sent: 'Jun 1, 2026', status: 'pending', body: '2-hour session, 50 edited images.' },
  ],
  questionnaires: [],
  quotes: [],
  messages: [
    { id: 'm1', from: 'Emma Lawson', clientId: 'c1', thread: [{ id: 't1', from: 'Emma Lawson', text: 'Hi! When can we expect the gallery?', time: '10:23 AM', out: false }, { id: 't2', from: 'You', text: 'Hi Emma! Gallery will be ready within 4–6 weeks.', time: '10:31 AM', out: true }], unread: true },
    { id: 'm2', from: 'Marcus Webb', clientId: 'c2', thread: [{ id: 't3', from: 'Marcus Webb', text: 'We confirmed Central Park. Works for us!', time: 'Yesterday', out: false }], unread: true },
  ],
  formSettings: DEFAULT_FORM_SETTINGS,
  leads: [],
  quotes: [],
  questionnaires: [],
}

export function loadData() {
  if (typeof window === 'undefined') return seed
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) {
      const parsed = JSON.parse(s)
      return {
        ...seed,
        ...parsed,
        stages: parsed.stages || DEFAULT_STAGES,
        sessionTypes: parsed.sessionTypes || DEFAULT_SESSION_TYPES,
        sessionCatalog: parsed.sessionCatalog || DEMO_SESSION_CATALOG,
        availability: parsed.availability || DEFAULT_AVAILABILITY,
        discounts: parsed.discounts || [],
        formSettings: parsed.formSettings || DEFAULT_FORM_SETTINGS,
        quotes: parsed.quotes || [],
        questionnaires: parsed.questionnaires || [],
      }
    }
  } catch (e) {}
  return seed
}
