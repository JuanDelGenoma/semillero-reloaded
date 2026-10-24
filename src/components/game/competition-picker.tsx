import { hasMetro } from '@/game/engine'
import type { CategoryId, Competition } from '@/game/types'
import { cn } from '@/lib/utils'

/** AFA / Liga Metro switch, only for the categories that play both. */
export function CompetitionPicker({
  category,
  value,
  onChange,
}: {
  category: CategoryId
  value: Competition
  onChange: (c: Competition) => void
}) {
  if (!hasMetro(category)) return null
  return (
    <div role="tablist" aria-label="Torneo" className="inline-flex rounded-md border bg-card p-1">
      {(
        [
          ['afa', 'Liga AFA'],
          ['metro', 'Liga Metro'],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'rounded-sm px-3 py-1 text-sm font-semibold transition-colors motion-reduce:transition-none',
            value === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
