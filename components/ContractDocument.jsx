/** Visual layout for the stored plain-text agreement. The contract wording stays
 * in the saved body; this component only groups its existing lines. */
export default function ContractDocument({ body, signedBy, signedAt }) {
  const lines = String(body || 'No contract body.').replace(/\r\n/g, '\n').split('\n')
  const branded = lines[0]?.trim().toUpperCase() === "ELLIE'S HEARTSTRINGS" && lines[1]?.trim() === 'CONTRACT'
  let issueDate = '', from = '', to = '', documentName = '', agreementTitle = ''
  let start = 0
  if (branded) {
    issueDate = lines.find(line => line.startsWith('Issue date:'))?.replace('Issue date:', '').trim() || ''
    from = lines.find(line => line.startsWith('From:'))?.replace('From:', '').trim() || ''
    to = lines.find(line => line.startsWith('To:'))?.replace('To:', '').trim() || ''
    const toIndex = lines.findIndex(line => line.startsWith('To:'))
    const names = lines.slice(toIndex + 1).map(line => line.trim()).filter(Boolean)
    documentName = names[0] || ''
    agreementTitle = names[1] || ''
    start = lines.findIndex((line, index) => index > toIndex && line.trim() === agreementTitle) + 1
  }
  const signatureIndex = lines.findIndex((line, index) => index >= start && line.trim() === 'Signatures')
  const content = lines.slice(start, signatureIndex < 0 ? undefined : signatureIndex)
  const signatures = signatureIndex < 0 ? [] : lines.slice(signatureIndex + 1).map(line => line.trim()).filter(Boolean)
  return <article className="contract-document">
    {branded && <>
      <header className="contract-document-head"><div><strong>ELLIE'S HEARTSTRINGS</strong><span>CONTRACT</span></div><div className="contract-document-date"><small>Issue date</small><span>{issueDate}</span></div></header>
      <h1 className="contract-document-name">{documentName}</h1>
      <div className="contract-document-parties"><div><small>From</small><span>{from}</span></div><div><small>To</small><span>{to}</span></div></div>
      <h2 className="contract-document-title">{agreementTitle}</h2>
    </>}
    <div className="contract-document-content">{content.map((line, index) => {
      const text = line.trim()
      if (!text) return null
      if (/^\d+\.\s+\S/.test(text)) return <h3 key={index}>{text}</h3>
      if (text.startsWith('●')) return <p className="contract-document-bullet" key={index}>{text.slice(1).trim()}</p>
      if (/^\d+\.\d+\s+\S/.test(text)) return <p className="contract-document-clause" key={index}>{text}</p>
      return <p className={text.startsWith('THIS AGREEMENT') ? 'contract-document-intro' : ''} key={index}>{text}</p>
    })}</div>
    {!!signatures.length && <section className="contract-document-signatures"><h3>Signatures</h3><div>{[0, 2].map(index => <div key={index}><div className="contract-document-signature-line" /><strong>{signatures[index] || ''}</strong><span>{index === 2 && signedBy ? `Electronically signed by ${signedBy}${signedAt ? ` on ${signedAt}` : ''}` : signatures[index + 1] || ''}</span></div>)}</div></section>}
  </article>
}
