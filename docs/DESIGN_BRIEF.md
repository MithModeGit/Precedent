# Design Brief

Visual system, typography, component patterns, and writing standards for Precedent. Read this before writing any Tailwind classes, CSS, or in-product copy. Every design decision in this document is final for the MVP.

---

## 1. Color System

Define all colors as CSS custom properties in `app/globals.css`. Reference them in `tailwind.config.ts` as theme extensions. No hardcoded hex values anywhere in component files.

### CSS Custom Properties

```css
:root {
  --color-background: #F9F8F5;
  --color-surface: #FFFFFF;
  --color-surface-raised: #F4F3F0;

  --color-text-primary: #1A1A2E;
  --color-text-secondary: #64748B;
  --color-text-muted: #94A3B8;

  --color-brand-navy: #1E3A5F;
  --color-brand-navy-hover: #163050;
  --color-accent-gold: #C4A35A;
  --color-accent-gold-light: #E8D5A3;

  --color-must: #991B1B;
  --color-must-bg: #FEF2F2;
  --color-must-border: #FECACA;

  --color-should: #92400E;
  --color-should-bg: #FFFBEB;
  --color-should-border: #FDE68A;

  --color-nice: #065F46;
  --color-nice-bg: #F0FDF4;
  --color-nice-border: #BBF7D0;

  --color-confident: #1E3A5F;
  --color-confident-bg: #EFF6FF;

  --color-review: #92400E;
  --color-review-bg: #FFFBEB;

  --color-low-confidence: #991B1B;
  --color-low-confidence-bg: #FEF2F2;

  --color-diff-delete: #991B1B;
  --color-diff-delete-bg: #FEF2F2;

  --color-diff-insert: #065F46;
  --color-diff-insert-bg: #F0FDF4;

  --color-border: #E2E8F0;
  --color-border-subtle: #F1F5F9;

  --color-success: #065F46;
  --color-error: #991B1B;
  --color-warning: #92400E;
}
```

### Tailwind Theme Extension

In `tailwind.config.ts`:

```typescript
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
      must: 'var(--color-must)',
      'must-bg': 'var(--color-must-bg)',
      should: 'var(--color-should)',
      'should-bg': 'var(--color-should-bg)',
      nice: 'var(--color-nice)',
      'nice-bg': 'var(--color-nice-bg)',
    },
    fontFamily: {
      display: ['var(--font-garamond)', 'Georgia', 'serif'],
      sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      mono: ['var(--font-jetbrains)', 'Consolas', 'monospace'],
    },
  },
}
```

---

## 2. Typography

### Font Loading

In `app/layout.tsx`, load fonts using `next/font/google`:

```typescript
import { EB_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google'

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-garamond',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains',
  display: 'swap',
})
```

Apply all three font variables to the `<html>` element.

### Usage Rules

| Typeface | Use | Class |
|---|---|---|
| EB Garamond | Product wordmark, H1, H2 headings only | `font-display` |
| DM Sans | Everything else: body, labels, buttons, captions, inputs | `font-sans` |
| JetBrains Mono | Clause text in diff view, section numbers | `font-mono` |

Do not use EB Garamond for H3 and below. The serif is reserved for primary headings to maintain visual hierarchy.

### Type Scale

| Element | Class | Notes |
|---|---|---|
| Product wordmark | `font-display text-2xl font-semibold tracking-tight` | Home screen header only |
| Page H1 | `font-display text-3xl font-normal` | One per page |
| Section H2 | `font-display text-xl font-semibold` | Major section breaks |
| Card heading | `font-sans text-sm font-semibold uppercase tracking-widest text-text-secondary` | Small caps style labels |
| Body text | `font-sans text-sm leading-6` | Default for most content |
| Caption / metadata | `font-sans text-xs text-text-secondary` | Timestamps, labels |
| Clause text (diff view) | `font-mono text-sm leading-6` | Review cards |

Line heights: use `leading-6` (24px) for body text and clause text. Do not use `leading-relaxed` or `leading-loose` in content areas.

---

## 3. Spacing and Layout

The design uses an 8px base grid. Prefer multiples of 8: `p-2` (8px), `p-4` (16px), `p-6` (24px), `p-8` (32px).

Cards and panels: `p-6` internal padding with `rounded-md` (8px) corners. No larger corner radius.

Dividers: `border-border` color, 1px weight. No decorative dividers.

Shadows: use a single shadow level only: `shadow-sm` (`box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05)`). No `shadow-lg`, no `shadow-xl`. Elevation is expressed through background color contrast, not shadows.

---

## 4. In-Product Writing Standards

### Rules for All UI Text

- No em dashes. Use a colon, semicolon, comma, or parentheses instead.
- No en dashes except in date ranges: "Jan 1 - Jan 7" is acceptable.
- Sentence case for all labels, buttons, and headings. No ALL CAPS except for the "small caps" card heading style defined in Section 2.
- Active voice. "Export your document" not "Your document can be exported."
- Numbers: write out one through nine, use digits for 10 and above.

### Prohibited Phrases

Never use in any user-visible text (buttons, labels, tooltips, empty states, error messages, or confirmation dialogs):

