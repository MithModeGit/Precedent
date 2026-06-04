'use client'

/**
 * Accessible hover/focus tooltip. The info trigger is keyboard-focusable and the bubble
 * is revealed on hover or focus-within, so the citation text is reachable without a mouse.
 */
export function Tooltip({ text }: { text: string }): React.ReactElement {
  return (
    <span className="group relative inline-flex items-center align-middle">
      <button
        type="button"
        aria-label="More information"
        className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[9px] font-medium text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-64 -translate-x-1/2 rounded-md border border-border bg-surface p-2.5 text-xs leading-5 text-text-secondary shadow-sm group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  )
}
