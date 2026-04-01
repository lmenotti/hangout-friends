import IdeasBoard from '@/components/IdeasBoard'

export const metadata = { title: 'Ideas — Hangout' }

export default function IdeasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Ideas</h1>
        <p className="text-sm text-zinc-500 mt-1">Suggest things to do. Vote on your favorites. Auto-schedule the top pick.</p>
      </div>
      <IdeasBoard showSchedule />
    </div>
  )
}
