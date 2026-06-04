# CLAUDE.md

Operating instructions for Claude Code on the Precedent project. Read this file at the start of every session before touching any code.

---

## What This Project Is

Precedent is an AI-powered NDA review platform. The full product specification is in `docs/PRD.md`. Before implementing any feature, read the PRD and the relevant spec document from the list below.

---

## Spec Reading Order

Read documents in this sequence before starting work in any domain:

1. This file — always first
2. `docs/PRD.md` — what is being built and why
3. `docs/ARCHITECTURE.md` — tech stack and project structure
4. The domain-specific spec for the feature at hand:

| Domain | Spec File |
|---|---|
| LLM inference, prompts, eval scoring | `docs/AI_PIPELINE.md` |
| Database schema, Supabase queries | `docs/DATA_MODEL.md` |
| React components, routing, state | `docs/FRONTEND_SPEC.md` |
| File parsing, .docx export, OOXML | `docs/DOCUMENT_PROCESSING.md` |
| Colors, typography, UI copy | `docs/DESIGN_BRIEF.md` |

---

## Git Workflow

### Branch Strategy

Three persistent branches:

- `main`: production; deployed to Vercel automatically on merge
- `develop`: integration; deployed to Vercel preview on merge
- `feature/*`, `fix/*`, `docs/*`: work branches; always cut from `develop`

No direct commits to `main` or `develop`. Every change goes through a PR.

### Creating a Work Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/short-description
```

Branch naming conventions:

| Type | Prefix | Example |
|---|---|---|
| New feature | `feature/` | `feature/review-interface` |
| Bug fix | `fix/` | `fix/dtsa-false-positive-entity-nda` |
| Documentation | `docs/` | `docs/update-pipeline-spec` |
| Refactor | `refactor/` | `refactor/eval-scoring-logic` |

Use kebab-case. Keep names descriptive but under 40 characters.

### Commit Message Format

Use Conventional Commits:

```
type(scope): description in present tense, lowercase, no period
```

Valid types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `test`

Valid scopes: `pipeline`, `eval`, `review`, `export`, `dashboard`, `upload`, `db`, `ui`, `ci`, `config`

Good examples:
```
feat(pipeline): implement Pass 2 redline generation with reference database injection
fix(eval): correct DTSA binary check false positive on entity-only signatories
feat(review): add three-action accept/modify/reject controls with auto-advance
feat(export): generate .docx with tracked changes and Word comment annotations
```

---

## PR Creation and Merge Process

### Before Opening a PR

Run these three commands and confirm all pass before creating the PR:

```bash
npm run type-check
npm run lint
npm run build
```

Do not open a PR if any of these fail.

### PR Description Format

Every PR description must include these four sections:

```markdown
## What Was Built
[One to three sentences describing the change]

## Spec Reference
[Which spec document and section this implements, e.g., "docs/AI_PIPELINE.md — Pass 2: Redline Generation"]

## Decisions
[Any implementation decisions that deviate from the spec and the reason why. Write "None" if the implementation follows the spec exactly.]

## Verification
[How the change was verified: manual test steps taken, or automated tests added]
```

### Merge Targets

- Feature, fix, refactor branches: target `develop`
- `develop`: targets `main` for production releases

---

## Gemini Code Assist Review Process

After creating a PR, Gemini Code Assist will post an automated review with inline comments. This is the required process for every comment:

**Read every comment.** No comment is skipped regardless of how minor it appears.

**If you agree with the comment:**
1. Implement the fix on the PR branch
2. Commit with an appropriate message
3. Reply to the comment inline explaining what was changed and why
4. Mark the conversation as resolved

**If you disagree with the comment:**
1. Reply to the comment inline with a specific explanation of why the change is not being made. Cite the relevant spec document or technical reasoning.
2. Be direct and objective. Disagreement is fine; silence is not.
3. Do not mark the conversation as resolved until a response has been posted.

**Every comment requires a response.** There are no silent skips, no ignores, and no unaddressed conversations.

Once every Gemini comment has either been resolved with a fix or responded to with a reasoned disagreement, and all CI checks are green, merge the PR.

### Merging

Feature branches into `develop`:
```bash
gh pr merge <PR-NUMBER> --squash --delete-branch
```

`develop` into `main`:
```bash
gh pr merge <PR-NUMBER> --squash
```

---

## Code Quality Standards

### TypeScript

- Strict mode is on. No `any` types.
- No `@ts-ignore` unless accompanied by a comment explaining why it is unavoidable and what the correct fix would be.
- All function parameters and return types are explicitly annotated.

### Imports

- No unused imports.
- Group order: Node built-ins, then external packages, then internal modules.
- No circular imports.

### Environment Variables

- Read from `process.env` only in server-side code: Route Handlers and Server Components.
- Never access `process.env` inside Client Components.
- All environment variable access goes through `lib/env.ts`, which validates presence at startup.
- API keys live in `.env.local` locally and in Vercel environment variables in production.
- `.env.local` is in `.gitignore`. Never commit it.

### Error Handling

- Every `async` function that calls an external service (Supabase, Gemini API) wraps the call in a `try/catch`.
- Errors are logged server-side and returned to the client as structured error responses, not raw exceptions.
- No unhandled promise rejections.

### Console Statements

- No `console.log` in committed code.
- Server-side diagnostic output uses a simple logger utility.

---

## Design and UI Standards

### Colors

Use only the CSS custom property tokens defined in `docs/DESIGN_BRIEF.md`. No hardcoded hex values outside the token definition file. No default Tailwind palette colors (no `indigo-*`, `purple-*`, `sky-*`, or bright `green-*`).

### Typography

Use only EB Garamond and DM Sans. No Inter. No Roboto. No system font stacks as primary fonts.

### Component Patterns

Follow the approved patterns in `docs/DESIGN_BRIEF.md` Section 5. The anti-pattern list in that section is enforced.

### UI Copy

- No em dashes anywhere in user-visible text. Use a colon, semicolon, comma, or parentheses instead.
- No phrases from the prohibited list in `docs/DESIGN_BRIEF.md` Section 4.
- Button labels are verbs describing the action: "Start Review", "Confirm and Continue", "Export Document".
- Error messages name the problem and suggest a resolution.
- Empty states describe the context and offer a direct action.

---

## File and Folder Naming

| Type | Convention | Example |
|---|---|---|
| React components | PascalCase | `ReviewCard.tsx` |
| Utility functions, hooks | camelCase | `useSessionStore.ts` |
| Route handlers | Next.js convention | `app/api/pipeline/classify/route.ts` |
| Zod schemas | camelCase in `schemas/` | `schemas/redline.ts` |
| Prompt strings | camelCase in `prompts/` | `prompts/redline.ts` |
| Spec documents | UPPER_SNAKE or kebab in `docs/` | `docs/AI_PIPELINE.md` |

---

## What Not To Do

- Push directly to `main` or `develop`
- Open a PR without running `type-check`, `lint`, and `build` first
- Merge a PR before Gemini Code Assist has reviewed it
- Leave any Gemini comment without a response
- Use `any` TypeScript types
- Use hardcoded color values outside the token definition
- Import server-only modules into Client Components
- Commit `.env.local` or any file containing actual secrets
- Write UI copy with em dashes or prohibited phrases
- Add new third-party packages without confirming they are necessary and not already covered by an existing dependency
