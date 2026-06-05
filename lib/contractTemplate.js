// Ellie's Heartstrings — Photography Services Agreement template
// Fields wrapped in {{field}} are replaced with client data

export const CONTRACT_TEMPLATE = `Portrait Photography Services Agreement

THIS AGREEMENT is made as of {{effectiveDate}} (the "Effective Date") between {{clientName}} ("Client"), and Ellie's Heartstrings ("Photographer").

1. Engagement of Photographer
1.1 Services. Subject to the terms set out herein, Client engages Photographer to provide, and Photographer agrees to provide, the photography services described in this Section 1.1 (the "Services") in connection with the portrait session of {{sessionType}} (the "Portrait Session").

Date and time of Portrait Session: {{sessionDate}} at {{sessionTime}}

Location of Portrait Session: {{location}}

Description of Services: {{sessionType}}

As part of the Services, the Photographer will produce or take similar action to create materials from Images and provide related deliverables pursuant to the provision of the Services ("Work Product"). "Images" means photographic material, whether still or moving, created by Photographer pursuant to this Agreement and includes, but is not limited to, transparencies, negatives, prints or digital files, captured, recorded, stored or delivered in any type of analogue, photographic, optical, electronic, magnetic, digital or any other medium.

1.2 Exclusivity. Client acknowledges and agrees that Photographer will be the exclusive provider of the Services in the Portrait Session, unless otherwise agreed to by the parties in writing.

2. Fees and Payment
2.1 Fees. Client will pay Photographer the fees set out herein in this Section 2.1 ("Fees"), including any applicable federal or state/provincial sales or value-added taxes due on such Fees.

Total Fee for Services: {{totalFee}}

Retainer due upon signing: {{retainerAmount}}

Remaining amount due on {{remainingDueDate}} of {{remainingAmount}}

2.2 Retainer. Client acknowledges and agrees that the retainer amount set out above is due upon the signing of this Agreement and is not refundable ("Retainer"), so as to fairly compensate Photographer for committing his/her time to provide the Services and turning down other potential projects or clients. Both parties agree that the Retainer will be credited towards the total Fees payable by Client.

2.3 Invoice. Photographer will issue an invoice to Client upon agreement of the Services ("Invoice"). Client agrees to pay all Fees outstanding on or prior to the due dates set out in Section 2.1.

3. Client Responsibilities
3.1 Required Consents. Client will ensure that all required consents, as applicable, have been obtained prior to performance of the Services.

3.2 Expenses. Client will provide the means of travel or be responsible for reasonable travel expenses incurred by Photographer that are necessary for the performance of the Services where the location is not in the city of Linden, NJ.

3.3 Waiver. Client (on behalf of himself/herself and any other participant whose image or recording may be captured by the Services) hereby waives all rights and claims, and releases Photographer from any claim or cause of action relating to the sale, display, license, use and exploitation of Images pursuant to this Agreement.

4. Photographer Responsibilities
4.1 Equipment. Client will not be required to supply any photography equipment to Photographer.

4.2 Manner of Service. Photographer will ensure that the Services are performed in a good, expedient, workmanlike and safe manner.

4.3 Photography Staff. Photographer will ensure that all Photography Staff comply with the reasonable directions of Client regarding safety and applicable health, safety and security requirements.

5. Artistic Release
5.1 Consistency. Photographer will use reasonable efforts to ensure that the Services are produced in a style consistent with Photographer's current portfolio.

5.2 Style. Client acknowledges and agrees that Client has reviewed Photographer's previous work and has a reasonable expectation that Photographer will perform the Services in a similar style, and that Photographer will use its artistic judgement when providing the Services.

6. Term and Termination
6.1 Term. This Agreement will begin on the Effective Date and continue until all outstanding Fees are paid in full and all final Work Product has been delivered.

6.2 Cancellation. Client may terminate the Agreement by providing Photographer with written notice no later than 2 days before the original date of the Portrait Session. Client acknowledges that Client is not relieved of any payment obligations unless the minimum notice is duly provided.

6.3 Rescheduling. In the event of Rescheduling, Photographer will use commercially reasonable efforts to accommodate Client's change.

6.4 No Refund. Client acknowledges and agrees that Cancellation by Client will not result in a refund of any fees paid on or prior to the date of Cancellation.

6.5 Late Arrivals. In the event that the Client arrives late to the Portrait Session, the amount of time late may be deducted from the time allotted for the session.

6.6 Replacement. In the event that Photographer is unable to perform the Services, Photographer shall cause a replacement photographer to perform the Services subject to Client's consent.

7. Ownership of Work Product
7.1 Ownership. Photographer will own all right, title and interest in all Work Product. Client hereby grants Photographer an exclusive, royalty-free, worldwide, irrevocable license to use any materials created during the performance of the Services in connection with the marketing, advertising or promotion of Photographer's services.

8. Limited License to Client
8.1 Personal Use. Photographer hereby grants Client a limited, irrevocable, royalty-free, non-transferable license to use Work Product for Client's personal use only, including personal social media, personal creations, non-commercial display, and personal communications.

9. Indemnity and Limitation of Liability
9.1 Indemnification. Client agrees to indemnify, defend and hold harmless Photographer and its affiliates for any injury, property damage, liability, claim or other cause of action arising out of or related to the Services.

9.2 Force Majeure. Neither party shall be held in breach of this Agreement for any delay caused by illness, emergency, fire, strike, pandemic, or any conditions beyond the reasonable control of the non-performing party.

9.3 Maximum Liability. Photographer's maximum liability shall not exceed the total Fees payable under this Agreement.

10. General
10.1 Notice.
Photographer's Email: hello@elliesheartstrings.com
Client's Email: {{clientEmail}}

10.2 Governing Law. This Agreement will be governed by the laws of New Jersey, United States.

10.3 Entire Agreement. This Agreement constitutes the entire agreement between the parties with respect to the Services.

Signatures

{{clientName}}
Signed on: ___________________

Ellie's Heartstrings
Signed on: ___________________`

export function fillContract(template, fields) {
  let out = template
  Object.entries(fields).forEach(([key, val]) => {
    out = out.replaceAll(`{{${key}}}`, val || `[${key}]`)
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
    sessionType: client?.type || booking?.type || '[Session Type]',
    sessionDate,
    sessionTime,
    location: booking?.location || '[Location]',
    totalFee: total ? `$${total.toLocaleString()}.00` : '[Total Fee]',
    retainerAmount: total ? `$${retainer.toLocaleString()}.00` : '[Retainer]',
    remainingAmount: total ? `$${remaining.toLocaleString()}.00` : '[Remaining]',
    remainingDueDate: dueDate,
  }
}
