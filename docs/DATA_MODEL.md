# Data Model

Supabase schema, session management, and database access patterns for Precedent. Read this before writing any Supabase queries or creating migration files.

---

## Session Management (No Auth)

Precedent uses UUID-based anonymous sessions. No user accounts exist in the MVP.

**How it works:**

1. On the user's first visit, generate a UUID client-side and store it in `localStorage` under the key `precedent_session_uuid`.
2. On subsequent visits, read the UUID from `localStorage`. If not found, generate a new one.
3. All database records for this user are keyed to this UUID.
4. Sessions are accessible only from the same browser and device that created them.

**Session utility** (`lib/session.ts`):

```typescript
const SESSION_KEY = 'precedent_session_uuid'

export function getOrCreateSessionUUID(): string {
  if (typeof window === 'undefined') {
    throw new Error('getOrCreateSessionUUID called server-side')
  }
  
  const existing = localStorage.getItem(SESSION_KEY)
  if (existing) return existing
  
  const newUUID = crypto.randomUUID()
  localStorage.setItem(SESSION_KEY, newUUID)
  return newUUID
}
```

---

## Supabase Client

**`lib/supabase.ts`** — two exports:

```typescript
import { createClient } from '@supabase/supabase-js'

// Server-side client (for Route Handlers and Server Components)
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Browser client (for Client Components)
import { createBrowserClient } from '@supabase/ssr'

export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## Tables

### sessions

Stores one record per document review session.

```sql
create table sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  document_name text not null,
  document_type text not null check (document_type in ('mutual_nda', 'one_way_nda')),
  use_case text not null check (use_case in ('saas_vendor', 'employment_contractor', 'manda', 'strategic_partnership', 'ip_licensing', 'other')),
  governing_law text not null,
  signatory_type text not null check (signatory_type in ('entity', 'individual')),
  party_perspective text not null check (party_perspective in ('disclosing', 'receiving')),
  mode text not null check (mode in ('conservative', 'standard', 'aggressive')),
  status text not null default 'in_progress' check (status in ('in_progress', 'exported')),
  export_generated_at timestamptz
);
```

The `id` is the UUID generated client-side. No auto-increment primary key. The client sends this UUID when creating a session.

---

### clause_reviews

Stores one record per clause per session. Created after Pass 2 completes.

```sql
create table clause_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  clause_type text not null,
  section_number text not null,
  priority_tier text not null check (priority_tier in ('must', 'should', 'nice')),
  original_text text not null,
  proposed_text text not null,
  rationale text not null,
  citation text not null,
  counterparty_prediction text not null,
  no_action_needed boolean not null default false,
  decision text check (decision in ('accepted', 'modified', 'rejected', 'skipped')),
  accepted_text text,
  decided_at timestamptz,
  display_order int not null default 0
);

create index idx_clause_reviews_session_id on clause_reviews(session_id);
```

`accepted_text` is populated when `decision` is `'accepted'` (equals `proposed_text`) or `'modified'` (equals the lawyer's edited version). Null when `'rejected'` or `'skipped'`.

`display_order` stores the clause's position in the original document for document-order sorting. Set this from the clause's position in the Pass 1 output array.

---

### eval_runs

Stores one record per Pass 3 evaluation run per session.

```sql
create table eval_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  overall_score decimal(3,2) not null,
  legal_accuracy smallint not null check (legal_accuracy between 1 and 5),
  market_calibration smallint not null check (market_calibration between 1 and 5),
  redline_precision smallint not null check (redline_precision between 1 and 5),
  explanation_quality smallint not null check (explanation_quality between 1 and 5),
  proportionality smallint not null check (proportionality between 1 and 5),
  dtsa_check text not null check (dtsa_check in ('PASS', 'FAIL')),
  dtsa_note text not null,
  ca_1660_check text not null check (ca_1660_check in ('PASS', 'FAIL')),
  ca_1660_note text not null,
  trade_secret_check text not null check (trade_secret_check in ('PASS', 'FAIL')),
  trade_secret_note text not null,
  ai_training_check text not null check (ai_training_check in ('PASS', 'FAIL')),
  ai_training_note text not null,
  consistency_check text not null check (consistency_check in ('PASS', 'FAIL')),
  consistency_note text not null,
  improvement_notes text[] not null default '{}'
);

