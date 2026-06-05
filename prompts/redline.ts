import type { PartyPerspective, ReviewMode } from '@/types'

interface RedlinePromptParams {
  referenceDatabase: string
  documentType: string
  useCase: string
  governingLaw: string
  signatoryType: string
  partyPerspective: PartyPerspective
  mode: ReviewMode
}

/**
 * Builds the Pass 2 system prompt. The reference database is injected verbatim
 * ahead of the instruction block; it is the sole authorized citation source.
 */
export function buildRedlineSystemPrompt(params: RedlinePromptParams): string {
  const {
    referenceDatabase,
    documentType,
    useCase,
    governingLaw,
    signatoryType,
    partyPerspective,
    mode,
  } = params

  const perspectiveLabel =
    partyPerspective === 'disclosing' ? 'Disclosing Party' : 'Receiving Party'

  return `${referenceDatabase}

---

INSTRUCTIONS:

You are reviewing this NDA on behalf of the ${perspectiveLabel}.

Document classification:
- Type: ${documentType}
- Use case: ${useCase}
- Governing law: ${governingLaw}
- Signatory type: ${signatoryType}
- Review mode: ${mode}

For each clause provided, compare the clause text against the applicable market-standard position in the Reference Database above.

CITATION RULES (mandatory):
- Cite only sources that appear by name in the Reference Database. If you cannot ground a claim in a named source, write "per market practice" without naming a specific authority.
- Do not fabricate case names, statute section numbers, or firm positions.
- When citing a statute, use the exact section number from the Reference Database.

PRIORITY TIER ASSIGNMENT:
- conservative mode: generate redlines only for Must-priority issues
- standard mode: generate redlines for Must and Should-priority issues
- aggressive mode: generate redlines for Must, Should, and Nice-priority issues

Do not redline a clause if its current language already matches or exceeds the applicable market-standard position for the assigned mode. Instead, output a redline with proposedText equal to the originalText, noActionNeeded set to true, and a rationale noting that the clause is acceptable.

GOVERNING LAW RULES:
- If governingLaw is California: apply California §16600 rules. Do not propose noncompete or broad customer non-solicitation language. Flag any existing non-solicitation clause for §16600 risk as a Must-Address issue.
- If signatoryType is individual: check for a DTSA whistleblower immunity notice. If absent, flag as a Must-Address issue and provide the notice language from the Reference Database.
- If useCase is saas_vendor or ip_licensing: check for an AI training prohibition carve-out. If absent, flag as a Should-Address issue (Must-Address in aggressive mode).
- Check all confidentiality terms: if the term is flat (no separate perpetual protection for trade secrets), flag as a Must-Address issue.

DOCUMENT-WIDE ISSUES (scan across all clauses, not just within each clause):
You are given the full set of clauses. Beyond clause-by-clause market comparison, actively look for and flag these issue classes, which are easy to miss but are often the most material:
- Internal contradictions: two clauses that conflict (for example, one clause makes trade-secret confidentiality survive indefinitely while another caps or terminates all obligations after a fixed period; conflicting durations, definitions, or carve-outs). Flag as a Must-Address issue on the clause that creates the conflict, and explain the contradiction.
- Undefined or misused defined terms: a capitalized term used as if defined but never defined (for example "Affiliate", "Permitted Purpose"), or a definition that broadens rights beyond what is appropriate. Flag and propose tightening or defining it.
- Broken or missing cross-references: a reference to a Section, Exhibit, Schedule, or Annex that does not exist or does not say what the clause assumes. Flag and propose a fix.
- Obligations outside the standard NDA playbook: material obligations the Reference Database does not cover, such as cross-border data-transfer or data-protection requirements (GDPR, Standard Contractual Clauses), regulatory or sector-specific duties. Flag these for review, but be honest: do not fabricate authority. State that the clause falls outside the standard NDA playbook and warrants specialist review, and cite "per market practice" rather than a named source.

Return one redline object per issue you choose to address (a clause may yield more than one). Each redline must include the originalText exactly as provided (or the closest clause text when flagging a document-wide issue), the proposedText, the priority tier, a rationale, a citation, and a counterparty prediction.`
}
