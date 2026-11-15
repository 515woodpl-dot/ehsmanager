/**
 * lib/businessTypes.js — what kind of business the manager is set up for.
 *
 * The choice is saved with the business profile (studio_settings.branding
 * → businessType) and decides the wording across the app, emails and client
 * pages, the starting lists (project types, stages, contact-form options,
 * sample services) and the contract template. Businesses saved before this
 * existed have no choice stored and stay on "photography".
 */
import { createContext, useContext } from 'react'

const photography = {
  id: 'photography',
  label: 'Photography',
  tagline: 'Photography CRM',
  descriptor: 'Photography',
  // The bookable appointment.
  session: 'Session', sessions: 'Sessions',
  // The catalog shown on the public booking page.
  service: 'Session Type', services: 'Session Types',
  // The two details kept on every client / project.
  typeLabel: 'Session type', dateLabel: 'Session date',
  provider: 'Photographer',
  agreement: 'Photography Agreement',
  contractTitle: 'Portrait Photography Services Agreement',
  defaultCategory: 'Portrait',
  imageLabel: 'Photo URL (HTTPS)',
  slugExample: 'maternity-classic',
  lineItemExample: 'e.g. Maternity Signature session',
  lineItemDetails: "What's included — hours of coverage, edited images, prints, travel…",
  invoiceItem: 'Photography services',
  remainingDue: 'Proof Delivery Date',
  projectTypes: ['Family', 'Maternity', 'Newborn', 'Portrait'],
  stages: [
    { id: 'inquiry', label: 'Inquiry' },
    { id: 'booked', label: 'Booked' },
    { id: 'postpro', label: 'Post-production' },
    { id: 'done', label: 'Done' },
  ],
  contactOptions: ['Family Portraits', 'Maternity Photography', 'Newborn Photography', 'Personal Portraits', 'Kids Portraits', 'Engagement / Couples Session', 'Other'],
  contactOptionsLabel: 'Session type checkboxes',
  contactQuestion: 'What kind of memories would you like captured?',
  sessionNotes: 'Outfit suggestions, what to bring, parking info...',
  quickReplies: ['Your gallery is ready! 🎉', 'Looking forward to your session!'],
  reminder: {
    intro: "This is a friendly reminder about your upcoming photography session. We're looking forward to seeing you!",
    tip: 'Please arrive a few minutes early so we have time to get comfortable before we start shooting. Feel free to reach out if you have any questions or need to make any changes.',
  },
  questionnaireIntro: 'a few questions before your session',
  questions: [
    ['How did you hear about us?', 'text'],
    ['Do you have any specific shots in mind?', 'textarea'],
    ['Are there any props or outfits you plan to bring?', 'text'],
  ],
  catalog: [
    ['Portrait Signature', 'Portrait', 60, 375, '#5db8be'],
    ['Maternity Simple', 'Maternity', 120, 375, '#d72650'],
    ['Maternity Classic', 'Maternity', 120, 540, '#d72650'],
    ['Maternity Signature', 'Maternity', 120, 820, '#d72650'],
    ['Maternity Heirloom', 'Maternity', 120, 1100, '#d72650'],
    ['Milestone Classic', 'Milestone', 120, 375, '#429de0'],
    ['Milestone Signature', 'Milestone', 120, 550, '#429de0'],
    ['Milestone Heirloom', 'Milestone', 120, 800, '#429de0'],
    ['Growing Together Simple', 'Family', 120, 450, '#d72650'],
  ],
  catalogDescription: category => `A ${category.toLowerCase()} session tailored to your story.`,
  booking: {
    title: 'Book a Photography Session',
    description: name => `Explore portrait, maternity, milestone and family photography sessions with ${name}.`,
    eyebrow: 'Photography sessions made personal',
    headline: 'Hold on to the moments that matter.',
    intro: 'Every season deserves to be remembered. Explore a collection of thoughtful portrait experiences, choose the one that feels like you, and request a time that fits your life.',
    cta: 'EXPLORE SESSIONS ↓',
    nav: 'Collections',
    heroCaption: 'the little things',
    all: 'All sessions',
    sectionEyebrow: 'Your story, beautifully told',
    sectionTitle: 'Choose your experience',
    sectionIntro: 'From the first hello to every little milestone, find a session that makes room for what matters most.',
    cardFallback: 'A photography experience made for this moment.',
    cardMeta: 'Full session',
    empty: 'New collections are coming soon. Check back shortly or get in touch to plan your session.',
    steps: [
      ['01', 'Find your session', 'Browse the collections and choose the experience that fits your story.'],
      ['02', 'Pick a time', 'See available dates and request a time that works for you.'],
      ['03', 'Make it yours', 'We will confirm the details and get ready to create something lovely.'],
    ],
    footer: "Let's make something beautiful.",
    detailKind: 'Photography session',
    detailFallback: 'A session designed around the moments that matter to you.',
    locationFallback: 'Location shared after booking',
  },
}

