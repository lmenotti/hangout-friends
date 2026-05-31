import { Suspense } from 'react'
import Link from 'next/link'
import AuthEmailForm from '@/components/AuthEmailForm'

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 pb-24">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors">
            hangout
          </Link>
          <h1 className="text-xl font-semibold text-zinc-100">Sign in</h1>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <Suspense fallback={<div className="h-32 rounded-xl bg-zinc-800/50 animate-pulse" />}>
            <AuthEmailForm />
          </Suspense>
        </div>

        <div className="space-y-2 text-center">
          <p>
            <Link href="/auth/signin/options" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Other sign-in options
            </Link>
          </p>
          <p>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
