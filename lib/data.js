export const STORAGE_KEY = 'ehs-studio-v1'

export const DEFAULT_SESSION_TYPES = ['Family', 'Maternity', 'Newborn', 'Portrait']

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
        formSettings: parsed.formSettings || DEFAULT_FORM_SETTINGS,
        quotes: parsed.quotes || [],
        questionnaires: parsed.questionnaires || [],
      }
    }
  } catch (e) {}
  return seed
}
