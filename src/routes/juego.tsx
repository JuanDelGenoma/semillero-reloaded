import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Binoculars,
  ChevronDown,
  FastForward,
  Globe2,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  Shirt,
  Swords,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Crest } from '@/components/game/crest'
import { SaveControls } from '@/components/game/save-controls'
import { CATEGORIES } from '@/game/categories'
import { clubById } from '@/game/data/clubs'
import { RatingBadge } from '@/components/game/rating'
import { cutCandidates, formatWeek, seasonDate, playerName, promotionCandidates, yearAge } from '@/game/engine'
import { SEASON_WEEKS } from '@/game/fixtures'
import { useGame } from '@/game/store'

export const Route = createFileRoute('/juego')({
  head: () => ({ meta: [{ title: 'Oficina · Semillero' }] }),
  component: GameLayout,
})

const NAV = [
  { to: '/juego', label: 'Oficina', icon: LayoutDashboard, exact: true },
  { to: '/juego/plantel', label: 'Plantel', icon: Users },
  { to: '/juego/alineacion', label: 'Alineación', icon: Shirt },
  { to: '/juego/partidos', label: 'Partidos', icon: Swords },
  { to: '/juego/tablas', label: 'Tablas', icon: ListOrdered },
  { to: '/juego/captacion', label: 'Captación', icon: Binoculars },
  { to: '/juego/internacional', label: 'Internacional', icon: Globe2 },
] as const

function GameLayout() {
  const { game, advance } = useGame()
  const [closing, setClosing] = useState(false)

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-5xl uppercase">Sin carrera activa</h1>
          <p className="mt-3 text-muted-foreground">Elegí un club para hacerte cargo de sus inferiores.</p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/nueva">Nueva carrera</Link>
          </Button>
        </div>
      </div>
    )
  }

  const club = clubById(game.clubId)
  const unread = game.news.filter((n) => !n.read).length + game.decisions.length

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-content items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="hidden font-display text-xl uppercase sm:block" aria-label="Semillero, inicio">
            Semillero
          </Link>
          <span className="hidden h-6 w-px bg-white/20 sm:block" />
          <Crest clubId={club.id} className="size-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{club.name}</p>
            <p className="font-['Barlow_Condensed'] text-sm uppercase tracking-wide text-primary-foreground/70">
              Año {seasonDate(game.season, game.week).getFullYear()} · Temporada {game.season} · Semana {game.week}/
              {SEASON_WEEKS} · {formatWeek(game.season, game.week)} de{' '}
              {seasonDate(game.season, game.week).getFullYear()}
            </p>
          </div>
          <SaveControls />
          {game.seasonOver ? (
            <Button
              onClick={() => setClosing(true)}
              className="bg-[var(--gold)] text-[oklch(0.2_0.05_262)] hover:bg-[var(--gold)]/90"
            >
              Cerrar temporada
            </Button>
          ) : (
            <div className="flex">
              <Button
                onClick={() => advance(1)}
                className="rounded-r-none bg-[var(--celeste)] text-[oklch(0.2_0.06_262)] hover:bg-[var(--celeste)]/90"
              >
                <FastForward /> Avanzar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label="Más opciones para avanzar"
                    className="rounded-l-none border-l border-black/15 bg-[var(--celeste)] px-2 text-[oklch(0.2_0.06_262)] hover:bg-[var(--celeste)]/90"
                  >
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => advance(1)}>Avanzar 1 semana</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => advance(4)}>Avanzar 4 semanas</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => advance(SEASON_WEEKS)}>
                    Simular hasta fin de temporada
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <nav className="mx-auto flex max-w-content gap-1 overflow-x-auto px-2 sm:px-4" aria-label="Secciones">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: 'exact' in n }}
              className="inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-primary-foreground/70 transition-colors hover:text-primary-foreground motion-reduce:transition-none"
              activeProps={{
                className: '!border-[var(--celeste)] !text-primary-foreground',
              }}
            >
              <n.icon className="size-4" />
              {n.label}
              {n.to === '/juego' && unread > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-sm bg-[var(--celeste)] px-1 text-xs text-[oklch(0.2_0.06_262)]">
                  <Inbox className="size-3" />
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-content px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <SeasonCloseDialog open={closing} onClose={() => setClosing(false)} />
    </div>
  )
}

function SeasonCloseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { game } = useGame()
  if (!game) return null
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {game.cuts && !game.cuts.done ? <CutsStep /> : <SeasonSummary onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

/** The board's release request: pick the players to let go in each category. */
function CutsStep() {
  const { game, release } = useGame()
  const [ids, setIds] = useState<string[]>([])
  if (!game?.cuts) return null
  const required = game.cuts.required
  const cats = CATEGORIES.filter((c) => (required[c.id] ?? 0) > 0)
  const chosenIn = (cat: (typeof CATEGORIES)[number]['id']) =>
    cutCandidates(game, cat).filter((p) => ids.includes(p.id)).length
  const ready = cats.every((c) => chosenIn(c.id) >= (required[c.id] ?? 0))

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-3xl uppercase">Pedido de la coordinación</DialogTitle>
        <DialogDescription>
          Para hacer lugar a la camada {game.season + 1 - 14} y a los fichajes, la comisión pide liberar jugadores en
          cada categoría. Los que suben a Reserva no cuentan. Elegí a quiénes dejar ir.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        {cats.map((c) => {
          const need = required[c.id] ?? 0
          const done = chosenIn(c.id)
          return (
            <section key={c.id} className="rounded-md border">
              <header className="flex items-center justify-between border-b px-3 py-2">
                <h3 className="font-display text-lg uppercase">{c.name}</h3>
                <span
                  className={
                    done >= need ? 'text-sm font-semibold text-[var(--tier-elite)]' : 'text-sm text-muted-foreground'
                  }
                >
                  {done}/{need} descartes
                </span>
              </header>
              <ul className="grid max-h-48 gap-x-3 overflow-y-auto p-2 sm:grid-cols-2">
                {cutCandidates(game, c.id).map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-muted">
                      <Checkbox
                        checked={ids.includes(p.id)}
                        onCheckedChange={() =>
                          setIds((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))
                        }
                        aria-label={`Descartar a ${playerName(p)}`}
                      />
                      <span className="w-8 font-['Barlow_Condensed'] text-xs font-bold">{p.position}</span>
                      <span className="min-w-0 flex-1 truncate">{playerName(p)}</span>
                      <RatingBadge value={p.ovr} />
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
      <DialogFooter>
        <Button
          size="lg"
          disabled={!ready}
          onClick={() => {
            const err = release(ids)
            if (err) toast.error(err)
            else toast.success('Descartes confirmados')
          }}
        >
          Confirmar descartes ({ids.length})
        </Button>
      </DialogFooter>
    </>
  )
}

function SeasonSummary({ onClose }: { onClose: () => void }) {
  const { game, nextSeason } = useGame()
  if (!game) return null
  const summary = game.history.find((h) => h.season === game.season)
  const promoted = promotionCandidates(game)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-3xl uppercase">Cierre de temporada {game.season}</DialogTitle>
        <DialogDescription>
          Campeones de la Liga AFA y la Liga Metro, jugadores que suben a Reserva y la camada {game.season - 13} que
          llega a novena.
        </DialogDescription>
      </DialogHeader>

      <section>
        <h3 className="mb-2 text-lg uppercase">Campeones</h3>
        <ul className="divide-y rounded-md border">
          {CATEGORIES.map((c) => {
            const id = summary?.champions[c.id]
            return (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-20 font-semibold">{c.name}</span>
                {id && <Crest clubId={id} className="size-6" />}
                <span className={id === game.clubId ? 'font-semibold text-[var(--tier-elite)]' : ''}>
                  {id ? clubById(id).name : '—'}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {summary?.metroChampions && (
        <section>
          <h3 className="mb-2 text-lg uppercase">Campeones Liga Metro</h3>
          <ul className="divide-y rounded-md border">
            {CATEGORIES.filter((c) => summary.metroChampions?.[c.id]).map((c) => {
              const id = summary.metroChampions![c.id]!
              return (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-20 font-semibold">{c.name}</span>
                  <Crest clubId={id} className="size-6" />
                  <span className={id === game.clubId ? 'font-semibold text-[var(--tier-elite)]' : ''}>
                    {clubById(id).name}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {(game.messiCup.result || summary?.released?.length || game.promotedThisSeason.length > 0) && (
        <section className="space-y-1 text-sm">
          {game.messiCup.result && (
            <p>
              <strong>Messi Cup:</strong> {game.messiCup.result}
            </p>
          )}
          {game.promotedThisSeason.length > 0 && (
            <p>
              <strong>Subieron a Reserva tras un Mundial:</strong> {game.promotedThisSeason.join(', ')}
            </p>
          )}
          {summary?.released && summary.released.length > 0 && (
            <p>
              <strong>Descartados:</strong> {summary.released.join(', ')}
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-2 text-lg uppercase">Suben a Reserva ({promoted.length})</h3>
        {promoted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie deja las inferiores este año.</p>
        ) : (
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {promoted.map((p) => (
              <li key={p.id} className="flex justify-between rounded-sm bg-muted px-2 py-1">
                <span>{playerName(p)}</span>
                <span className="text-muted-foreground">
                  {yearAge(p, game.season)} años
                  {yearAge(p, game.season) < 19 ? ' · precoz' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DialogFooter>
        <Button
          size="lg"
          onClick={() => {
            nextSeason()
            onClose()
          }}
        >
          Empezar temporada {game.season + 1}
        </Button>
      </DialogFooter>
    </>
  )
}
