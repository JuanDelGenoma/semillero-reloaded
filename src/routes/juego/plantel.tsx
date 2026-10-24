import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CategoryPicker } from '@/components/game/category-picker'
import { PlayerDialog } from '@/components/game/player-dialog'
import { CardsCell, PlayerStatus } from '@/components/game/player-status'
import { PotentialStars, RatingBadge } from '@/components/game/rating'
import { FORMATION, POSITION_LINE, categoryInfo, naturalCategory } from '@/game/categories'
import { currentAge, hasMetro, playerName, unavailability } from '@/game/engine'
import { countryByName } from '@/game/data/world'
import { useActiveGame } from '@/game/store'
import type { Position } from '@/game/types'

export const Route = createFileRoute('/juego/plantel')({
  head: () => ({ meta: [{ title: 'Plantel · Semillero' }] }),
  component: Squad,
})

const POS_ORDER: Position[] = ['POR', 'LD', 'DFC', 'LI', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC']

function Squad() {
  const { game, category } = useActiveGame()
  const [open, setOpen] = useState<string | null>(null)
  const info = categoryInfo(category)
  const squad = game.players
    .filter((p) => p.category === category)
    .sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position) || b.ovr - a.ovr)
  const avg = squad.length ? squad.reduce((s, p) => s + p.ovr, 0) / squad.length : 0
  const starters = new Set(game.lineups[category] ?? [])
  const out = squad.filter((p) => {
    const u = unavailability(p)
    return u && u !== 'ciudadania'
  }).length
  const metro = hasMetro(category)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-['Barlow_Condensed'] text-sm uppercase tracking-widest text-muted-foreground">
            {info.label} · nacidos desde {game.season - info.maxYearAge}
          </p>
          <h1 className="text-4xl uppercase sm:text-5xl">Plantel de {info.name}</h1>
        </div>
        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Jugadores</dt>
            <dd className="font-display text-3xl">{squad.length}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Nivel medio</dt>
            <dd className="font-display text-3xl">{avg.toFixed(1)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Bajas</dt>
            <dd className="font-display text-3xl text-destructive">{out}</dd>
          </div>
        </dl>
      </div>

      <CategoryPicker />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Pos</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead className="text-center">Nac.</TableHead>
              <TableHead className="text-center">Año</TableHead>
              <TableHead className="text-center">Nivel</TableHead>
              <TableHead>Potencial</TableHead>
              <TableHead className="text-center">{metro ? 'PJ (Metro)' : 'PJ'}</TableHead>
              <TableHead className="text-center">G</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead>Tarjetas</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {squad.map((p) => {
              const playsUp = naturalCategory(p.birthYear, game.season) !== category
              return (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpen(p.id)}>
                  <TableCell>
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 font-['Barlow_Condensed'] text-xs font-bold">
                      {p.position}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-semibold hover:underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpen(p.id)
                      }}
                    >
                      {playerName(p)}
                    </button>
                    <span className="ml-2 inline-flex gap-1">
                      {starters.has(p.id) && (
                        <span className="rounded-sm bg-[var(--tier-good)] px-1 text-[10px] font-bold uppercase text-white">
                          Titular
                        </span>
                      )}
                      {!p.citizen && (
                        <span className="rounded-sm bg-muted px-1 text-[10px] font-bold uppercase text-muted-foreground">
                          Sólo Metro
                        </span>
                      )}
                      {playsUp && (
                        <span className="rounded-sm bg-[var(--celeste)] px-1 text-[10px] font-bold uppercase">
                          Juega arriba
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-['Barlow_Condensed'] text-xs font-bold" title={p.nationality}>
                    {countryByName(p.nationality).code}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">
                    {p.birthYear} <span className="text-xs">({currentAge(p, game.season, game.week)} años)</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <RatingBadge value={p.ovr} />
                  </TableCell>
                  <TableCell>
                    <PotentialStars pot={p.pot} />
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {p.stats.apps}
                    {metro && <span className="text-xs text-muted-foreground"> ({p.metroStats.apps})</span>}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{p.stats.goals}</TableCell>
                  <TableCell className="text-center tabular-nums">{p.stats.assists}</TableCell>
                  <TableCell>
                    <CardsCell player={p} />
                  </TableCell>
                  <TableCell>
                    <PlayerStatus player={p} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {squad.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No hay jugadores registrados en esta categoría.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Formación base 4-3-3 ({FORMATION.filter((f) => POSITION_LINE[f.pos] === 'DEF').length} defensores). Tocá un
        jugador para ver su ficha, editarlo o registrarlo en una categoría mayor.
        {metro && ' Entre paréntesis, partidos de Liga Metro.'}
      </p>

      <PlayerDialog playerId={open} onClose={() => setOpen(null)} />
    </div>
  )
}
