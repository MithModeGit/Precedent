// Minimal type shim for pdf-parse, which ships no type declarations.
declare module 'pdf-parse' {
  interface PDFParseResult {
    numpages: number
    numrender: number
    info: unknown
    metadata: unknown
    version: string
    text: string
  }
  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<PDFParseResult>
  export default pdfParse
}
