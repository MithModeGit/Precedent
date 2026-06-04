import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase'
import { getStoredEval } from '@/lib/eval-fetch'
import { SessionDetail, type DetailClause } from '@/components/dashboard/SessionDetail'

export const dynamic = 'force-dynamic'

const DOC_TYPE_LABEL: Record<string, string> = {
  mutual_nda: 'Mutual NDA',
  one_way_nda: 'One-Way NDA',
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}): Promise<React.ReactElement> {
  const { sessionId } = await params
  const supabase = getSupabaseServer()

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (!session) notFound()

  const { data: reviews } = await supabase
    .from('clause_reviews')
    .select('*')
    .eq('session_id', sessionId)
    .order('display_order', { ascending: true })

  const evalRun = await getStoredEval(sessionId)
  const scoreByKey = new Map(
    (evalRun?.clauseScores ?? []).map((s) => [`${s.clauseType}|${s.sectionNumber}`, s]),
  )

  const clauses: DetailClause[] = (reviews ?? []).map((r) => {
    const score = scoreByKey.get(`${r.clause_type}|${r.section_number}`)
    return {
      clauseType: r.clause_type,
      sectionNumber: r.section_number,
      priority: r.priority_tier,
      decision: r.decision,
      originalText: r.original_text,
      proposedText: r.proposed_text,
      acceptedText: r.accepted_text,
      dimensions: score?.dimensions ?? null,
      clauseOverallScore: score?.clauseOverallScore ?? null,
      evaluatorNote: score?.evaluatorNote ?? null,
    }
  })

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/dashboard" className="mb-6 inline-block text-sm font-medium text-navy">
        Back to dashboard
      </Link>
      <SessionDetail
        data={{
          documentName: session.document_name,
          documentType: DOC_TYPE_LABEL[session.document_type] ?? session.document_type,
          governingLaw: session.governing_law,
          mode: session.mode,
          partyPerspective: session.party_perspective,
          createdAt: session.created_at,
          evalRun,
          clauses,
        }}
      />
    </main>
  )
}
