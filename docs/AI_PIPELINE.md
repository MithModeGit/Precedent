# AI Pipeline

Specification for the four-pass LLM inference pipeline that powers Precedent's redline generation and evaluation. Read this before implementing any Route Handler under `app/api/pipeline/`.

---

## Overview

Every document review runs four sequential LLM passes using Gemini 3 Flash via the Vercel AI SDK. Each pass takes structured input and returns structured JSON output via `generateObject`.

| Pass | Route | Trigger | Blocks UI? |
|---|---|---|---|
| 1: Classify | `api/pipeline/classify` | On upload, before classification confirmation screen | Yes |
| 2: Redline | `api/pipeline/redline` | After user confirms classification | Yes |
| 3: Evaluate | `api/pipeline/evaluate` | After review interface loads (SSE) | No |
| 4: Improve | `api/pipeline/improve` | After Pass 3 completes (background) | No |

Passes 1 and 2 run synchronously and block the UI. The review interface loads only after Pass 2 completes. Passes 3 and 4 run as background SSE streams; the review interface shows loading states in confidence signal positions until Pass 3 results arrive.

---

## Vercel AI SDK Pattern

All passes use `generateObject` with a Zod schema. Use this pattern for every pass:

```typescript
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

const GEMINI_MODEL = google('gemini-3-flash') // verify exact model string with Google AI SDK docs

const { object } = await generateObject({
  model: GEMINI_MODEL,
  schema: yourZodSchema,
  system: SYSTEM_PROMPT,
  prompt: userInput,
})
```

If the exact model string for Gemini 3 Flash is not available in `@ai-sdk/google` at build time, check the package's model list or use the string from Google AI Studio. Store the model string as a constant in `lib/env.ts` so it can be updated in one place.

---

## Pass 1: Document Parsing and Classification

**File:** `app/api/pipeline/classify/route.ts`

**Input:** Multipart form data containing the uploaded file.

**Processing:**
1. Extract text from the file using `mammoth` (DOCX) or `pdf-parse` (PDF). See `docs/DOCUMENT_PROCESSING.md` for the extraction details.
2. Send the full extracted text to Gemini 3 Flash with the classification system prompt.
3. Return structured JSON.

**System prompt instruction:** Identify every clause in the document by type. Determine the document type, governing law, use case, and signatory type from the text.

**Zod schema** (`schemas/classify.ts`):

```typescript
import { z } from 'zod'

export const ClauseTypeEnum = z.enum([
  'parties_and_recitals',
  'definition_of_ci',
  'exclusions',
  'obligations',
  'standard_of_care',
  'permitted_disclosures',
  'compelled_disclosure',
  'residuals',
  'term_of_obligations',
  'term_of_agreement',
  'return_or_destruction',
  'non_solicitation',
  'no_license',
  'injunctive_relief',
  'limitation_of_liability',
  'governing_law',
  'entire_agreement',
  'amendment_and_waiver',
  'assignment',
  'counterparts',
  'other',
])

export const ClassifyOutputSchema = z.object({
  documentType: z.enum(['mutual_nda', 'one_way_nda']),
  useCase: z.enum(['saas_vendor', 'employment_contractor', 'manda', 'strategic_partnership', 'ip_licensing', 'other']),
  governingLaw: z.string().describe('The jurisdiction identified in the governing law clause, e.g. "California", "Delaware", "New York"'),
  signatoryType: z.enum(['entity', 'individual']).describe('Entity if both signatories are companies. Individual if one or more signatories is a named person.'),
  clauses: z.array(z.object({
    clauseType: ClauseTypeEnum,
    sectionNumber: z.string().describe('The section number as it appears in the document, e.g. "1.1", "Section 4", "3"'),
    text: z.string().describe('The full text of this clause as it appears in the document'),
  })),
})

export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>
```

**Response shape:** Return the `ClassifyOutput` object as JSON with HTTP 200.

---

## Pass 2: Redline Generation

**File:** `app/api/pipeline/redline/route.ts`

