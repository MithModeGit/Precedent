-- The evaluator now sees the full source document (so it can measure coverage of issues
-- the redlines missed, not just the quality of the redlines made), and stores a recall
-- score plus the list of missed material issues.

-- Full document text the redlines were generated from, used as evaluator context.
alter table sessions
  add column if not exists document_text text not null default '';

-- Issue coverage (recall): 1-5 score, rationale, and the material issues that were missed.
alter table eval_runs
  add column if not exists issue_coverage smallint not null default 5 check (issue_coverage between 1 and 5),
  add column if not exists issue_coverage_rationale text not null default '',
  add column if not exists missed_issues text[] not null default '{}';
