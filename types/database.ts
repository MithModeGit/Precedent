import type {
  SessionRow,
  ClauseReviewRow,
  EvalRunRow,
  EvalClauseScoreRow,
} from '@/types'

/** Row type with the given keys made optional, for insert payloads (defaults/generated columns). */
type Insert<T, OptionalKeys extends keyof T> = Omit<T, OptionalKeys> &
  Partial<Pick<T, OptionalKeys>>

/**
 * Typed Supabase schema. Passed to createClient so table inserts/selects are
 * type-checked. Mirrors supabase/migrations/0001_init.sql.
 */
export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: SessionRow
        Insert: Insert<
          SessionRow,
          'id' | 'created_at' | 'status' | 'export_generated_at' | 'is_benchmark'
        >
        Update: Partial<SessionRow>
        Relationships: []
      }
      clause_reviews: {
        Row: ClauseReviewRow
        Insert: Insert<
          ClauseReviewRow,
          | 'id'
          | 'no_action_needed'
          | 'decision'
          | 'accepted_text'
          | 'decided_at'
          | 'display_order'
        >
        Update: Partial<ClauseReviewRow>
        Relationships: []
      }
      eval_runs: {
        Row: EvalRunRow
        Insert: Insert<EvalRunRow, 'id' | 'created_at' | 'improvement_notes'>
        Update: Partial<EvalRunRow>
        Relationships: []
      }
      eval_clause_scores: {
        Row: EvalClauseScoreRow
        Insert: Insert<EvalClauseScoreRow, 'id'>
        Update: Partial<EvalClauseScoreRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
