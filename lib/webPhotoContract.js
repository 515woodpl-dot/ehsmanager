// Web Design, Development & Photography Services Agreement.
//
// The agreement text, the details a studio fills in for each client
// (WEB_PHOTO_SECTIONS), and the step that turns those details into the values
// the template uses (webPhotoValues). Dynamic parts are {{field}}.

export const WEB_PHOTO_TEMPLATE = `{{contractTitle}}

THIS AGREEMENT is made on {{effectiveDate}} between the Provider and the Client below, for web design, web development and a photography shoot.

1. Parties

● Provider: {{providerLine}} (“Provider”)

● Client: {{clientLine}} (“Client”)

● Project: {{projectName}}, a new or redesigned website for {{websiteName}}, including a photography shoot for the site’s images (the “Project”)

2. Web Design and Development Services

The Provider will design, build and launch the website described below.

● Pages: {{pageCount}} pages: {{pageList}}

● Design: custom layout, typography and color palette, responsive on phone, tablet and desktop

● Development: {{platform}}, contact form, basic on-page SEO (titles, descriptions, image alt text), analytics setup

● Integrations: {{integrations}}

● Testing: the major current browsers and devices before launch

● Launch: deployment to the Client’s hosting and domain, plus one round of post-launch fixes within {{postLaunchDays}} days

Anything not listed here is outside the scope and handled under Section 7.

3. Photography Services

3.1 Shoot: {{shootSessions}} session(s) of up to {{shootHours}} hours at {{shootLocation}} on {{shootDates}}, with the Provider’s own professional equipment.

3.2 Subjects: {{shootSubjects}}.

3.3 Shot list: the Client will supply a shot list or wish list at least {{shotListDays}} days before the shoot. The Provider may add creative shots.

3.4 Delivery: {{photoCount}} edited, web-optimized images (color-corrected and cropped) within {{deliveryDays}} business days after the shoot, through an online gallery or download link. Unedited and RAW files are not included unless agreed in writing.

3.5 Access and readiness: the Client will provide access to locations, arrange staff, products and props, and obtain any location permissions needed.

3.6 People in photos: the Client will make sure every identifiable person has agreed to be photographed. The Provider may supply a model release form for the Client to collect.

3.7 Weather and conditions: if outdoor conditions or site problems make the shoot unusable, the parties will reschedule once at no extra charge.

3.8 Extra images or time: additional images or hours are billed at {{extraRate}} per image or hour.

3.9 Portfolio: the Provider may show the photos and the finished site in their portfolio and promotion, unless the Client objects in writing for confidentiality reasons.

4. Timeline and Deliverables

The Project starts on {{startDate}} after the deposit and the Client’s initial materials are received, with a target launch of {{launchDate}}. Dates move day for day when the Client is late with content, feedback or payment.

● Phase 1, Discovery: goals, sitemap, shot list. Target date: {{discoveryDate}}

● Phase 2, Photo shoot: shoot day(s); edited images delivered. Target date: {{photoDate}}

● Phase 3, Design: mockups of key pages for approval. Target date: {{designDate}}

● Phase 4, Development: working site on a staging link. Target date: {{devDate}}

● Phase 5, Review and testing: Client feedback applied, final checks. Target date: {{reviewDate}}

● Phase 6, Launch: site live, handover. Target date: {{launchDate}}

5. Fees and Payment

The total fee is {{totalFee}}, made up as follows.

● Web design and development: {{webFee}}

● Photography shoot and editing: {{photoFee}}

● Total: {{totalFee}}

Payments are due as follows.

● Deposit (non-refundable), due on signing: {{depositPct}}% ({{depositAmount}})

● Milestone, due on design approval: {{milestonePct}}% ({{milestoneAmount}})

● Final, due before launch: {{finalPct}}% ({{finalAmount}})

● Invoices are due within {{invoiceDays}} days. Unpaid balances over {{lateDays}} days late accrue {{interestPct}}% interest per month, and the Provider may pause work.

● The Provider keeps control of the final site files and the full-resolution images until the final payment clears.

● Client-approved expenses (travel beyond {{travelMiles}} miles, props, stock images, paid plugins, fonts, models) are billed at cost.

● Prices exclude hosting, domain, third-party subscriptions and taxes unless stated.

6. Client Responsibilities

● Provide text, logos, brand guidelines and other content within {{contentDays}} days of request.

● Name one decision-maker who gives consolidated feedback within {{feedbackDays}} business days.

● Own or have the right to use all content supplied, and keep the Provider free of claims over it.

● Give timely access to locations, hosting and domain accounts.

● Approve each phase in writing (email counts). Silence for {{approvalDays}} days after a request counts as approval of that phase.

7. Revisions and Change Requests

● The fee covers {{designRevisions}} round(s) of revisions on the design and {{siteRevisions}} round(s) on the built site. Photo editing includes {{photoRevisions}} round(s) of minor adjustments.

● Work beyond scope, new pages or features, or a redesign after approval is quoted in writing and billed at {{changeRate}} per hour once the Client agrees.

● A reshoot, or added shoot time, is a change request.

8. Ownership, Licensing and Image Rights

8.1 Website: after full payment, the Client owns the final website design and custom code. The Provider keeps ownership of pre-existing tools, templates, libraries and know-how, and grants the Client a perpetual license to use them as part of the site.

8.2 Photographs: the Provider keeps copyright in all photographs. After full payment, the Client receives a non-exclusive, perpetual license to use the delivered images on the website, social media, print and marketing for the Client’s own business.{{copyrightOption}}

8.3 Not permitted without written consent: reselling the images, licensing them to third parties, or entering them in contests.

8.4 Third-party material: stock images, fonts and plugins are licensed under their own terms, and the Client pays any licensing fees.

8.5 Client material: the Client keeps ownership of supplied content and grants the Provider permission to use it to build the site.

8.6 Credit: the Provider may include a small credit line in the site footer and on published photos.{{creditOption}}

9. Hosting, Domain and Maintenance

● Hosting and domain accounts are registered in the Client’s name and paid by the Client{{hostingOption}}.

● After launch, the Provider fixes defects in the delivered work for {{warrantyDays}} days at no charge. Later updates, content changes, backups, security and software updates are available under a separate maintenance plan{{maintenanceOption}}, or hourly at {{changeRate}}.

● The Provider is not responsible for outages, data loss or security issues caused by third-party hosts, plugins or changes made by others.

10. Confidentiality, Warranties and Liability

● Each party keeps the other’s non-public business information confidential during the Project and for {{confidentialityYears}} years after.

● The Provider will perform the services in a professional manner. The Provider does not guarantee specific results such as search ranking, traffic or sales.

● The Provider is not liable for indirect or consequential damages such as lost profits. Total liability is limited to the fees the Client has paid under this Agreement.

● The Client will indemnify the Provider against claims arising from content the Client supplied or from the Client’s failure to obtain releases or permissions.

● Photography equipment failure, illness or other events beyond the Provider’s control may delay a shoot. The Provider will reschedule, or refund the unused photography fee if no new date works. The Provider is not liable for lost opportunities.

11. Term, Termination and Rescheduling

● This Agreement runs from signing until the website is launched and final payment is made.

● Either party may end it with {{noticeDays}} days’ written notice. The Client pays for work done and expenses incurred up to the end date, and the deposit is not refunded.

● The Provider may end it immediately if the Client does not pay or stops responding for more than {{nonResponseDays}} days.

● Shoot cancellation: the Client may reschedule once with at least {{rescheduleHours}} hours’ notice at no charge. Later changes or cancellations cost {{lateCancelPct}}% of the photography fee, and a no-show costs the full photography fee.

● After termination, the Client receives only work that has been paid for in full.

12. General Provisions

● Independent contractor: the Provider is not an employee, partner or agent of the Client, and pays their own taxes and insurance.

● Entire agreement: this document is the whole agreement and replaces earlier discussions. Changes must be in writing and signed or confirmed by email by both parties.

● Governing law: the laws of {{governingState}} apply, and disputes will be handled in the courts of {{governingCounty}} after the parties first try good-faith mediation.

● Severability: if one clause is unenforceable, the rest stays in effect.

● Assignment: neither party may assign this Agreement without the other’s written consent.

● Notices: by email to the addresses in Section 1.

● Counterparts: electronic signatures and separate copies are valid.

13. Acceptance

By signing, both parties agree to the terms above.

Signatures

{{businessName}}
Signature required

{{clientName}}
Signature required`

