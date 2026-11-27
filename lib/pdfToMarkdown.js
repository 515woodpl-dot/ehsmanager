// Server only: turns a proposal PDF (e.g. exported from Claude) into the
// simple Markdown the Proposals editor uses. Font size spots headings,
// indentation spots bullet points (often drawn as shapes, not text),
// numbered items keep their wrapped lines, and page footers are dropped.
// It's a head start — review the result in the editor's preview.

export async function pdfToMarkdown(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise
  const lines = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const content = await page.getTextContent()
    let current = null
    for (const item of content.items) {
      if (!('str' in item)) continue
      const y = Math.round(item.transform[5])
      const x = Math.round(item.transform[4])
      const size = Math.round(Math.hypot(item.transform[2], item.transform[3]) * 10) / 10
      if (!current || Math.abs(current.y - y) > 2) {
        if (current) lines.push(current)
        current = { y, x, size, text: item.str, page: n }
      } else {
        current.text += item.str
        current.size = Math.max(current.size, size)
      }
    }
    if (current) lines.push(current)
  }
  for (const l of lines) l.text = l.text.replace(/\s+/g, ' ').trim()

  const mostCommon = key => {
    const counts = {}
    for (const l of lines) if (l.text) counts[l[key]] = (counts[l[key]] || 0) + l.text.length
    return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 0)
  }
  const body = mostCommon('size') || 11
  const margin = mostCommon('x')
  const pages = lines.at(-1)?.page || 1
  const repeats = {}
  for (const l of lines) repeats[l.text] = (repeats[l.text] || 0) + 1
  const skip = l => !l.text || /^(page|página) \d+ (of|de) \d+$/i.test(l.text) || (pages > 2 && repeats[l.text] >= pages - 1 && l.size <= body)

  const titleParts = []
  const out = []
  let block = null // { kind: 'p' | 'li' | 'ol', text }
  let heading = null // { level, text, size }
  const flush = () => {
    if (heading) { out.push(`${'#'.repeat(heading.level)} ${heading.text}`, ''); heading = null }
    if (!block) return
    if (block.kind === 'p') out.push(block.text, '')
    else out.push(block.kind === 'li' ? `- ${block.text}` : block.text, block.kind === 'ol' ? '' : null)
    block = null
  }
  let titleDone = false
  for (const l of lines) {
    if (skip(l)) continue
    const text = l.text
    // Title: the first lines in the largest type.
    if (!titleDone && l.size >= body * 1.5) { titleParts.push(text); continue }
    if (titleParts.length) titleDone = true
    if (l.size >= body * 1.15) {
      const level = l.size >= body * 1.5 ? 2 : 3
      if (heading && heading.size === l.size) { heading.text += ` ${text}`; continue }
      flush(); heading = { level, text, size: l.size }; continue
    }
    if (heading) flush()
    const bulletGlyph = /^[•●▪◦\-–]\s*/.test(text)
    const indented = l.x > margin + 6
    if (/^\d+[.)]\s+/.test(text)) { flush(); block = { kind: 'ol', text }; continue }
    // Wrapped lines of a numbered item or bullet hang indented: keep them in the item.
    if (block && (block.kind === 'ol' || (block.kind === 'li' && /^[a-záéíóúñ(]/.test(text))) && indented) { block.text += ` ${text}`; continue }
    if (bulletGlyph || (indented && (!block || block.kind !== 'li' || /[.!?:]$/.test(block.text) || /^[A-ZÁÉÍÓÚÑ¿¡"]/.test(text)))) {
      flush(); block = { kind: 'li', text: text.replace(/^[•●▪◦\-–]\s*/, '') }; continue
    }
    // A line back at the left margin ends a list item and starts a paragraph.
    if (block && (block.kind === 'li' || block.kind === 'ol') && !indented) flush()
    if (!block) block = { kind: 'p', text }
    else block.text += ` ${text}`
    // A short line that ends a sentence usually ends the paragraph.
    if (block.kind === 'p' && /[.!?:]$/.test(text) && text.length < 70) flush()
  }
  flush()
  const markdown = out.filter(v => v !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { title: titleParts.join(' ').trim(), markdown, pages }
}
