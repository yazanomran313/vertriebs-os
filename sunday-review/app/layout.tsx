import type { Metadata, Viewport } from 'next'
import './globals.css'
import PwaSetup from '@/components/PwaSetup'

export const metadata: Metadata = {
  title: 'Sunday Review',
  description: 'Wie kann ich mit weniger Zeit mehr Geld verdienen?',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sunday Review',
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <PwaSetup />
        {children}
      </body>
    </html>
  )
}
