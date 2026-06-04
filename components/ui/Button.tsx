import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Accept / primary action.
  primary: 'bg-navy text-surface hover:bg-navy-hover disabled:bg-navy/40',
  // Modify / outlined.
  secondary: 'bg-transparent text-navy border border-navy hover:bg-navy/5',
  // Reject / quiet.
  tertiary:
    'bg-transparent text-text-secondary border border-border hover:bg-surface-raised',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
})
