import JSZip from 'jszip'
import { diff_match_patch } from 'diff-match-patch'

/**
 * In-place .docx redlining for DOCX uploads. Applies accepted and modified redlines as
 * OOXML tracked changes (<w:ins>/<w:del>) and attaches each rationale as a Word comment.
 * Clause localization is the fragile part: clauses are matched to paragraphs by their
 * plain text, and any clause that cannot be located is skipped (the export never fails).
 */

const AUTHOR = 'Precedent'
const dmp = new diff_match_patch()

export interface DocxRedline {
  originalText: string
  acceptedText: string
  rationale: string
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function stripTags(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

interface Counter {
  value: number
}

/** Builds tracked-change runs for a character-level diff of original -> accepted. */
function buildTrackedChangesXml(
  original: string,
  accepted: string,
  counter: Counter,
  timestamp: string,
): string {
  const diffs = dmp.diff_main(original, accepted)
  dmp.diff_cleanupSemantic(diffs)

  let xml = ''
  for (const [op, text] of diffs) {
    const escaped = escapeXml(text)
    if (op === 0) {
      xml += `<w:r><w:t xml:space="preserve">${escaped}</w:t></w:r>`
    } else if (op === -1) {
      const id = counter.value++
      xml += `<w:del w:id="${id}" w:author="${AUTHOR}" w:date="${timestamp}"><w:r><w:delText xml:space="preserve">${escaped}</w:delText></w:r></w:del>`
    } else {
      const id = counter.value++
      xml += `<w:ins w:id="${id}" w:author="${AUTHOR}" w:date="${timestamp}"><w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:ins>`
    }
  }
  return xml
}

function buildCommentsXml(comments: { id: number; rationale: string }[], timestamp: string): string {
  const items = comments
    .map(
      (c) =>
        `<w:comment w:id="${c.id}" w:author="${AUTHOR}" w:date="${timestamp}" w:initials="P"><w:p><w:r><w:t xml:space="preserve">${escapeXml(c.rationale)}</w:t></w:r></w:p></w:comment>`,
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${items}</w:comments>`
}

async function ensureCommentsContentType(zip: JSZip): Promise<void> {
  const file = zip.file('[Content_Types].xml')
  if (!file) return
  const content = await file.async('string')
  if (content.includes('word/comments.xml')) return
  const override =
    '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>'
  zip.file('[Content_Types].xml', content.replace('</Types>', `${override}</Types>`))
}

async function ensureCommentsRelationship(zip: JSZip): Promise<void> {
  const path = 'word/_rels/document.xml.rels'
  const file = zip.file(path)
  if (!file) return
  const content = await file.async('string')
  if (content.includes('comments.xml')) return
  const rel =
    '<Relationship Id="rIdPrecedentComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>'
  zip.file(path, content.replace('</Relationships>', `${rel}</Relationships>`))
}

export async function generateRedlinedDocx(
  originalBuffer: Buffer,
  redlines: DocxRedline[],
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(originalBuffer)
  const documentFile = zip.file('word/document.xml')
  if (!documentFile) throw new Error('Invalid .docx: missing word/document.xml')

  let documentXml = await documentFile.async('string')

  // Start ids after any already present in an existing comments file so new comment and
  // revision ids never collide with the original document's comments.
  const counter: Counter = { value: 1 }
  const existingCommentsFile = zip.file('word/comments.xml')
  let existingCommentsXml = ''
  if (existingCommentsFile) {
    existingCommentsXml = await existingCommentsFile.async('string')
    const ids = Array.from(existingCommentsXml.matchAll(/w:id="(\d+)"/g)).map((m) =>
      parseInt(m[1] ?? '0', 10),
    )
    if (ids.length > 0) counter.value = Math.max(...ids) + 1
  }

  const timestamp = new Date().toISOString()
  const comments: { id: number; rationale: string }[] = []

  const paragraphs = documentXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) ?? []
  const usedParagraphs = new Set<number>()
  const replacements = new Map<number, string>()

  for (const redline of redlines) {
    if (redline.originalText === redline.acceptedText) continue
    const target = normalize(redline.originalText)
    if (!target) continue

    let matchedIndex = -1
    for (let i = 0; i < paragraphs.length; i++) {
      if (usedParagraphs.has(i)) continue
      const paraText = normalize(stripTags(paragraphs[i] ?? ''))
      if (!paraText) continue
      // Accept only a close match: the clause is essentially the whole paragraph, or the
      // clause spans into it. This keeps the replacement from clobbering surrounding text
      // in a larger paragraph.
      const exactish = paraText.includes(target) && target.length / paraText.length > 0.7
      const spanning =
        target.length > 40 && target.includes(paraText) && paraText.length / target.length > 0.6
      if (exactish || spanning) {
        matchedIndex = i
        break
      }
    }

    if (matchedIndex === -1) {
      console.warn('Export: a clause could not be located in the document; skipping its tracked change.')
      continue
    }
    usedParagraphs.add(matchedIndex)

    const matched = paragraphs[matchedIndex]
    if (!matched) continue
    const parts = matched.match(/^(<w:p\b[^>]*>)([\s\S]*)(<\/w:p>)$/)
    if (!parts) continue
    const [, openTag, inner, closeTag] = parts as unknown as [string, string, string, string]
    const pPrMatch = inner.match(/^<w:pPr>[\s\S]*?<\/w:pPr>/)
    const pPr = pPrMatch ? pPrMatch[0] : ''

    const commentId = counter.value++
    comments.push({ id: commentId, rationale: redline.rationale })
    const tracked = buildTrackedChangesXml(
      redline.originalText,
      redline.acceptedText,
      counter,
      timestamp,
    )
    const newInner = `${pPr}<w:commentRangeStart w:id="${commentId}"/>${tracked}<w:commentRangeEnd w:id="${commentId}"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${commentId}"/></w:r>`
    replacements.set(matchedIndex, `${openTag}${newInner}${closeTag}`)
  }

  // Single-pass replacement by paragraph position, so duplicate/boilerplate paragraphs are
  // matched by index rather than by first textual occurrence. NOTE: a replaced paragraph's
  // inner runs are rewritten as plain tracked-change runs, so original character-level
  // formatting within the matched clause is not preserved. This is an accepted limitation
  // of the string-based MVP approach; matches are kept close to the clause text to limit it.
  let pIndex = 0
  documentXml = documentXml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (match) => {
    const replacement = replacements.get(pIndex)
    pIndex++
    return replacement ?? match
  })

  zip.file('word/document.xml', documentXml)

  if (comments.length > 0 || existingCommentsFile) {
    // Append to an existing populated comments file; otherwise (no file, or an empty or
    // self-closing one with no </w:comments> close tag) write a fresh comments part.
    if (existingCommentsXml.includes('</w:comments>')) {
      const items = comments
        .map(
          (c) =>
            `<w:comment w:id="${c.id}" w:author="${AUTHOR}" w:date="${timestamp}" w:initials="P"><w:p><w:r><w:t xml:space="preserve">${escapeXml(c.rationale)}</w:t></w:r></w:p></w:comment>`,
        )
        .join('')
      zip.file(
        'word/comments.xml',
        existingCommentsXml.replace('</w:comments>', `${items}</w:comments>`),
      )
    } else {
      zip.file('word/comments.xml', buildCommentsXml(comments, timestamp))
    }
    await ensureCommentsContentType(zip)
    await ensureCommentsRelationship(zip)
  }

  return zip.generateAsync({ type: 'nodebuffer' })
}
