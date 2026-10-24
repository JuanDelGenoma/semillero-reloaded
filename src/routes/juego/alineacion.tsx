import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertTriangle, Eraser, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CategoryPicker } from '@/components/game/category-picker'
import { Crest } from '@/components/game/crest'
import { PlayerStatus } from '@/components/game/player-status'
import { RatingBadge } from '@/components/game/rating'
import { FORMATION, categoryInfo, positionFit } from '@/game/categories'
import { clubById } from '@/game/data/clubs'
import {
  autoLineup,
  eligiblePool,
  lineupRating,
  nextUserMatch,
  pickedElsewhere,
  shortName,
  unavailability,
  currentAge,
  hasMetro,
} from '@/game/engine'
import { useActiveGame } from '@/game/store'
import type { CategoryId, Player } from '@/game/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/juego/alineacion')({
  head: () => ({ meta: [{ title: 'Alineación · Semillero' }] }),
  component: LineupPage,
})

function LineupPage() {
  const { category } = useActiveGame()
  return (
    <div className="space-y-6">
      <CategoryPicker />
      <LineupEditor key={category} cat={category} />
    </div>
  )
}

function fitTone(fit: number) {
  if (fit >= 1) return 'ring-white/0'
  if (fit >= 0.9) return 'ring-[var(--gold)]'
  return 'ring-destructive'
}