const webdesign = {
  id: 'webdesign',
  label: 'Web design',
  tagline: 'Web Design CRM',
  descriptor: 'Web Design',
  session: 'Meeting', sessions: 'Meetings',
  service: 'Service', services: 'Services',
  typeLabel: 'Project type', dateLabel: 'Kickoff date',
  provider: 'Designer',
  agreement: 'Web Design Agreement',
  contractTitle: 'Website Design Services Agreement',
  defaultCategory: 'Website',
  imageLabel: 'Image URL (HTTPS)',
  slugExample: 'discovery-call',
  lineItemExample: 'e.g. 5-page business website',
  lineItemDetails: "What's included — pages, revisions, copywriting, hosting, training…",
  invoiceItem: 'Web design services',
  remainingDue: 'Website Launch',
  projectTypes: ['New Website', 'Website Redesign', 'Online Store', 'Landing Page', 'Website Care Plan'],
  stages: [
    { id: 'inquiry', label: 'Inquiry' },
    { id: 'booked', label: 'Signed' },
    { id: 'design', label: 'Design' },
    { id: 'build', label: 'Development' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Launched' },
  ],
  contactOptions: ['New Website', 'Website Redesign', 'Online Store / E-commerce', 'Landing Page', 'SEO', 'Maintenance / Care Plan', 'Branding / Logo', 'Other'],
  contactOptionsLabel: 'Service checkboxes',
  contactQuestion: 'What can we help you with?',
  sessionNotes: 'Agenda, meeting link, what to have ready...',
  quickReplies: ['Your site preview is ready for review! 🎉', 'Looking forward to our meeting!'],
  reminder: {
    intro: "This is a friendly reminder about our upcoming meeting. We're looking forward to talking with you!",
    tip: "Have any login details, content or examples you'd like to go over ready. Feel free to reach out if you have any questions or need to make any changes.",
  },
  questionnaireIntro: 'a few questions before we start',
  questions: [
    ['How did you hear about us?', 'text'],
    ['What is the main goal of your website?', 'textarea'],
    ['Who are your customers, and what should they do on the site?', 'textarea'],
    ['Share two or three websites you like, and what you like about them.', 'textarea'],
    ['Do you already have a domain name, hosting, logo and written content?', 'textarea'],
  ],
  catalog: [
    ['Discovery Call', 'Consultation', 30, 0, '#5db8be'],
    ['Website Audit', 'Consultation', 60, 150, '#5db8be'],
    ['Landing Page', 'Website', 60, 900, '#429de0'],
    ['Starter Website', 'Website', 60, 2500, '#429de0'],
    ['Business Website', 'Website', 90, 4500, '#429de0'],
    ['Online Store', 'E-commerce', 90, 6500, '#d72650'],
    ['Website Care Plan', 'Maintenance', 30, 120, '#7a5fc0'],
  ],
  catalogDescription: category => category === 'Consultation'
    ? 'A focused conversation about your goals and the best next step.'
    : `A ${category.toLowerCase()} package planned around your goals. Book a kickoff call to get started.`,
  booking: {
    title: 'Book a Web Design Consultation',
    description: name => `Website design, redesigns, online stores and care plans from ${name}. Pick a service and book a time to talk.`,
    eyebrow: 'Websites made personal',
    headline: 'A website that works as hard as you do.',
    intro: 'Clear, fast, good-looking websites built around your goals. Explore the services, choose the one that fits, and request a time to talk it through.',
    cta: 'EXPLORE SERVICES ↓',
    nav: 'Services',
    heroCaption: 'made to fit',
    all: 'All services',
    sectionEyebrow: 'Design, build and care',
    sectionTitle: 'Choose your service',
    sectionIntro: 'From a first conversation to a full launch, find the service that fits where your business is right now.',
    cardFallback: 'A web design service shaped around your goals.',
    cardMeta: 'First meeting',
    empty: 'New services are coming soon. Check back shortly or get in touch to plan your project.',
    steps: [
      ['01', 'Find your service', 'Browse the services and choose the one that fits your project.'],
      ['02', 'Pick a time', 'See available dates and request a time that works for you.'],
      ['03', 'Get started', 'We will confirm the details and get ready to plan your site.'],
    ],
    footer: "Let's build something great.",
    detailKind: 'Web design',
    detailFallback: 'A service designed around what your business needs.',
    locationFallback: 'Online · meeting link shared after booking',
  },
}

const creative = {
  id: 'creative',
  label: 'Digital creative studio',
  tagline: 'Creative Studio CRM',
  descriptor: 'Creative Studio',
  session: 'Booking', sessions: 'Bookings',
  service: 'Service', services: 'Services',
  typeLabel: 'Project type', dateLabel: 'Start date',
  provider: 'Studio',
  agreement: 'Creative Services Agreement',
  contractTitle: 'Creative Services Agreement',
  defaultCategory: 'Web Design',
  imageLabel: 'Image URL (HTTPS)',
  slugExample: 'brand-photo-shoot',
  lineItemExample: 'e.g. Business website, brand photo shoot, logo design',
  lineItemDetails: "What's included — pages, images, concepts, video length, posts per month, revisions…",
  invoiceItem: 'Creative services',
  remainingDue: 'Final Delivery',
  projectTypes: ['Website', 'Photography', 'Branding & Logo', 'Graphic Design', 'Video', 'Social Media Content', 'Website + Photography', 'Full Brand Package'],
  stages: [
    { id: 'inquiry', label: 'Inquiry' },
    { id: 'booked', label: 'Signed' },
    { id: 'discovery', label: 'Discovery' },
    { id: 'production', label: 'In production' },
    { id: 'review', label: 'Client review' },
    { id: 'done', label: 'Delivered' },
  ],
  contactOptions: ['New Website / Redesign', 'Online Store', 'Photography Shoot', 'Logo & Branding', 'Graphic Design', 'Video Production', 'Social Media Content', 'Other'],
  contactOptionsLabel: 'Service checkboxes',
  contactQuestion: 'What can we help you with?',
  sessionNotes: 'Agenda or shot list, location, meeting link, what to bring...',
  quickReplies: ['Your first designs are ready for review! 🎉', 'Your photos and files are ready to download!', 'Looking forward to working with you!'],
  reminder: {
    intro: "This is a friendly reminder about your upcoming booking with us. We're looking forward to it!",
    tip: 'If this is a shoot, have the people, products and spaces you want captured ready. If it is a meeting, bring any examples, logins or content you would like to go over. Feel free to reach out if you need to make any changes.',
  },
  questionnaireIntro: 'a few questions before we start',
  questions: [
    ['How did you hear about us?', 'text'],
    ['What are you hoping this project will do for your business?', 'textarea'],
    ['Who are your customers, and how would you like them to see your brand?', 'textarea'],
    ['Share two or three brands, websites or accounts whose look you like, and why.', 'textarea'],
    ['What do you already have (logo, brand colors, photos, website, domain, social accounts)?', 'textarea'],
    ['Is there a date this needs to be ready by?', 'text'],
  ],
  catalog: [
    ['Discovery Call', 'Consultation', 30, 0, '#5db8be'],
    ['Starter Website', 'Web Design', 60, 2500, '#429de0'],
    ['Business Website', 'Web Design', 90, 4500, '#429de0'],
    ['Brand Photo Shoot', 'Photography', 120, 650, '#d72650'],
    ['Product Photography', 'Photography', 120, 500, '#d72650'],
    ['Logo & Brand Identity', 'Branding', 60, 1200, '#e0a33f'],
    ['Promo Video', 'Video', 120, 1500, '#7a5fc0'],
    ['Social Media Content (monthly)', 'Social Media', 30, 600, '#3fae7a'],
    ['Website + Photography Package', 'Packages', 90, 5600, '#20211f'],
  ],
  catalogDescription: category => category === 'Consultation'
    ? 'A focused conversation about your goals and which services fit best.'
    : category === 'Packages'
      ? 'A website with its own photo shoot, planned together so everything looks like one brand.'
      : `${category} planned around your brand and goals. Book a time to get started.`,
  booking: {
    title: 'Book with a Digital Creative Studio',
    description: name => `Websites, photography, branding, video and social media content from ${name}. Pick a service and book a time.`,
    eyebrow: 'Web · Photo · Brand · Video',
    headline: 'Everything your brand needs to look its best.',
    intro: 'Websites, photography, branding, video and social content made to work together. Explore the services, choose what fits, and request a time to get started.',
    cta: 'EXPLORE SERVICES ↓',
    nav: 'Services',
    heroCaption: 'made together',
    all: 'All services',
    sectionEyebrow: 'Design, capture and create',
    sectionTitle: 'Choose your service',
    sectionIntro: 'Start with one service or combine them. Every project begins with a conversation about your goals.',
    cardFallback: 'A creative service shaped around your brand.',
    cardMeta: 'First booking',
    empty: 'New services are coming soon. Check back shortly or get in touch to plan your project.',
    steps: [
      ['01', 'Find your service', 'Browse the services and choose the ones that fit your project.'],
      ['02', 'Pick a time', 'See available dates and request a time that works for you.'],
      ['03', 'Get started', 'We will confirm the details and plan your project with you.'],
    ],
    footer: "Let's create something great.",
    detailKind: 'Creative studio',
    detailFallback: 'A service designed around what your brand needs.',
    locationFallback: 'Location or meeting link shared after booking',
  },
}

export const BUSINESS_TYPES = { photography, webdesign, creative }
export const DEFAULT_BUSINESS_TYPE = 'photography'
export const BUSINESS_TYPE_OPTIONS = Object.values(BUSINESS_TYPES).map(type => ({ id: type.id, label: type.label }))

export const isBusinessType = value => Object.prototype.hasOwnProperty.call(BUSINESS_TYPES, value)

// Wording and defaults for a business type, plus lower-case forms for
// use mid-sentence ("No sessions yet", "Schedule a meeting").
export function businessTerms(type) {
  const base = BUSINESS_TYPES[isBusinessType(type) ? type : DEFAULT_BUSINESS_TYPE]
  return {
    ...base,
    sessionLower: base.session.toLowerCase(), sessionsLower: base.sessions.toLowerCase(),
    serviceLower: base.service.toLowerCase(), servicesLower: base.services.toLowerCase(),
    typeLabelLower: base.typeLabel.toLowerCase(), dateLabelLower: base.dateLabel.toLowerCase(),
    providerLower: base.provider.toLowerCase(), agreementLower: base.agreement.toLowerCase(),
  }
}

const slugify = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Sample services for the booking catalog ("Add samples").
export function sampleCatalog(type) {
  const terms = businessTerms(type)
  return terms.catalog.map(([name, category, durationMinutes, price, color], index) => ({
    id: `s${index + 1}`, name, slug: slugify(name), category,
    description: terms.catalogDescription(category), imageUrl: '',
    durationMinutes, price, location: '', color, public: true, sortOrder: index + 1,
  }))
}

// The starting lists for a business type, in the shape the app stores them.
export function businessDefaults(type) {
  const terms = businessTerms(type)
  return { stages: terms.stages, sessionTypes: terms.projectTypes, checkboxOptions: terms.contactOptions }
}

// Moves a client's stage onto a new stage list: same id if it still exists,
// otherwise the stage at the same relative position (first stays first,
// last stays last).
export function remapStage(status, fromStages, toStages) {
  if (!toStages.length || toStages.some(stage => stage.id === status)) return status
  const index = fromStages.findIndex(stage => stage.id === status)
  if (index < 0) return toStages[0].id
  const ratio = fromStages.length > 1 ? index / (fromStages.length - 1) : 0
  return toStages[Math.round(ratio * (toStages.length - 1))].id
}

export const TermsContext = createContext(businessTerms(DEFAULT_BUSINESS_TYPE))
export const useTerms = () => useContext(TermsContext)
