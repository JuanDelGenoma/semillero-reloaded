import { CATEGORIES } from '@/game/categories'
import { useGame } from '@/game/store'
import { cn } from '@/lib/utils'

export function CategoryPicker() {
  const { category, setCategory } = useGame()
  return (
    <div role="tablist" aria-label="Categoría" className="flex gap-1.5 overflow-x-auto pb-1">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          role="tab"
          type="button"
          aria-selected={category === c.id}
          onClick={() => setCategory(c.id)}
          className={cn(
            'shrink-0 rounded-sm border px-3 py-1.5 text-left transition-colors motion-reduce:transition-none',
            category === c.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
          )}
        >
          <span className="block font-display text-base uppercase leading-tight">{c.name}</span>
          <span
            className={cn(
              "block font-['Barlow_Condensed'] text-xs uppercase tracking-wide",
              category === c.id ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {c.label.split('·')[1]}
          </span>
        </button>
      ))}
    </div>
  )
}
