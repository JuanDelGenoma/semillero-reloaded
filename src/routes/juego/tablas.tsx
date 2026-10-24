import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CategoryPicker } from '@/components/game/category-picker'
import { CompetitionPicker } from '@/components/game/competition-picker'
import { Crest } from '@/components/game/crest'
import { categoryInfo } from '@/game/categories'
import { clubById } from '@/game/data/clubs'
import { COMPETITION_NAME, hasMetro, standings, topScorers } from '@/game/engine'
import type { Competition } from '@/game/types'
import { useActiveGame } from '@/game/store'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/juego/tablas')({
  head: () => ({ meta: [{ title: 'Tablas · Semillero' }] }),
  component: Tables,
})

function Tables() {
  const { game, category } = useActiveGame()
  const [picked, setPicked] = useState<Competition>('afa')
  const comp = hasMetro(category) ? picked : 'afa'
  const info = categoryInfo(category)
  const table = standings(game, category, comp)
  const scorers = topScorers(game, category, comp)

  return (
    <div className="space-y-6">
      <div>
        <p className="font-['Barlow_Condensed'] text-sm uppercase tracking-widest text-muted-foreground">
          {COMPETITION_NAME[comp]} {game.season} · {info.label}
        </p>
        <h1 className="text-4xl uppercase sm:text-5xl">Posiciones de {info.name}</h1>
      </div>

      <CategoryPicker />
      <CompetitionPicker category={category} value={comp} onChange={setPicked} />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Club</TableHead>
                {['PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG'].map((h) => (
                  <TableHead key={h} className="text-center">
                    {h}
                  </TableHead>
                ))}
                <TableHead className="text-center">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.map((r, i) => {
                const mine = r.clubId === game.clubId
                return (
                  <TableRow key={r.clubId} className={cn(mine && 'bg-accent/50 font-semibold hover:bg-accent/60')}>
                    <TableCell className="text-center tabular-nums">
                      <span
                        className={cn(
                          i === 0 && r.pj > 0 && 'rounded-sm bg-[var(--gold)] px-1.5 py-0.5 text-[oklch(0.2_0.05_262)]',
                        )}
                      >
                        {i + 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Crest clubId={r.clubId} className="size-6" />
                        {clubById(r.clubId).name}
                      </span>
                    </TableCell>
                    {[r.pj, r.pg, r.pe, r.pp, r.gf, r.gc, r.gf - r.gc].map((v, j) => (
                      <TableCell key={j} className="text-center tabular-nums">
                        {j === 6 && v > 0 ? `+${v}` : v}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-display text-base tabular-nums">{r.pts}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </section>

        <section className="h-fit rounded-md border bg-card">
          <header className="border-b px-4 py-3">
            <h2 className="text-xl uppercase">Goleadores</h2>
          </header>
          {scorers.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Todavía no hubo goles en {info.name}.</p>
          ) : (
            <ol className="divide-y">
              {scorers.map((s, i) => (
                <li
                  key={s.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2',
                    s.clubId === game.clubId && 'bg-accent/40 font-semibold',
                  )}
                >
                  <span className="w-5 text-right text-sm tabular-nums text-muted-foreground">{i + 1}</span>
                  <Crest clubId={s.clubId} className="size-5" />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="font-display text-lg tabular-nums">{s.goals}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
