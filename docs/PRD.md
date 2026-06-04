# PRECEDENT
## Product Requirements Document
Version 1.0 | Internal Working Document

---

## Table of Contents

1. Product Overview
2. Problem Statement
3. Target User
4. Product Vision and Competitive Positioning
5. Feature Specifications
   - 5.1 Contract Upload
   - 5.2 Classification Confirmation
   - 5.3 Redline Generation Pipeline
   - 5.4 Critical Issues Panel
   - 5.5 Review Interface
   - 5.6 Evaluation System
   - 5.7 Document Export
   - 5.8 Evaluation Dashboard
   - 5.9 Home Screen and Session Management
6. User Flows
7. Success Metrics
8. Non-Goals
9. Design and UX Principles
10. Technical Architecture Summary
11. Post-MVP Roadmap

---

## 1. Product Overview

Precedent is an AI-powered NDA review platform built for lawyers and legal professionals. It runs a structured four-pass inference pipeline that parses an uploaded NDA, classifies its legal context, generates clause-by-clause redlines grounded in documented market practice, and scores those redlines against a defined quality rubric. Lawyers review the output through a priority-ordered interface, accept or modify each suggested redline, and export a final Word document with tracked changes and explanatory comment annotations.

The platform includes a built-in evaluation system that runs on every session. It scores redlines across six quality dimensions and five binary compliance checks, persists those scores in a time-series database, and surfaces performance trends through a dedicated dashboard. This makes the quality of the AI's output visible and measurable across sessions, not only within a single review.

---

## 2. Problem Statement

NDA review is one of the most common legal tasks and one of the least well-served by existing tools.

The speed problem is well documented. According to the 2025 Contracting Benchmark Report, the average NDA takes five days to execute. NDAs represent approximately 30 percent of large legal teams' daily work. For in-house counsel at growth-stage companies, this volume arrives without adequate staffing: a single lawyer may handle dozens of inbound contracts per week, frequently under commercial pressure to turn reviews around within hours.

The quality problem is less discussed but more consequential. Redline quality depends on who is doing the review and under what conditions. A lawyer working under time pressure at the end of a quarter will miss things that would be obvious in a calmer context. Lawyers with limited commercial NDA experience under-redline what matters and over-redline what does not. Positions that diverge from current market practice invite unnecessary counterparty friction. Certain compliance requirements (the DTSA whistleblower notice for individual signatories, California §16600 jurisdiction exposure when a non-solicitation clause appears alongside California governing law) require current specialist knowledge that generalist reviewers may not have.

A gap analysis of major existing legal AI tools found seven specific capabilities absent from all of them:

