import type { Metadata } from 'next'
import { EB_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { LegalDisclaimer } from '@/components/ui/LegalDisclaimer'
import './globals.css'

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

export const metadata: Metadata = {
  title: 'Precedent',
  description: 'AI-powered NDA review for legal professionals.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <html
      lang="en"
      className={`${garamond.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background text-text-primary">
        {children}
        <LegalDisclaimer />
      </body>
    </html>
  )
}
