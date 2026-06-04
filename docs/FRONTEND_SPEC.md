# Frontend Spec

Component architecture, routing, state management, and UI behavior for Precedent. Read this before building any React component or Next.js page. Read `docs/DESIGN_BRIEF.md` before writing any styles.

---

## Routing (Next.js App Router)

| Route | Component | Description |
|---|---|---|
| `/` | `HomeScreen` | Recent sessions, stats, new review CTA |
| `/upload` | `UploadScreen` | File upload, party perspective, mode selection |
| `/classify` | `ClassificationConfirm` | AI classification confirmation and correction |
| `/processing` | `ProcessingScreen` | Staged progress indicators during pipeline |
| `/review/[sessionId]` | `ReviewInterface` | Two-panel review interface |
| `/dashboard` | `EvalDashboard` | Evaluation trend overview and session index |
| `/dashboard/[sessionId]` | `SessionDetail` | Per-session drill-down |

All routes are Server Components at the page level. Interactive components (review cards, charts, forms) are Client Components. Pass data from Server Components to Client Components via props.

---

## State Management

No Redux, no Zustand in MVP. Use React state and Context where necessary.

**Session context** (`components/review/SessionContext.tsx`):

Wrap the review interface in a context provider that holds:

```typescript
type SessionContextValue = {
  sessionId: string
  clauses: ClauseReview[]
  decisions: Record<string, Decision>  // keyed by clauseReviewId
  setDecision: (clauseReviewId: string, decision: Decision) => void
  evalResults: EvaluateOutput | null
  setEvalResults: (results: EvaluateOutput) => void
  currentClauseIndex: number
  setCurrentClauseIndex: (index: number) => void
  sortOrder: 'priority' | 'document'
  setSortOrder: (order: 'priority' | 'document') => void
}
```

The `decisions` map persists in-memory during the session. On each decision change, also write to Supabase via a `PATCH` to the clause review record.

---

## Page Flows and Navigation

### Upload to Review Flow

1. `UploadScreen`: user selects file, perspective, mode. On submit, POST to `/api/pipeline/classify`. Show inline loading state on the button.
2. On success: navigate to `/classify` with Pass 1 results in URL state (use `router.push('/classify')` with results stored in sessionStorage, not URL params, to avoid exposing contract content in the URL).
3. `ClassificationConfirm`: display detected values. On confirm, POST to `/api/pipeline/redline`. Navigate to `/processing` while waiting.
4. `ProcessingScreen`: show four-stage progress. Poll or subscribe to the redline route. On completion, navigate to `/review/[sessionId]`.
5. `ReviewInterface`: loads with Pass 2 results. Immediately opens SSE connection to `/api/pipeline/evaluate?sessionId=...`.

### Home Screen

On mount, read the session UUID from `localStorage` and fetch the 5 most recent sessions from Supabase. If no sessions exist (first visit), show only the "Start New Review" CTA and the benchmark session stats.

---

## Review Interface

### Layout

