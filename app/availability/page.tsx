import AvailabilityGrid from '@/components/AvailabilityGrid'

export const metadata = { title: 'Availability — Hangout' }

export default function AvailabilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Availability</h1>
        <p className="text-sm text-zinc-500 mt-1">Mark your free hours each week. The heatmap shows when the group overlaps.</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <AvailabilityGrid />
      </div>
    </div>
  )
}
