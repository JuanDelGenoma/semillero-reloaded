import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CategoryPicker } from '@/components/game/category-picker'
import { CompetitionPicker } from '@/components/game/competition-picker'
import { Crest } from '@/components/game/crest'
import { categoryInfo } from '@/game/categories'
import { clubById } from '@/game/data/clubs'
import { COMPETITION_NAME, formatWeek, hasMetro, userMatches } from '@/game/engine'
import { useActiveGame } from '@/game/store'
import type { CategoryId, Competition, Match } from '@/game/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/juego/partidos')({
  head: () => ({ meta: [{ title: 'Partidos · Semillero' }] }),
  component: Matches,
})

function Matches() {
  const { category } = useActiveGame()
  const [comp, setComp] = useState<Competition>('afa')
  const effective = hasMetro(category) ? comp : 'afa'
  return <MatchesView key={`${category}-${effective}`} category={category} comp={effective} onComp={setComp} />
}

function MatchesView({
  category,
  comp,
  onComp,
}: {
  category: CategoryId
  comp: Competition
  onComp: (c: Competition) => void
}) {
  const { game } = useActiveGame()
  const info = categoryInfo(category)
  const mine = userMatches(game, category, comp)
  const rounds = mine.length
  const lastPlayed = mine.filter((m) => m.played).at(-1)?.round ?? 1
  const [round, setRound] = useState(lastPlayed)
  const [open, setOpen] = useState<string | null>(
    lastPlayed > 0 ? (mine.find((m) => m.round === lastPlayed)?.id ?? null) : null,
  )
  const roundMatches = game.matches.filter(
    (m) => m.competition === comp && m.category === category && m.round === round,
  )
  const record = mine.reduce(
    (r, m) => {
      if (!m.played) return r
      const home = m.homeId === game.clubId
      const d = (home ? m.homeGoals : m.awayGoals) - (home ? m.awayGoals : m.homeGoals)
      return d > 0 ? { ...r, g: r.g + 1 } : d < 0 ? { ...r, p: r.p + 1 } : { ...r, e: r.e + 1 }
    },
    { g: 0, e: 0, p: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-['Barlow_Condensed'] text-sm uppercase tracking-widest text-muted-foreground">
            {COMPETITION_NAME[comp]} {game.season} · {info.label}
          </p>
          <h1 className="text-4xl uppercase sm:text-5xl">Partidos de {info.name}</h1>
        </div>
        <p className="font-display text-2xl tabular-nums">
          <span className="text-[var(--tier-elite)]">{record.g}G</span> · {record.e}E ·{' '}
          <span className="text-destructive">{record.p}P</span>
        </p>
      </div>

      <CategoryPicker />
      <CompetitionPicker category={category} value={comp} onChange={onComp} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-md border bg-card">
          <header className="border-b px-4 py-3">
            <h2 className="text-xl uppercase">Fixture del club</h2>
          </header>
          <ul className="divide-y">
            {mine.map((m) => (
              <li key={m.id}>
                <MatchRow match={m} expanded={open === m.id} onToggle={() => setOpen(open === m.id ? null : m.id)} />
              </li>
            ))}
          </ul>
        </section>

        <section className="h-fit rounded-md border bg-card lg:sticky lg:top-32">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-xl uppercase">Fecha {round}</h2>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Fecha anterior"
                disabled={round <= 1}
                onClick={() => setRound(round - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Fecha siguiente"
                disabled={round >= rounds}
                onClick={() => setRound(round + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </header>
          <ul className="divide-y text-sm">
            {roundMatches.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2',
                  (m.homeId === game.clubId || m.awayId === game.clubId) && 'bg-accent/40 font-semibold',
                )}
              >
                <span className="flex min-w-0 items-center justify-end gap-2 text-right">
                  <span className="truncate">{clubById(m.homeId).name}</span>
                  <Crest clubId={m.homeId} className="size-5" />
                </span>
                <span className="w-12 text-center font-display tabular-nums">
                  {m.played ? `${m.homeGoals}-${m.awayGoals}` : '–'}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <Crest clubId={m.awayId} className="size-5" />
                  <span className="truncate">{clubById(m.awayId).name}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function MatchRow({ match: m, expanded, onToggle }: { match: Match; expanded: boolean; onToggle: () => void }) {
  const { game } = useActiveGame()
  const home = m.homeId === game.clubId
  const rival = home ? m.awayId : m.homeId
  const our = home ? m.homeGoals : m.awayGoals
  const their = home ? m.awayGoals : m.homeGoals
  const result = !m.played ? null : our > their ? 'G' : our < their ? 'P' : 'E'

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        disabled={!m.played}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent motion-reduce:transition-none"
      >
        <span className="w-14 font-['Barlow_Condensed'] text-sm uppercase text-muted-foreground">F{m.round}</span>
        <span className="hidden w-24 text-xs text-muted-foreground sm:block">{formatWeek(game.season, m.week)}</span>
        <span className="w-10 rounded-sm bg-muted text-center text-[10px] font-bold uppercase">{home ? 'L' : 'V'}</span>
        <Crest clubId={rival} className="size-6" />
        <span className="min-w-0 flex-1 truncate">{clubById(rival).name}</span>
        {result ? (
          <span
            className={cn(
              'w-14 rounded-sm py-0.5 text-center font-display tabular-nums',
              result === 'G'
                ? 'bg-[var(--tier-elite)] text-white'
                : result === 'P'
                  ? 'bg-destructive text-white'
                  : 'bg-muted',
            )}
          >
            {our}-{their}
          </span>
        ) : (
          <span className="w-14 text-center text-xs text-muted-foreground">Por jugar</span>
        )}
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
            !m.played && 'invisible',
          )}
        />
      </button>
      {expanded && m.played && <MatchDetail match={m} />}
    </>
  )
}

function MatchDetail({ match: m }: { match: Match }) {
  const events = [
    ...m.goals.map((g) => ({
      minute: g.minute,
      clubId: g.clubId,
      kind: 'goal' as const,
      text: g.scorerName,
      extra: g.assistName,
    })),
    ...m.cards.map((c) => ({
      minute: c.minute,
      clubId: c.clubId,
      kind: c.type,
      text: c.playerName,
      extra: undefined,
    })),
    ...m.injuries.map((i) => ({
      minute: 0,
      clubId: i.clubId,
      kind: 'injury' as const,
      text: i.playerName,
      extra: undefined,
    })),
  ].sort((a, b) => a.minute - b.minute)

  return (
    <div className="border-t bg-muted/40 px-4 py-4">
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="flex items-center justify-end gap-2 text-right font-semibold">
          {clubById(m.homeId).name} <Crest clubId={m.homeId} className="size-8" />
        </span>
        <span className="font-display text-3xl tabular-nums">
          {m.homeGoals} - {m.awayGoals}
        </span>
        <span className="flex items-center gap-2 font-semibold">
          <Crest clubId={m.awayId} className="size-8" /> {clubById(m.awayId).name}
        </span>
      </div>
      {events.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Partido sin goles ni tarjetas.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {events.map((e, i) => {
            const isHome = e.clubId === m.homeId
            const icon =
              e.kind === 'goal' ? (
                '⚽'
              ) : e.kind === 'injury' ? (
                '🩹'
              ) : (
                <span
                  className={cn(
                    'inline-block h-3.5 w-2.5 rounded-[1px]',
                    e.kind === 'yellow' ? 'bg-[var(--gold)]' : 'bg-destructive',
                  )}
                />
              )
            const label = (
              <span>
                <span className="font-semibold">{e.text}</span>
                {e.extra && <span className="text-muted-foreground"> (asist. {e.extra})</span>}
                {e.kind === 'injury' && <span className="text-muted-foreground"> se lesionó</span>}
              </span>
            )
            return (
              <li key={i} className="grid grid-cols-[1fr_3rem_1fr] items-center gap-2">
                <span className="flex items-center justify-end gap-2 text-right">
                  {isHome && (
                    <>
                      {label} {icon}
                    </>
                  )}
                </span>
                <span className="text-center font-['Barlow_Condensed'] text-muted-foreground">
                  {e.minute ? `${e.minute}'` : ''}
                </span>
                <span className="flex items-center gap-2">
                  {!isHome && (
                    <>
                      {icon} {label}
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
