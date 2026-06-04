# Document Processing

Specification for file parsing (upload) and .docx generation (export) in Precedent. Read this before implementing `app/api/pipeline/classify/route.ts` or `app/api/export/route.ts`.

---

## File Parsing on Upload

### DOCX Parsing with mammoth

```typescript
import mammoth from 'mammoth'

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}
```

Use `extractRawText`, not `convertToHtml`. The extracted plain text is what gets sent to Pass 1. Mammoth preserves paragraph structure and list items as newlines.

Handle the case where `result.messages` contains warnings. Log warnings server-side but do not fail the extraction.

### PDF Parsing with pdf-parse

```typescript
import pdfParse from 'pdf-parse'

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text
}
```

`data.text` contains the extracted text. `data.numpages` gives the page count (use this for the upload screen confirmation display).

Warn if `data.text.length < 200`: the PDF may be scanned (image-only) and text extraction may be empty or minimal. Return the partial text but flag this in the API response.

### Routing Based on File Type

In `app/api/pipeline/classify/route.ts`:

```typescript
const file = formData.get('file') as File
const buffer = Buffer.from(await file.arrayBuffer())
const fileName = file.name.toLowerCase()

let text: string
if (fileName.endsWith('.docx')) {
  text = await extractTextFromDocx(buffer)
} else if (fileName.endsWith('.pdf')) {
  text = await extractTextFromPdf(buffer)
} else {
  return Response.json({ error: 'Unsupported file type' }, { status: 400 })
}
```

---

## .docx Export Generation

The export produces a Word document with:
1. All accepted and modified redlines shown as tracked changes (OOXML `<w:ins>` and `<w:del>` elements)
2. Each redline's rationale as a Word comment bubble (`<w:comment>` elements)
3. Rejected redlines reverted to original text (no tracked changes)

The .docx format is a ZIP archive containing XML files. Use `jszip` to read and modify the archive.

### High-Level Export Flow

```typescript
import JSZip from 'jszip'
import { diffMatchPatch } from 'diff-match-patch'

export async function generateRedlinedDocx(
  originalDocxBuffer: Buffer,
  clauseReviews: ClauseReview[],
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(originalDocxBuffer)
  
  // Read the main document XML
  const documentXml = await zip.file('word/document.xml')!.async('string')
  
  // Build modified document XML with tracked changes
  const modifiedDocumentXml = applyRedlinesToXml(documentXml, clauseReviews)
  
  // Build comments XML
  const commentsXml = buildCommentsXml(clauseReviews)
  
  // Update the zip
  zip.file('word/document.xml', modifiedDocumentXml)
  zip.file('word/comments.xml', commentsXml)
  
  // Update [Content_Types].xml to include comments if not already present
  await ensureCommentsContentType(zip)
  
  // Update _rels/document.xml.rels to reference comments
  await ensureCommentsRelationship(zip)
  
  return zip.generateAsync({ type: 'nodebuffer' })
}
```

### Tracked Changes: OOXML Pattern

Tracked changes use three OOXML elements:

**Deletion:** Marks original text as deleted
```xml
<w:del w:id="1" w:author="Precedent" w:date="2026-01-01T00:00:00Z">
  <w:r>
    <w:delText>original clause language to be replaced</w:delText>
  </w:r>
</w:del>
```

**Insertion:** Marks new text as inserted
```xml
<w:ins w:id="2" w:author="Precedent" w:date="2026-01-01T00:00:00Z">
  <w:r>
    <w:t>proposed replacement language</w:t>
  </w:r>
</w:ins>
```

**Accepted redline (no change):** Just the clean text as normal runs. No `<w:ins>` or `<w:del>`.

**Rejected redline:** The original text as normal runs. No `<w:ins>` or `<w:del>`.

Important: `w:id` values must be sequential integers starting from 1. Track a counter across all insertions and deletions in the document.

### Computing the Diff

Use `diff-match-patch` to compute the character-level diff between the original clause text and the accepted text:

```typescript
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch'

const dmp = new diff_match_patch()

export function buildTrackedChangesXml(
  originalText: string,
  acceptedText: string,
  revisionIdCounter: { value: number },
  timestamp: string
): string {
  const diffs = dmp.diff_main(originalText, acceptedText)
  dmp.diff_cleanupSemantic(diffs)
  
  let xml = ''
  
  for (const [op, text] of diffs) {
    const escapedText = escapeXml(text)
    const id = revisionIdCounter.value++
    
    if (op === DIFF_EQUAL) {
      xml += `<w:r><w:t xml:space="preserve">${escapedText}</w:t></w:r>`
    } else if (op === DIFF_DELETE) {
      xml += `<w:del w:id="${id}" w:author="Precedent" w:date="${timestamp}"><w:r><w:delText xml:space="preserve">${escapedText}</w:delText></w:r></w:del>`
    } else if (op === DIFF_INSERT) {
      xml += `<w:ins w:id="${id}" w:author="Precedent" w:date="${timestamp}"><w:r><w:t xml:space="preserve">${escapedText}</w:t></w:r></w:ins>`
    }
  }
  
  return xml
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
```

### Word Comments: OOXML Pattern

Comments live in `word/comments.xml`. Each comment has an ID and content.

**`word/comments.xml` structure:**
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:comment w:id="1" w:author="Precedent" w:date="2026-01-01T00:00:00Z" w:initials="P">
    <w:p>
      <w:r>
        <w:t>RATIONALE TEXT HERE</w:t>
      </w:r>
    </w:p>
  </w:comment>
  <!-- one entry per accepted or modified redline -->
</w:comments>
```

**Linking a comment to text in `word/document.xml`:**
```xml
<!-- Before the text span: -->
<w:commentRangeStart w:id="1"/>
<!-- The text run(s) the comment applies to -->
<w:r><w:t>the relevant clause text</w:t></w:r>
<!-- After the text span: -->
<w:commentRangeEnd w:id="1"/>
<w:r>
  <w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>
  <w:commentReference w:id="1"/>
</w:r>
```

Comment IDs and revision IDs share the same integer namespace. Maintain a single counter across all tracked change and comment elements.

### Clause Text Localization in the Document XML

To place tracked changes and comments at the correct position in `document.xml`, you need to locate each clause's text within the XML. Use this approach:

1. Parse `document.xml` as a string
2. For each clause with an accepted or modified decision, search for the clause's `originalText` in the XML (after stripping XML tags from a working copy)
3. Replace the located text with the tracked changes XML
4. Insert the comment range markers around the same span

This is the most fragile part of the implementation. Edge cases:
- Clause text may span multiple `<w:r>` runs (a single paragraph of text can be split across runs due to formatting)
- Special characters in the original text must be XML-escaped when searching

To handle multi-run text: normalize the document XML first by merging adjacent `<w:r>` elements with identical `<w:rPr>` properties before searching. Or: search for the plain text value after stripping all tags from a working copy of the XML, then reconstruct the XML around the located text position.

If locating a specific clause is not feasible (text not found exactly), skip the tracked change for that clause and log a warning. Do not fail the export.

### Content Type and Relationship Updates

When adding `word/comments.xml` to the zip, update two files:

**`[Content_Types].xml`**: Add a content type override if not already present:
```xml
<Override PartName="/word/comments.xml"
  ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
```

**`word/_rels/document.xml.rels`**: Add a relationship if not already present:
```xml
<Relationship Id="rIdComments"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"
  Target="comments.xml"/>
```

### Export Route Handler

```typescript
// app/api/export/route.ts
export async function POST(request: Request) {
  const { sessionId } = await request.json()
  
  // Fetch session, clause reviews, and original document buffer from Supabase
  // (Store the original uploaded file in Supabase Storage on upload)
  
  const docxBuffer = await generateRedlinedDocx(originalBuffer, clauseReviews)
  
  return new Response(docxBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${documentName}-redlined.docx"`,
    },
  })
}
```

### Storing the Original File

When the user uploads a file, store the original buffer in Supabase Storage so the export route can retrieve it later:

```typescript
const { error } = await supabaseServer.storage
  .from('uploads')
  .upload(`${sessionId}/original.docx`, fileBuffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    upsert: true,
  })
```

Create a `uploads` storage bucket in Supabase with private access. Only server-side routes access this bucket.

---

## Testing Document Processing

Before the export feature is considered complete, manually test the generated .docx by opening it in Microsoft Word and verifying:

1. Track changes are visible in the "Review" tab with correct deletions and insertions attributed to "Precedent"
2. Comment bubbles are visible in the right margin, each containing the rationale text
3. Accepting all tracked changes produces a clean document with only the accepted/modified language
4. Rejected clauses show no tracked changes

Document this manual test in the PR description under "Verification".
