-- Precedent initial schema.
-- Run this in the Supabase SQL editor (or via the Supabase CLI) before first use.
-- See docs/DATA_MODEL.md. Note the device_id deviation from the literal spec:
-- each review is its own sessions row (id = gen_random_uuid()); device_id keys all
-- of a device's reviews to the localStorage UUID so recent-sessions, the per-device
-- rate limit, and the one-active-session constraint can function.

-- sessions: one row per document review session.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null,
  created_at timestamptz not null default now(),
  document_name text not null,
  document_type text not null check (document_type in ('mutual_nda', 'one_way_nda')),
  use_case text not null check (use_case in ('saas_vendor', 'employment_contractor', 'manda', 'strategic_partnership', 'ip_licensing', 'other')),
  governing_law text not null,
  signatory_type text not null check (signatory_type in ('entity', 'individual')),
  party_perspective text not null check (party_perspective in ('disclosing', 'receiving')),
  mode text not null check (mode in ('conservative', 'standard', 'aggressive')),
  status text not null default 'in_progress' check (status in ('in_progress', 'exported')),
  export_generated_at timestamptz,
  is_benchmark boolean not null default false
);

create index if not exists idx_sessions_device_id on sessions(device_id);
create index if not exists idx_sessions_created_at on sessions(created_at desc);

-- clause_reviews: one row per clause per session, created after Pass 2.
create table if not exists clause_reviews (
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

create index if not exists idx_clause_reviews_session_id on clause_reviews(session_id);

-- eval_runs: one Pass 3 evaluation run per session (enforced unique).
create table if not exists eval_runs (
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

create unique index if not exists idx_eval_runs_session_id on eval_runs(session_id);

-- eval_clause_scores: per-clause dimension scores from Pass 3.
create table if not exists eval_clause_scores (
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

create index if not exists idx_eval_clause_scores_eval_run_id on eval_clause_scores(eval_run_id);
