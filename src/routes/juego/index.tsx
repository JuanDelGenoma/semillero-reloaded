import { Link, createFileRoute } from '@tanstack/react-router'
import {
  Ambulance,
  ArrowUpRight,
  Ban,
  Binoculars,
  CalendarDays,
  CheckCheck,
  Flag,
  Handshake,
  Newspaper,
  Plane,
  Sparkles,
  Sprout,
  Trophy,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Crest } from '@/components/game/crest'
import { DecisionsPanel } from '@/components/game/decisions'
import { CATEGORIES, categoryInfo } from '@/game/categories'
import { clubById } from '@/game/data/clubs'
import {
  UNAVAILABLE_LABEL,
  formatWeek,
  hasMetro,
  money,
  nextUserMatch,
  playerName,
  standings,
  unavailability,
  userMatches,
} from '@/game/engine'
import { useActiveGame } from '@/game/store'
import type { NewsItem } from '@/game/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/juego/')({
  component: Office,
})

const NEWS_ICON: Record<NewsItem['kind'], typeof Newspaper> = {
  result: Trophy,
  injury: Ambulance,
  suspension: Ban,
  info: Newspaper,
  promotion: ArrowUpRight,
  camada: Sprout,
  seleccion: Flag,
  mercado: Handshake,
  evento: Sparkles,
  messi: Plane,
  captacion: Binoculars,
}

