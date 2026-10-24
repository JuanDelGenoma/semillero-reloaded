import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Flag, Plane, Trophy, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Crest } from '@/components/game/crest'
import { RatingBadge } from '@/components/game/rating'
import { categoryInfo } from '@/game/categories'
import { clubById } from '@/game/data/clubs'
import { formatWeek, playerName, unavailability } from '@/game/engine'
import { MESSI_SQUAD, groupTable, messiEligible, suggestedSquad } from '@/game/messi'
import { BANDS, MONTH_NAMES, plannedEvent, type Band } from '@/game/national'
import { useActiveGame } from '@/game/store'
import type { CupMatch } from '@/game/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/juego/internacional')({
  head: () => ({ meta: [{ title: 'Internacional · Semillero' }] }),
  component: International,
})

function International() {
  return (
    <div className="space-y-8">
      <div>
        <p className="font-['Barlow_Condensed'] text-sm uppercase tracking-widest text-muted-foreground">
          Torneos en el exterior y selecciones juveniles
        </p>
        <h1 className="text-4xl uppercase sm:text-5xl">Internacional</h1>
      </div>
      <MessiCupSection />
      <NationalSection />
    </div>
  )
}

/* ------------------------------- Messi Cup ------------------------------- */

function MessiCupSection() {
  const { game } = useActiveGame()
  const cup = game.messiCup

  return (
    <section className="space-y-4" aria-labelledby="messi">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="messi" className="flex items-center gap-2 text-3xl uppercase">
            <Trophy className="size-6 text-[var(--gold)]" /> Messi Cup {cup.season}
          </h2>
          <p className="max-w-reading text-sm text-muted-foreground">
            Torneo Sub 16 en el exterior: cuatro grupos de cuatro, semifinales y final contra academias de Europa y
            clubes ligados a Lionel Messi. Viajan unos {MESSI_SQUAD.ideal} chicos de cualquier categoría, que se pierden
            tres semanas con el club (desde el {formatWeek(cup.season, cup.startWeek)}).
          </p>
        </div>
        <span className="rounded-sm bg-muted px-2 py-1 font-['Barlow_Condensed'] text-sm uppercase tracking-wide">
          {cup.status === 'pending'
            ? 'Lista de viaje'
            : cup.status === 'playing'
              ? 'En juego'
              : (cup.result ?? 'Terminado')}
        </span>
      </div>

      {cup.status === 'pending' ? <SquadPicker /> : <CupResults />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cup.groups.map((_, gi) => {
          const table = groupTable(cup, gi)
          return (
            <div key={gi} className="rounded-md border bg-card">
              <p className="border-b px-3 py-2 font-display text-lg uppercase">Grupo {'ABCD'[gi]}</p>
              <ul className="divide-y text-sm">
                {table.map((r, i) => (
                  <li
                    key={r.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5',
                      r.id === game.clubId && 'bg-accent/50 font-semibold',
                    )}
                  >
                    <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                    <Crest clubId={r.id} className="size-5" />
                    <span className="min-w-0 flex-1 truncate">{clubById(r.id).name}</span>
                    <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                      {r.gf}-{r.gc}
                    </span>
                    <span className="w-6 text-right font-display tabular-nums">{r.pts}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SquadPicker() {
  const { game, setMessiSquad } = useActiveGame()
  const cup = game.messiCup
  const [ids, setIds] = useState<string[]>(cup.squad ?? suggestedSquad(game))
  const eligible = messiEligible(game).sort((a, b) => b.ovr - a.ovr)
  const toggle = (id: string) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const keepers = eligible.filter((p) => ids.includes(p.id) && p.position === 'POR').length
  const valid = ids.length >= MESSI_SQUAD.min && ids.length <= MESSI_SQUAD.max

  return (
    <div className="rounded-md border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-xl uppercase">
            Lista de viaje · {ids.length} elegidos ({keepers} arqueros)
          </h3>
          <p className="text-xs text-muted-foreground">
            Entre {MESSI_SQUAD.min} y {MESSI_SQUAD.max} jugadores Sub 16 (nacidos desde {game.season - 16}).{' '}
            {cup.squad
              ? 'Lista confirmada; podés cambiarla hasta la salida.'
              : 'Si no la confirmás, la arma el cuerpo técnico.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIds(suggestedSquad(game))}>
            <WandSparkles /> Sugerir
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            onClick={() => {
              const err = setMessiSquad(ids)
              if (err) toast.error(err)
              else toast.success('Lista de la Messi Cup confirmada')
            }}
          >
            Confirmar lista
          </Button>
        </div>
      </header>
      <ul className="grid max-h-[28rem] gap-x-4 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-3">
        {eligible.map((p) => {
          const out = unavailability(p, 'cup')
          return (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted">
                <Checkbox
                  checked={ids.includes(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                  aria-label={playerName(p)}
                />
                <span className="w-9 font-['Barlow_Condensed'] text-xs font-bold">{p.position}</span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {playerName(p)}
                  <span className="text-xs text-muted-foreground">
                    {' '}
                    · {categoryInfo(p.category).name}
                    {out && ` · ${out === 'lesionado' ? 'lesionado' : 'no disponible'}`}
                  </span>
                </span>
                <RatingBadge value={p.ovr} />
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CupResults() {
  const { game } = useActiveGame()
  const cup = game.messiCup
  const mine = cup.matches.filter((m) => m.homeId === game.clubId || m.awayId === game.clubId)
  const knockout = cup.matches.filter((m) => m.stage !== 'grupo')
  const travellers = game.players.filter((p) => cup.squad?.includes(p.id))

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-md border bg-card">
        <p className="border-b px-4 py-2 font-display text-lg uppercase">Partidos</p>
        <ul className="divide-y text-sm">
          {[...mine.filter((m) => m.stage === 'grupo'), ...knockout].map((m) => (
            <CupRow key={m.id} m={m} mine={m.homeId === game.clubId || m.awayId === game.clubId} />
          ))}
        </ul>
        {cup.champion && (
          <p className="flex items-center gap-2 border-t px-4 py-3 font-semibold">
            <Trophy className="size-4 text-[var(--gold)]" /> Campeón: <Crest clubId={cup.champion} className="size-5" />
            {clubById(cup.champion).name}
          </p>
        )}
      </div>
      <div className="rounded-md border bg-card">
        <p className="flex items-center gap-2 border-b px-4 py-2 font-display text-lg uppercase">
          <Plane className="size-4" /> Delegación ({travellers.length})
        </p>
        <ul className="grid gap-x-3 p-3 text-sm sm:grid-cols-2">
          {travellers.map((p) => (
            <li key={p.id} className="truncate">
              <span className="font-['Barlow_Condensed'] text-xs font-bold">{p.position}</span> {playerName(p)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CupRow({ m, mine }: { m: CupMatch; mine: boolean }) {
  const stage = m.stage === 'grupo' ? `Grupo ${'ABCD'[m.group ?? 0]}` : m.stage === 'semi' ? 'Semifinal' : 'Final'
  return (
    <li
      className={cn(
        'grid grid-cols-[5.5rem_1fr_auto_1fr] items-center gap-2 px-4 py-2',
        mine && 'bg-accent/40 font-semibold',
      )}
    >
      <span className="font-['Barlow_Condensed'] text-xs uppercase text-muted-foreground">{stage}</span>
      <span className="flex min-w-0 items-center justify-end gap-2 text-right">
        <span className="truncate">{clubById(m.homeId).name}</span>
        <Crest clubId={m.homeId} className="size-5" />
      </span>
      <span className="w-16 text-center font-display tabular-nums">
        {m.played ? `${m.homeGoals}-${m.awayGoals}` : '–'}
        {m.penalties && <span className="block text-[10px] text-muted-foreground">({m.penalties.join('-')} pen.)</span>}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <Crest clubId={m.awayId} className="size-5" />
        <span className="truncate">{clubById(m.awayId).name}</span>
      </span>
    </li>
  )
}

/* ------------------------------ Selecciones ------------------------------ */

function qualifiedLabel(v: boolean | undefined) {
  return v === undefined ? 'Por definirse' : v ? 'Clasificada' : 'Sin clasificar'
}

function NationalSection() {
  const { game } = useActiveGame()
  const onDuty = game.players.filter((p) => p.duty?.kind === 'seleccion')
  const arg = game.national.qualified.Argentina ?? {}
  const months = [1, 2, 3, 4, 5, 6, 7, 8]
  const cell = (band: Band, month: number) => {
    const e = plannedEvent(band, month)
    if (!e.worldCup) return `${e.event} (${e.days} días)`
    const q = band === 'Sub 15' ? arg.sub15 : arg.sub17
    return q === false ? 'Entrenamientos (3 días)' : `${e.event} (hasta ${e.days} días)${q ? '' : ' · si clasifica'}`
  }

  return (
    <section className="space-y-4" aria-labelledby="selecciones">
      <div>
        <h2 id="selecciones" className="flex items-center gap-2 text-3xl uppercase">
          <Flag className="size-6" /> Selecciones juveniles
        </h2>
        <p className="max-w-reading text-sm text-muted-foreground">
          Cada mes las selecciones Sub 15 y Sub 17 llaman a los chicos que más se destacan. Mientras están convocados no
          juegan para el club. Si viajan a un Mundial, tienen un 10 % de chances de subir a Reserva al volver, y un 50 %
          si la selección llega a semifinales. Los extranjeros pueden ser llamados por su país.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                {BANDS.map((b) => (
                  <TableHead key={b}>Argentina {b}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m) => (
                <TableRow key={m}>
                  <TableCell className="capitalize">{MONTH_NAMES[m]}</TableCell>
                  {BANDS.map((b) => (
                    <TableCell key={b} className="text-sm">
                      {cell(b, m)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">
            Mundial Sub 15: {qualifiedLabel(arg.sub15)} · Mundial Sub 17: {qualifiedLabel(arg.sub17)}. Argentina se
            clasifica en el 90 % de los casos.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border bg-card">
            <p className="border-b px-4 py-2 font-display text-lg uppercase">Convocados ahora ({onDuty.length})</p>
            {onDuty.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">Ningún jugador está con su selección.</p>
            ) : (
              <ul className="divide-y text-sm">
                {onDuty.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2 px-4 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{playerName(p)}</span>
                      <span className="text-xs text-muted-foreground">{p.duty!.label}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{p.duty!.weeksLeft} sem.</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-md border bg-card">
            <p className="border-b px-4 py-2 font-display text-lg uppercase">
              Convocatorias {game.season} ({game.national.callUps.length})
            </p>
            {game.national.callUps.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Todavía no hubo convocados. Los chicos con mucho nivel para su edad son los que llaman.
              </p>
            ) : (
              <ul className="max-h-80 divide-y overflow-y-auto text-sm">
                {game.national.callUps.map((c) => (
                  <li key={c.id} className="px-4 py-2">
                    <span className="font-semibold">{c.playerName}</span>{' '}
                    <span className="text-muted-foreground">
                      · {c.country} {c.band} · {c.event} · {c.days} días · {formatWeek(c.season, c.week)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
