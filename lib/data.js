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

export const DEFAULT_SESSION_TYPES = ['Strategy', 'Web Development', 'Digital Marketing', 'SEO Services']

export const DEFAULT_AVAILABILITY = {
  timezone: 'America/New_York', noticeDays: 1, horizonDays: 90, bufferMinutes: 0,
  weekdays: { 0: [], 1: [{ start: '09:00', end: '17:00' }], 2: [{ start: '09:00', end: '17:00' }], 3: [{ start: '09:00', end: '17:00' }], 4: [{ start: '09:00', end: '17:00' }], 5: [{ start: '09:00', end: '17:00' }], 6: [] },
  blockedDates: [], blockedTimes: [],
}

const demoType = (id, name, category, durationMinutes, price, color) => ({
  id, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), category,
  description: `A ${category.toLowerCase()} conversation about your goals and next steps.`, imageUrl: '',
  durationMinutes, price, location: 'Video call', color, public: true, sortOrder: Number(id.slice(1)),
})

export const DEMO_SESSION_CATALOG = [
  demoType('s1', 'Discovery Call', 'Strategy', 30, 0, '#B7410E'),
  demoType('s2', 'Strategy Workshop', 'Strategy', 90, 0, '#C4622D'),
  demoType('s3', 'Website Consultation', 'Web Development', 45, 0, '#C7FF3F'),
  demoType('s4', 'Marketing Review', 'Digital Marketing', 45, 0, '#7254D8'),
  demoType('s5', 'SEO Audit Call', 'SEO Services', 45, 0, '#1E385B'),
]

export const DEFAULT_STAGES = [
  { id: 'inquiry', label: 'Inquiry' },
  { id: 'booked', label: 'Active Project' },
  { id: 'postpro', label: 'In Review' },
  { id: 'done', label: 'Launched' },
]

export const DEFAULT_FORM_SETTINGS = {
  contactType: 'Lead',
  buttonLabel: 'Submit',
  formTitle: '',
  afterSubmit: 'message',
  successMessage: 'Thanks! We got your info and will reach out soon.',
  redirectUrl: '',
  checkboxOptions: [
    'Strategy',
    'Web Development',
    'Digital Marketing',
    'SEO Services',
    'Other',
  ],
}

export const seed = {
  clients: [],
  stages: DEFAULT_STAGES,
  sessionTypes: DEFAULT_SESSION_TYPES,
  sessionCatalog: DEMO_SESSION_CATALOG,
  availability: DEFAULT_AVAILABILITY,
  discounts: [],
  invoices: [],
  bookings: [],
  contracts: [],
  questionnaires: [],
  quotes: [],
  messages: [],
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
