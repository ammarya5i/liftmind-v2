import type { Metadata } from 'next'
import { Saira, Barlow } from 'next/font/google'
import './globals.css'

// Display: Saira — a sport-technical typeface (squared, modern), distinctive but
// readable. Body: Barlow — sporty grotesque for clean UI text.
const display = Saira({ subsets: ['latin'], variable: '--font-display' })
const sans = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'LiftMind — AI coaching for lifters',
  description:
    'Normalized training logs, real PR tracking, and an AI coach that remembers your training.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-aurora min-h-screen">{children}</body>
    </html>
  )
}
