import type { Priority } from '@/types'

// Dedicated *-border tokens are used instead of an opacity modifier: Tailwind v3
// opacity modifiers produce invalid CSS against colors defined as hex var() values.
const PRIORITY_CLASSES: Record<Priority, string> = {
  must: 'bg-must-bg text-must border-must-border',
  should: 'bg-should-bg text-should border-should-border',
  nice: 'bg-nice-bg text-nice border-nice-border',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  must: 'Must-Address',
  should: 'Should-Address',
  nice: 'Nice-to-Address',
}

export function PriorityBadge({ priority }: { priority: Priority }): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASSES[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  )
}
