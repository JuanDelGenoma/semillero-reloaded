import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Binoculars, Globe2, Plane } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PotentialStars, RatingBadge } from '@/components/game/rating'
import { CATEGORIES, POSITION_NAME, categoryInfo, naturalCategory } from '@/game/categories'
import { countryByName } from '@/game/data/world'
import { currentAge, formatWeek, money, playerName } from '@/game/engine'
import { MAX_MISSIONS, SCOUT_REGIONS, citizenshipDate } from '@/game/market'
import { useActiveGame } from '@/game/store'
import type { CategoryId, Position, ScoutRegion } from '@/game/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/juego/captacion')({
  head: () => ({ meta: [{ title: 'Captación · Semillero' }] }),
  component: Scouting,
})

function Scouting() {
  const { game } = useActiveGame()
  const big = game.clubId === 'river' || game.clubId === 'boca'
  const foreigners = game.players.filter((p) => !p.citizen)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-['Barlow_Condensed'] text-sm uppercase tracking-widest text-muted-foreground">
            Ojeadores, pruebas y fichajes
          </p>
          <h1 className="text-4xl uppercase sm:text-5xl">Captación</h1>
        </div>
        <p className="text-right">
          <span className="block text-xs uppercase text-muted-foreground">Presupuesto de la cantera</span>
          <span className="font-display text-3xl tabular-nums">{money(game.funds)}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <MissionForm />
        <section className="rounded-md border bg-card">
          <header className="border-b px-4 py-3">
            <h2 className="flex items-center gap-2 text-xl uppercase">
              <Plane className="size-5" /> Ojeadores en viaje ({game.missions.length}/{MAX_MISSIONS})
            </h2>
          </header>
          {game.missions.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No hay ojeadores recorriendo canchas ahora.</p>
          ) : (
            <ul className="divide-y text-sm">
              {game.missions.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span>
                    <span className="block font-semibold">{SCOUT_REGIONS[m.region].label}</span>
                    <span className="text-xs text-muted-foreground">
                      Buscan {m.position ? POSITION_NAME[m.position].toLowerCase() : 'cualquier puesto'} para{' '}
                      {categoryInfo(m.category).name}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Vuelven el {formatWeek(m.returns.season, m.returns.week)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="flex gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
            <Globe2 className="size-4 shrink-0" />
            {big
              ? 'Por el nombre del club, cada tanto llegan candidatos de todo el mundo a pedir una prueba. Aparecen en la Oficina.'
              : 'Muy de vez en cuando algún chico del exterior pide probarse en el club. Aparece en la Oficina.'}
          </p>
        </section>
      </div>

      <Prospects />

      <section className="rounded-md border bg-card">
        <header className="border-b px-4 py-3">
          <h2 className="text-xl uppercase">Extranjeros sin ciudadanía ({foreigners.length})</h2>
          <p className="text-xs text-muted-foreground">
            Necesitan dos años en el país. Mientras tanto sólo juegan la Liga Metro (7ª, 8ª y 9ª).
          </p>
        </header>
        {foreigners.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Todos los jugadores del club tienen ciudadanía argentina.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {foreigners.map((p) => {
              const d = citizenshipDate(p)
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span>
                    <span className="font-semibold">{playerName(p)}</span>{' '}
                    <span className="text-muted-foreground">
                      · {p.nationality} · {categoryInfo(p.category).name}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {d ? `Ciudadanía el ${formatWeek(d.season, d.week)} de ${d.season}` : 'Sin fecha de llegada'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function MissionForm() {
  const { game, sendScouts } = useActiveGame()
  const [region, setRegion] = useState<ScoutRegion>('amba')
  const [cat, setCat] = useState<CategoryId>('novena')
  const [position, setPosition] = useState<Position | 'any'>('any')
  const r = SCOUT_REGIONS[region]
  const full = game.missions.length >= MAX_MISSIONS
  const broke = game.funds < r.cost

  return (
    <section className="rounded-md border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-xl uppercase">
          <Binoculars className="size-5" /> Enviar ojeadores
        </h2>
      </header>
      <form
        className="space-y-4 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          const err = sendScouts(region, cat, position === 'any' ? null : position)
          if (err) toast.error(err)
          else
            toast.success(`Los ojeadores salen hacia ${r.label}`, {
              description: `Vuelven en ${r.weeks} semanas.`,
            })
        }}
      >
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Región</legend>
          {(Object.keys(SCOUT_REGIONS) as ScoutRegion[]).map((id) => {
            const x = SCOUT_REGIONS[id]
            return (
              <label
                key={id}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-md border p-3 transition-colors hover:bg-muted motion-reduce:transition-none',
                  region === id && 'border-primary ring-1 ring-primary',
                )}
              >
                <input
                  type="radio"
                  name="region"
                  value={id}
                  checked={region === id}
                  onChange={() => setRegion(id)}
                  className="mt-1 accent-[var(--primary)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{x.label}</span>
                  <span className="block text-xs text-muted-foreground">{x.description}</span>
                </span>
                <span className="text-right text-xs text-muted-foreground">
                  {money(x.cost)}
                  <br />
                  {x.weeks} semanas
                </span>
              </label>
            )
          })}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="sc-cat">Categoría</Label>
            <Select value={cat} onValueChange={(v) => setCat(v as CategoryId)}>
              <SelectTrigger id="sc-cat" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.label.split('·')[1].trim()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sc-pos">Puesto</Label>
            <Select value={position} onValueChange={(v) => setPosition(v as Position | 'any')}>
              <SelectTrigger id="sc-pos" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquiera</SelectItem>
                {(Object.keys(POSITION_NAME) as Position[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {POSITION_NAME[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={full || broke || game.seasonOver}>
          {full
            ? 'No hay ojeadores libres'
            : broke
              ? 'No alcanza el presupuesto'
              : `Enviar ojeadores · ${money(r.cost)}`}
        </Button>
      </form>
    </section>
  )
}

function Prospects() {
  const { game, trial, sign, dismiss } = useActiveGame()
  const run = (fn: () => string | null, ok?: string) => {
    const err = fn()
    if (err) toast.error(err)
    else if (ok) toast.success(ok)
  }

  return (
    <section className="rounded-md border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="text-xl uppercase">Candidatos ({game.prospects.length})</h2>
        <p className="text-xs text-muted-foreground">
          El nivel es la estimación de los ojeadores hasta que lo pruebes. Si no lo fichás a tiempo, firma en otro club.
        </p>
      </header>
      {game.prospects.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Todavía no hay candidatos. Mandá ojeadores y esperá su informe.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Pos</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-center">Nivel</TableHead>
              <TableHead>Potencial</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {game.prospects.map((pr) => {
              const p = pr.player
              const cat = naturalCategory(p.birthYear, game.season)
              return (
                <TableRow key={pr.id}>
                  <TableCell>
                    <span className="block font-semibold">{playerName(p)}</span>
                    <span className="text-xs text-muted-foreground">
                      {countryByName(p.nationality).code} · {currentAge(p, game.season, game.week)} años · {pr.origin} ·
                      hasta el {formatWeek(pr.expires.season, pr.expires.week)}
                    </span>
                  </TableCell>
                  <TableCell className="font-['Barlow_Condensed'] text-xs font-bold">{p.position}</TableCell>
                  <TableCell>{cat ? categoryInfo(cat).name : '—'}</TableCell>
                  <TableCell className="text-center">
                    {pr.tested ? (
                      <RatingBadge value={p.ovr} />
                    ) : (
                      <span className="tabular-nums text-muted-foreground">
                        {pr.estimate[0]}–{pr.estimate[1]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PotentialStars pot={pr.potEstimate} />
                  </TableCell>
                  <TableCell className="tabular-nums">{money(pr.fee)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {!pr.tested && (
                        <Button size="xs" variant="outline" onClick={() => run(() => trial(pr.id))}>
                          Probar
                        </Button>
                      )}
                      <Button
                        size="xs"
                        disabled={pr.fee > game.funds}
                        onClick={() => run(() => sign(pr.id), `${playerName(p)} firmó con el club`)}
                      >
                        Fichar
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => run(() => dismiss(pr.id))}>
                        Descartar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
