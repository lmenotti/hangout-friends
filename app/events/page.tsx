'use client'

import EventsList from '@/components/EventsList'
import CreateEventForm from '@/components/CreateEventForm'
import { useState } from 'react'

export default function EventsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Events</h1>
        <p className="text-sm text-zinc-500 mt-1">Scheduled hangouts. Let everyone know if you&apos;re coming.</p>
      </div>
      <CreateEventForm onCreated={() => setRefreshKey(k => k + 1)} />
      <EventsList key={refreshKey} />
    </div>
  )
}
