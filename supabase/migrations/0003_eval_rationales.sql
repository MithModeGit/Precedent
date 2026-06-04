-- Pass 3 now produces an evidence-backed rationale for each session-level dimension score.
-- Stored as a JSON object keyed by dimension (legalAccuracy, marketCalibration, ...).
alter table eval_runs
  add column if not exists dimension_rationales jsonb not null default '{}'::jsonb;
