
// Digital Services Agreement for 515Studio (strategy, web development, digital marketing, SEO).
// DRAFT: have it reviewed by a qualified attorney before relying on it.
// Dynamic fields are wrapped in {{field}}. Field keys keep their original names
// (sessionDate = project start date, sessionTime = kickoff time, location = delivery format)
// so saved contracts and the builder keep working.

export const CONTRACT_TEMPLATE = `{{contractTitle}}

THIS AGREEMENT is made as of {{effectiveDate}} (the “Effective Date”) between {{clientName}} (“Client”), and 515Studio (“Studio”).

1. Engagement of Studio

1.1 Services. Subject to the terms set out herein, Client engages Studio to provide, and Studio agrees to provide, the services described in this Section 1.1 (the “Services”).

Services: {{sessionType}}

Project start date and kickoff time: {{sessionDate}} at {{sessionTime}}

Delivery format and location: {{location}}

As part of the Services, Studio will produce the websites, strategies, campaigns, reports, content, designs, code and related materials described above (the “Deliverables”). Any additional work not described in this Section 1.1 requires a written change request agreed by both parties and may change the Fees and timeline.

1.2 Independent Contractor. Studio is an independent contractor. Nothing in this Agreement creates an employment, partnership or agency relationship between the parties.

2. Fees and Payment

2.1 Fees. Client will pay Studio the fees set out herein (“Fees”), plus any applicable taxes.

● Total Fee for Services: {{totalFee}}

● Deposit due upon signing: {{retainerAmount}}

● Remaining amount due on {{remainingDueDate}} of {{remainingAmount}}

2.2 Deposit. The deposit is due upon signing this Agreement, is non-refundable, and compensates Studio for reserving its time and declining other work. The deposit will be credited toward the total Fees.

2.3 Invoices. Studio will invoice Client for the Fees. Client will pay each invoice by its due date. Studio may pause work while any invoice is overdue. Third-party costs such as domains, hosting, licenses, stock assets and advertising spend are not included in the Fees unless stated above, and are paid by Client or reimbursed at cost with prior approval.

2.4 Late Payment. Overdue amounts may accrue a late charge of 1.5% per month, or the maximum allowed by law if lower.

3. Client Responsibilities

3.1 Materials and Access. Client will promptly provide the content, brand assets, approvals, feedback and account access that Studio reasonably needs. Delays by Client may delay delivery and do not reduce the Fees.

3.2 Rights in Client Materials. Client confirms that it owns or has the right to use all materials it provides, and that they do not infringe any third party's rights. Client grants Studio a license to use those materials to perform the Services.

3.3 Approvals. Client will review Deliverables and provide consolidated written feedback within five (5) business days of delivery. Deliverables not rejected in writing within that time are deemed accepted.

3.4 Results. Client understands that marketing, advertising and search results depend on factors outside Studio's control, such as search engine algorithms, competition and market conditions.

4. Studio Responsibilities

4.1 Standard of Work. Studio will perform the Services in a professional and workmanlike manner consistent with industry standards.

4.2 Timeline. Studio will use reasonable efforts to meet the timeline agreed with Client. Dates depend on timely cooperation from Client under Section 3.

4.3 Revisions. The Fees include up to two (2) rounds of reasonable revisions per Deliverable unless stated otherwise. Additional revisions or changes in scope are billed separately.

5. Intellectual Property

5.1 Ownership of Deliverables. Upon receipt of full payment, Studio assigns to Client its rights in the final Deliverables created specifically for Client, excluding Studio Materials.

5.2 Studio Materials. Studio keeps all rights in its pre-existing tools, code libraries, templates, methods and know-how (“Studio Materials”) and grants Client a non-exclusive, perpetual license to use them as part of the Deliverables.

5.3 Third-Party Materials. Third-party software, fonts, images and plugins are subject to their own licenses.

5.4 Portfolio. Studio may display the Deliverables and describe the engagement in its portfolio and marketing, unless Client objects in writing.

6. Confidentiality

6.1 Confidential Information. Each party will keep the other's non-public business information confidential and use it only to perform this Agreement. This does not apply to information that is public, independently developed, or required to be disclosed by law.

7. Term and Termination

7.1 Term. This Agreement begins on the Effective Date and continues until the Services are completed and all Fees are paid in full (“Term”).

7.2 Termination. Either party may terminate this Agreement with fourteen (14) days' written notice. Either party may terminate immediately if the other materially breaches this Agreement and does not fix the breach within ten (10) days of written notice.

7.3 Effect of Termination. Client will pay for all Services performed and expenses incurred up to the termination date. Deposits and amounts paid for work already performed are not refundable.

7.4 Rescheduling. Client may reschedule a meeting or kickoff with at least two (2) days' written notice. Studio will use reasonable efforts to accommodate the change.

8. Warranties and Limitation of Liability

8.1 Disclaimer. Except as expressly stated in this Agreement, the Services and Deliverables are provided “as is”, and Studio disclaims all other warranties, express or implied, including fitness for a particular purpose and uninterrupted or error-free operation.

8.2 Indemnification. Client will indemnify and hold harmless Studio from third-party claims arising from materials Client provides or from Client's use of the Deliverables in violation of law or this Agreement.

8.3 Force Majeure. Neither party is liable for delay or non-performance caused by events beyond its reasonable control, including illness, emergency, fire, strike, pandemic, natural disaster, or outages of internet, hosting or third-party platforms.

8.4 Maximum Liability. Studio's total liability arising out of or related to this Agreement will not exceed the Fees paid by Client under this Agreement. Neither party is liable for indirect, incidental or consequential damages, including lost profits or lost data.

9. General

9.1 Notice. Parties will give notice to each other by email at the following addresses:

● Studio's Email: {{photographerEmail}}

● Client's Email: {{clientEmail}}

9.2 Survival. Sections 2, 5, 6, 8 and 9 survive termination of this Agreement.

9.3 Governing Law. This Agreement is governed by the laws of {{governingState}}, United States.

9.4 Amendment. This Agreement may only be changed by a written agreement signed or accepted electronically by both parties.

9.5 Entire Agreement. This Agreement is the entire agreement between the parties about the Services and replaces all earlier discussions and understandings.

9.6 Severability. If any provision is found illegal, invalid or unenforceable, that provision will be limited or removed to the minimum extent necessary and the rest of this Agreement will remain in effect.

9.7 Electronic Signatures. The parties agree that electronic signatures have the same effect as handwritten signatures.

Signatures

515Studio
Signature required

{{clientName}}
Signature required`

