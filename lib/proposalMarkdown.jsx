// Turns a proposal written in simple Markdown into React elements — no raw
// HTML, so pasted text can never inject markup or scripts.
//
//   # Title            ## Section            ### Sub-section
//   - bullet           1. numbered item      > highlighted note
//   | A | B |  (table, first row = header; a |---| row is optional)
//   ---  (divider)     **bold**   *italic*   [link](https://…)
const safeHref = url => /^(https:\/\/|mailto:|tel:)/i.test(url) ? url : null

function inline(text, keyBase = '') {
  const out = []
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g
  let last = 0, m, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = `${keyBase}-${i++}`
    if (m[2]) out.push(<strong key={key}>{m[2]}</strong>)
    else if (m[3]) out.push(<em key={key}>{m[3]}</em>)
    else {
      const href = safeHref(m[5])
      out.push(href ? <a key={key} href={href} target={href.startsWith('https') ? '_blank' : undefined} rel="noreferrer">{m[4]}</a> : m[4])
    }
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

export function parseBlocks(source) {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let para = []
  const flush = () => { if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = [] } }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const t = line.trim()
    if (!t) { flush(); continue }
    let m
    if ((m = /^(#{1,3})\s+(.*)$/.exec(t))) { flush(); blocks.push({ type: `h${m[1].length}`, text: m[2] }); continue }
    if (/^(-{3,}|\*{3,})$/.test(t)) { flush(); blocks.push({ type: 'hr' }); continue }
    if (t.startsWith('>')) { flush(); const quote = [t.replace(/^>\s?/, '')]; while (lines[i + 1]?.trim().startsWith('>')) quote.push(lines[++i].trim().replace(/^>\s?/, '')); blocks.push({ type: 'quote', text: quote.join(' ') }); continue }
    if (/^[-*•]\s+/.test(t)) { flush(); const items = [t.replace(/^[-*•]\s+/, '')]; while (/^[-*•]\s+/.test(lines[i + 1]?.trim() || '')) items.push(lines[++i].trim().replace(/^[-*•]\s+/, '')); blocks.push({ type: 'ul', items }); continue }
    if (/^\d+[.)]\s+/.test(t)) { flush(); const start = parseInt(t, 10); const items = [t.replace(/^\d+[.)]\s+/, '')]; while (/^\d+[.)]\s+/.test(lines[i + 1]?.trim() || '')) items.push(lines[++i].trim().replace(/^\d+[.)]\s+/, '')); blocks.push({ type: 'ol', start, items }); continue }
    if (t.startsWith('|')) {
      flush()
      const rows = [cells(t)]
      while (lines[i + 1]?.trim().startsWith('|')) rows.push(cells(lines[++i]))
      const body = rows.filter(r => !r.every(c => /^:?-{2,}:?$/.test(c)))
      blocks.push({ type: 'table', head: body[0] || [], rows: body.slice(1) })
      continue
    }
    para.push(t)
  }
  flush()
  return blocks
}

export function ProposalBody({ source, className = '' }) {
  const blocks = parseBlocks(source)
  return <div className={className}>{blocks.map((b, i) => {
    const k = `b${i}`
    switch (b.type) {
      case 'h1': return <h1 key={k}>{inline(b.text, k)}</h1>
      case 'h2': return <h2 key={k}>{inline(b.text, k)}</h2>
      case 'h3': return <h3 key={k}>{inline(b.text, k)}</h3>
      case 'hr': return <hr key={k} />
      case 'quote': return <blockquote key={k}>{inline(b.text, k)}</blockquote>
      case 'ul': return <ul key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ul>
      case 'ol': return <ol key={k} start={b.start}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ol>
      case 'table': return <div key={k} className="proposal-table-wrap"><table>
        <thead><tr>{b.head.map((c, j) => <th key={j}>{inline(c, `${k}-h${j}`)}</th>)}</tr></thead>
        <tbody>{b.rows.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} data-label={b.head[j] || ''}>{inline(c, `${k}-${ri}-${j}`)}</td>)}</tr>)}</tbody>
      </table></div>
      default: return <p key={k}>{inline(b.text, k)}</p>
    }
  })}</div>
}

// First "# heading" of a proposal, used as its title if none is given.
export const firstHeading = source => parseBlocks(source).find(b => b.type === 'h1')?.text || ''
