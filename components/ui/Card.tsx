interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/** White surface card on the warm background. Single shadow level per DESIGN_BRIEF §3. */
export function Card({ children, className = '', ...props }: CardProps): React.ReactElement {
  return (
    <div
      className={`rounded-md border border-border bg-surface p-6 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
