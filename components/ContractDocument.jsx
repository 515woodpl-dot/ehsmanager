/** Visual layout for the stored plain-text agreement, modelled on the studio's
 * Pixieset contract. The contract wording stays in the saved body; this
 * component only groups its lines and styles filled-in values and terms. */

export function parseContract(body) {
  const lines = String(body || 'No contract body.').replace(/\r\n/g, '\n').split('\n')
  const branded = lines[1]?.trim() === 'CONTRACT' && lines.some(line => line.startsWith('Issue date:'))
  const meta = { studio: '', issueDate: '', from: '', to: '', documentName: '', title: '' }
  let start = 0
  if (branded) {
    meta.studio = lines[0].trim()
    const value = prefix => lines.find(line => line.startsWith(prefix))?.slice(prefix.length).trim() || ''
    meta.issueDate = value('Issue date:')
    meta.from = value('From:')
    meta.to = value('To:')
    const toIndex = lines.findIndex(line => line.startsWith('To:'))
    const names = lines.slice(toIndex + 1).map(line => line.trim()).filter(Boolean)
    meta.documentName = names[0] || ''
    meta.title = names[1] || ''
    start = lines.findIndex((line, index) => index > toIndex && line.trim() === meta.title) + 1
  }
  const signatureIndex = lines.findIndex((line, index) => index >= start && line.trim() === 'Signatures')
  const content = lines.slice(start, signatureIndex < 0 ? undefined : signatureIndex)
  // Template order is studio, then client; each name is followed by a status line.
  const names = signatureIndex < 0 ? [] : lines.slice(signatureIndex + 1).map(line => line.trim()).filter(line => line && line !== 'Signature required')
  return { meta, content, signers: { studio: names[0] || meta.from, client: names[1] || meta.to }, hasSignatures: signatureIndex >= 0 }
}

// Each rule's groups must cover the whole line; styles: u = filled-in value, b = bold.
const RULES = [
  [/^(THIS AGREEMENT)( is made as of )(.+?)( \(the “Effective Date”\) between )(.+?)( \(“Client”\), and )(.+?)( \(“Photographer”\)\.?)$/, ['b', '', 'u', '', 'u', '', 'u', '']],
  [/^(.*portrait session of )(.+?)(\s*\(the “Portrait Session”\)\.?)$/, ['', 'u', '']],
  [/^(Date and time of Portrait Session: )(.+?)( at )(.+)$/, ['', 'u', '', 'u']],
  [/^(Remaining amount due on )(.+?)( of )(.+)$/, ['', 'u', '', 'u']],
  [/^((?:Location of Portrait Session|Description of Services?|Total Fee for Services|Retainer due upon signing|Photographer[’']s Email|Client[’']s Email): )(.+)$/, ['', 'u']],
  [/^(.*city of )(.+?)(\. Client.*)$/, ['', 'b', '']],
  [/^(.*governed by the laws of )(.+)$/, ['', 'b']],
]

// Defined terms (“Fees”) and bracketed values ([2 days]) are bold, as in the source.
function emphasise(text, keyPrefix) {
  return text.split(/(“[^”]+”|\[[^\]]+\])/g).map((part, index) => {
    if (/^“.+”$/.test(part)) return <span key={`${keyPrefix}-${index}`}>“<strong>{part.slice(1, -1)}</strong>”</span>
    if (/^\[.+\]$/.test(part)) return <span key={`${keyPrefix}-${index}`}>[<strong>{part.slice(1, -1)}</strong>]</span>
    return part
  })
}

function rich(text) {
  for (const [pattern, styles] of RULES) {
    const match = pattern.exec(text)
    if (!match) continue
    return match.slice(1).map((part, index) => {
      if (styles[index] === 'u') return <span className="cd-value" key={index}>{part}</span>
      if (styles[index] === 'b') return <strong key={index}>{part}</strong>
      return <span key={index}>{emphasise(part, index)}</span>
    })
  }
  return emphasise(text, 'p')
}

function Clause({ text }) {
  const match = /^(\d+\.\d+)\s+(.+?\s?\.)\s+(.*)$/.exec(text)
  if (!match) return <p className="cd-clause">{rich(text)}</p>
  return <p className="cd-clause">{match[1]} <strong>{match[2]}</strong> {rich(match[3])}</p>
}

export function SignatureBlock({ name, image, signedOn, children }) {
  return (
    <div className="cd-signature">
      <div className="cd-signature-mark">
        {children || (image
          ? <img src={image} alt={`Signature of ${name}`} />
          : signedOn ? <span className="cd-signature-script">{name}</span> : null)}
      </div>
      <div className="cd-signature-name">{name}</div>
      <div className="cd-signature-date">{signedOn ? `Signed on ${signedOn}` : 'Awaiting signature'}</div>
    </div>
  )
}

export default function ContractDocument({ body, signedBy, signedAt, signatureImage, showSummary = true, clientSignatureSlot }) {
  const { meta, content, signers, hasSignatures } = parseContract(body)
  const blocks = []
  let bullets = []
  const flush = () => { if (bullets.length) { blocks.push(<ul key={`ul-${blocks.length}`}>{bullets}</ul>); bullets = [] } }
  content.forEach((line, index) => {
    const text = line.trim()
    if (!text) return
    if (text.startsWith('●') || text.startsWith('•')) { bullets.push(<li key={index}>{rich(text.slice(1).trim())}</li>); return }
    flush()
    if (/^\d+\.\s+\S/.test(text)) blocks.push(<h3 key={index}>{text}</h3>)
    else if (/^\d+\.\d+\s+\S/.test(text)) blocks.push(<Clause key={index} text={text} />)
    else blocks.push(<p key={index} className={/^(Date and time|Location|Description) of /.test(text) ? 'cd-detail' : undefined}>{rich(text)}</p>)
  })
  flush()

  return (
    <article className="contract-document">
      {showSummary && meta.from && (
        <header className="cd-summary">
          <h2>{meta.documentName}</h2>
          <dl>
            <div><dt>From</dt><dd>{meta.from}</dd></div>
            <div><dt>To</dt><dd>{meta.to}</dd></div>
            <div><dt>Issue date</dt><dd>{meta.issueDate}</dd></div>
          </dl>
        </header>
      )}
      {meta.title && <h1 className="cd-title">{meta.title}</h1>}
      <div className="cd-body">{blocks}</div>
      {hasSignatures && (
        <section className="cd-signatures">
          <h3>Signatures</h3>
          {signedBy || !clientSignatureSlot
            ? <SignatureBlock name={signedBy || signers.client} image={signatureImage} signedOn={signedBy ? signedAt : ''} />
            : <SignatureBlock name={signers.client}>{clientSignatureSlot}</SignatureBlock>}
          <SignatureBlock name={signers.studio} signedOn={meta.issueDate} />
        </section>
      )}
    </article>
  )
}