1. DTSA notice enforcement as a hard binary check for individual signatories (rather than an optional suggestion)
2. Automatic California §16600 detection when a non-solicitation clause is paired with California governing law
3. Mandatory trade secret term bifurcation check, flagging flat confidentiality terms that expose trade secret protections
4. AI training carve-out flagging for SaaS and technology vendor contexts (reflected in Practical Law's 2025-2026 guidance, but absent from all major tools)
5. Confidence indicators tied to specific cited authorities, not generic quality signals
6. Counterparty response predictions grounded in deal-type context
7. An evaluation system that tracks whether AI output quality improves over time

Precedent addresses each of these gaps directly.

---

## 3. Target User

The primary user is a lawyer or legal professional responsible for reviewing inbound NDAs as part of a commercial workflow. This includes in-house counsel at growth-stage technology companies handling 10 to 50 vendor, customer, and partner NDAs per week; commercial counsel at law firms reviewing contracts for corporate clients; and legal operations professionals at larger enterprises managing high-volume procurement agreements.

The defining characteristic of this user is operational context. They receive contracts from sales, GTM, or procurement teams who expect quick turnaround. They work under commercial pressure: a delayed NDA can stall a deal. They understand what a good NDA looks like and know current market practice, but they do not have time to reconstruct every position from first principles on each review. They need a system that starts from a sound, documented baseline, flags what genuinely requires attention at the right priority level, and produces output they can send without second-guessing.

This user expects the platform to know its domain. Generic suggestions without legal grounding will not survive their scrutiny. Confidence signals must be traceable to specific sources. The interface must match the professional standard they apply to their own work.

---

## 4. Product Vision and Competitive Positioning

Precedent's near-term goal is to prove that AI-generated NDA redlines can be market-calibrated, legally grounded, and evaluated systematically. The longer-term vision is a platform that learns from lawyer decisions over time, adapts its market positions as practice evolves, and extends its coverage to the full commercial contract surface: MSAs, DPAs, and statements of work.

**Market position.**

Existing legal AI tools fall broadly into two categories: pure AI suggestion tools (Harvey, Spellbook, LegalOn) and full human-in-the-loop services (Crosby, Ontra). Precedent occupies a distinct position: AI-powered redlines delivered through a structured evaluation system that makes the AI's performance visible, measurable, and improvable. It is built for lawyers who want to maintain their own judgment while benefiting from AI assistance, and who want evidence that the AI is getting better over time.

**Seven specific capabilities absent from all existing tools.**

| Capability | Market Gap |
|---|---|
| DTSA notice check as a hard binary | Most tools omit this or treat it as optional |
| California §16600 detection | No tool performs this automatically |
| Trade secret bifurcation check | Not consistently proposed by any tool |
| AI training carve-out flag | Not present in any current tool despite 2025-2026 Practical Law guidance |
| Confidence indicators with source citations | Tools provide signals but not grounded citations |
| Counterparty response predictions | Present in some tools but without deal-type calibration |
| Session-level evaluation with trend tracking | No current tool tracks quality improvement over time |

---

## 5. Feature Specifications

### 5.1 Contract Upload

The upload screen presents three required inputs before the pipeline begins.

**File.** Accepted formats: PDF and DOCX. After the user selects a file, the platform displays the filename and detected page count for confirmation. No hard file size limit applies in the MVP; a warning appears for documents over 50 pages.

**Party perspective.** Two options: Disclosing Party and Receiving Party. This selection orients every redline generated. A Disclosing Party selection produces redlines that protect the disclosing party (stronger CI definitions, narrower exclusions, broader remedy language). A Receiving Party selection produces redlines that limit the receiving party's obligations (marking requirements, narrower CI scope, bifurcated term). No default is pre-selected; the user must choose.

**Review mode.** Three options with Standard as the default:

| Mode | What it produces |
|---|---|
| Conservative | Redlines on Must-Address positions only; focuses on material legal risk and hard compliance requirements |
| Standard | Must-Address and Should-Address redlines, reflecting market-standard positions from the NDA reference database |
| Aggressive | All redlines including Nice-to-Address positions, pursuing the full anchor position for each clause |

A "Start Review" button triggers the pipeline after all three inputs are provided.

---

### 5.2 Classification Confirmation

After Pass 1 completes, a classification confirmation screen appears before the review interface loads. The screen displays the AI's detected values for four fields:

| Field | Description |
|---|---|
| Document Type | Mutual NDA or One-Way NDA |
| Use Case | SaaS/Vendor, Employment/Contractor, M&A, Strategic Partnership, or IP Licensing |
| Governing Law | The jurisdiction detected from the governing law clause |
| Signatory Type | Entity (company-to-company) or Individual (individual signatory present) |

Each field shows the AI-detected value with an edit icon beside it. Clicking the edit icon opens a free-text input. The user's correction replaces the AI-detected value in the classification JSON object, which is injected into the Pass 2 prompt context directly. No re-triggering of the classification model occurs; corrections are treated as authoritative.

This step exists because misclassification silently corrupts every downstream redline. An NDA misidentified as New York-governed when the actual governing law is California will not trigger the §16600 flag. An individual-signatory NDA misidentified as entity-only will not trigger the DTSA check. The confirmation screen makes these determinations visible and correctable before they affect the output.

The user clicks "Confirm and Continue" to proceed. Pass 2 begins immediately after confirmation.

---

### 5.3 Redline Generation Pipeline

Precedent's processing runs as four sequential LLM passes using Gemini 3 Flash via the Vercel AI SDK. Each pass produces structured JSON output that feeds the next.

**Pass 1: Document Parsing and Classification**

Runs before the classification confirmation screen.

- Input: raw text extracted from the uploaded file via mammoth (DOCX) or pdf-parse (PDF)
- Processing: sends the full text to Gemini 3 Flash with a clause classification prompt
- Output: a clause-by-clause taxonomy (clause type, section number, extracted text), detected document type, governing law, signatory type, and use case

**Pass 2: Redline Generation**

The core pass. Runs after the user confirms or corrects the classification.

- Input: classified clause list, confirmed classification metadata (party perspective, mode, governing law, signatory type, use case), and the full NDA reference database injected as a system prompt context block
- Processing: for each clause, the model compares the clause text against the applicable market-standard position in the reference database and generates a redline where deviation exists
- Output: per-clause JSON objects containing priority tier (Must / Should / Nice), original clause text, proposed replacement text, 2 to 3 sentence rationale with named source citation, and a counterparty prediction with fallback position

The NDA reference database is a structured markdown file stored in the repository at `/lib/nda-reference-database.md`. It is the sole authorized citation source for the model. The system prompt instructs explicitly: "Cite only sources present in the reference database I have provided. If you cannot ground a claim in the reference database, write 'per market practice' without naming a specific source. Do not fabricate case names, statute sections, or firm positions."

The reference database contains:
- Market-standard positions for the twelve high-frequency NDA clause types, with must/should/nice assignments by use case and governing law
- The DTSA whistleblower immunity notice language verbatim, per 18 U.S.C. § 1833(b)
- California §16600 drafting rules and the AB 1076 (2023) amendments
- AI training prohibition carve-out language for SaaS and technology vendor contexts
- Summaries of eight key cases: Martin Marietta v. Vulcan (Del. 2012), PepsiCo v. Redmond (7th Cir. 1995), Brown v. TGS Management (Cal. App. 2020), Silicon Image v. Analogix (N.D. Cal. 2008), Convolve v. Compaq (Fed. Cir. 2013), IBM v. Papermaster (S.D.N.Y. 2008), In re D.E. Shaw (SEC 2023), and In re Brink's (SEC 2022)
- Binary check trigger rules for DTSA, California §16600, trade secret bifurcation, AI training carve-out, and internal consistency

**Pass 3: Evaluation Scoring**

Runs after the review interface loads. Results are pushed to the client via server-sent events (SSE).

- Input: original contract text, all generated redlines, and the full evaluation rubric embedded in the system prompt
- Processing: scores each redline on five scale dimensions and five binary checks; computes clause-level and session-level scores
- Output: per-clause dimension scores, binary check results, overall session score, and brief evaluator notes
- UX state during processing: confidence signal positions in the review cards display a "Computing..." loading state until results arrive

**Pass 4: Improvement Note Generation**

Runs after Pass 3 completes, entirely in the background. No primary review interface element depends on Pass 4.

- Input: Pass 3 output and trailing 10-session history for the same document type and mode
- Processing: compares this session's scores with the trailing history and identifies patterns worth surfacing
- Output: plain-language improvement insights that update the evaluation dashboard
- Example output: "Market Calibration on the CI Definition clause scored below 3.0 in 4 of the last 5 Standard-mode SaaS NDA sessions. The proposed oral disclosure confirmation window may be more aggressive than the Cooley GO settled position for this mode."

---

### 5.4 Critical Issues Panel

A compact summary panel that appears above the first redline card in the review interface. It displays a count of Must-Address redlines with a list of clause names and jump links to each.

Sample text: "3 issues require attention before this document can be sent."

The panel collapses automatically when all Must-Address redlines have been resolved (accepted or modified). The user can manually toggle it at any time.

---

### 5.5 Review Interface

**Layout.** Two-panel design.

The left panel (40% of screen width) renders the full contract text as structured HTML extracted from the uploaded file. Each clause with an associated redline displays a colored left border indicating priority tier: deep crimson for Must-Address, dark amber for Should-Address, forest green for Nice-to-Address. Clicking any highlighted clause navigates to its review card in the right panel.

The right panel (60% of screen width) shows the active review card.

**Review card contents:**

| Element | Description |
|---|---|
| Clause name and section number | Identifies which clause is under review |
| Priority tier badge | Must, Should, or Nice, color-coded per the palette |
| Eval confidence signal | Confident, Review Needed, or Low Confidence (shows loading state until Pass 3 completes) |
| Before/after diff | Deleted text from the original in red with strikethrough; proposed additions in green with underline |
| Rationale | 2 to 3 sentences citing the specific source (statute section, case name, or named market authority) |
| Counterparty prediction | Expandable section labeled "Expected counterparty response" showing predicted pushback and fallback position |

**Action buttons.** Three actions are available for every redline.

*Accept:* Applies the proposed language as a tracked change. Auto-advances to the next unreviewed redline. Records the decision in the running log.

*Modify:* Transforms the proposed text field into an editable rich text input. The original text remains visible above in a faded reference block. Diff highlighting updates in real time as the lawyer edits. "Confirm Edit" saves the modification. "Cancel" reverts to the unmodified proposed text. After confirming, the interface auto-advances. The running log records the decision as "Modified" and stores both the AI's proposed text and the lawyer's accepted version.

*Reject:* Preserves the original language with no tracked change. Auto-advances. Records the decision in the running log.

**Navigation.** Default display order is priority order: all Must-Address redlines first, then Should-Address, then Nice-to-Address. A toggle in the header switches to document order (the sequence in which clauses appear in the NDA). The lawyer can skip any redline and return to it at any time; skipped redlines are marked distinctly in the running log.

**Header.** A persistent strip above the review area shows: progress ("Reviewed X of Y redlines"), the sort toggle, and session metadata (document name, mode, party perspective).

**Running log.** A collapsible panel on the right edge of the screen, accessible from a persistent tab. Each entry shows: clause name, decision badge (Accepted / Modified / Rejected), timestamp, and for modifications, a brief note showing the AI's proposed text and the lawyer's accepted version.

**Quality Report tab.** A secondary tab in the right panel, toggled from the default "Redlines" tab. Displays the full evaluation output for this session once Pass 3 completes. Content matches the session detail view described in Section 5.8.

---

### 5.6 Evaluation System

The evaluation system runs on every document session (Passes 3 and 4) and produces two categories of output: per-clause confidence signals that appear inline in the review interface, and session-level quality scores that populate the evaluation dashboard.

**Scale dimensions.** Five dimensions scored as integers from 1 to 5. The rubric definitions use observable, text-verifiable criteria so the model can apply them consistently across sessions.

---

**Legal Accuracy (weight: 30%)**

Measures whether the legal claims, statute citations, and case characterizations in the redline are factually correct.

| Score | Criteria |
|---|---|
| 5 | Every legal claim is tied to a specific source in the NDA reference database. Statute sections are cited with the correct title, section number, and subpart. Case holdings are accurately characterized with no material omissions. |
| 4 | All claims correct in substance. At least one citation is imprecise (cites the act rather than the specific section, or paraphrases a case holding without naming the case), but nothing is factually wrong. |
| 3 | All claims appear correct but at least one is unverifiable from the reference database. The model may have drawn on general knowledge rather than a cited authority. |
| 2 | At least one legal claim is factually incorrect, cites the wrong statutory section, or materially mischaracterizes a case holding. |
| 1 | Multiple factual errors. The model cited authorities not present in the reference database or fundamentally misrepresented a legal standard. |

---

**Market Calibration (weight: 25%)**

Measures whether the proposed language reflects current market-standard practice for this clause type, deal type, and governing law.

| Score | Criteria |
|---|---|
| 5 | The proposed language matches the settled market position documented in the reference database for this specific clause type, deal type, and governing law. |
| 4 | Within the market range. What a careful commercial lawyer would send without hesitation. Not the optimal settled position but would not generate significant pushback. |
| 3 | Defensible but either slightly aggressive (invites more pushback than warranted) or slightly weak (leaves available protection on the table). |
| 2 | Materially off-market. A sophisticated counterparty would push back firmly or refuse outright; or the protection achieved is weaker than what market practice regularly delivers. |
| 1 | Fundamentally off-market. Either so one-sided that acceptance is implausible, or so weak it provides no meaningful improvement over the original clause. |

---

**Redline Precision (weight: 20%)**

Measures whether the proposed language itself is well-drafted: internally consistent, unambiguous, and ready to send without further editing.

| Score | Criteria |
|---|---|
| 5 | Internally consistent with all defined terms used in the document. Cross-references are correct. No ambiguous pronouns or undefined terms introduced. Requires no further editing before sending. |
| 4 | Clear and functional. Minor stylistic imprecision that does not create a legal ambiguity. |
| 3 | Understandable in intent but introduces at least one ambiguity: an undefined term, an imprecise qualifier, or a cross-reference that does not resolve cleanly. |
| 2 | Creates a material ambiguity or internal inconsistency with another clause. Would require redrafting before sending. |
| 1 | Self-contradictory, uses multiple undefined terms, or would create more problems than the original. |

---

**Explanation Quality (weight: 15%)**

Measures whether the rationale clearly explains the legal basis for the change, the commercial consequence of leaving the original unchanged, and the expected counterparty response.

| Score | Criteria |
|---|---|
| 5 | Names the specific legal basis (statute section, case name, or market authority). Describes the concrete commercial consequence of leaving the original unchanged. Includes a counterparty prediction with a fallback position. All three elements present and specific. |
| 4 | Names a legal basis and describes the commercial consequence. Counterparty prediction is either absent or generic ("counterparty may push back"). |
| 3 | Explains the issue and the fix but relies on general statements without naming the specific source or standard. |
| 2 | Describes what changed without explaining why it matters commercially. No source citation. No counterparty prediction. |
| 1 | Generic language applicable to any NDA clause. No legal basis, no commercial consequence, no counterparty prediction. |

---

**Proportionality (weight: 10%)**

Measures whether the priority tier assigned and the aggressiveness of the proposed language are calibrated to the actual legal risk of the clause and the selected review mode.

| Score | Criteria |
|---|---|
| 5 | Boilerplate clauses flagged at Nice-to-Address only or not at all. Substantive clauses addressed at the intensity their legal risk warrants. The aggressiveness of proposed language matches the selected mode per the reference database. |
| 4 | Generally correct calibration. One clause slightly over or under-prioritized; the error would not mislead a reviewing lawyer. |
| 3 | At least one clause materially over-prioritized (boilerplate flagged at Must-Address) or under-prioritized (substantive issue flagged at Nice-to-Address). |
| 2 | Multiple calibration errors that would meaningfully direct the lawyer's attention toward the wrong issues. |
| 1 | No discernible relationship between clause risk level and assigned priority. All clauses treated with the same intensity regardless of legal substance. |

---

**Binary checks.** Five checks scored as PASS or FAIL, each with a brief explanatory note generated by the evaluator.

| Check | PASS Criteria | FAIL Criteria |
|---|---|---|
| DTSA Notice | System correctly applied the rule: flagged missing notice for individual signatories; did not flag entity-only NDAs. | Either direction wrong: flagged an entity-only NDA, or missed a required notice for an individual signatory. |
| California §16600 | California governing law detected with a non-solicitation or non-compete clause present, and the jurisdiction warning was generated. | Flag missed when conditions were met; or flag generated when governing law is not California. |
| Trade Secret Bifurcation | Flat confidentiality term (no separate perpetual trade secret protection) flagged as a Must-Address issue. | Flat term present and not flagged; or correctly bifurcated term incorrectly flagged. |
| AI Training Carve-out | For SaaS/Vendor context: missing AI training prohibition flagged. For other use cases: no flag generated. | Missed in SaaS/Vendor context; or incorrectly generated in employment or M&A context. |
| Internal Consistency | No cross-clause contradictions found across the full set of generated redlines for this document. | At least one contradiction exists between two redlines in the same document. |

**Overall session score.** The weighted average of the five scale dimension scores. If two or more binary checks fail, the overall score is capped at 3.0. One binary check failure generates a warning indicator in the dashboard but does not cap the score.

**Confidence signal mapping.** Each per-clause weighted score maps to the confidence signal displayed in the review card. These signals update when Pass 3 results arrive via SSE.

| Signal | Threshold |
|---|---|
| Confident | Weighted clause score of 4.0 or above, with no applicable binary check failures |
| Review Needed | Weighted clause score between 2.5 and 3.9, or any applicable binary check failure |
| Low Confidence | Weighted clause score below 2.5 |

---

### 5.7 Document Export

The "Export Redlined Document" button appears in the review interface header at all times. If unreviewed redlines remain when the user initiates an export, a confirmation dialog displays: "You have [N] unreviewed redlines. Export anyway?" The user can proceed or return to review.

**Exported .docx contents:**

- All accepted and modified redlines appear as tracked changes from the original counterparty text. Deletions show as red strikethrough; insertions show as green underline. This format allows the counterparty to accept or reject each change natively in Word, which is standard practice.
- Rejected redlines revert to the original text with no tracked change.
- For each accepted or modified redline: the rationale appears as a Word comment bubble attached to the relevant text span. The comment is attributed to "Precedent" with the generation timestamp.

**Technical implementation:** jszip handles ZIP manipulation of the .docx file structure. diff-match-patch computes character-level diffs between original and final accepted text. Tracked changes are implemented as OOXML `<w:ins>` and `<w:del>` elements in `word/document.xml`. Comment annotations are implemented as `<w:comment>` elements in `word/comments.xml`, with `<w:commentRangeStart>`, `<w:commentRangeEnd>`, and `<w:commentReference>` markers linking each comment to its text span.

The session saves to session history upon export.

---

### 5.8 Evaluation Dashboard

The evaluation dashboard is accessible from the main navigation at any time. It is visible to all users, not limited to administrators.

Before the first real user session, the dashboard is pre-populated with eval data from three synthetic NDA benchmark runs (see Section 10.5). This ensures the dashboard displays meaningful starting data from the first time it is opened.

---

**View 1: Trend Overview**

This is the default view. A time range selector in the header allows switching between Last 7 Days, Last 30 Days, Last 90 Days, and All Time.

*Summary stat row.* Four cards:

| Card | Contents |
|---|---|
| Average Quality Score | Current period overall score (e.g., "3.8 / 5.0") with a delta indicator versus the prior equivalent period |
| Sessions Completed | Count for the selected period with trend indicator |
| Redline Acceptance Rate | Percentage of AI-suggested redlines accepted without modification during the period |
| Binary Check Pass Rate | Percentage of all binary checks passed across all sessions in the period |

*Overall score trend chart.* A line chart with session date on the horizontal axis and quality score (0 to 5) on the vertical. Each session plots as a point. Three horizontal color bands indicate performance tiers: deep green (4.0 to 5.0), amber (3.0 to 4.0), muted red (0 to 3.0). Hovering any point shows a tooltip: document name, date, overall score, document type.

*Dimension performance panel.* Five horizontal bars, one per dimension. Each bar shows the current period's average score. A small marker on each bar shows the prior period's average, making improvement or regression immediately visible.

*Binary check pass rate panel.* Five tiles, one per check. Each shows the check name, pass rate as a percentage, and a trend direction indicator. Color coding: green for above 90%, amber for 70 to 90%, muted red below 70%.

*Clause performance table.* All twelve NDA clause types as rows. Columns: Clause Type, Average Score (current period), Trend, and Sessions Reviewed. Sorted ascending by average score by default, so the lowest-performing clause types appear at the top. This is the most actionable view for identifying where the reference database or system prompt needs refinement.

---

**View 2: Session Index**

A searchable, sortable table of all sessions.

Columns: Document Name, Date, Document Type, Mode, Overall Score (as a color-coded badge), Binary Checks (a row of five pass/fail dots), and a "View Session" button.

Clicking "View Session" opens the session detail view.

---

**Session Detail View**

A dedicated page for a single session containing:

- Header: document name, date, classification metadata (document type, governing law, mode, party perspective), overall score badge
- Binary checks summary: five rows, each with the check name, PASS or FAIL badge, and the evaluator's note
- Dimension scores: five horizontal bars showing this session's score per dimension
- Improvement notes: the Pass 4 plain-language output, rendered in a bordered section
- Clause-level breakdown: an expandable list of all clauses reviewed. Each collapsed row shows clause name, priority tier badge, lawyer decision badge, and the clause's overall score. Expanding a row reveals per-dimension scores for that clause, the evaluator's note, and for modified redlines, a side-by-side comparison of the AI's proposed text and the lawyer's accepted version

---

### 5.9 Home Screen and Session Management

All users land on the home screen on every visit, including first-time users.

**Home screen contents:**

- "Start New Review" button, prominently placed at the top of the screen
- Recent sessions list: the five most recent sessions showing document name, date, document type, and overall eval score badge, with a "View" action for each
- Summary stats row: total reviews completed and average quality score across all sessions
- First-time users see the stats row populated with data from the synthetic benchmark sessions; the recent sessions list shows those benchmark sessions as entries

**Session constraints:**

The MVP allows one active session at a time. If the user attempts to start a new review while a prior session has no export yet, the platform prompts: "You have an unfinished session: [document name]. Start a new review and archive the previous one, or return to finish it?" This constraint is removed in the first post-MVP release, which will support unlimited concurrent sessions.

Sessions are auto-named from the uploaded document's filename. Users can rename any session from the session history.

Sessions persist via UUID-keyed records in Supabase, accessible from the same browser and device. Across different browsers or devices, sessions are not accessible. Authentication-based session sync is a post-MVP roadmap item.

---

## 6. User Flows

### 6.1 Primary Review Flow (First-Time User)

1. User opens the Precedent URL and lands on the home screen, which shows benchmark session data and a "Start New Review" button.
2. User clicks "Start New Review."
3. Upload screen appears. User selects a file, chooses party perspective, and selects a review mode (Standard is pre-selected).
4. User clicks "Start Review."
5. Processing screen appears with four staged progress indicators: Parsing Document, Classifying Contract, Generating Redlines, Preparing Interface.
6. Pass 1 completes. Classification confirmation screen displays the AI-detected values.
7. User reviews the detected values, corrects any that are wrong via the free-text edit inputs, and clicks "Confirm and Continue."
8. Pass 2 begins. Review interface loads as Pass 2 completes.
9. Critical Issues panel appears above the first review card, listing all Must-Address redlines with jump links.
10. All review cards are visible. Confidence signals show a "Computing..." loading state while Pass 3 runs in the background.
11. User works through redlines: accepts some, modifies others, rejects some, skips and returns as needed.
12. Pass 3 completes. Confidence signals update across all review cards. Quality Report tab populates.
13. Pass 4 completes. Evaluation dashboard updates with improvement notes for this session.
14. User finishes reviewing and clicks "Export Redlined Document."
15. If unreviewed redlines remain, a confirmation dialog appears. User proceeds or returns to review.
16. The .docx downloads. The session saves to history.
17. User returns to the home screen, which now shows the completed session in the recent sessions list.

### 6.2 Returning User Flow

1. User opens the Precedent URL and lands on the home screen showing prior sessions.
2. User can click "View" on any prior session to open its session detail in the evaluation dashboard (read-only after export).
3. Or user clicks "Start New Review." If a prior session is unfinished, the archiving confirmation prompt appears.

### 6.3 Classification Correction Flow

1. Classification confirmation screen shows: Document Type: Mutual NDA, Use Case: SaaS/Vendor, Governing Law: New York, Signatory Type: Entity.
2. User recognizes the actual governing law is California.
3. User clicks the edit icon next to the Governing Law field.
4. A free-text input replaces the displayed value. User types "California."
5. The corrected value stores in the classification JSON. Pass 2 will now apply California §16600 rules and the CA jurisdiction flag.
6. User clicks "Confirm and Continue." Pass 2 begins with the corrected context.

### 6.4 Modify Redline Flow

1. User opens a review card for the CI Definition clause, flagged as Must-Address.
2. The proposed redline adds a 30-day written confirmation requirement for oral disclosures. The user prefers a 10-day window.
3. User clicks "Modify."
4. The proposed text becomes an editable rich text field. The original text displays above in a faded reference block.
5. User edits "30 days" to "10 days." The diff highlighting updates in real time.
6. User clicks "Confirm Edit."
7. The 10-day version applies as a tracked change. The running log records: "CI Definition — Modified: changed oral confirmation window from 30 to 10 days."
8. Interface auto-advances to the next unreviewed redline.

### 6.5 Export Flow

1. User has reviewed all redlines and clicks "Export Redlined Document" in the interface header.
2. The platform generates a .docx with: all accepted and modified redlines as track changes from the original, rationale notes as Word comment bubbles, rejected redlines reverting to original.
3. The file downloads to the user's machine.
4. The user opens the file in Word, reviews the tracked changes, and sends it to the counterparty.

### 6.6 Evaluation Dashboard Flow

1. User navigates to the evaluation dashboard from the main navigation.
2. Trend Overview loads. The user notices Market Calibration has been scoring below the other dimensions across the past 30 days.
3. User scrolls to the clause performance table and sees the CI Definition clause is the lowest-scoring row.
4. User switches to Session Index and finds the three most recent sessions.
5. User clicks "View Session" on the lowest-scoring session.
6. Session detail page shows all binary checks passed, but Market Calibration scored 2 on the CI Definition clause. The evaluator note reads: "The proposed oral disclosure confirmation window (30 days) was scored as more aggressive than the Cooley GO settled position for Standard mode, SaaS context."
7. User updates the NDA reference database to adjust the Standard mode position for this clause.

---

## 7. Success Metrics

**Metric 1: Must-Address Redline Acceptance Rate**

*Definition:* The percentage of Must-Address redlines the lawyer accepts without modification.

*Calculation:* (Must-Address redlines accepted as proposed) divided by (total Must-Address redlines generated), rolling 30-day window.

*Target:* 65% or above at MVP launch; 75% or above after one month of active sessions.

*Why it matters:* A lawyer accepting a Must-Address redline without modification signals that the AI identified a real issue and proposed language the lawyer found credible. A rate below 60% indicates either over-flagging (false Must-Address items) or proposals that are too aggressive or too weak to send. This is the primary AI quality signal.

---

**Metric 2: Overall Redline Acceptance Rate**

*Definition:* The percentage of all redlines (across all priority tiers) accepted without modification.

*Calculation:* (Total redlines accepted as proposed) divided by (total redlines generated), rolling 30-day window.

*Target:* 55% or above at MVP launch.

*Why it matters:* Tracked separately from the Must-Address rate to detect proportionality failures. A platform can perform well on Must-Address items while systematically over-redlining Should-Address and Nice-to-Address items, which creates noise and erodes lawyer trust. The two rates together diagnose both quality and calibration.

Note: a lower acceptance rate is not inherently a failure if lawyers are modifying (rather than rejecting) redlines to adjust aggressiveness. The modification rate and the delta between AI-proposed language and lawyer-accepted language are secondary signals for future analysis.

---

**Metric 3: DAU/MAU Ratio**

*Definition:* The ratio of daily active users to monthly active users.

*Calculation:* (Unique session UUIDs with at least one review action on a given day) divided by (unique session UUIDs with at least one review action in the trailing 30 days).

*Target:* 20% or above at MVP launch.

*Why it matters:* A high DAU/MAU ratio indicates that lawyers are using Precedent as part of their regular review workflow. A ratio below 15% suggests the platform has not yet become a daily tool, which is the intended use case.

---

## 8. Non-Goals

The following are explicitly out of scope for the MVP. Each represents a deliberate scope decision.

| Non-Goal | Rationale |
|---|---|
| Multi-party and complex transaction NDAs (M&A with standstill provisions, public company disclosure obligations) | These require specialist judgment that cannot be reliably encoded in the MVP reference database. Miscalibrated redlines on M&A agreements carry high commercial risk. |
| Document creation from scratch | Drafting requires substantially more deal context and increases the risk of legally incorrect output. Precedent reviews; it does not draft. |
| MSA and DPA review | Depth on NDAs is more valuable than shallow coverage of three contract types. The pipeline architecture supports extension; that extension belongs in v2. |
| Counterparty negotiation simulation | Requires a proprietary dataset of negotiation outcomes that does not exist at MVP. This feature is in Crosby's post-Series B roadmap but not yet in production anywhere. |
| CLM and external system integrations (Salesforce, Ironclad, email ingestion) | Upload and download only in MVP. Integrations add build complexity without demonstrating the core product value. |
| Multi-user collaboration (shared sessions, team views, inline commenting) | Single-user sessions only. Collaboration is a post-MVP roadmap item. |
| Autonomous prompt optimization | The evaluation system observes and reports. A human acts on those reports. Automatic self-modification of the system prompt before the failure mode profile is understood is a reliability risk. |
| Authentication | UUID-based sessions only. Single-device persistence is sufficient for the MVP use case. WorkOS enterprise SSO is the production authentication path and is documented in Section 11. |
| Concurrent sessions | One active session per user at a time. Unlimited concurrent sessions are a post-MVP roadmap item. |

---

## 9. Design and UX Principles

### 9.1 Color Palette

All colors are defined as CSS custom properties (or Tailwind theme extensions). Components must draw from these tokens and must not use default Tailwind palette values.

| Token | Hex | Usage |
|---|---|---|
| `--color-background` | `#F9F8F5` | Page background (warm off-white) |
| `--color-surface` | `#FFFFFF` | Cards, panels, content areas |
| `--color-text-primary` | `#1A1A2E` | Body text and headings |
| `--color-text-secondary` | `#64748B` | Captions, metadata, labels |
| `--color-brand-navy` | `#1E3A5F` | Navigation, primary buttons, active states |
| `--color-accent-gold` | `#C4A35A` | Highlights, selected states (used sparingly) |
| `--color-must` | `#991B1B` | Must-Address badges and priority indicators |
| `--color-should` | `#92400E` | Should-Address badges and priority indicators |
| `--color-nice` | `#065F46` | Nice-to-Address badges and priority indicators |
| `--color-confident` | `#1E3A5F` | Eval confidence signal: Confident |
| `--color-review` | `#92400E` | Eval confidence signal: Review Needed |
| `--color-low-confidence` | `#991B1B` | Eval confidence signal: Low Confidence |
| `--color-diff-delete` | `#991B1B` | Deleted text in diff view |
| `--color-diff-insert` | `#065F46` | Inserted text in diff view |

### 9.2 Typography

| Role | Typeface | Weights | Usage |
|---|---|---|---|
| Display | EB Garamond | 400, 600 | Product wordmark, H1 and H2 headings only |
| UI | DM Sans | 400, 500, 600 | All body text, labels, buttons, captions, form inputs |
| Data | JetBrains Mono | 400 | Clause text in diff view, structured data |

Both EB Garamond and DM Sans are available via Google Fonts. No other typefaces should be introduced.

Line heights: use 1.5 for body text and 1.2 for headings. Do not apply generous `leading-relaxed` or `leading-loose` spacing to primary content areas; lawyers read dense text and the interface should respect that.

### 9.3 Layout Principles

The review interface is designed for the information density appropriate to legal work. All elements of an active review card (diff view, rationale, action controls) must be visible without scrolling on a 1440px display. Padding on review cards should be moderate: sufficient to delineate elements, but not so generous that it forces scrolling on standard screens.

Charts in the evaluation dashboard should be clean, readable, and static. No decorative transitions, no gradient fills, no 3D effects. Data should be interpretable at a glance.

### 9.4 Patterns to Avoid

The following UI patterns are prohibited in all components:

- Thick colored left borders as decorative elements (reserved exclusively for priority tier indicators in the document view)
- Gradient backgrounds or gradient text effects anywhere in the product
- Box shadows exceeding 4px blur on any card or panel
- Default Tailwind palette values: indigo, purple, sky, or saturated green
- Unsolicited animations unrelated to user action
- Rapidly flashing skeleton loaders (use a slow, calm pulse for loading states)
- Rounded corners beyond 8px on rectangular UI elements
- Generic icon-only sidebar navigation without text labels
- Modal dialogs that blur or darken the background page

### 9.5 In-Product Writing Standards

All UI text (labels, buttons, empty states, tooltips, error messages, confirmation dialogs) must follow these rules:

- No em dashes
- Prohibited phrases: "get started," "let's go," "powered by AI," "smart," "intelligent," "instantly," "seamlessly," "unlock," "revolutionize," "game-changing," "robust," "comprehensive"
- Button labels use verbs describing the action: "Start Review," "Confirm and Continue," "Export Document" — not "Go," "Next," or "Done"
- Empty states name the context and offer a direct action: "No sessions yet. Start your first review above." Not "Nothing here yet."
- Error messages name the problem and suggest a path forward: "This file could not be parsed. Try uploading a DOCX file, or confirm that the PDF contains selectable text." Not "Something went wrong."
- Tooltips on legal concepts cite the source: "Per 18 U.S.C. § 1833(b), NDAs signed by individual employees or contractors must include a DTSA whistleblower immunity notice. Omitting it forfeits the right to seek exemplary damages and attorney's fees."

### 9.6 Legal Disclaimer

The following disclaimer appears in the footer of every screen and in the exported .docx file:

> Precedent is AI-assisted legal software. It does not constitute legal advice, and use of this platform does not create an attorney-client relationship. All outputs should be reviewed by a qualified attorney before reliance or use in any legal proceeding or commercial transaction.

---

## 10. Technical Architecture Summary

### 10.1 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, App Router, TypeScript |
| Styling | Tailwind CSS with fully custom theme tokens (no default palette values) |
| AI inference | Vercel AI SDK (`ai`, `@ai-sdk/google`) with Gemini 3 Flash |
| Background processing | Server-sent events (SSE) for Pass 3 and Pass 4 result delivery |
| Database | Supabase (PostgreSQL), UUID-keyed anonymous sessions |
| Document parsing | mammoth (DOCX), pdf-parse (PDF) |
| Document generation | jszip (ZIP manipulation), diff-match-patch (character-level diff for tracked changes and comment placement) |
| Animations | Framer Motion |
| Deployment | Vercel |

### 10.2 LLM Pipeline

Each of the four passes calls Gemini 3 Flash via the Vercel AI SDK's `generateObject` method with a Zod schema enforcing structured JSON output. Passes 1 and 2 run synchronously and block the review interface. The review interface renders immediately upon Pass 2 completion, with confidence signal loading states active. Passes 3 and 4 run server-side after Pass 2 completes, with results streamed to the client via SSE.

### 10.3 NDA Reference Database

A structured markdown file stored at `/lib/nda-reference-database.md`. Loaded at server startup and injected into every Pass 2 system prompt. Contains: market-standard positions for the twelve high-frequency NDA clause types (with must/should/nice assignments by use case and governing law), the DTSA notice language verbatim, California §16600 drafting rules, AI training carve-out language for SaaS and technology vendor contexts, binary check trigger rules, and summaries of eight key cases.

Primary sources used to compile the reference database:

| Source | URL |
|---|---|
| DTSA, 18 U.S.C. § 1833 | https://www.law.cornell.edu/uscode/text/18/1833 |
| Cal. B&P § 16600 | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=16600.&lawCode=BPC |
| Cooley GO Mutual NDA template | https://www.cooleygo.com/documents/form-non-disclosure-agreement-mutual/ |
| Cooley GO NDA guide | https://www.cooleygo.com/what-you-need-to-know-about-the-nda/ |
| Promise Legal NDA template | https://promise.legal/templates/nda |
| NVCA Life Science CDA | https://nvca.org/recommends/life-science-confidential-disclosure-agreement/ |
| Key cases | Google Scholar and Justia: Martin Marietta v. Vulcan, PepsiCo v. Redmond, Brown v. TGS Management, Silicon Image v. Analogix, Convolve v. Compaq, IBM v. Papermaster, In re D.E. Shaw, In re Brink's |

### 10.4 Data Model

**sessions**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key; generated client-side, stored in localStorage |
| created_at | Timestamp | |
| document_name | Text | Filename of uploaded contract |
| document_type | Text | Mutual NDA, One-Way NDA |
| use_case | Text | SaaS/Vendor, Employment, M&A, Strategic Partnership, IP Licensing |
| governing_law | Text | Detected or user-corrected jurisdiction |
| signatory_type | Text | Entity or Individual |
| party_perspective | Text | Disclosing or Receiving |
| mode | Text | Conservative, Standard, or Aggressive |
| status | Text | In Progress or Exported |
| export_generated_at | Timestamp | Null until export |

**clause_reviews**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK to sessions |
| clause_type | Text | e.g., ci_definition, residuals, governing_law |
| priority_tier | Text | Must, Should, or Nice |
| original_text | Text | Original clause from uploaded NDA |
| proposed_text | Text | AI-generated proposed redline |
| rationale | Text | AI-generated explanation |
| citation | Text | Source from the reference database |
| counterparty_prediction | Text | Predicted pushback and fallback position |
| decision | Text | Accepted, Modified, Rejected, or Skipped |
| accepted_text | Text | Final text if Modified; same as proposed_text if Accepted; null if Rejected |
| decided_at | Timestamp | |

**eval_runs**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK to sessions |
| overall_score | Decimal | Weighted average of dimension scores |
| legal_accuracy | Integer | 1 to 5 |
| market_calibration | Integer | 1 to 5 |
| redline_precision | Integer | 1 to 5 |
| explanation_quality | Integer | 1 to 5 |
| proportionality | Integer | 1 to 5 |
| dtsa_check | Text | PASS or FAIL |
| dtsa_note | Text | |
| ca_1660_check | Text | PASS or FAIL |
| ca_1660_note | Text | |
| trade_secret_check | Text | PASS or FAIL |
| trade_secret_note | Text | |
| ai_training_check | Text | PASS or FAIL |
| ai_training_note | Text | |
| consistency_check | Text | PASS or FAIL |
| consistency_note | Text | |
| improvement_notes | Text | Pass 4 plain-language insights |
| created_at | Timestamp | |

**eval_clause_scores**

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| eval_run_id | UUID | FK to eval_runs |
| clause_review_id | UUID | FK to clause_reviews |
| legal_accuracy | Integer | Clause-level score |
| market_calibration | Integer | Clause-level score |
| redline_precision | Integer | Clause-level score |
| explanation_quality | Integer | Clause-level score |
| proportionality | Integer | Clause-level score |
| clause_overall_score | Decimal | Weighted average for this clause |
| confidence_signal | Text | Confident, Review Needed, or Low Confidence |
| evaluator_note | Text | Brief explanatory note |

### 10.5 Synthetic NDA Documents

Three synthetic NDA documents ship with the repository for demo use and initial evaluation calibration. Each uses realistic legal language and document structure, with specific issues planted to trigger meaningful redlines and demonstrate the evaluation system.

**Document 1: Mutual SaaS Vendor NDA**

Governing law: California. Signatories: Entity.

Planted issues:
- CI definition uses "whether or not marked as confidential" language with no marking requirement and no time limit on oral disclosures
- Confidentiality term is flat at three years with no separate perpetual protection for trade secrets
- Exclusions clause omits the "without use of or reference to" qualifier on the independent development carve-out
- No AI training prohibition carve-out

**Document 2: One-Way Employment/Contractor NDA**

Governing law: Delaware. Signatories: Individual.

Planted issues:
- DTSA whistleblower immunity notice is entirely absent
- Non-solicitation period is 24 months with no general solicitation carve-out and no unsolicited applicant exception
- Compelled disclosure clause contains no carve-out for routine regulatory examinations

**Document 3: Mutual M&A Due Diligence NDA**

Governing law: New York. Signatories: Entity.

Planted issues:
- Residuals clause present with no trade secret carve-out and no intentional-memorization carve-out
- Permitted disclosures section lists representatives but does not require them to be bound by obligations "at least as restrictive" as those in the NDA
- Injunctive relief clause includes a bond requirement that has not been waived
- Governing law clause does not address inevitable disclosure doctrine exposure

---

## 11. Post-MVP Roadmap

**WorkOS enterprise authentication.** Replace UUID-based sessions with proper user accounts using WorkOS AuthKit. Enables cross-device session persistence, per-organization data isolation via Supabase Row Level Security, and SAML SSO for enterprise legal teams.

**Unlimited concurrent sessions.** Remove the one-session constraint. Lawyers reviewing multiple deals simultaneously need parallel sessions. Requires session management UI additions to the home screen.

**MSA and DPA expansion.** Extend the redlining pipeline to cover Master Service Agreements and Data Processing Agreements. The reference database architecture supports this through document-type-specific playbook sections. MSAs require substantially more extensive market standard coverage.

**Counterparty intelligence.** A predictive feature that recommends redlines calibrated to how a specific counterparty type typically negotiates, based on accumulated session data. Requires sufficient session volume to produce reliable patterns.

**Autonomous reference database updates.** A mechanism to flag market position entries in the reference database when session data shows systematic lawyer overrides of a specific clause position, and to surface a suggested revision for human approval. The production version of the improvement loop described in Section 5.8.

**Email and Slack intake.** Allow lawyers to submit contracts via email or Slack message. Returns the completed review with the .docx attachment. Mirrors the intake workflow of leading legal AI service platforms.

---

*Precedent Product Requirements Document. Version 1.0. Internal working document.*

*This document is a working product specification. The legal positions described herein are for product design purposes only. All outputs produced by the Precedent platform should be reviewed by a qualified attorney before reliance or use in any legal proceeding or commercial transaction.*
