import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  InsertedTextRun,
  DeletedTextRun,
  HeadingLevel,
} from 'docx'
import { diff_match_patch } from 'diff-match-patch'

/**
 * Fallback export for PDF uploads (and any case with no original .docx). Generates a
 * fresh .docx listing each redline as tracked changes, with the rationale rendered
 * inline (Word comment bubbles require an original document structure to anchor to).
 */

const AUTHOR = 'Precedent'
const dmp = new diff_match_patch()

export interface GeneratedRedline {
  clauseLabel: string
  sectionNumber: string
  originalText: string
  acceptedText: string
  rationale: string
}

export async function generateFreshRedlinedDocx(
  documentName: string,
  redlines: GeneratedRedline[],
): Promise<Buffer> {
  const date = new Date().toISOString()
  let revisionId = 1
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(documentName)] }),
  ]

  for (const redline of redlines) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240 },
        children: [new TextRun(`${redline.clauseLabel} (Section ${redline.sectionNumber})`)],
      }),
    )

    const diffs = dmp.diff_main(redline.originalText, redline.acceptedText)
    dmp.diff_cleanupSemantic(diffs)
    const runs = diffs.map(([op, text]) => {
      if (op === -1) {
        return new DeletedTextRun({ text, id: revisionId++, author: AUTHOR, date })
      }
      if (op === 1) {
        return new InsertedTextRun({ text, id: revisionId++, author: AUTHOR, date })
      }
      return new TextRun(text)
    })
    children.push(new Paragraph({ children: runs }))

    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: `Precedent: ${redline.rationale}`, italics: true, color: '64748B' }),
        ],
      }),
    )
  }

  const doc = new Document({ sections: [{ children }] })
  return Buffer.from(await Packer.toBuffer(doc))
}
