import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

// color-mix arbitrary values are used for translucent navy fills: Tailwind v3
// opacity modifiers (e.g. bg-navy/40) produce invalid CSS against hex var() colors.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Accept / primary action.
  primary:
    'bg-navy text-surface hover:bg-navy-hover disabled:bg-[color-mix(in_srgb,var(--color-brand-navy)_40%,transparent)]',
  // Modify / outlined.
  secondary:
    'bg-transparent text-navy border border-navy hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_5%,transparent)]',
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