- get started
- let's go
- powered by AI
- smart, intelligent, seamlessly, instantly, unlock, revolutionize
- game-changing, groundbreaking, next-level
- robust, comprehensive (as marketing language)
- just (as a minimizer: "just click here")
- leverage (as a verb)
- dive into, deep dive

### Button Labels

Use verbs that describe the action precisely:

| Good | Bad |
|---|---|
| Start Review | Get Started |
| Confirm and Continue | Next |
| Export Document | Done |
| View Session | Open |
| Modify | Edit (reserved for settings) |

### Empty States

Format: context sentence + direct action. One sentence each.

- No sessions: "No reviews yet. Start your first review above."
- No eval data: "Run a document review to see quality metrics here."
- Session complete, no export: "Review complete. Export your document to send it."

### Error Messages

Format: what went wrong + how to fix it.

- File parse error: "This file could not be read. Try uploading a DOCX file, or confirm the PDF contains selectable text."
- Pipeline error: "Something interrupted the analysis. Refresh the page and try again."
- Export error: "The document could not be generated. Wait a moment and try exporting again."

### Tooltips

Tooltips on legal terms must cite the source:

- On DTSA badge: "Per 18 U.S.C. § 1833(b), NDAs signed by individual employees or contractors must include a whistleblower immunity notice. Omitting it forfeits the right to seek exemplary damages and attorney's fees."
- On §16600 badge: "California Business and Professions Code § 16600 broadly voids contractual restrictions on lawful employment. Non-solicitation clauses in NDAs governed by California law carry material enforceability risk."

---

## 5. Component Patterns

### Approved Patterns

**Priority badges:** Small pill-shaped badges with colored background and text. Use the `--bg` variants for backgrounds and the base color for text and border.

```
Must:   bg-must-bg   text-must   border border-must/20   text-xs font-medium px-2 py-0.5 rounded-full
Should: bg-should-bg text-should border border-should/20  ...
Nice:   bg-nice-bg   text-nice   border border-nice/20    ...
```

**Confidence signal:** A small dot with label text.
```
Confident:      dot bg-confident, label text-confident
Review Needed:  dot bg-review, label text-review
Low Confidence: dot bg-low-confidence, label text-low-confidence
Loading:        dot bg-navy/30 animate-pulse
```

**Action buttons (Accept / Modify / Reject):** Three equal-width buttons in a row. Full-width within the review card.

```
Accept:  bg-navy text-white hover:bg-navy-hover
Modify:  bg-transparent text-navy border border-navy hover:bg-navy/5
Reject:  bg-transparent text-text-secondary border border-border hover:bg-surface-raised
```

**Cards:** White surface on the warm off-white background. `rounded-md shadow-sm border border-border`. Internal padding `p-6`.

**Section dividers inside cards:** `border-t border-border-subtle my-4`. No horizontal rules (`<hr>`) as decorative elements.

**Stat cards:** A simple card with a large numeric value, a label below it, and an optional trend indicator. No icons. No background colors. White surface only.

### Prohibited Patterns

- Thick left borders as decoration (reserved for priority tier clause highlights in the document panel only)
- Gradient backgrounds or gradient fills on any element
- `box-shadow` beyond `shadow-sm` on any card or panel
- Default Tailwind palette classes: `bg-indigo-*`, `bg-purple-*`, `bg-sky-*`, `text-blue-*`, etc.
- Border radius above `rounded-md` (8px) on rectangular elements
- Background overlays or blur effects behind modals
- Auto-playing animations not triggered by user interaction
- Skeleton loaders with fast pulse animations (use `animate-pulse` with a 2 second duration only)

### Framer Motion Usage

Use Framer Motion only for:
- Clause card reordering when the user switches between priority and document sort order (layout animation)
- Collapsible panels (running log, counterparty prediction, critical issues panel)
- Page transitions (subtle fade on route change)

Do not use Framer Motion for hover effects, button presses, or any micro-interaction that CSS handles adequately.

---

## 6. Recharts Configuration

All eval dashboard charts use Recharts. Apply these settings consistently:

```typescript
// Line chart for overall score trend
<LineChart>
  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
  <XAxis
    dataKey="date"
    tick={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fill: 'var(--color-text-secondary)' }}
  />
  <YAxis
    domain={[0, 5]}
    tick={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fill: 'var(--color-text-secondary)' }}
  />
  <Tooltip
    contentStyle={{
      fontFamily: 'var(--font-dm-sans)',
      fontSize: 12,
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
    }}
  />
  {/* Performance tier bands */}
  <ReferenceArea y1={4} y2={5} fill="var(--color-nice-bg)" fillOpacity={0.5} />
  <ReferenceArea y1={3} y2={4} fill="var(--color-should-bg)" fillOpacity={0.5} />
  <ReferenceArea y1={0} y2={3} fill="var(--color-must-bg)" fillOpacity={0.3} />
  <Line
    type="monotone"
    dataKey="overallScore"
    stroke="var(--color-brand-navy)"
    strokeWidth={2}
    dot={{ r: 5, fill: 'var(--color-brand-navy)' }}
    activeDot={{ r: 7 }}
  />
</LineChart>
```

No pie charts anywhere in the product. No 3D chart variants.
