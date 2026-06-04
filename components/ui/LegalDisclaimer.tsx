import { LEGAL_DISCLAIMER } from '@/lib/legal'

/** Required legal disclaimer shown in the footer of every screen (PRD §9.6). */
export function LegalDisclaimer(): React.ReactElement {
  return (
    <footer className="border-t border-border-subtle bg-background px-6 py-4">
      <p className="mx-auto max-w-4xl text-xs leading-5 text-text-muted">{LEGAL_DISCLAIMER}</p>
    </footer>
  )
}