function Office() {
  const { game, readNews, setCategory } = useActiveGame()
  const next = CATEGORIES.map((c) => ({
    cat: c,
    match: nextUserMatch(game, c.id),
  }))
  const nextRound = next.find((n) => n.match)?.match
  const metroNext = CATEGORIES.filter((c) => hasMetro(c.id))
    .map((c) => ({ cat: c, match: nextUserMatch(game, c.id, 'metro') }))
    .filter(
      (
        n,
      ): n is {
        cat: (typeof CATEGORIES)[number]
        match: NonNullable<typeof n.match>
      } => !!n.match && n.match.week === nextRound?.week,
    )
  const last = CATEGORIES.map((c) => ({
    cat: c,
    match: userMatches(game, c.id)
      .filter((m) => m.played)
      .at(-1),
  }))
  const unavailable = game.players.filter((p) => {
    const u = unavailability(p)
    return u && u !== 'ciudadania'
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <div>
          <p className="font-['Barlow_Condensed'] text-sm uppercase tracking-widest text-muted-foreground">
            Coordinación de inferiores · {game.managerName}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-4xl uppercase sm:text-5xl">Oficina</h1>
            <p className="text-right">
              <span className="block text-xs uppercase text-muted-foreground">Presupuesto de la cantera</span>
              <span className="font-display text-2xl tabular-nums">{money(game.funds)}</span>
            </p>
          </div>
        </div>

        <DecisionsPanel />

        {game.seasonOver && (
          <div className="rounded-md border border-[var(--gold)] bg-[var(--gold)]/10 p-4">
            <p className="font-semibold">Terminó la Liga AFA {game.season}.</p>
            <p className="text-sm text-muted-foreground">
              Revisá las tablas finales y usá <strong>Cerrar temporada</strong>: la coordinación te pide elegir los
              descartes de cada categoría antes de recibir a la nueva camada.
            </p>
          </div>
        )}

        <section className="rounded-md border bg-card">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="flex items-center gap-2 text-xl uppercase">
              <CalendarDays className="size-5" /> Próxima fecha
            </h2>
            {nextRound && (
              <span className="font-['Barlow_Condensed'] text-sm uppercase tracking-wide text-muted-foreground">
                Fecha {nextRound.round} · {formatWeek(game.season, nextRound.week)}
                {nextRound.week !== game.week && ' · semana libre antes'}
              </span>
            )}
          </header>
          {nextRound ? (
            <ul className="divide-y">
              {next.map(({ cat, match }) => {
                if (!match) return null
                const home = match.homeId === game.clubId
                const rival = home ? match.awayId : match.homeId
                const pos = standings(game, cat.id).findIndex((r) => r.clubId === rival) + 1
                const lineup = game.lineups[cat.id]
                return (
                  <li key={cat.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-20 font-semibold">{cat.name}</span>
                    <span className="w-10 rounded-sm bg-muted text-center text-xs font-semibold uppercase">
                      {home ? 'Local' : 'Visita'}
                    </span>
                    <Crest clubId={rival} className="size-7" />
                    <span className="min-w-0 flex-1 truncate">
                      {clubById(rival).name}
                      {match.round > 1 && <span className="text-muted-foreground"> · {pos}º</span>}
                    </span>
                    <Button asChild variant="ghost" size="xs" onClick={() => setCategory(cat.id)}>
                      <Link to="/juego/alineacion">{lineup ? 'Editar equipo' : 'Equipo automático'}</Link>
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">No quedan partidos esta temporada.</p>
          )}
          {nextRound && metroNext.length > 0 && (
            <div className="border-t bg-muted/40 px-4 py-3">
              <p className="mb-1 font-['Barlow_Condensed'] text-xs uppercase tracking-widest text-muted-foreground">
                Liga Metro · mismo fin de semana · juegan los que no tienen minutos en AFA
              </p>
              <ul className="space-y-1 text-sm">
                {metroNext.map(({ cat, match }) => {
                  const rival = match.homeId === game.clubId ? match.awayId : match.homeId
                  return (
                    <li key={cat.id} className="flex items-center gap-2">
                      <span className="w-20 font-semibold">{cat.name}</span>
                      <Crest clubId={rival} className="size-5" />
                      <span className="truncate">{clubById(rival).name}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-md border bg-card">
          <header className="border-b px-4 py-3">
            <h2 className="text-xl uppercase">Últimos resultados</h2>
          </header>
          {last.every((l) => !l.match) ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Todavía no se jugó ninguna fecha. Armá los equipos y tocá <strong>Avanzar</strong>.
            </p>
          ) : (
            <ul className="divide-y">
              {last.map(({ cat, match }) => {
                if (!match) return null
                const home = match.homeId === game.clubId
                const our = home ? match.homeGoals : match.awayGoals
                const their = home ? match.awayGoals : match.homeGoals
                const rival = home ? match.awayId : match.homeId
                const scorers = match.goals.filter((g) => g.clubId === game.clubId)
                return (
                  <li key={cat.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="w-20 pt-0.5 font-semibold">{cat.name}</span>
                    <span
                      className={cn(
                        'w-14 rounded-sm py-0.5 text-center font-display text-lg tabular-nums',
                        our > their
                          ? 'bg-[var(--tier-elite)] text-white'
                          : our < their
                            ? 'bg-destructive text-white'
                            : 'bg-muted',
                      )}
                    >
                      {our}-{their}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <Crest clubId={rival} className="size-5" /> {home ? 'vs' : 'en'} {clubById(rival).name}
                      </p>
                      {scorers.length > 0 && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          ⚽ {scorers.map((g) => `${g.scorerName} ${g.minute}'`).join(', ')}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-md border bg-card">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="flex items-center gap-2 text-xl uppercase">
              <Newspaper className="size-5" /> Novedades
            </h2>
            <Button variant="ghost" size="xs" onClick={readNews}>
              <CheckCheck /> Marcar leídas
            </Button>
          </header>
          <ul className="max-h-[32rem] divide-y overflow-y-auto">
            {game.news.slice(0, 40).map((n) => {
              const Icon = NEWS_ICON[n.kind]
              return (
                <li key={n.id} className={cn('flex gap-3 px-4 py-3', !n.read && 'bg-accent/30')}>
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 font-['Barlow_Condensed'] text-xs uppercase tracking-wide text-muted-foreground">
                      {formatWeek(n.season, n.week)} {n.season}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-md border bg-card">
          <header className="border-b px-4 py-3">
            <h2 className="flex items-center gap-2 text-xl uppercase">
              <Ambulance className="size-5" /> Bajas de la semana
            </h2>
          </header>
          {unavailable.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Todos los jugadores están disponibles.</p>
          ) : (
            <ul className="divide-y text-sm">
              {unavailable.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{playerName(p)}</span>
                    <span className="text-xs text-muted-foreground">
                      {categoryInfo(p.category).name} ·{' '}
                      {p.injury ? p.injury.description : p.duty ? p.duty.label : UNAVAILABLE_LABEL[unavailability(p)!]}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-destructive">
                    {p.injury
                      ? `${p.injury.weeksLeft} sem.`
                      : p.duty
                        ? `${p.duty.weeksLeft} sem.`
                        : p.clubBan > 0
                          ? `${p.clubBan} sem.`
                          : `${p.suspension} ${p.suspension === 1 ? 'fecha' : 'fechas'}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