const text = (key, label, extra = {}) => ({ key, label, type: 'text', ...extra })
const date = (key, label, extra = {}) => ({ key, label, type: 'date', ...extra })
const num = (key, label, extra = {}) => ({ key, label, type: 'number', ...extra })
const area = (key, label, extra = {}) => ({ key, label, type: 'textarea', ...extra })

// `required` details block saving until they're filled in. `mark` details are
// highlighted in the agreement. `value` is a starting value.
export const WEB_PHOTO_SECTIONS = [
  { title: 'Project', fields: [
    text('projectName', 'Project name', { required: true, mark: true, placeholder: 'e.g. Acme Bakery website' }),
    text('websiteName', 'Website / business name', { required: true, mark: true }),
    text('providerAddress', 'Your address', { mark: true }),
    text('providerPhone', 'Your phone', { mark: true }),
    text('clientAddress', 'Client address', { mark: true }),
    text('clientPhone', 'Client phone', { mark: true }),
  ] },
  { title: 'Web design and development', fields: [
    num('pageCount', 'Number of pages', { value: '5', required: true, mark: true }),
    text('pageList', 'Pages', { value: 'Home, About, Services, Gallery, Contact', required: true, mark: true }),
    text('platform', 'CMS / platform / custom code', { required: true, mark: true, placeholder: 'e.g. WordPress, Webflow, custom code' }),
    text('integrations', 'Integrations', { value: 'None', mark: true, placeholder: 'Booking, payments, email, maps, social, or "None"' }),
    num('postLaunchDays', 'Post-launch fixes within (days)', { value: '14' }),
  ] },
  { title: 'Photography', fields: [
    num('shootSessions', 'Number of sessions', { value: '1', required: true, mark: true }),
    num('shootHours', 'Hours per session', { required: true, mark: true }),
    text('shootLocation', 'Location(s)', { required: true, mark: true }),
    text('shootDates', 'Shoot date(s)', { required: true, mark: true, placeholder: 'e.g. December 4, 2026' }),
    text('shootSubjects', 'Subjects', { required: true, placeholder: 'Business exterior/interior, products, team portraits, events…' }),
    num('shotListDays', 'Shot list due before the shoot (days)', { value: '7' }),
    num('photoCount', 'Edited images delivered', { required: true, mark: true }),
    num('deliveryDays', 'Delivery after the shoot (business days)', { value: '10' }),
    num('extraRate', 'Rate for extra images or hours ($)', { required: true, mark: true }),
  ] },
  { title: 'Timeline', fields: [
    date('startDate', 'Start date', { required: true, mark: true }),
    date('launchDate', 'Target launch date', { required: true, mark: true }),
    date('discoveryDate', 'Discovery', { mark: true }),
    date('photoDate', 'Photo shoot and delivery', { mark: true }),
    date('designDate', 'Design mockups', { mark: true }),
    date('devDate', 'Working site on staging', { mark: true }),
    date('reviewDate', 'Review and testing', { mark: true }),
  ] },
  { title: 'Fees and payment', fields: [
    num('webFee', 'Web design and development ($)', { required: true, mark: true }),
    num('photoFee', 'Photography shoot and editing ($)', { required: true, mark: true }),
    num('depositPct', 'Deposit on signing (%)', { value: '40', required: true }),
    num('milestonePct', 'On design approval (%)', { value: '30', required: true }),
    num('invoiceDays', 'Invoices due within (days)', { value: '7' }),
    num('lateDays', 'Late interest starts after (days)', { value: '15' }),
    num('interestPct', 'Late interest per month (%)', { value: '1.5' }),
    num('travelMiles', 'Free travel up to (miles)', { value: '25' }),
  ] },
  { title: 'Responsibilities and revisions', fields: [
    num('contentDays', 'Client content due within (days)', { value: '7' }),
    num('feedbackDays', 'Client feedback within (business days)', { value: '5' }),
    num('approvalDays', 'Silence counts as approval after (days)', { value: '10' }),
    num('designRevisions', 'Design revision rounds', { value: '2' }),
    num('siteRevisions', 'Built-site revision rounds', { value: '1' }),
    num('photoRevisions', 'Photo editing revision rounds', { value: '1' }),
    num('changeRate', 'Hourly rate for extra work ($)', { required: true, mark: true }),
  ] },
  { title: 'Ownership, hosting and maintenance', fields: [
    num('copyrightFee', 'Copyright transfer fee ($)', { hint: 'Leave blank if copyright is not offered for sale.', mark: true }),
    num('creditFee', 'Fee to remove the credit line ($)', { hint: 'Leave blank if the credit stays.', mark: true }),
    text('hostingFee', 'Hosting by you: fee', { hint: 'For example "$25 per month". Leave blank if the Client hosts.', mark: true }),
    num('maintenanceFee', 'Maintenance plan per month ($)', { hint: 'Leave blank if you only offer hourly work.', mark: true }),
    num('warrantyDays', 'Free fixes after launch (days)', { value: '30' }),
  ] },
  { title: 'Confidentiality, termination and law', fields: [
    num('confidentialityYears', 'Confidentiality lasts (years)', { value: '2' }),
    num('noticeDays', 'Notice to end the agreement (days)', { value: '14' }),
    num('nonResponseDays', 'Client silent for more than (days)', { value: '30' }),
    num('rescheduleHours', 'Free reschedule needs notice (hours)', { value: '72' }),
    num('lateCancelPct', 'Late shoot change costs (% of photography fee)', { value: '50' }),
    text('governingCounty', 'County for disputes', { required: true, mark: true, placeholder: 'e.g. Union County, New Jersey' }),
  ] },
]

