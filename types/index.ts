/**
 * Shared domain types and database row shapes for Precedent.
 *
 * String-literal unions here are the canonical TypeScript representation of the
 * values enforced by the Supabase CHECK constraints (see supabase/migrations) and
 * the Zod pipeline schemas (see schemas/). Keep all three in sync.
 */

export type DocumentType = 'mutual_nda' | 'one_way_nda'

export type UseCase =
  | 'saas_vendor'
  | 'employment_contractor'
  | 'manda'
  | 'strategic_partnership'
  | 'ip_licensing'
  | 'other'

export type SignatoryType = 'entity' | 'individual'

export type PartyPerspective = 'disclosing' | 'receiving'

export type ReviewMode = 'conservative' | 'standard' | 'aggressive'

export type SessionStatus = 'in_progress' | 'exported'

export type Priority = 'must' | 'should' | 'nice'

export type Decision = 'accepted' | 'modified' | 'rejected' | 'skipped'

export type ConfidenceSignal = 'confident' | 'review_needed' | 'low_confidence'

export type BinaryResult = 'PASS' | 'FAIL'

export type ClauseType =
  | 'parties_and_recitals'
  | 'definition_of_ci'
  | 'exclusions'
  | 'obligations'
  | 'standard_of_care'
  | 'permitted_disclosures'
  | 'compelled_disclosure'
  | 'residuals'
  | 'term_of_obligations'
  | 'term_of_agreement'
  | 'return_or_destruction'
  | 'non_solicitation'
  | 'no_license'
  | 'injunctive_relief'
  | 'limitation_of_liability'
  | 'governing_law'
  | 'entire_agreement'
  | 'amendment_and_waiver'
  | 'assignment'
  | 'counterparts'
  | 'other'

// ---------------------------------------------------------------------------
// Client-facing shapes
// ---------------------------------------------------------------------------

/** A clause review in camelCase, passed from the server page to client components. */
export interface ClauseReview {
  id: string
  clauseType: ClauseType
  sectionNumber: string
  priority: Priority
  originalText: string
  proposedText: string
  rationale: string
  citation: string
  counterpartyPrediction: string
  noActionNeeded: boolean
  decision: Decision | null
  acceptedText: string | null
  decidedAt: string | null
  displayOrder: number
}

/** Session metadata passed to the review interface. */
export interface ReviewSession {
  id: string
  documentName: string
  documentType: DocumentType
  useCase: UseCase
  governingLaw: string
  signatoryType: SignatoryType
  partyPerspective: PartyPerspective
  mode: ReviewMode
  status: SessionStatus
}

// ---------------------------------------------------------------------------
// Database row shapes
// ---------------------------------------------------------------------------

export type SessionRow = {
  id: string
  device_id: string
  created_at: string
  document_name: string
  document_type: DocumentType
  use_case: UseCase
  governing_law: string
  signatory_type: SignatoryType
  party_perspective: PartyPerspective
  mode: ReviewMode
  status: SessionStatus
  export_generated_at: string | null
  is_benchmark: boolean
}

export type ClauseReviewRow = {
  id: string
  session_id: string
  clause_type: ClauseType
  section_number: string
  priority_tier: Priority
  original_text: string
  proposed_text: string
  rationale: string
  citation: string
  counterparty_prediction: string
  no_action_needed: boolean
  decision: Decision | null
  accepted_text: string | null
  decided_at: string | null
  display_order: number
}

export type EvalRunRow = {
  id: string
  session_id: string
  created_at: string
  overall_score: number
  legal_accuracy: number
  market_calibration: number
  redline_precision: number
  explanation_quality: number
  proportionality: number
  dtsa_check: BinaryResult
  dtsa_note: string
  ca_1660_check: BinaryResult
  ca_1660_note: string
  trade_secret_check: BinaryResult
  trade_secret_note: string
  ai_training_check: BinaryResult
  ai_training_note: string
  consistency_check: BinaryResult
  consistency_note: string
  improvement_notes: string[]
  dimension_rationales: Record<string, string>
}

export type EvalClauseScoreRow = {
  id: string
  eval_run_id: string
  clause_review_id: string
  legal_accuracy: number
  market_calibration: number
  redline_precision: number
  explanation_quality: number
  proportionality: number
  clause_overall_score: number
  confidence_signal: ConfidenceSignal
  evaluator_note: string
}