**Input:** JSON body containing:
```typescript
{
  clauses: ClassifyOutput['clauses'],
  classification: {
    documentType: string,
    useCase: string,
    governingLaw: string,
    signatoryType: string,
  },
  partyPerspective: 'disclosing' | 'receiving',
  mode: 'conservative' | 'standard' | 'aggressive',
}
```

**Processing:**
1. Load the NDA reference database from `lib/nda-reference-database.md` (read the file at request time or cache it at module load).
2. Build the system prompt by injecting the reference database content, the classification metadata, the party perspective, and the mode.
3. Call `generateObject` with the redline schema.
4. Return structured JSON.

### NDA Reference Database Injection

The reference database must be injected verbatim into the system prompt. Use this pattern:

```typescript
import { readFileSync } from 'fs'
import { join } from 'path'

const referenceDatabase = readFileSync(
  join(process.cwd(), 'lib/nda-reference-database.md'),
  'utf-8'
)
```

Prepend the reference database to the system prompt before the instruction block.

### System Prompt Structure (`prompts/redline.ts`)

```
[REFERENCE DATABASE CONTENT INJECTED HERE]

---

INSTRUCTIONS:

You are reviewing this NDA on behalf of the ${partyPerspective === 'disclosing' ? 'Disclosing Party' : 'Receiving Party'}.

Document classification:
- Type: ${documentType}
- Use case: ${useCase}
- Governing law: ${governingLaw}
- Signatory type: ${signatoryType}
- Review mode: ${mode}

For each clause provided, compare the clause text against the applicable market-standard position in the Reference Database above.

CITATION RULES (mandatory):
- Cite only sources that appear by name in the Reference Database. If you cannot ground a claim in a named source, write "per market practice" without naming a specific authority.
- Do not fabricate case names, statute section numbers, or firm positions.
- When citing a statute, use the exact section number from the Reference Database.

PRIORITY TIER ASSIGNMENT:
- conservative mode: generate redlines only for Must-priority issues
- standard mode: generate redlines for Must and Should-priority issues
- aggressive mode: generate redlines for Must, Should, and Nice-priority issues

Do not redline a clause if its current language already matches or exceeds the applicable market-standard position for the assigned mode. Instead, output a redline with proposedText equal to the originalText and a note that the clause is acceptable.

GOVERNING LAW RULES:
- If governingLaw is California: apply California §16600 rules. Do not propose noncompete or broad customer non-solicitation language. Flag any existing non-solicitation clause for §16600 risk as a Must-Address issue.
- If signatoryType is individual: check for a DTSA whistleblower immunity notice. If absent, flag as a Must-Address issue and provide the notice language from the Reference Database.
- If useCase is saas_vendor: check for an AI training prohibition carve-out. If absent, flag as a Should-Address issue.
- Check all confidentiality terms: if the term is flat (no separate perpetual protection for trade secrets), flag as a Must-Address issue.
```

### Zod Schema (`schemas/redline.ts`)

```typescript
import { z } from 'zod'
import { ClauseTypeEnum } from './classify'

export const PriorityEnum = z.enum(['must', 'should', 'nice'])

export const RedlineOutputSchema = z.object({
  redlines: z.array(z.object({
    clauseType: ClauseTypeEnum,
    sectionNumber: z.string(),
    priority: PriorityEnum,
    originalText: z.string(),
    proposedText: z.string(),
    rationale: z.string().describe('2 to 3 sentences. Name the specific source from the Reference Database. Describe the commercial consequence. Include a counterparty prediction.'),
    citation: z.string().describe('The specific source cited from the Reference Database, e.g. "18 U.S.C. § 1833(b)" or "Cooley GO, Standard Mutual NDA". Write "per market practice" if no specific source applies.'),
    counterpartyPrediction: z.string().describe('What the counterparty is likely to say in response, and the recommended fallback position.'),
    noActionNeeded: z.boolean().describe('True if the clause already meets or exceeds the applicable market-standard position for this mode and no redline is warranted.'),
  })),
})

export type RedlineOutput = z.infer<typeof RedlineOutputSchema>
```

