-- Distinguishes benchmark documents by kind so the dashboard can label the deliberately
-- adversarial stress-test NDA separately from the standard ones. The lower score on the
-- adversarial document is expected and demonstrates that the evaluation discriminates.
alter table sessions
  add column if not exists benchmark_kind text not null default 'standard'
  check (benchmark_kind in ('standard', 'adversarial'));
