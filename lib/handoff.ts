import type { ClassifyOutput } from '@/schemas/classify'
import type { PartyPerspective, ReviewMode } from '@/types'

/**
 * Pass 1 results handed from the upload screen to the classification screen via
 * sessionStorage, so contract content never appears in the URL.
 */
export interface PipelineHandoff {
  sessionId: string
  fileName: string
  pageCount: number | null
  partyPerspective: PartyPerspective
  mode: ReviewMode
  classification: ClassifyOutput
}

const KEY = 'precedent_handoff'

export function storeHandoff(handoff: PipelineHandoff): void {
  sessionStorage.setItem(KEY, JSON.stringify(handoff))
}

export function readHandoff(): PipelineHandoff | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PipelineHandoff
  } catch {
    return null
  }
}

export function clearHandoff(): void {
  sessionStorage.removeItem(KEY)
}
