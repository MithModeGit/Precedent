# Precedent

AI-powered NDA review for legal professionals. Precedent generates market-calibrated redlines, scores them against a legal quality rubric, and tracks whether the AI is improving over time.

---

## What It Does

Precedent runs a four-pass inference pipeline on every uploaded NDA:

1. **Classify**: extracts and labels every clause by type, identifies governing law, document type, and signatory context
2. **Redline**: generates clause-by-clause redlines grounded in a curated reference database of market-standard NDA positions, case law summaries, and statutory requirements
3. **Evaluate**: scores every redline on five quality dimensions and five binary compliance checks, then delivers confidence signals to the review interface via server-sent events
4. **Improve**: compares this session's scores with recent session history to surface patterns worth attention

Lawyers review the output through a priority-ordered interface: Must-Address issues first, then Should-Address, then Nice-to-Address. They accept, modify, or reject each redline, then export a Word document with tracked changes and rationale annotations as comment bubbles.

The evaluation dashboard shows quality score trends over time, binary check pass rates, and per-clause performance breakdowns across all sessions.

---

## What Makes It Different

Most legal AI tools produce redlines without any system for measuring whether those redlines are accurate, well-calibrated, or improving. Precedent treats quality measurement as a first-class product surface:

- DTSA whistleblower notice is enforced as a hard binary check for individual signatories (omitting it forfeits exemplary damages and attorney's fees under 18 U.S.C. § 1833(b))
- California §16600 detection fires automatically when a non-solicitation clause appears alongside California governing law
- Trade secret term bifurcation is checked on every document
- Confidence indicators are grounded in specific named legal authorities, not vague quality signals
- The evaluation dashboard tracks whether accuracy and calibration are improving across sessions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, TypeScript, App Router |
| AI | Vercel AI SDK with Gemini 3 Flash |
| Background Processing | Server-sent events (Pass 3 and Pass 4 results delivered after review interface loads) |
| Database | Supabase (PostgreSQL, anonymous UUID sessions) |
| Document Parsing | mammoth (DOCX), pdf-parse (PDF) |
| Document Generation | jszip, diff-match-patch (OOXML track changes and Word comments) |
| Charts | Recharts |
| Deployment | Vercel |

---

## Setup

**Requirements:** Node.js 20 or higher, a Google AI Studio API key, a Supabase project.

```bash
git clone https://github.com/MithModeGit/Precedent.git
cd Precedent
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get your Gemini API key at [aistudio.google.com](https://aistudio.google.com). Create a free Supabase project at [supabase.com](https://supabase.com).

Run the database migrations in `supabase/migrations/` against your Supabase project, then:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Project Structure

```
precedent/
├── app/api/pipeline/         # Four-pass LLM inference routes
├── app/api/export/           # .docx generation route
├── app/review/[sessionId]/   # Review interface
├── app/dashboard/            # Evaluation dashboard
├── components/               # React components
├── lib/
│   ├── nda-reference-database.md   # Legal knowledge base (injected into prompts)
│   └── synthetic-ndas/             # Three benchmark NDAs for demo and eval seeding
├── prompts/                  # LLM system prompts for each pass
├── schemas/                  # Zod schemas for structured AI output
├── docs/                     # Full spec documentation
└── .github/workflows/        # CI (type check, lint, build on every PR)
```

---

## Documentation

Full specifications are in `/docs`:

| Document | Contents |
|---|---|
| `docs/PRD.md` | Product requirements: features, user flows, success metrics |
| `docs/ARCHITECTURE.md` | Tech stack, project structure, environment variables |
| `docs/AI_PIPELINE.md` | Four-pass LLM pipeline with Zod schemas and prompt structure |
| `docs/DATA_MODEL.md` | Supabase schema and query patterns |
| `docs/FRONTEND_SPEC.md` | Component architecture and UI behavior |
| `docs/DOCUMENT_PROCESSING.md` | File parsing and .docx export with OOXML |
| `docs/DESIGN_BRIEF.md` | Color system, typography, component patterns |

---

## License

MIT