function LineupEditor({ cat }: { cat: CategoryId }) {
  const { game, saveLineup } = useActiveGame()
  const info = categoryInfo(cat)
  const lineup = game.lineups[cat] ?? autoLineup(game, cat)
  const [selected, setSelected] = useState<number | null>(null)
  const byId = new Map(game.players.map((p) => [p.id, p]))
  const pool = eligiblePool(game, cat).sort(
    (a, b) => Number(b.category === cat) - Number(a.category === cat) || b.ovr - a.ovr,
  )
  const match = nextUserMatch(game, cat)
  const rival = match ? (match.homeId === game.clubId ? match.awayId : match.homeId) : null
  const problems = lineup
    .map((id) => (id ? byId.get(id) : undefined))
    .filter((p): p is Player => !!p && !!unavailability(p))
  const empty = lineup.filter((id) => !id).length

  const commit = (next: (string | null)[]) => saveLineup(cat, next)

  const onSlot = (i: number) => {
    if (selected === null) return setSelected(i)
    if (selected === i) return setSelected(null)
    const next = [...lineup]
    ;[next[selected], next[i]] = [next[i], next[selected]]
    commit(next)
    setSelected(null)
  }

  const onPlayer = (p: Player) => {
    const elsewhere = pickedElsewhere(game, p.id, cat)
    if (elsewhere) {
      toast.error(`${shortName(p)} ya es titular en ${categoryInfo(elsewhere).name}`, {
        description: 'Sacalo de esa alineación para usarlo acá.',
      })
      return
    }
    const next = [...lineup]
    const current = next.indexOf(p.id)
    if (selected === null && current >= 0) return setSelected(current)
    let target: number = selected ?? 0
    if (selected === null) {
      // Best empty slot for his position, otherwise the slot he fits best.
      let bestScore = -1
      FORMATION.forEach((f, i) => {
        const score = (next[i] ? 0 : 2) + positionFit(p.position, f.pos)
        if (score > bestScore) {
          bestScore = score
          target = i
        }
      })
    }
    if (current >= 0) next[current] = next[target]
    next[target] = p.id
    commit(next)
    setSelected(null)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-['Barlow_Condensed'] text-sm uppercase tracking-widest text-muted-foreground">
              {info.label} · 4-3-3
            </p>
            <h1 className="text-4xl uppercase">Equipo de {info.name}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-muted-foreground">Nivel del once</p>
            <p className="font-display text-3xl">{lineupRating(game, lineup).toFixed(1)}</p>
          </div>
        </div>

        {rival && match && (
          <p className="mb-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Fecha {match.round}:</span>
            <Crest clubId={rival} className="size-5" />
            <span className="font-semibold">
              {match.homeId === game.clubId ? 'vs' : 'en cancha de'} {clubById(rival).name}
            </span>
          </p>
        )}

        <div
          className="relative mx-auto aspect-[68/90] w-full max-w-md overflow-hidden rounded-md border-4 border-[var(--pitch-dark)] bg-[var(--pitch)]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 10%, rgba(255,255,255,.05) 10% 20%)',
          }}
        >
          <div className="pointer-events-none absolute inset-3 rounded-sm border-2 border-white/40" />
          <div className="pointer-events-none absolute left-3 right-3 top-1/2 border-t-2 border-white/40" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
          <div className="pointer-events-none absolute bottom-3 left-1/2 h-[14%] w-[46%] -translate-x-1/2 border-2 border-b-0 border-white/40" />
          <div className="pointer-events-none absolute left-1/2 top-3 h-[14%] w-[46%] -translate-x-1/2 border-2 border-t-0 border-white/40" />

          {FORMATION.map((slot, i) => {
            const p = lineup[i] ? byId.get(lineup[i]!) : undefined
            const fit = p ? positionFit(p.position, slot.pos) : 1
            const bad = p && unavailability(p)
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSlot(i)}
                aria-label={`${slot.pos}: ${p ? shortName(p) : 'vacío'}`}
                aria-pressed={selected === i}
                className="absolute flex w-20 -translate-x-1/2 translate-y-1/2 flex-col items-center gap-0.5 focus-visible:outline-none"
                style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
              >
                <span
                  className={cn(
                    'flex size-11 items-center justify-center rounded-full border-2 font-display text-base shadow-md ring-2 transition-transform motion-reduce:transition-none',
                    p
                      ? 'border-white bg-primary text-primary-foreground'
                      : 'border-dashed border-white/70 bg-white/10 text-white',
                    p && fitTone(fit),
                    selected === i && 'scale-110 border-[var(--celeste)] bg-[var(--celeste)] text-primary',
                    bad && 'bg-destructive',
                  )}
                >
                  {p ? Math.round(p.ovr * fit) : '+'}
                </span>
                <span className="max-w-full truncate rounded-sm bg-black/55 px-1 text-[11px] font-semibold leading-tight text-white">
                  {p ? shortName(p) : slot.pos}
                </span>
                {p && p.position !== slot.pos && (
                  <span className="text-[10px] font-bold uppercase leading-none text-white/80">
                    {p.position}→{slot.pos}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mx-auto mt-3 flex max-w-md flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => commit(autoLineup(game, cat))}>
            <WandSparkles /> Equipo automático
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selected === null || !lineup[selected ?? -1]}
            onClick={() => {
              if (selected === null) return
              const next = [...lineup]
              next[selected] = null
              commit(next)
              setSelected(null)
            }}
          >
            <Eraser /> Quitar del puesto
          </Button>
        </div>

        {(problems.length > 0 || empty > 0) && (
          <div className="mx-auto mt-3 flex max-w-md gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            <p>
              {problems.length > 0 &&
                `${problems.map(shortName).join(', ')} no puede${problems.length > 1 ? 'n' : ''} jugar. `}
              {empty > 0 && `Hay ${empty} puesto${empty > 1 ? 's' : ''} vacío${empty > 1 ? 's' : ''}. `}
              Si no lo corregís, el cuerpo técnico completa el once con los mejores disponibles.
            </p>
          </div>
        )}
        <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground">
          Tocá un puesto y después un jugador de la lista. Tocá dos puestos para intercambiarlos. Un borde amarillo o
          rojo indica que juega fuera de su posición.
        </p>
      </section>

      <section className="rounded-md border bg-card">
        <header className="border-b px-4 py-3">
          <h2 className="text-xl uppercase">Disponibles para {info.name}</h2>
          <p className="text-xs text-muted-foreground">
            Registrados en {info.name} y chicos de categorías menores que pueden jugar arriba. Los extranjeros sin
            ciudadanía no aparecen: sólo juegan Liga Metro.
            {hasMetro(cat) &&
              ' Los que no jueguen AFA el fin de semana forman el equipo de Liga Metro automáticamente.'}
          </p>
        </header>
        <ul className="max-h-[42rem] divide-y overflow-y-auto">
          {pool.map((p) => {
            const inLineup = lineup.includes(p.id)
            const elsewhere = pickedElsewhere(game, p.id, cat)
            const out = unavailability(p)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPlayer(p)}
                  disabled={!!out}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none',
                    inLineup && 'bg-accent/40',
                  )}
                >
                  <span className="w-10 rounded-sm bg-muted py-0.5 text-center font-['Barlow_Condensed'] text-xs font-bold">
                    {p.position}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{shortName(p)}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.birthYear} ({currentAge(p, game.season, game.week)} años)
                      {p.category !== cat && ` · de ${categoryInfo(p.category).name}`}
                      {elsewhere && ` · titular en ${categoryInfo(elsewhere).name}`}
                    </span>
                  </span>
                  {out ? (
                    <PlayerStatus player={p} />
                  ) : (
                    inLineup && <span className="text-xs font-semibold text-[var(--tier-good)]">En cancha</span>
                  )}
                  <RatingBadge value={p.ovr} />
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
