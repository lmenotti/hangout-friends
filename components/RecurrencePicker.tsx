'use client'

type Props = {
  value: string
  endDate: string
  onChange: (rule: string, endDate: string) => void
}

const PRESETS = [
  { label: 'None', rule: '' },
  { label: 'Weekly', rule: 'FREQ=WEEKLY' },
  { label: 'Biweekly', rule: 'FREQ=WEEKLY;INTERVAL=2' },
  { label: 'Monthly', rule: 'FREQ=MONTHLY' },
]

export default function RecurrencePicker({ value, endDate, onChange }: Props) {
  const isCustom = value && !PRESETS.find(p => p.rule === value)
  const selected = isCustom ? 'custom' : value

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">Recurrence</label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.rule}
            type="button"
            onClick={() => onChange(p.rule, endDate)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors touch-manipulation ${
              selected === p.rule
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange('FREQ=WEEKLY', endDate)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors touch-manipulation ${
            isCustom ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <input
          value={value}
          onChange={e => onChange(e.target.value, endDate)}
          placeholder="e.g. FREQ=WEEKLY;BYDAY=MO,WE"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
        />
      )}

      {value && (
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">End date (optional)</label>
          <input
            type="date"
            value={endDate}
            onChange={e => onChange(value, e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}
    </div>
  )
}