Two-panel layout with a persistent header. No page scroll on the outer container; each panel scrolls independently.

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Progress | Sort Toggle | Session Metadata | Export Btn  │
├──────────────────────────┬──────────────────────────────────────┤
│                          │ CRITICAL ISSUES PANEL (if any open) │
│   DOCUMENT PANEL         ├──────────────────────────────────────┤
│   (40% width)            │                                      │
│   Contract text          │   ACTIVE REVIEW CARD                 │
│   with colored           │   (60% width)                        │
│   left borders           │                                      │
│                          │                                      │
│   Scrollable             │   Scrollable                         │
└──────────────────────────┴──────────────────────────────────────┘
│ RUNNING LOG (collapsible panel, right edge)                     │
└─────────────────────────────────────────────────────────────────┘
```

### DocumentPanel

Renders the full contract text as structured HTML. Each clause that has an associated redline shows a colored left border (2px solid) in the priority tier color. No border for clauses without redlines.

Clicking a clause scrolls the right panel to its review card and sets `currentClauseIndex` in context.

When a clause's redline is resolved (decision recorded), dim the left border to 40% opacity.

### RedlineCard

Props: `clauseReview: ClauseReview`, `evalScore: ClauseScore | null`, `onDecide: (decision: Decision) => void`

Structure (top to bottom):
1. Clause name + section number (small caps label style)
2. Priority badge + Eval confidence signal (side by side)
3. Diff view: original text with deletions in `--color-diff-delete` strikethrough, additions in `--color-diff-insert` underline
4. Rationale block (2 to 3 sentences, citation displayed as a smaller footnote)
5. Counterparty prediction (collapsed by default, expandable with chevron)
6. Three action buttons: Accept, Modify, Reject

**Confidence signal loading state:** Until Pass 3 results arrive, render a small animated pulse element in place of the confidence badge. Apply a CSS `animation: pulse 2s infinite` using the brand navy color at 30% opacity.

**Modify mode:**

When the user clicks "Modify":
1. Hide the static diff view
2. Render a `<textarea>` pre-filled with the `proposedText`
3. Show the original text above in a faded `<div>` labeled "Original"
4. Render a live diff below the textarea: compute the diff between `originalText` and the current textarea value using `diff-match-patch` on every keystroke (debounced to 300ms)
5. Show "Confirm Edit" and "Cancel" buttons below the textarea
6. On "Confirm Edit": call `onDecide({ type: 'modified', acceptedText: textareaValue })`
7. On "Cancel": exit modify mode, show static diff again

### CriticalIssuesPanel

Renders only if at least one Must-priority redline has `decision === null` (unresolved).

Shows: "N issues require attention before this document can be sent" with a list of clause names as jump links.

Auto-hides when all Must-priority redlines are resolved. Can be manually toggled with a chevron.

### RunningLog

A collapsible panel triggered by a tab on the right edge of the screen. Width: 280px when open, 0 when closed with a toggle tab always visible.

Each entry:
```
[Clause Name]          [Decision Badge]
[Section Number]       [HH:MM:SS]
[For Modified: "Changed to: ..."]
```

Entries are prepended (most recent at top).

### Header

Fixed at top of the review interface. Contains:
- Left: "Reviewed X of Y redlines" (count of decided clauses)
- Center: Sort toggle (two buttons: "Priority Order" | "Document Order", active state on current selection)
- Right: session metadata chip (document name, mode, party perspective), then "Export Document" button

### Clause Ordering

Priority order: sort all clauses with `must` priority first, then `should`, then `nice`. Within each tier, preserve the original document order.

Document order: sort all clauses by `display_order` (their position in the original document).

When the user switches sort order, animate the cards repositioning (Framer Motion layout animation).

---

## Evaluation Dashboard

### EvalDashboard

Two views toggled by a tab at the top: "Trend Overview" and "Session History".

Time range selector for Trend Overview: a segmented control with four options: "7 Days", "30 Days", "90 Days", "All Time".

### TrendOverview

**Stat cards row:** Four cards in a 4-column grid (responsive: 2-column on smaller screens).

Each card: a large number, a label below it, and a small trend indicator (up arrow in `--color-nice`, down arrow in `--color-must`, dash for flat).

**Overall score trend chart:** Use Recharts `LineChart`. X-axis: session dates formatted as "MMM D". Y-axis: 0 to 5. Three horizontal `ReferenceArea` bands for the green/amber/red performance tiers. `Dot` size 6. `Tooltip` shows document name, date, score.

**Dimension bars:** Five `Progress`-style horizontal bars. Each bar: label on the left (120px fixed width), bar in the center, score value on the right. Use a custom bar component, not a Recharts chart. Show a small dot or marker for the prior period average.

**Binary check tiles:** Five tiles in a 2-3 grid (2 on first row, 3 on second). Each tile: check name, large pass rate percentage, trend direction badge.

**Clause performance table:** Standard HTML `<table>` with `<thead>` and `<tbody>`. Sortable by clicking column headers. Default sort: average score ascending.

### SessionIndex

A searchable table. Search input filters by document name client-side (no server round-trip).

Each row: document name, date, document type chip, mode chip, score badge (colored background per tier), five binary check dots (green/red), "View" button.

Clicking "View" navigates to `/dashboard/[sessionId]`.

### SessionDetail

Display the session's full eval data. Structure:
1. Header with session metadata
2. Binary checks summary (5 rows)
3. Dimension score bars (same component as TrendOverview)
4. Improvement notes (rendered as a bordered `<blockquote>` per note)
5. Clause breakdown: an accordion where each item is a clause. Collapsed state shows clause name, priority badge, decision badge, overall clause score. Expanded state shows all five dimension scores, evaluator note, and for modified clauses, the before/after comparison

---

## Upload Screen

Three inputs in a vertical stack:

1. **File upload zone:** Drag-and-drop zone with a file input fallback. Accepted types: `.pdf`, `.docx`. On file selected, show filename and page count (if detectable). On invalid file type, show inline error.

2. **Party perspective:** Two radio buttons styled as selectable cards: "Disclosing Party" and "Receiving Party". Neither selected by default. Required field.

3. **Review mode:** Three radio buttons styled as selectable cards: "Conservative", "Standard" (pre-selected), "Aggressive". Each card includes a one-line description (from the PRD Section 5.1 mode definitions).

"Start Review" button is disabled until a file and party perspective are both selected.

---

## Classification Confirmation Screen

Four editable fields displayed as a clean two-column grid. Each field:
- Label on top
- Detected value below in a larger font
- Edit icon (pencil) beside the value
- On click: inline `<input type="text">` replaces the displayed value
- On blur or Enter: save the value

The user's corrections are stored in component state and passed to the Pass 2 API call as overrides.

"Confirm and Continue" button triggers Pass 2. Shows a loading state on the button while Pass 2 runs.

---

## Processing Screen

Four steps displayed vertically, each with an icon and label:

1. Parsing Document
2. Classifying Contract
3. Generating Redlines
4. Preparing Interface

Steps transition from "pending" (gray) to "active" (navy, with a spinner) to "complete" (forest green, checkmark). One step is active at a time. Steps complete in order as the pipeline progresses.

The active step also shows a context line below its label (e.g., "Identifying clause types and governing law" for step 2).

---

## Home Screen

Structure (vertical):
1. Full-width hero area: Precedent wordmark (EB Garamond), one-sentence product description, "Start New Review" button
2. Stats row: two stat cards (Total Reviews, Average Quality Score)
3. Section header: "Recent Sessions"
4. Session list: up to 5 sessions as cards. Each card: document name, date, document type chip, mode chip, score badge, "View" and "Continue" (or "View" if exported) actions

If no sessions exist beyond benchmarks: show benchmark sessions in the list with a small "Benchmark" label.

---

## Responsive Behavior

The review interface (two-panel layout) requires a minimum viewport width of 1024px. Below that, show a notice: "Precedent is optimized for desktop use. For the best experience, open this page on a wider screen."

All other screens (home, upload, classification, processing, dashboard) are responsive to tablet and mobile.
