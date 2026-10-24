import { Star, StarHalf } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RatingBadge({ value, className }: { value: number; className?: string }) {
  const v = Math.round(value)
  const tone =
    v >= 75
      ? 'bg-[var(--tier-elite)] text-white'
      : v >= 65
        ? 'bg-[var(--tier-good)] text-white'
        : v >= 55
          ? 'bg-[var(--tier-mid)] text-foreground'
          : 'bg-muted text-muted-foreground'
  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-8 items-center justify-center rounded-sm px-1.5 font-display text-sm tabular-nums',
        tone,
        className,
      )}
    >
      {v}
    </span>
  )
}

/** Potential as 0.5–5 stars. */
export function PotentialStars({ pot }: { pot: number }) {
  const halves = Math.max(1, Math.min(10, Math.round((pot - 40) / 5.5)))
  const full = Math.floor(halves / 2)
  return (
    <span className="inline-flex text-[var(--gold)]" aria-label={`Potencial ${halves / 2} de 5`}>
      {Array.from({ length: full }, (_, i) => (
        <Star key={i} className="size-3.5 fill-current" />
      ))}
      {halves % 2 === 1 && <StarHalf className="size-3.5 fill-current" />}
    </span>
  )
}
