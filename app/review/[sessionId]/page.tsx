import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase'
import { ReviewInterface } from '@/components/review/ReviewInterface'
import type { ClauseReview, ReviewSession } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}): Promise<React.ReactElement> {
  const { sessionId } = await params
  const supabase = getSupabaseServer()

  const { data: sessionRow } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!sessionRow) notFound()

  const { data: clauseRows } = await supabase
    .from('clause_reviews')
    .select('*')
    .eq('session_id', sessionId)
    .order('display_order', { ascending: true })

  const session: ReviewSession = {
    id: sessionRow.id,
    documentName: sessionRow.document_name,
    documentType: sessionRow.document_type,
    useCase: sessionRow.use_case,
    governingLaw: sessionRow.governing_law,
    signatoryType: sessionRow.signatory_type,
    partyPerspective: sessionRow.party_perspective,
    mode: sessionRow.mode,
    status: sessionRow.status,
  }

  const clauses: ClauseReview[] = (clauseRows ?? []).map((row) => ({
    id: row.id,
    clauseType: row.clause_type,
    sectionNumber: row.section_number,
    priority: row.priority_tier,
    originalText: row.original_text,
    proposedText: row.proposed_text,
    rationale: row.rationale,
    citation: row.citation,
    counterpartyPrediction: row.counterparty_prediction,
    noActionNeeded: row.no_action_needed,
    decision: row.decision,
    acceptedText: row.accepted_text,
    displayOrder: row.display_order,
  }))

  return (
    <>
      <div className="p-8 text-sm text-text-secondary lg:hidden">
        Precedent is optimized for desktop use. For the best experience, open this page on a wider
        screen.
      </div>
      <div className="hidden lg:block">
        <ReviewInterface session={session} clauses={clauses} />
      </div>
    </>
  )
}
