// Creative Services Agreement: one modular agreement for a digital creative
// studio. Per client, the studio ticks the services in the deal (web, photo,
// branding, video/social) and only those sections, fees, timeline phases and
// clauses appear. Section numbers and cross-references follow automatically.
//
// The wording is based on the studio's Web Design, Development & Photography
// Services Agreement, with branding and video/social sections in the same
// style. The text is produced line by line in the format ContractDocument
// renders: "N. Heading", "N.n Clause", "● bullet", then a "Signatures" block.

export const CREATIVE_SERVICES = [
  { id: 'web', label: 'Web design & development' },
  { id: 'photo', label: 'Photography' },
  { id: 'brand', label: 'Branding & graphic design' },
  { id: 'video', label: 'Video & social media content' },
]

const text = (key, label, extra = {}) => ({ key, label, type: 'text', ...extra })
const date = (key, label, extra = {}) => ({ key, label, type: 'date', ...extra })
const num = (key, label, extra = {}) => ({ key, label, type: 'number', ...extra })

// `service`: shown (and required) only when that service is ticked; a list
// means any of them. `required` blocks saving while empty, `mark` highlights
// the value in the agreement, `value` is the starting value.
export const CREATIVE_SECTIONS = [
  { title: 'Project', fields: [
    text('projectName', 'Project name', { required: true, mark: true, placeholder: 'e.g. Acme Bakery website and brand shoot' }),
    text('websiteName', 'Client business or brand name', { required: true, mark: true }),
    text('providerAddress', 'Your address', { mark: true }),
    text('providerPhone', 'Your phone', { mark: true }),
    text('clientAddress', 'Client address', { mark: true }),
    text('clientPhone', 'Client phone', { mark: true }),
  ] },
  { title: 'Web design and development', service: 'web', fields: [
    num('pageCount', 'Number of pages', { value: '5', required: true, mark: true }),
    text('pageList', 'Pages', { value: 'Home, About, Services, Gallery, Contact', required: true, mark: true }),
    text('platform', 'CMS / platform / custom code', { required: true, mark: true, placeholder: 'e.g. WordPress, Webflow, custom code' }),
    text('integrations', 'Integrations', { value: 'None', mark: true, placeholder: 'Booking, payments, email, maps, social, or "None"' }),
    num('postLaunchDays', 'Post-launch fixes within (days)', { value: '14' }),
    num('designRevisions', 'Design revision rounds', { value: '2' }),
    num('siteRevisions', 'Built-site revision rounds', { value: '1' }),
    num('webFee', 'Web design and development fee ($)', { required: true, mark: true }),
  ] },
  { title: 'Photography', service: 'photo', fields: [
    num('shootSessions', 'Number of sessions', { value: '1', required: true, mark: true }),
    num('shootHours', 'Hours per session', { required: true, mark: true }),
    text('shootLocation', 'Location(s)', { required: true, mark: true }),
    text('shootDates', 'Shoot date(s)', { required: true, mark: true, placeholder: 'e.g. December 4, 2026' }),
    text('shootSubjects', 'Subjects', { required: true, placeholder: 'Business exterior/interior, products, team portraits, events…' }),
    num('shotListDays', 'Shot list due before the shoot (days)', { value: '7' }),
    num('photoCount', 'Edited images delivered', { required: true, mark: true }),
    num('deliveryDays', 'Delivery after the shoot (business days)', { value: '10' }),
    num('photoRevisions', 'Photo editing revision rounds', { value: '1' }),
    num('extraRate', 'Rate for extra images or hours ($)', { required: true, mark: true }),
    num('photoFee', 'Photography shoot and editing fee ($)', { required: true, mark: true }),
  ] },
  { title: 'Branding and graphic design', service: 'brand', fields: [
    num('logoConcepts', 'Initial logo concepts', { value: '3', required: true, mark: true }),
    text('brandItems', 'Other design items', { value: 'Business card, social media profile and post templates', mark: true, placeholder: 'Business cards, flyers, signage, social templates… or "None"' }),
    num('brandRevisions', 'Branding revision rounds', { value: '2' }),
    num('brandFee', 'Branding and design fee ($)', { required: true, mark: true }),
  ] },
  { title: 'Video and social media content', service: 'video', hint: 'Fill in the video details, the social media details, or both. Leave the number of videos or posts blank for the part that is not included.', fields: [
    num('videoCount', 'Number of videos', { value: '1', mark: true }),
    text('videoLength', 'Length of each video', { value: '60 seconds', mark: true }),
    num('videoHours', 'Filming time (hours)', { value: '4', mark: true }),
    text('videoLocation', 'Filming location(s)', { mark: true }),
    text('videoFormats', 'Formats delivered', { value: 'horizontal (16:9) and vertical (9:16) versions', mark: true }),
    num('videoDeliveryDays', 'First edit after filming (business days)', { value: '15' }),
    num('videoRevisions', 'Video revision rounds', { value: '2' }),
    num('socialPosts', 'Social media posts per month', { mark: true }),
    num('socialMonths', 'Number of months', { mark: true }),
    text('socialPlatforms', 'Platforms', { value: 'Instagram and Facebook', mark: true }),
    num('videoFee', 'Video and social content fee ($)', { required: true, mark: true }),
  ] },
  { title: 'Timeline', fields: [
    date('startDate', 'Start date', { required: true, mark: true }),
    date('launchDate', 'Target launch or final delivery date', { required: true, mark: true }),
    date('discoveryDate', 'Discovery', { mark: true }),
    date('photoDate', 'Photo shoot and delivery', { service: 'photo', mark: true }),
    date('brandDate', 'Brand concepts presented', { service: 'brand', mark: true }),
    date('designDate', 'Website design mockups', { service: 'web', mark: true }),
    date('devDate', 'Working site on staging', { service: 'web', mark: true }),
    date('videoDate', 'Filming and first edit', { service: 'video', mark: true }),
    date('reviewDate', 'Review and final checks', { mark: true }),
  ] },
  { title: 'Fees and payment', fields: [
    num('depositPct', 'Deposit on signing (%)', { value: '40', required: true }),
    num('milestonePct', 'On first approval (%)', { value: '30', required: true }),
    num('invoiceDays', 'Invoices due within (days)', { value: '7' }),
    num('lateDays', 'Late interest starts after (days)', { value: '15' }),
    num('interestPct', 'Late interest per month (%)', { value: '1.5' }),
    num('travelMiles', 'Free travel up to (miles)', { value: '25', service: ['photo', 'video'] }),
    num('changeRate', 'Hourly rate for extra work ($)', { required: true, mark: true }),
  ] },
  { title: 'Responsibilities', fields: [
    num('contentDays', 'Client content due within (days)', { value: '7' }),
    num('feedbackDays', 'Client feedback within (business days)', { value: '5' }),
    num('approvalDays', 'Silence counts as approval after (days)', { value: '10' }),
  ] },
  { title: 'Ownership, hosting and maintenance', fields: [
    num('copyrightFee', 'Photo/video copyright transfer fee ($)', { service: ['photo', 'video'], hint: 'Leave blank if copyright is not offered for sale.', mark: true }),
    num('creditFee', 'Fee to remove the credit line ($)', { hint: 'Leave blank if the credit stays.', mark: true }),
    text('hostingFee', 'Hosting by you: fee', { service: 'web', hint: 'For example "$25 per month". Leave blank if the Client hosts.', mark: true }),
    num('maintenanceFee', 'Maintenance plan per month ($)', { service: 'web', hint: 'Leave blank if you only offer hourly work.', mark: true }),
    num('warrantyDays', 'Free fixes after launch (days)', { value: '30', service: 'web' }),
  ] },
  { title: 'Confidentiality, termination and law', fields: [
    num('confidentialityYears', 'Confidentiality lasts (years)', { value: '2' }),
    num('noticeDays', 'Notice to end the agreement (days)', { value: '14' }),
    num('nonResponseDays', 'Client silent for more than (days)', { value: '30' }),
    num('rescheduleHours', 'Free reschedule of a shoot needs notice (hours)', { value: '72', service: ['photo', 'video'] }),
    num('lateCancelPct', 'Late shoot change costs (% of that service’s fee)', { value: '50', service: ['photo', 'video'] }),
    text('governingCounty', 'County for disputes', { required: true, mark: true, placeholder: 'e.g. Union County, New Jersey' }),
  ] },
]

