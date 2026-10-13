/** Formats the stored plain-text agreement without changing its legal wording. */
export default function ContractDocument({ body, signedBy, signedAt, signatureData, headerImageUrl }) {
  const allLines = String(body || 'No contract body.').replace(/\r\n/g, '\n').split('\n')
  const titleIndex = allLines.findIndex(line => line.trim() === 'Portrait Photography Services Agreement')
  const lines = allLines.slice(titleIndex >= 0 ? titleIndex : 0)
  const title = lines[0]?.trim() || 'Portrait Photography Services Agreement'
  const signatureIndex = lines.findIndex(line => line.trim() === 'Signatures')
  const content = lines.slice(1, signatureIndex < 0 ? undefined : signatureIndex)
  const signatures = signatureIndex < 0 ? [] : lines.slice(signatureIndex + 1).map(line => line.trim()).filter(Boolean)
  return <article className="contract-document">
    {headerImageUrl && <header className="contract-document-brand"><img src={headerImageUrl} alt="Contract header" /></header>}
    <h1 className="contract-document-title">{title}</h1>
    <div className="contract-document-content">{content.map((line, index) => {
      const text = line.trim()
      if (!text) return null
      if (/^\d+\.\s+\S/.test(text)) return <h2 key={index}>{text}</h2>
      if (text.startsWith('●')) return <p className="contract-document-bullet" key={index}>{text.slice(1).trim()}</p>
      if (/^\d+\.\d+\s+\S/.test(text)) return <p className="contract-document-clause" key={index}>{text}</p>
      return <p className={text.startsWith('THIS AGREEMENT') ? 'contract-document-intro' : ''} key={index}>{text}</p>
    })}</div>
    {!!signatures.length && <section className="contract-document-signatures"><h2>Signatures</h2><div>{[0, 2].map(index => <div key={index}>
      {index === 2 && signatureData ? <img className="contract-signature-image" src={signatureData} alt={`Signature of ${signedBy || signatures[index] || 'client'}`} /> : <div className="contract-document-signature-line" />}
      <strong>{signatures[index] || ''}</strong>
      <span>{index === 2 && signedBy ? `Electronically signed by ${signedBy}${signedAt ? ` on ${signedAt}` : ''}` : signatures[index + 1] || ''}</span>
    </div>)}</div></section>}
  </article>
}
