/**
 * Generates a clean .docx of the adversarial benchmark NDA from its markdown source, so it
 * can be uploaded and run through the platform end to end by hand.
 *
 * Run: npx tsx scripts/make-sample-docx.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

async function main(): Promise<void> {
  const source = readFileSync(join(process.cwd(), 'lib/synthetic-ndas/nda-4-hard.md'), 'utf-8')
  const lines = source
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

  if (lines.length === 0) {
    throw new Error('Source markdown produced no content lines; nothing to write.')
  }

  const [title, ...body] = lines
  const paragraphs = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    ...body.map((line) => new Paragraph({ children: [new TextRun(line)], spacing: { after: 160 } })),
  ]

  const doc = new Document({ sections: [{ children: paragraphs }] })
  const outDir = join(process.cwd(), 'samples')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'Cross-Border-Data-Partnership-NDA.docx')

  const buffer = await Packer.toBuffer(doc)
  writeFileSync(outPath, buffer)
  console.warn(`wrote ${outPath}`)
}

main().catch((error) => {
  console.error(
    `Failed to generate sample docx: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exitCode = 1
})
