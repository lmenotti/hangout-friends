import Link from 'next/link'

export default function PlanCreatorBar() {
  return (
    <nav
      className="md:hidden fixed top-0 inset-x-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="font-semibold text-white text-sm tracking-tight shrink-0 touch-manipulation min-h-[44px] flex items-center"
        >
          hangout
        </Link>
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-100 active:text-zinc-100 px-3 py-2 rounded-lg transition-colors touch-manipulation min-h-[44px] flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
            <path d="M3 12L12 3l9 9" />
            <path d="M9 21V12h6v9" />
          </svg>
          Home
        </Link>
      </div>
    </nav>
  )
}