create unique index idx_eval_runs_session_id on eval_runs(session_id);
```

One eval run per session. The unique index enforces this.

---

### eval_clause_scores

Stores per-clause dimension scores from Pass 3. One record per clause per eval run.

```sql
create table eval_clause_scores (
  id uuid primary key default gen_random_uuid(),
  eval_run_id uuid not null references eval_runs(id) on delete cascade,
  clause_review_id uuid not null references clause_reviews(id) on delete cascade,
  legal_accuracy smallint not null check (legal_accuracy between 1 and 5),
  market_calibration smallint not null check (market_calibration between 1 and 5),
  redline_precision smallint not null check (redline_precision between 1 and 5),
  explanation_quality smallint not null check (explanation_quality between 1 and 5),
  proportionality smallint not null check (proportionality between 1 and 5),
  clause_overall_score decimal(3,2) not null,
  confidence_signal text not null check (confidence_signal in ('confident', 'review_needed', 'low_confidence')),
  evaluator_note text not null
);

create index idx_eval_clause_scores_eval_run_id on eval_clause_scores(eval_run_id);
```

---

## Common Query Patterns

**Create a session:**
```typescript
await supabaseServer
  .from('sessions')
  .insert({
    id: sessionUUID,
    document_name: fileName,
    document_type: classification.documentType,
    use_case: classification.useCase,
    governing_law: classification.governingLaw,
    signatory_type: classification.signatoryType,
    party_perspective: partyPerspective,
    mode: mode,
  })
```

**Fetch recent sessions for home screen (most recent 5):**
```typescript
const { data } = await supabaseBrowser
  .from('sessions')
  .select('id, document_name, document_type, mode, status, created_at, export_generated_at')
  .order('created_at', { ascending: false })
  .limit(5)
```

Note: without auth, the anonymous key can read all sessions in the table. In the MVP, the client filters by UUID client-side after fetching. Post-MVP with RLS enabled, this query will automatically filter by user identity.

**Fetch session with eval data for dashboard:**
```typescript
const { data } = await supabaseBrowser
  .from('sessions')
  .select(`
    *,
    eval_runs (
      *,
      eval_clause_scores (*)
    ),
    clause_reviews (*)
  `)
  .eq('id', sessionId)
  .single()
```

**Update a clause review decision:**
```typescript
await supabaseServer
  .from('clause_reviews')
  .update({
    decision: 'modified',
    accepted_text: lawyerEditedText,
    decided_at: new Date().toISOString(),
  })
  .eq('id', clauseReviewId)
```

**Fetch trailing 10 sessions of same document type for Pass 4:**
```typescript
const { data } = await supabaseServer
  .from('sessions')
  .select('id, eval_runs(*)')
  .eq('document_type', documentType)
  .eq('mode', mode)
  .order('created_at', { ascending: false })
  .limit(10)
```

---

## Synthetic NDA Seeding

The evaluation dashboard must display data before any real user sessions exist. On first load, check whether the sessions table is empty. If empty, seed the database with results from the three synthetic NDA benchmark runs.

The synthetic NDA documents are in `lib/synthetic-ndas/`. Run each through Passes 1, 2, and 3 during the seeding process. Store the results under fixed UUIDs (hardcoded constants) that will not conflict with user-generated UUIDs.

Mark seeded sessions with a `is_benchmark` boolean column (add this to the sessions table). The eval dashboard filters or labels benchmark sessions differently from real user sessions.

```sql
alter table sessions add column is_benchmark boolean not null default false;
```

---

## Rate Limiting

Enforce a per-session rate limit of 5 document reviews. Check against the sessions count for the UUID before creating a new session:

```typescript
const { count } = await supabaseServer
  .from('sessions')
  .select('id', { count: 'exact', head: true })
  .eq('id', sessionUUID)

if (count >= 5) {
  return Response.json({ error: 'Session review limit reached' }, { status: 429 })
}
```

This prevents API cost abuse on the public anonymous deployment.
