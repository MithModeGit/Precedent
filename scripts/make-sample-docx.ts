/**
 * Generates a clean .docx from a markdown NDA source (lines starting with '#' are stripped),
 * so it can be uploaded and run through the platform end to end by hand.
 *
 * Run: npx tsx scripts/make-sample-docx.ts [sourceMd] [outputDocx]
 * Defaults to the adversarial benchmark NDA.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

async function main(): Promise<void> {
  const srcRel = process.argv[2] ?? 'lib/synthetic-ndas/nda-4-hard.md'
  const outRel = process.argv[3] ?? 'samples/Cross-Border-Data-Partnership-NDA.docx'

  const source = readFileSync(join(process.cwd(), srcRel), 'utf-8')
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
  const outPath = join(process.cwd(), outRel)
  mkdirSync(dirname(outPath), { recursive: true })

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