export const WEB_PHOTO_FIELDS = WEB_PHOTO_SECTIONS.flatMap(section => section.fields)

// Starting values for a new agreement.
export function webPhotoDefaults({ client, booking, invoice, branding = {} } = {}) {
  const out = Object.fromEntries(WEB_PHOTO_FIELDS.map(field => [field.key, field.value || '']))
  return {
    ...out,
    projectName: client?.name ? `${client.name} website` : '',
    websiteName: client?.name || '',
    providerAddress: branding.address || '',
    providerPhone: branding.phone || '',
    clientPhone: client?.phone || '',
    shootLocation: booking?.location || '',
    shootDates: booking?.date ? longDate(booking.date) : '',
    startDate: client?.date || '',
    webFee: invoice?.amount ? String(invoice.amount) : '',
  }
}

const longDate = iso => {
  const d = new Date(`${iso}T00:00:00`)
  return isNaN(d) ? String(iso) : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
const money = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
const round2 = value => Math.round(value * 100) / 100
const filled = value => String(value ?? '').trim() !== ''

// Turns the details into the values the agreement uses. `missing` lists
// required details that are empty (they show as [Label] in the preview), and
// `problems` lists numbers that don't add up. `highlights` are the filled-in
// details to mark in the agreement.
export function webPhotoValues(fields) {
  const missing = []
  const problems = []
  const textOf = field => {
    const value = String(fields[field.key] ?? '').trim()
    if (field.type === 'date') return value ? longDate(value) : 'to be confirmed'
    return value
  }
  const values = {}
  for (const field of WEB_PHOTO_FIELDS) {
    const raw = String(fields[field.key] ?? '').trim()
    if (field.required && !raw) { missing.push(field.label); values[field.key] = `[${field.label}]`; continue }
    if (field.type === 'number' && raw && !(Number(raw) >= 0)) problems.push(`${field.label} must be a number`)
    values[field.key] = textOf(field)
  }
  // Dollar amounts.
  for (const key of ['extraRate', 'changeRate']) if (filled(fields[key]) && Number(fields[key]) >= 0) values[key] = money(Number(fields[key]))
  const webFee = Number(fields.webFee) || 0, photoFee = Number(fields.photoFee) || 0
  const total = round2(webFee + photoFee)
  const depositPct = Number(fields.depositPct) || 0, milestonePct = Number(fields.milestonePct) || 0
  const finalPct = round2(100 - depositPct - milestonePct)
  if (finalPct < 0) problems.push('Deposit and design approval payments are more than 100%')
  const depositAmount = round2(total * depositPct / 100)
  const milestoneAmount = round2(total * milestonePct / 100)
  const finalAmount = round2(total - depositAmount - milestoneAmount)
  if (filled(fields.webFee)) values.webFee = money(webFee)
  if (filled(fields.photoFee)) values.photoFee = money(photoFee)
  Object.assign(values, {
    totalFee: total > 0 ? money(total) : '[Total fee]',
    depositPct: String(depositPct), milestonePct: String(milestonePct), finalPct: String(Math.max(0, finalPct)),
    depositAmount: money(depositAmount), milestoneAmount: money(milestoneAmount), finalAmount: money(finalAmount),
  })
  // Optional details change a sentence, so they're built here.
  const fee = key => filled(fields[key]) && Number(fields[key]) > 0 ? money(Number(fields[key])) : ''
  values.copyrightOption = fee('copyrightFee') ? ` Copyright can transfer to the Client for an additional fee of ${fee('copyrightFee')}.` : ''
  values.creditOption = fee('creditFee') ? ` The credit can be removed for ${fee('creditFee')}.` : ''
  values.hostingOption = filled(fields.hostingFee) ? `, unless the Provider hosts the site for ${String(fields.hostingFee).trim()}` : ''
  values.maintenanceOption = fee('maintenanceFee') ? ` of ${fee('maintenanceFee')} per month` : ''
  // Parties.
  const parts = (...items) => items.map(item => String(item ?? '').trim()).filter(Boolean).join(', ')
  values.providerLine = parts(fields.businessName || '[Business name]', fields.providerAddress, fields.photographerEmail || '[Business email]', fields.providerPhone)
  values.clientLine = parts(fields.clientName || '[Client name]', fields.clientAddress, fields.clientEmail || '[Client email]', fields.clientPhone)
  const highlights = [
    fields.businessName, fields.photographerEmail, fields.clientName, fields.clientEmail,
    ...WEB_PHOTO_FIELDS.filter(field => field.mark).map(field => values[field.key]),
    values.totalFee, values.depositAmount, values.milestoneAmount, values.finalAmount,
    values.copyrightOption && fee('copyrightFee'), values.creditOption && fee('creditFee'), values.maintenanceOption && fee('maintenanceFee'),
  ].map(value => String(value ?? '').trim()).filter(value => value.length >= 3 && !/^\[.*\]$/.test(value) && value !== 'to be confirmed')
  return { values, missing, problems, highlights: [...new Set(highlights)] }
}
