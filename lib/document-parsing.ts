import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'

export interface ParsedDocument {
  text: string
  /** Page count when known (PDF only); null for DOCX. */
  pageCount: number | null
  /** True when extraction yielded suspiciously little text (likely a scanned PDF). */
  likelyScanned: boolean
}

/** Minimum extracted character count below which a PDF is flagged as likely scanned. */
const MIN_PDF_TEXT_LENGTH = 200

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  // Mammoth surfaces non-fatal warnings (unsupported styles, etc.). Log, do not fail.
  if (result.messages.length > 0) {
    console.warn(`mammoth extraction warnings: ${result.messages.length}`)
  }
  return result.value
}

export async function extractTextFromPdf(
  buffer: Buffer,
): Promise<{ text: string; pageCount: number }> {
  const data = await pdfParse(buffer)
  return { text: data.text, pageCount: data.numpages }
}

/**
 * Routes a file to the correct extractor by extension and returns the parsed text
 * plus metadata. Throws on unsupported file types.
 */
export async function parseDocument(
  fileName: string,
  buffer: Buffer,
): Promise<ParsedDocument> {
  const lower = fileName.toLowerCase()

  if (lower.endsWith('.docx')) {
    const text = await extractTextFromDocx(buffer)
    return { text, pageCount: null, likelyScanned: false }
  }

  if (lower.endsWith('.pdf')) {
    const { text, pageCount } = await extractTextFromPdf(buffer)
    return { text, pageCount, likelyScanned: text.length < MIN_PDF_TEXT_LENGTH }
  }

  throw new Error('Unsupported file type. Upload a DOCX or PDF file.')
}
