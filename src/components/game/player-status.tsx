import { Ambulance, Ban, Flag, Lock, Plane } from 'lucide-react'
import type { Player } from '@/game/types'

/** Availability for the club. `metro` shows Liga Metro bans and lets non-citizens through. */
export function PlayerStatus({ player, metro = false }: { player: Player; metro?: boolean }) {
  const cls = 'inline-flex items-center gap-1 text-xs font-semibold text-destructive'
  if (player.injury)
    return (
      <span className={cls}>
        <Ambulance className="size-3.5" /> {player.injury.weeksLeft} sem.
      </span>
    )
  if (player.clubBan > 0)
    return (
      <span className={cls}>
        <Ban className="size-3.5" /> Sanción club
      </span>
    )
  if (player.duty)
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--tier-good)]"
        title={player.duty.label}
      >
        {player.duty.kind === 'messi' ? <Plane className="size-3.5" /> : <Flag className="size-3.5" />}
        {player.duty.kind === 'messi' ? 'Messi Cup' : 'Selección'} · {player.duty.weeksLeft} sem.
      </span>
    )
  const ban = metro ? player.metroBan : player.suspension
  if (ban > 0)
    return (
      <span className={cls}>
        <Ban className="size-3.5" /> {ban} {ban === 1 ? 'fecha' : 'fechas'}
      </span>
    )
  if (!metro && !player.citizen)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Lock className="size-3.5" /> Sólo Metro
      </span>
    )
  return <span className="text-xs text-muted-foreground">Disponible</span>
}

export function CardsCell({ player }: { player: Player }) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span className="inline-block h-3 w-2 rounded-[1px] bg-[var(--gold)]" aria-hidden /> {player.stats.yellows}
      <span className="inline-block h-3 w-2 rounded-[1px] bg-destructive" aria-hidden /> {player.stats.reds}
    </span>
  )
}
