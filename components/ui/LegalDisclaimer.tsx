/** Required legal disclaimer shown in the footer of every screen (PRD §9.6). */
export function LegalDisclaimer(): React.ReactElement {
  return (
    <footer className="border-t border-border-subtle bg-background px-6 py-4">
      <p className="mx-auto max-w-4xl text-xs leading-5 text-text-muted">
        Precedent is AI-assisted legal software. It does not constitute legal advice, and
        use of this platform does not create an attorney-client relationship. All outputs
        should be reviewed by a qualified attorney before reliance or use in any legal
        proceeding or commercial transaction.
      </p>
    </footer>
  )
}