// Contract types offered in the builder. `lang` sets date wording and the
// signature labels on the signing page.
import { WEBDEV_EN, WEBDEV_ES } from './contractTemplatesWeb'
export const CONTRACT_TEMPLATES = {
  webdev_en: { label: 'Web Design & Development (English)', title: 'Web Design & Development Agreement', lang: 'en', body: WEBDEV_EN, due: 'Website launch' },
  webdev_es: { label: 'Diseño y Desarrollo Web (Español)', title: 'Contrato de Diseño y Desarrollo Web', lang: 'es', body: WEBDEV_ES, due: 'Lanzamiento del sitio web' },
  digital: { label: 'Digital Services (strategy, marketing, SEO)', title: 'Digital Services Agreement', lang: 'en', body: CONTRACT_TEMPLATE, due: 'Project completion' },
}
export const DEFAULT_TEMPLATE = 'webdev_en'
// 'es' for contracts made from a Spanish template (or whose text has the
// Spanish signature block), otherwise 'en'. Used for emails and dates.
export const contractLanguage = ({ fields, body } = {}) =>
  (CONTRACT_TEMPLATES[fields?.template]?.lang === 'es' || /(^|\n)Firmas\s*(\n|$)/.test(body || '')) ? 'es' : 'en'
export const contractDate = (lang, date = new Date()) => date.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
// Contracts saved before templates existed used the Digital Services text.
export const templateFor = id => CONTRACT_TEMPLATES[id] || CONTRACT_TEMPLATES.digital

// The details filled in from the client, session and invoice. Contracts
// highlight these (light pink) so they're easy to check before signing.
export const HIGHLIGHT_FIELDS = ['clientName', 'clientEmail', 'effectiveDate', 'sessionType', 'sessionDate', 'sessionTime', 'location', 'totalFee', 'retainerAmount', 'remainingAmount', 'remainingDueDate']

export function highlightValues(fields) {
  return HIGHLIGHT_FIELDS.map(key => String(fields?.[key] ?? '').trim())
    .filter(value => value && !/^\[.*\]$/.test(value) && value !== 'TBD')
}

// Saved contracts keep their highlight list; older ones fall back to the
// stored client and session fields.
export const contractHighlights = fields => Array.isArray(fields?.highlights) ? fields.highlights : highlightValues(fields)

export function fillContract(template, fields) {
  let out = template
  Object.entries(fields).forEach(([key, val]) => {
    out = out.replaceAll(`{{${key}}}`, val ?? `[${key}]`)
  })
  return out
}

export function buildContractFields(client, booking, invoice) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const sessionDate = booking?.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '[Session Date]'
  const sessionTime = booking?.time
    ? (() => { const [h, m] = (booking.time).split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}` })()
    : 'TBD'
  const total = invoice?.amount || 0
  const retainer = Math.round(total / 2 * 100) / 100
  const remaining = total - retainer
  const dueDate = invoice?.due
    ? new Date(invoice.due + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '[Due Date]'
  return {
    effectiveDate: today,
    clientName: client?.name || '[Client Name]',
    clientEmail: client?.email || '[Client Email]',
    sessionType: booking?.type || client?.type || '[Session Type]',
    sessionDate,
    sessionTime,
    location: booking?.location || '[Location]',
    totalFee: total ? `$${total.toLocaleString()}.00` : '[Total Fee]',
    retainerAmount: total ? `$${retainer.toLocaleString()}.00` : '[Retainer]',
    remainingAmount: total ? `$${remaining.toLocaleString()}.00` : '[Remaining]',
    remainingDueDate: dueDate,
  }
}
