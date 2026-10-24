import { clubById } from '@/game/data/clubs'
import { cn } from '@/lib/utils'

/** Simple two-colour shield built from the club's colours. */
export function Crest({ clubId, className }: { clubId: string; className?: string }) {
  const club = clubById(clubId)
  const [a, b] = club.colors
  const light = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 160
  }
  return (
    <svg
      viewBox="0 0 40 46"
      className={cn('size-8 shrink-0 drop-shadow-sm', className)}
      role="img"
      aria-label={club.name}
    >
      <defs>
        <clipPath id={`crest-${club.id}`}>
          <path d="M20 1 L38 6 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V6 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#crest-${club.id})`}>
        <rect width="40" height="46" fill={a} />
        <path d="M0 30 L40 14 V24 L0 40 Z" fill={b} />
      </g>
      <path
        d="M20 1 L38 6 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V6 Z"
        fill="none"
        stroke="rgba(0,0,0,.35)"
        strokeWidth="1.5"
      />
      <text
        x="20"
        y="20"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="800"
        fontFamily="var(--font-heading)"
        fill={light(a) ? '#111' : '#fff'}
        letterSpacing=".5"
      >
        {club.short}
      </text>
    </svg>
  )
}
