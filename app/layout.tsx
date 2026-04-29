import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { UserProvider } from '@/context/UserContext'
import Nav from '@/components/Nav'
import BottomNav from '@/components/BottomNav'
import NameModal from '@/components/NameModal'
import Providers from '@/components/ChakraProvider'

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
          <Providers>
            <Nav />
            <NameModal />
            <main
              className="max-w-4xl mx-auto px-4 py-8 md:pb-8"
              style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
            >
              {children}
            </main>
            <BottomNav />
          </Providers>
        </UserProvider>
        <Script
          id="google-maps"
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
