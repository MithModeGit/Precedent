# Architecture

Project structure, tech stack, and setup instructions for the Precedent platform. Read this after `CLAUDE.md` and before any domain-specific spec.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | Server and Client Components, Route Handlers |
| Styling | Tailwind CSS with fully custom theme | No default Tailwind palette values; see `docs/DESIGN_BRIEF.md` |
| AI Inference | Vercel AI SDK (`ai`, `@ai-sdk/google`) | `generateObject` with Zod schemas; Gemini 3 Flash for all passes |
| Background Processing | Server-sent events via Route Handler streaming | Pass 3 and Pass 4 results delivered after review interface loads |
| Database | Supabase (PostgreSQL) | UUID-keyed anonymous sessions; no auth in MVP |
| Document Parsing | `mammoth` (DOCX), `pdf-parse` (PDF) | See `docs/DOCUMENT_PROCESSING.md` |
| Document Generation | `jszip` + `diff-match-patch` | .docx with OOXML track changes and comments |
| Animations | Framer Motion | Subtle transitions only; see `docs/DESIGN_BRIEF.md` |
| Charts | Recharts | Eval dashboard trend charts |
| Deployment | Vercel | `main` deploys to production; every PR gets a preview URL |

---

## Directory Structure

```
precedent/
├── app/
│   ├── api/
│   │   ├── pipeline/
│   │   │   ├── classify/route.ts       # Pass 1: document parsing and classification
│   │   │   ├── redline/route.ts        # Pass 2: redline generation
│   │   │   ├── evaluate/route.ts       # Pass 3: eval scoring (SSE streaming)
│   │   │   └── improve/route.ts        # Pass 4: improvement note generation
│   │   └── export/route.ts             # .docx generation and download
│   ├── review/
│   │   └── [sessionId]/
│   │       └── page.tsx                # Review interface
│   ├── dashboard/
│   │   └── page.tsx                    # Evaluation dashboard
│   ├── layout.tsx                      # Root layout (fonts, global styles)
│   └── page.tsx                        # Home screen
├── components/
│   ├── review/
│   │   ├── ReviewInterface.tsx         # Two-panel layout container
│   │   ├── DocumentPanel.tsx           # Left panel: contract text with clause highlights
│   │   ├── RedlineCard.tsx             # Right panel: active clause review card
│   │   ├── CriticalIssuesPanel.tsx     # Must-Address summary banner
│   │   ├── RunningLog.tsx              # Collapsible decision history panel
│   │   └── QualityReport.tsx           # Eval results tab within review interface
│   ├── dashboard/
│   │   ├── EvalDashboard.tsx           # Tab container (Trend Overview / Session Index)
│   │   ├── TrendOverview.tsx           # Aggregate performance charts
│   │   ├── SessionIndex.tsx            # Searchable session table
│   │   └── SessionDetail.tsx           # Per-session drill-down view
│   ├── upload/
│   │   ├── UploadScreen.tsx            # File upload, party perspective, mode selection
│   │   └── ClassificationConfirm.tsx   # AI classification review and correction
│   ├── home/
│   │   └── HomeScreen.tsx              # Recent sessions, stats, new review CTA
│   ├── processing/
│   │   └── ProcessingScreen.tsx        # Staged progress indicators during pipeline
│   └── ui/
│       └── (shared primitive components)
├── lib/
│   ├── env.ts                          # Type-safe environment variable validation
│   ├── supabase.ts                     # Supabase client (server and browser instances)
│   ├── session.ts                      # UUID session management with localStorage
│   ├── nda-reference-database.md       # Legal knowledge base injected into Pass 2 prompts
│   └── synthetic-ndas/
│       ├── nda-1-saas.md               # Synthetic Mutual SaaS NDA with planted issues
│       ├── nda-2-employment.md         # Synthetic Employment NDA with planted issues
│       └── nda-3-manda.md              # Synthetic M&A NDA with planted issues
├── prompts/
│   ├── classify.ts                     # Pass 1 system prompt
│   ├── redline.ts                      # Pass 2 system prompt (injects reference database)
│   ├── evaluate.ts                     # Pass 3 eval prompt (full rubric)
│   └── improve.ts                      # Pass 4 improvement note prompt
├── schemas/
│   ├── classify.ts                     # Zod schema for Pass 1 output
│   ├── redline.ts                      # Zod schema for Pass 2 output
│   ├── evaluate.ts                     # Zod schema for Pass 3 output
│   └── improve.ts                      # Zod schema for Pass 4 output
├── types/
│   └── index.ts                        # Shared TypeScript types and enums
├── docs/
│   ├── PRD.md
│   ├── DESIGN_BRIEF.md
│   ├── ARCHITECTURE.md                 # This file
│   ├── AI_PIPELINE.md
│   ├── DATA_MODEL.md
│   ├── FRONTEND_SPEC.md
│   └── DOCUMENT_PROCESSING.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── CLAUDE.md
├── README.md
├── .env.example
├── .env.local                          # Not committed; contains actual secrets
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Environment Variables

Document all required variables in `.env.example` with placeholder values. Never commit `.env.local`.

| Variable | Description | Where to get it |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key for all four pipeline passes | Google AI Studio (aistudio.google.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key | Supabase project Settings > API |

Set these in three places:

1. `.env.local` for local development
2. Vercel dashboard (Project > Settings > Environment Variables) for production
3. GitHub repository Secrets (Settings > Secrets and variables > Actions) for CI builds

---

## Package.json Scripts

These scripts must exist in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "type-check": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

The CI workflow runs `type-check`, `lint`, and `build` on every PR. All three must pass before a PR can be merged.

---

## Running Locally

```bash
git clone https://github.com/MithModeGit/Precedent.git
cd Precedent
npm install
cp .env.example .env.local
# Open .env.local and fill in actual values for all three variables
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Deployment

The repository is connected to Vercel. Vercel handles deployment automatically:

- Every PR receives a unique preview URL
- Merging to `develop` deploys to the develop preview environment
- Merging to `main` deploys to production

No manual deployment steps are required.

---

## Branch Protection

The following rules should be set in GitHub repository Settings > Branches. These cannot be configured via code.

For `main`:
- Require a pull request before merging
- Require status checks to pass (select the CI workflow: "Type Check, Lint, and Build")
- Require branches to be up to date before merging
- Do not allow direct pushes

For `develop`:
- Same rules; no required approving reviews since Claude Code handles the Gemini review process

---

## TypeScript Configuration

`tsconfig.json` must have strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

---

## Tailwind Configuration

The `tailwind.config.ts` must extend the theme with the color tokens and font families from `docs/DESIGN_BRIEF.md`. It must not use any default Tailwind palette colors in application code. See `docs/DESIGN_BRIEF.md` for the exact configuration values.
