'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PartyPerspective, ReviewMode } from '@/types'
import { Button } from '@/components/ui/Button'
import { ProcessingScreen } from '@/components/processing/ProcessingScreen'
import { storeHandoff } from '@/lib/handoff'
import { getSupabaseBrowser } from '@/lib/supabase'

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Upload ceiling: well above any real NDA, bounds function memory/time and cost. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const PERSPECTIVES: { value: PartyPerspective; label: string; description: string }[] = [
  {
    value: 'disclosing',
    label: 'Disclosing Party',
    description: 'Protect the party sharing information: stronger definitions and remedies.',
  },
  {
    value: 'receiving',
    label: 'Receiving Party',
    description: 'Limit the obligations of the party receiving information.',
  },
]

const MODES: { value: ReviewMode; label: string; description: string }[] = [
  {
    value: 'conservative',
    label: 'Conservative',
    description: 'Must-Address positions only: material legal risk and hard compliance.',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Must-Address and Should-Address redlines from market-standard positions.',
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    description: 'All redlines including Nice-to-Address, pursuing the full anchor position.',
  },
]

export function UploadScreen(): React.ReactElement {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [perspective, setPerspective] = useState<PartyPerspective | null>(null)
  const [mode, setMode] = useState<ReviewMode>('standard')
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [stage, setStage] = useState(0)

  function selectFile(f: File | undefined): void {
    if (!f) return
    const lower = f.name.toLowerCase()
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setError('This file type is not supported. Upload a DOCX or PDF file.')
      return
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError('This file is larger than 10MB. Upload a smaller DOCX or PDF.')
      return
    }
    setError(null)
    setFile(f)
  }

  async function handleStart(): Promise<void> {
    if (!file || !perspective) return
    setProcessing(true)
    setStage(0)
    try {
      // Upload the original directly to Storage (browser -> Storage), bypassing the
      // serverless request body limit so documents of any size are supported.
      const sessionId = crypto.randomUUID()
      const extension = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx'
      const contentType = extension === 'pdf' ? 'application/pdf' : DOCX_CONTENT_TYPE
      const { error: uploadError } = await getSupabaseBrowser()
        .storage.from('uploads')
        .upload(`${sessionId}/original.${extension}`, file, { contentType, upsert: true })
      if (uploadError) {
        setError('The file could not be uploaded. Check your connection and try again.')
        setProcessing(false)
        return
      }

      setStage(1)
      const res = await fetch('/api/pipeline/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, fileName: file.name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something interrupted the analysis. Refresh the page and try again.')
        setProcessing(false)
        return
      }
      storeHandoff({
        sessionId: data.sessionId,
        fileName: data.fileName,
        pageCount: data.pageCount,
        partyPerspective: perspective,
        mode,
        classification: data.classification,
      })
      router.push('/classify')
    } catch {
      setError('Something interrupted the analysis. Refresh the page and try again.')
      setProcessing(false)
    }
  }

  if (processing) return <ProcessingScreen stage={stage} />

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl font-normal text-text-primary">Start a review</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Upload an NDA, choose the party you represent, and select a review mode.
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <p className="mb-2 text-sm font-semibold text-text-primary">Document</p>
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              selectFile(e.dataTransfer.files[0])
            }}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            className="cursor-pointer rounded-md border border-dashed border-border bg-surface p-8 text-center"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0])}
            />
            {file ? (
              <p className="text-sm text-text-primary">{file.name}</p>
            ) : (
              <p className="text-sm text-text-secondary">
                Drop a DOCX or PDF here, or click to choose a file.
              </p>
            )}
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-semibold text-text-primary">Party perspective</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PERSPECTIVES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPerspective(p.value)}
                className={`rounded-md border p-4 text-left ${
                  perspective === p.value ? 'border-navy bg-surface' : 'border-border bg-surface'
                }`}
              >
                <p className="text-sm font-medium text-text-primary">{p.label}</p>
                <p className="mt-1 text-xs text-text-secondary">{p.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-semibold text-text-primary">Review mode</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`rounded-md border p-4 text-left ${
                  mode === m.value ? 'border-navy bg-surface' : 'border-border bg-surface'
                }`}
              >
                <p className="text-sm font-medium text-text-primary">{m.label}</p>
                <p className="mt-1 text-xs text-text-secondary">{m.description}</p>
              </button>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-error">{error}</p>}

        <Button onClick={handleStart} disabled={!file || !perspective}>
          Start Review
        </Button>
      </div>
    </main>
  )
}
