import Link from 'next/link'

export default function SignInOptionsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 pb-24">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors">
            hangout
          </Link>
          <h1 className="text-xl font-semibold text-zinc-100">Other sign-in options</h1>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <p className="text-sm text-zinc-400">
            Password sign-in isn&apos;t available yet. Use email and a magic link for now.
          </p>
        </div>

        <p className="text-center">
          <Link href="/auth/signin" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
