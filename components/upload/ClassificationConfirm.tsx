'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DocumentType, SignatoryType, UseCase } from '@/types'
import { Button } from '@/components/ui/Button'
import { ProcessingScreen } from '@/components/processing/ProcessingScreen'
import { getOrCreateDeviceId } from '@/lib/session'
import { readHandoff, clearHandoff, type PipelineHandoff } from '@/lib/handoff'

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'mutual_nda', label: 'Mutual NDA' },
  { value: 'one_way_nda', label: 'One-Way NDA' },
]
const USE_CASES: { value: UseCase; label: string }[] = [
  { value: 'saas_vendor', label: 'SaaS / Vendor' },
  { value: 'employment_contractor', label: 'Employment / Contractor' },
  { value: 'manda', label: 'M&A' },
  { value: 'strategic_partnership', label: 'Strategic Partnership' },
  { value: 'ip_licensing', label: 'IP Licensing' },
  { value: 'other', label: 'Other' },
]
const SIGNATORIES: { value: SignatoryType; label: string }[] = [
  { value: 'entity', label: 'Entity (company to company)' },
  { value: 'individual', label: 'Individual (a named person signs)' },
]

function Field({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-widest text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  )
}

const selectClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-navy focus:outline-none'

export function ClassificationConfirm(): React.ReactElement {
  const router = useRouter()
  const [handoff, setHandoff] = useState<PipelineHandoff | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('mutual_nda')
  const [useCase, setUseCase] = useState<UseCase>('saas_vendor')
  const [governingLaw, setGoverningLaw] = useState('')
  const [signatoryType, setSignatoryType] = useState<SignatoryType>('entity')
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [stage, setStage] = useState(2)

  useEffect(() => {
    const h = readHandoff()
    if (!h) {
      router.replace('/upload')
      return
    }
    setHandoff(h)
    setDocumentType(h.classification.documentType)
    setUseCase(h.classification.useCase)
    setGoverningLaw(h.classification.governingLaw)
    setSignatoryType(h.classification.signatoryType)
  }, [router])

  async function handleConfirm(): Promise<void> {
    if (!handoff) return
    setProcessing(true)
    setStage(2)
    const advance = setTimeout(() => setStage(3), 2500)
    try {
      const res = await fetch('/api/pipeline/redline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: handoff.sessionId,
          deviceId: getOrCreateDeviceId(),
          documentName: handoff.fileName,
          clauses: handoff.classification.clauses,
          classification: { documentType, useCase, governingLaw, signatoryType },
          partyPerspective: handoff.partyPerspective,
          mode: handoff.mode,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(
          res.status === 429
            ? 'You have reached the limit of 5 reviews for this device.'
            : (data.error ?? 'Something interrupted the analysis. Refresh the page and try again.'),
        )
        setProcessing(false)
        return
      }
      clearHandoff()
      router.push(`/review/${handoff.sessionId}`)
    } catch {
      setError('Something interrupted the analysis. Refresh the page and try again.')
      setProcessing(false)
    } finally {
      clearTimeout(advance)
    }
  }

  if (processing) return <ProcessingScreen stage={stage} />
  if (!handoff) return <div className="p-12 text-sm text-text-secondary">Loading...</div>

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl font-normal text-text-primary">Confirm classification</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Review the detected values and correct any that are wrong. These guide every redline.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field label="Document Type">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className={selectClass}
          >
            {DOC_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Use Case">
          <select
            value={useCase}
            onChange={(e) => setUseCase(e.target.value as UseCase)}
            className={selectClass}
          >
            {USE_CASES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Governing Law">
          <input
            type="text"
            value={governingLaw}
            onChange={(e) => setGoverningLaw(e.target.value)}
            className={selectClass}
          />
        </Field>
        <Field label="Signatory Type">
          <select
            value={signatoryType}
            onChange={(e) => setSignatoryType(e.target.value as SignatoryType)}
            className={selectClass}
          >
            {SIGNATORIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      <div className="mt-8">
        <Button onClick={handleConfirm} disabled={!governingLaw.trim()}>
          Confirm and Continue
        </Button>
      </div>
    </main>
  )
}