**Response:** Return the `RedlineOutput` object as JSON with HTTP 200. Store the output in Supabase `clause_reviews` table using the session ID.

---

## Pass 3: Evaluation Scoring

**File:** `app/api/pipeline/evaluate/route.ts`

**Input:** Query param `sessionId`. Route handler reads the clause reviews from Supabase for this session.

**Processing:** Run `generateObject` with the eval schema. Stream the result back to the client via SSE.

**Timing:** Called from the client after the review interface loads. The client opens an `EventSource` connection to this route. The route runs the evaluation and closes the stream when done.

### SSE Route Handler Pattern

```typescript
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Fetch clause reviews for this session
        const { data: reviews } = await supabase
          .from('clause_reviews')
          .select('*')
          .eq('session_id', sessionId)

        // Run evaluation
        const { object: evalResults } = await generateObject({
          model: GEMINI_MODEL,
          schema: EvaluateOutputSchema,
          system: EVALUATE_SYSTEM_PROMPT,
          prompt: buildEvalPrompt(reviews),
        })

        // Send results
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(evalResults)}\n\n`)
        )
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Evaluation failed' })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

### Client-Side SSE Consumption

In the review interface component, open the SSE connection after the review interface mounts:

```typescript
useEffect(() => {
  const eventSource = new EventSource(`/api/pipeline/evaluate?sessionId=${sessionId}`)

  eventSource.onmessage = (event) => {
    const evalResults = JSON.parse(event.data)
    if (!evalResults.error) {
      setEvalResults(evalResults)  // Updates confidence signals across all review cards
    }
    eventSource.close()
  }

  eventSource.onerror = () => {
    eventSource.close()
  }

  return () => eventSource.close()
}, [sessionId])
```

### Eval System Prompt Structure (`prompts/evaluate.ts`)

The eval prompt must embed the full rubric. The rubric must include all five scale dimensions (Legal Accuracy, Market Calibration, Redline Precision, Explanation Quality, Proportionality) with explicit 1-to-5 criteria, and all five binary checks (DTSA Notice, California §16600, Trade Secret Bifurcation, AI Training Carve-out, Internal Consistency) with exact PASS/FAIL criteria. See `docs/PRD.md` Section 5.6 for the complete rubric text to embed in this prompt.

Key instruction to include verbatim:

```
Score based only on observable characteristics of the text provided. If the criteria for a score level require finding a specific element in the text (a statute citation, a case name, a source name), confirm it is present before assigning that score. Do not assign a score based on what you believe the intent was.

Return scores as integers. Do not return decimals or ranges.
```

### Eval Zod Schema (`schemas/evaluate.ts`)

```typescript
import { z } from 'zod'
import { ClauseTypeEnum } from './classify'

const DimensionScore = z.number().int().min(1).max(5)
const BinaryCheck = z.enum(['PASS', 'FAIL'])
const ConfidenceSignal = z.enum(['confident', 'review_needed', 'low_confidence'])

export const EvaluateOutputSchema = z.object({
  overallScore: z.number().describe('Weighted average of the five dimension scores, capped at 3.0 if two or more binary checks fail'),
  dimensions: z.object({
    legalAccuracy: DimensionScore,
    marketCalibration: DimensionScore,
    redlinePrecision: DimensionScore,
    explanationQuality: DimensionScore,
    proportionality: DimensionScore,
  }),
  binaryChecks: z.object({
    dtsaNotice: z.object({ result: BinaryCheck, note: z.string() }),
    california1660: z.object({ result: BinaryCheck, note: z.string() }),
    tradeSecretBifurcation: z.object({ result: BinaryCheck, note: z.string() }),
    aiTrainingCarveout: z.object({ result: BinaryCheck, note: z.string() }),
    internalConsistency: z.object({ result: BinaryCheck, note: z.string() }),
  }),
  clauseScores: z.array(z.object({
    clauseType: ClauseTypeEnum,
    sectionNumber: z.string(),
    dimensions: z.object({
      legalAccuracy: DimensionScore,
      marketCalibration: DimensionScore,
      redlinePrecision: DimensionScore,
      explanationQuality: DimensionScore,
      proportionality: DimensionScore,
    }),
    clauseOverallScore: z.number(),
    confidenceSignal: ConfidenceSignal,
    evaluatorNote: z.string().describe('One sentence explaining the lowest-scoring dimension for this clause, or confirming all dimensions scored well.'),
  })),
  improvementNotes: z.array(z.string()).describe('Array of plain-language improvement observations based on this session only. Pass 4 compares these with history to generate trend insights.'),
})

export type EvaluateOutput = z.infer<typeof EvaluateOutputSchema>
```