export const CREATIVE_FIELDS = CREATIVE_SECTIONS.flatMap(section => section.fields.map(field => ({ ...field, service: field.service || section.service })))

export const selectedServices = fields => {
  const list = Array.isArray(fields?.services) ? fields.services : String(fields?.services || '').split(',')
  return CREATIVE_SERVICES.map(item => item.id).filter(id => list.includes(id))
}
export const appliesTo = (thing, services) => !thing.service || [].concat(thing.service).some(id => services.includes(id))

const longDate = iso => {
  const d = new Date(`${iso}T00:00:00`)
  return isNaN(d) ? String(iso) : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
const money = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
const round2 = value => Math.round(value * 100) / 100
const filled = value => String(value ?? '').trim() !== ''
// "a and b", "a, b, and c": the serial comma keeps items that contain "and" readable.
const listJoin = items => items.length <= 1 ? items.join('') : items.length === 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`

// Starting values for a new agreement. Services start from the client's
// project type when it names them ("Website + Photography").
export function creativeDefaults({ client, booking, invoice, branding = {} } = {}) {
  const out = Object.fromEntries(CREATIVE_FIELDS.map(field => [field.key, field.value || '']))
  const type = String(client?.type || booking?.type || '').toLowerCase()
  const guess = [
    /web|site|store|landing/.test(type) && 'web',
    /photo|shoot/.test(type) && 'photo',
    /brand|logo|graphic|design(?!.*web)/.test(type) && 'brand',
    /video|social|reel|content/.test(type) && 'video',
  ].filter(Boolean)
  if (/full brand package/.test(type)) guess.push('web', 'photo', 'brand')
  return {
    ...out,
    services: [...new Set(guess.length ? guess : ['web'])],
    projectName: client?.name ? `${client.name} ${client?.type ? client.type.toLowerCase() : 'project'}` : '',
    websiteName: client?.name || '',
    providerAddress: branding.address || '',
    providerPhone: branding.phone || '',
    clientPhone: client?.phone || '',
    shootLocation: booking?.location || '',
    videoLocation: booking?.location || '',
    shootDates: booking?.date ? longDate(booking.date) : '',
    startDate: client?.date || '',
  }
}

// Builds the agreement. Returns the text, the required details still empty
// (shown as [Label] in the preview), numbers that don't add up, the money
// summary, and the filled-in details to highlight.
export function creativeAgreement(fields) {
  const services = selectedServices(fields)
  const has = id => services.includes(id)
  const hasVideo = has('video') && Number(fields.videoCount) > 0
  const hasSocial = has('video') && Number(fields.socialPosts) > 0
  const shoots = has('photo') || hasVideo
  const missing = []
  const problems = []
  if (!services.length) problems.push('Choose at least one service for this agreement')
  if (has('video') && !hasVideo && !hasSocial) problems.push('Video and social media content needs a number of videos or posts per month')
  if (hasSocial && !(Number(fields.socialMonths) > 0)) missing.push('Number of months')

  // Each detail as it reads in the agreement.
  const v = {}
  for (const field of CREATIVE_FIELDS) {
    if (!appliesTo(field, services)) continue
    const raw = String(fields[field.key] ?? '').trim()
    if (field.required && !raw) { missing.push(field.label); v[field.key] = `[${field.label}]`; continue }
    if (field.type === 'number' && raw && !(Number(raw) >= 0)) problems.push(`${field.label} must be a number`)
    v[field.key] = field.type === 'date' ? (raw ? longDate(raw) : 'to be confirmed') : raw
  }
  for (const key of ['extraRate', 'changeRate', 'webFee', 'photoFee', 'brandFee', 'videoFee']) if (filled(fields[key]) && Number(fields[key]) >= 0 && v[key] !== undefined) v[key] = money(Number(fields[key]))

  // Money.
  const feeLines = [
    has('web') && ['Web design and development', 'webFee'],
    has('photo') && ['Photography shoot and editing', 'photoFee'],
    has('brand') && ['Branding and graphic design', 'brandFee'],
    has('video') && [hasVideo && hasSocial ? 'Video and social media content' : hasSocial ? 'Social media content' : 'Video production', 'videoFee'],
  ].filter(Boolean)
  const total = round2(feeLines.reduce((sum, [, key]) => sum + (Number(fields[key]) || 0), 0))
  const depositPct = Number(fields.depositPct) || 0, milestonePct = Number(fields.milestonePct) || 0
  const finalPct = round2(100 - depositPct - milestonePct)
  if (finalPct < 0) problems.push('Deposit and first-approval payments are more than 100%')
  const depositAmount = round2(total * depositPct / 100)
  const milestoneAmount = round2(total * milestonePct / 100)
  const finalAmount = round2(total - depositAmount - milestoneAmount)
  const totalText = total > 0 ? money(total) : '[Total fee]'

  const fee = key => filled(fields[key]) && Number(fields[key]) > 0 ? money(Number(fields[key])) : ''
  const parts = (...items) => items.map(item => String(item ?? '').trim()).filter(Boolean).join(', ')
  const media = [has('photo') && 'photographs', hasVideo && 'videos'].filter(Boolean)
  const mediaText = listJoin(media)

  // What the project includes, in words.
  const summary = listJoin([
    has('web') && 'a new or redesigned website',
    has('photo') && 'a photography shoot',
    has('brand') && 'brand identity and graphic design',
    hasVideo && hasSocial ? 'video and social media content' : hasVideo ? 'video production' : hasSocial ? 'social media content' : '',
  ].filter(Boolean))

  // Sections in order; numbers are given once the list is known.
  const sections = []
  const add = (key, title, lines) => sections.push({ key, title, lines })
  const no = key => sections.findIndex(section => section.key === key) + 1
  const ref = key => `Section ${no(key)}`

  add('parties', 'Parties', () => [
    `● Provider: ${parts(fields.businessName || '[Business name]', fields.providerAddress, fields.photographerEmail || '[Business email]', fields.providerPhone)} (“Provider”)`,
    `● Client: ${parts(fields.clientName || '[Client name]', fields.clientAddress, fields.clientEmail || '[Client email]', fields.clientPhone)} (“Client”)`,
    `● Project: ${v.projectName}, ${summary || '[services]'} for ${v.websiteName} (the “Project”)`,
    `The services included are described in ${listJoin(sections.filter(s => s.service).map(s => ref(s.key)))}. Anything not listed there is outside the scope and handled under ${ref('revisions')}.`,
  ])
  if (has('web')) sections.push({ key: 'web', service: true, title: 'Web Design and Development Services', lines: () => [
    'The Provider will design, build and launch the website described below.',
    `● Pages: ${v.pageCount} pages: ${v.pageList}`,
    '● Design: custom layout, typography and color palette, responsive on phone, tablet and desktop',
    `● Development: ${v.platform}, contact form, basic on-page SEO (titles, descriptions, image alt text), analytics setup`,
    `● Integrations: ${v.integrations || 'None'}`,
    '● Testing: the major current browsers and devices before launch',
    `● Launch: deployment to the Client’s hosting and domain, plus one round of post-launch fixes within ${v.postLaunchDays} days`,
  ] })
  if (has('photo')) sections.push({ key: 'photo', service: true, title: 'Photography Services', numbered: true, lines: () => [
    `Shoot: ${v.shootSessions} session(s) of up to ${v.shootHours} hours at ${v.shootLocation} on ${v.shootDates}, with the Provider’s own professional equipment.`,
    `Subjects: ${v.shootSubjects}.`,
    `Shot list: the Client will supply a shot list or wish list at least ${v.shotListDays} days before the shoot. The Provider may add creative shots.`,
    `Delivery: ${v.photoCount} edited, web-optimized images (color-corrected and cropped) within ${v.deliveryDays} business days after the shoot, through an online gallery or download link. Unedited and RAW files are not included unless agreed in writing.`,
    'Access and readiness: the Client will provide access to locations, arrange staff, products and props, and obtain any location permissions needed.',
    'People in photos: the Client will make sure every identifiable person has agreed to be photographed. The Provider may supply a model release form for the Client to collect.',
    'Weather and conditions: if outdoor conditions or site problems make the shoot unusable, the parties will reschedule once at no extra charge.',
    `Extra images or time: additional images or hours are billed at ${v.extraRate} per image or hour.`,
  ] })
  if (has('brand')) sections.push({ key: 'brand', service: true, title: 'Branding and Graphic Design Services', lines: () => [
    'The Provider will create the brand identity and design items described below.',
    `● Logo: ${v.logoConcepts} initial logo concepts, developed into one final logo, with full-color, one-color and reversed versions`,
    '● Brand guide: color palette, typography and simple rules for using the logo',
    `● Other design items: ${v.brandItems || 'None'}`,
    '● Files: final artwork in vector (AI, SVG or PDF) and web (PNG and JPG) formats',
    '● Printing, trademark searches and registration are not included unless agreed in writing.',
  ] })
  if (has('video')) sections.push({ key: 'video', service: true, title: hasVideo && hasSocial ? 'Video and Social Media Content' : hasSocial ? 'Social Media Content' : 'Video Production', lines: () => [
    ...(hasVideo ? [
      `● Video: ${v.videoCount} video(s) of up to ${v.videoLength} each, including up to ${v.videoHours} hours of filming at ${v.videoLocation || 'a location agreed in writing'}, editing, color correction, and music licensed for the Client’s use`,
      `● Formats: ${v.videoFormats}, delivered by download link`,
      `● Delivery: a first edit within ${v.videoDeliveryDays} business days after filming. Raw footage is not included unless agreed in writing.`,
      '● People and places on camera: the Client will make sure every identifiable person has agreed to be filmed and that filming at the location is allowed.',
    ] : []),
    ...(hasSocial ? [
      `● Social media: ${v.socialPosts} posts per month for ${v.socialMonths || '[Number of months]'} month(s) on ${v.socialPlatforms}, including design and captions`,
      `● Content calendar: the Provider shares each month’s planned posts in advance, and the Client approves them within ${v.feedbackDays} business days. Approved posts are scheduled or delivered ready to post.`,
      '● Not included unless agreed in writing: paid advertising and ad spend, community management, replying to comments or messages, and growth or engagement guarantees.',
    ] : []),
  ] })
  add('timeline', 'Timeline and Deliverables', () => {
    const phases = [
      ['Discovery', 'goals, plan and content list', v.discoveryDate],
      has('photo') && ['Photo shoot', 'shoot day(s); edited images delivered', v.photoDate],
      has('brand') && ['Brand design', 'logo concepts and brand guide for approval', v.brandDate],
      has('web') && ['Website design', 'mockups of key pages for approval', v.designDate],
      has('web') && ['Development', 'working site on a staging link', v.devDate],
      has('video') && [hasVideo ? 'Video' : 'Social content', hasVideo ? 'filming and first edit for review' : 'first month’s content calendar for approval', v.videoDate],
      [has('web') ? 'Review and testing' : 'Review', 'Client feedback applied, final checks', v.reviewDate],
      [has('web') ? 'Launch and handover' : 'Final delivery', has('web') ? 'site live, files handed over' : 'final files delivered', v.launchDate],
    ].filter(Boolean)
    return [
      `The Project starts on ${v.startDate} after the deposit and the Client’s initial materials are received, with a target ${has('web') ? 'launch' : 'final delivery'} of ${v.launchDate}. Dates move day for day when the Client is late with content, feedback or payment.`,
      ...phases.map(([name, what, when], i) => `● Phase ${i + 1}, ${name}: ${what}. Target date: ${when}`),
    ]
  })
  add('fees', 'Fees and Payment', () => [
    `The total fee is ${totalText}, made up as follows.`,
    ...feeLines.map(([label, key]) => `● ${label}: ${v[key]}`),
    `● Total: ${totalText}`,
    'Payments are due as follows.',
    `● Deposit (non-refundable), due on signing: ${depositPct}% (${money(depositAmount)})`,
    `● Milestone, due on approval of the first designs or deliverables: ${milestonePct}% (${money(milestoneAmount)})`,
    `● Final, due ${has('web') ? 'before launch' : 'before final delivery'}: ${Math.max(0, finalPct)}% (${money(finalAmount)})`,
    `● Invoices are due within ${v.invoiceDays} days. Unpaid balances over ${v.lateDays} days late accrue ${v.interestPct}% interest per month, and the Provider may pause work.`,
    `● The Provider keeps control of the final files (${listJoin([has('web') && 'site files', media.length && `full-resolution ${mediaText}`, has('brand') && 'design source files', hasSocial && 'social media graphics'].filter(Boolean))}) until the final payment clears.`,
    `● Client-approved expenses (${shoots ? `travel beyond ${v.travelMiles} miles, props, models, ` : ''}stock images, music, paid plugins, fonts) are billed at cost.`,
    '● Prices exclude hosting, domain, printing, paid advertising, third-party subscriptions and taxes unless stated.',
  ])
  add('client', 'Client Responsibilities', () => [
    `● Provide text, logos, brand guidelines and other content within ${v.contentDays} days of request.`,
    `● Name one decision-maker who gives consolidated feedback within ${v.feedbackDays} business days.`,
    '● Own or have the right to use all content supplied, and keep the Provider free of claims over it.',
    `● Give timely access to ${listJoin([shoots && 'locations', has('web') && 'hosting and domain accounts', hasSocial && 'social media accounts'].filter(Boolean)) || 'the accounts and materials the Project needs'}.`,
    `● Approve each phase in writing (email counts). Silence for ${v.approvalDays} days after a request counts as approval of that phase.`,
  ])
  add('revisions', 'Revisions and Change Requests', () => [
    `● The fee covers ${listJoin([
      has('web') && `${v.designRevisions} round(s) of revisions on the website design and ${v.siteRevisions} round(s) on the built site`,
      has('photo') && `${v.photoRevisions} round(s) of minor photo editing adjustments`,
      has('brand') && `${v.brandRevisions} round(s) of revisions on the chosen logo concept and design items`,
      hasVideo && `${v.videoRevisions} round(s) of revisions on each video`,
      hasSocial && 'one round of changes to each month’s planned posts before they are approved',
    ].filter(Boolean)) || 'the revisions described above'}.`,
    `● Work beyond scope, new pages, items or features, or a redesign after approval is quoted in writing and billed at ${v.changeRate} per hour once the Client agrees.`,
    ...(shoots ? ['● A reshoot, or added shoot or filming time, is a change request.'] : []),
  ])
  add('ownership', 'Ownership, Licensing and Image Rights', () => [
    ...(has('web') ? ['Website: after full payment, the Client owns the final website design and custom code. The Provider keeps ownership of pre-existing tools, templates, libraries and know-how, and grants the Client a perpetual license to use them as part of the site.'] : []),
    ...(has('brand') ? ['Brand identity: after full payment, the Client owns the final logo and the brand assets created for them, and may register them as trademarks. Concepts that were not chosen remain the Provider’s.'] : []),
    ...(media.length ? [`${mediaText[0].toUpperCase()}${mediaText.slice(1)}: the Provider keeps copyright in all ${mediaText}. After full payment, the Client receives a non-exclusive, perpetual license to use the delivered ${mediaText} on the website, social media, print and marketing for the Client’s own business.${fee('copyrightFee') ? ` Copyright can transfer to the Client for an additional fee of ${fee('copyrightFee')}.` : ''}`,
      `Not permitted without written consent: reselling the ${mediaText}, licensing them to third parties, or entering them in contests.`] : []),
    ...(hasSocial ? ['Social media posts: after full payment, the Client may keep and reuse the delivered posts and graphics for their own business.'] : []),
    'Third-party material: stock images, music, fonts and plugins are licensed under their own terms, and the Client pays any licensing fees.',
    'Client material: the Client keeps ownership of supplied content and grants the Provider permission to use it for the Project.',
    `Credit: the Provider may include a small credit line ${listJoin([has('web') && 'in the site footer', media.length && `on published ${mediaText}`].filter(Boolean)) || 'on the delivered work where suitable'}.${fee('creditFee') ? ` The credit can be removed for ${fee('creditFee')}.` : ''}`,
    'Portfolio: the Provider may show the finished work in their portfolio and promotion, unless the Client objects in writing for confidentiality reasons.',
  ])
  if (has('web')) add('hosting', 'Hosting, Domain and Maintenance', () => [
    `● Hosting and domain accounts are registered in the Client’s name and paid by the Client${filled(fields.hostingFee) ? `, unless the Provider hosts the site for ${String(fields.hostingFee).trim()}` : ''}.`,
    `● After launch, the Provider fixes defects in the delivered work for ${v.warrantyDays} days at no charge. Later updates, content changes, backups, security and software updates are available under a separate maintenance plan${fee('maintenanceFee') ? ` of ${fee('maintenanceFee')} per month` : ''}, or hourly at ${v.changeRate}.`,
    '● The Provider is not responsible for outages, data loss or security issues caused by third-party hosts, plugins or changes made by others.',
  ])
  add('liability', 'Confidentiality, Warranties and Liability', () => [
    `● Each party keeps the other’s non-public business information confidential during the Project and for ${v.confidentialityYears} years after.`,
    '● The Provider will perform the services in a professional manner. The Provider does not guarantee specific results such as search ranking, followers, traffic or sales.',
    '● The Provider is not liable for indirect or consequential damages such as lost profits. Total liability is limited to the fees the Client has paid under this Agreement.',
    '● The Client will indemnify the Provider against claims arising from content the Client supplied or from the Client’s failure to obtain releases or permissions.',
    ...(shoots ? ['● Equipment failure, illness or other events beyond the Provider’s control may delay a shoot or filming. The Provider will reschedule, or refund the unused fee for that service if no new date works. The Provider is not liable for lost opportunities.'] : []),
  ])
  add('term', 'Term, Termination and Rescheduling', () => [
    `● This Agreement runs from signing until ${has('web') ? 'the website is launched' : 'the final files are delivered'} and final payment is made.`,
    `● Either party may end it with ${v.noticeDays} days’ written notice. The Client pays for work done and expenses incurred up to the end date, and the deposit is not refunded.`,
    `● The Provider may end it immediately if the Client does not pay or stops responding for more than ${v.nonResponseDays} days.`,
    ...(shoots ? [`● Shoot cancellation: the Client may reschedule a shoot or filming day once with at least ${v.rescheduleHours} hours’ notice at no charge. Later changes or cancellations cost ${v.lateCancelPct}% of that service’s fee, and a no-show costs its full fee.`] : []),
    '● After termination, the Client receives only work that has been paid for in full.',
  ])
  add('general', 'General Provisions', () => [
    '● Independent contractor: the Provider is not an employee, partner or agent of the Client, and pays their own taxes and insurance.',
    '● Entire agreement: this document is the whole agreement and replaces earlier discussions. Changes must be in writing and signed or confirmed by email by both parties.',
    `● Governing law: the laws of ${fields.governingState || '[Governing state]'} apply, and disputes will be handled in the courts of ${v.governingCounty} after the parties first try good-faith mediation.`,
    '● Severability: if one clause is unenforceable, the rest stays in effect.',
    '● Assignment: neither party may assign this Agreement without the other’s written consent.',
    `● Notices: by email to the addresses in ${ref('parties')}.`,
    '● Counterparts: electronic signatures and separate copies are valid.',
  ])
  add('acceptance', 'Acceptance', () => ['By signing, both parties agree to the terms above.'])
  // Ownership clauses are numbered like the photography items.
  sections.find(section => section.key === 'ownership').numbered = true

  const out = [fields.contractTitle || 'Creative Services Agreement', '',
    `THIS AGREEMENT is made on ${fields.effectiveDate ? longDate(fields.effectiveDate) : '[Date]'} between the Provider and the Client below, for the creative services described in this Agreement.`, '']
  sections.forEach((section, index) => {
    const n = index + 1
    out.push(`${n}. ${section.title}`, '')
    let item = 0
    for (const line of section.lines()) {
      const numbered = section.numbered && !line.startsWith('●')
      out.push(numbered ? `${n}.${++item} ${line}` : line, '')
    }
  })
  out.push('Signatures', '', fields.businessName || '[Business name]', 'Signature required', '', fields.clientName || '[Client name]', 'Signature required')

  const highlights = [
    fields.businessName, fields.photographerEmail, fields.clientName, fields.clientEmail, fields.providerAddress, fields.providerPhone, fields.clientAddress, fields.clientPhone,
    ...CREATIVE_FIELDS.filter(field => field.mark && appliesTo(field, services)).map(field => v[field.key]),
    totalText, money(depositAmount), money(milestoneAmount), money(finalAmount),
    fee('copyrightFee'), fee('creditFee'), fee('maintenanceFee'), filled(fields.hostingFee) ? String(fields.hostingFee).trim() : '',
    fields.effectiveDate ? longDate(fields.effectiveDate) : '',
  ].map(value => String(value ?? '').trim()).filter(value => value.length >= 3 && !/^\[.*\]$/.test(value) && value !== 'to be confirmed' && value !== 'None')

  return {
    text: out.join('\n'), services, missing: [...new Set(missing)], problems,
    money: { total: totalText, deposit: money(depositAmount), milestone: money(milestoneAmount), final: money(finalAmount) },
    highlights: [...new Set(highlights)],
  }
}
