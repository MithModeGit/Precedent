import type { Config } from 'tailwindcss'

// Color and font tokens map to the CSS custom properties defined in app/globals.css.
// Application code must reference these semantic names, never default Tailwind palette values.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        navy: 'var(--color-brand-navy)',
        'navy-hover': 'var(--color-brand-navy-hover)',
        gold: 'var(--color-accent-gold)',
        'gold-light': 'var(--color-accent-gold-light)',
        must: 'var(--color-must)',
        'must-bg': 'var(--color-must-bg)',
        'must-border': 'var(--color-must-border)',
        should: 'var(--color-should)',
        'should-bg': 'var(--color-should-bg)',
        'should-border': 'var(--color-should-border)',
        nice: 'var(--color-nice)',
        'nice-bg': 'var(--color-nice-bg)',
        'nice-border': 'var(--color-nice-border)',
        confident: 'var(--color-confident)',
        'confident-bg': 'var(--color-confident-bg)',
        review: 'var(--color-review)',
        'review-bg': 'var(--color-review-bg)',
        'low-confidence': 'var(--color-low-confidence)',
        'low-confidence-bg': 'var(--color-low-confidence-bg)',
        'diff-delete': 'var(--color-diff-delete)',
        'diff-delete-bg': 'var(--color-diff-delete-bg)',
        'diff-insert': 'var(--color-diff-insert)',
        'diff-insert-bg': 'var(--color-diff-insert-bg)',
        border: 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
      },
      fontFamily: {
        display: ['var(--font-garamond)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'Consolas', 'monospace'],
      },
      borderRadius: {
        md: '8px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        // Slow, calm 2-second pulse for loading states (per DESIGN_BRIEF §5).
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
