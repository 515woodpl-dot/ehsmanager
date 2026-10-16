// Wraps every filled-in detail (client, session date/time, location,
// amounts) in a light pink mark. Longest values first so "$1,200.00" wins
// over "$1,200".
function marked(text, values) {
  if (!values?.length) return text
  const escape = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(${[...new Set(values)].sort((a, b) => b.length - a.length).map(escape).join('|')})`, 'g')
  const set = new Set(values)
  return text.split(pattern).map((part, i) => set.has(part) ? <mark className="contract-filled" key={i}>{part}</mark> : part)
}

/** Formats the stored plain-text agreement without changing its legal wording. */
export default function ContractDocument({ body, signedBy, signedAt, signatureData, headerImageUrl, studioSignature = null, highlights = [] }) {
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
      if (text.startsWith('●')) return <p className="contract-document-bullet" key={index}>{marked(text.slice(1).trim(), highlights)}</p>
      if (/^\d+\.\d+\s+\S/.test(text)) return <p className="contract-document-clause" key={index}>{marked(text, highlights)}</p>
      return <p className={text.startsWith('THIS AGREEMENT') ? 'contract-document-intro' : ''} key={index}>{marked(text, highlights)}</p>
    })}</div>
    {!!signatures.length && <section className="contract-document-signatures"><h2>Signatures</h2><div>{[0, 2].map(index => {
      // Slot 0 is the studio, slot 2 the client.
      const sig = index === 0
        ? studioSignature?.name ? { name: studioSignature.name, at: studioSignature.at, image: studioSignature.data } : null
        : signedBy ? { name: signedBy, at: signedAt, image: signatureData } : null
      return <div key={index}>
        {sig?.image ? <img className="contract-signature-image" src={sig.image} alt={`Signature of ${sig.name}`} />
          : sig ? <div className="contract-signature-typed">{sig.name}</div>
          : <div className="contract-document-signature-line" />}
        <strong>{signatures[index] || ''}</strong>
        <span>{sig ? `Electronically signed by ${sig.name}${sig.at ? ` on ${sig.at}` : ''}` : signatures[index + 1] || ''}</span>
      </div>
    })}</div></section>}
  </article>
}
