import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Loads the NDA reference database from disk and caches it at module scope.
 * Server-only (uses fs). Injected verbatim into the Pass 2 and Pass 3 prompts.
 */
let cached: string | null = null

export function getReferenceDatabase(): string {
  if (cached === null) {
    cached = readFileSync(join(process.cwd(), 'lib/nda-reference-database.md'), 'utf-8')
  }
  return cached
}
