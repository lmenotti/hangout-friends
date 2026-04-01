import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { UserProvider } from '@/context/UserContext'
import Nav from '@/components/Nav'
import NameModal from '@/components/NameModal'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Hangout — Group Scheduler',
  description: 'Plan hangouts with your friends',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Hangout' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased overscroll-none">
        <UserProvider>
          <Nav />
          <NameModal />
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
        </UserProvider>
      </body>
    </html>
  )
}