**Confidence signal calculation:** Apply this mapping after receiving Pass 3 results. Do not include this logic in the eval prompt:

```typescript
function getConfidenceSignal(clauseOverallScore: number, binaryCheckFailed: boolean): ConfidenceSignal {
  if (binaryCheckFailed) return 'review_needed'
  if (clauseOverallScore >= 4.0) return 'confident'
  if (clauseOverallScore >= 2.5) return 'review_needed'
  return 'low_confidence'
}
```

Store Pass 3 results in the `eval_runs` and `eval_clause_scores` Supabase tables. See `docs/DATA_MODEL.md`.

---

## Pass 4: Improvement Notes

**File:** `app/api/pipeline/improve/route.ts`

**Input:** Query param `sessionId`. Route fetches this session's eval results and the trailing 10 sessions of the same document type from Supabase.

**Processing:** Call `generateObject` with a simple schema. No SSE needed; the client polls or uses a lightweight webhook pattern. The improvement notes update only the evaluation dashboard, which is not in the critical path of the review workflow.

**Zod Schema (`schemas/improve.ts`):**

```typescript
import { z } from 'zod'

export const ImproveOutputSchema = z.object({
  notes: z.array(z.string()).describe(
    'Array of 1 to 5 plain-language observations comparing this session to recent sessions. Each note identifies a specific clause type or dimension that is trending in a particular direction, and what that trend suggests about the reference database or prompt calibration.'
  ),
})
```

**System prompt instruction:** Summarize the patterns visible in the session history. Do not repeat obvious facts from the scores. Focus on actionable patterns: which clause types trend low, which binary checks fail repeatedly, what the modifier direction of Modified redlines suggests about calibration.

---

## Overall Score Calculation

Calculate the overall session score server-side after receiving Pass 3 output. Do not ask the model to compute the weighted average:

```typescript
function calculateOverallScore(dimensions: Dimensions, binaryChecks: BinaryChecks): number {
  const weights = {
    legalAccuracy: 0.30,
    marketCalibration: 0.25,
    redlinePrecision: 0.20,
    explanationQuality: 0.15,
    proportionality: 0.10,
  }

  const weightedAverage =
    dimensions.legalAccuracy * weights.legalAccuracy +
    dimensions.marketCalibration * weights.marketCalibration +
    dimensions.redlinePrecision * weights.redlinePrecision +
    dimensions.explanationQuality * weights.explanationQuality +
    dimensions.proportionality * weights.proportionality

  const failedBinaryChecks = Object.values(binaryChecks)
    .filter(check => check.result === 'FAIL').length

  return failedBinaryChecks >= 2
    ? Math.min(weightedAverage, 3.0)
    : weightedAverage
}
```

---

## Error Handling

Every pass must handle failures gracefully:

- If the Gemini API call fails: return HTTP 500 with a structured error `{ error: 'Pipeline pass failed', pass: 1 | 2 | 3 | 4 }`.
- If the Zod schema validation fails (model returned malformed output): retry once, then return the error.
- Pass 3 SSE errors: enqueue an error event before closing the stream so the client can display a fallback state.
- Pass 4 failures: log and swallow. Improvement notes are non-critical; the review session must not be blocked by a Pass 4 failure.
