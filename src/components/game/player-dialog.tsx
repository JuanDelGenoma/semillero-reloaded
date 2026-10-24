import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { CATEGORIES, POSITION_NAME, canPlayIn, categoryInfo, naturalCategory } from '@/game/categories'
import { birthYearRange, currentAge, formatWeek, hasMetro, playerName } from '@/game/engine'
import { NATIONALITIES } from '@/game/generate'
import { citizenshipDate } from '@/game/market'
import { useActiveGame } from '@/game/store'
import type { CategoryId, Player, Position } from '@/game/types'

import { PotentialStars, RatingBadge } from './rating'
import { CardsCell, PlayerStatus } from './player-status'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function PlayerDialog({ playerId, onClose }: { playerId: string | null; onClose: () => void }) {
  const { game, registerIn } = useActiveGame()
  const p = game.players.find((x) => x.id === playerId)
  const natural = p ? naturalCategory(p.birthYear, game.season) : null

  return (
    <Dialog open={!!p} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {p && (
          <>
            <DialogHeader>
              <p className="font-['Barlow_Condensed'] text-sm uppercase tracking-widest text-muted-foreground">
                {POSITION_NAME[p.position]} · {categoryInfo(p.category).name}
              </p>
              <DialogTitle className="font-display text-3xl uppercase">{playerName(p)}</DialogTitle>
              <DialogDescription>
                {currentAge(p, game.season, game.week)} años · nació en {MONTHS[p.birthMonth - 1]} de {p.birthYear} ·{' '}
                {p.nationality}
                {!p.citizen && ' · sin ciudadanía argentina'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/50 p-4 text-center">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Nivel</p>
                <RatingBadge value={p.ovr} className="mt-1 h-8 min-w-11 text-lg" />
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Potencial</p>
                <div className="mt-2">
                  <PotentialStars pot={p.pot} />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Estado</p>
                <div className="mt-2">
                  <PlayerStatus player={p} />
                </div>
              </div>
            </div>

            {p.duty && (
              <p className="rounded-md border border-[var(--tier-good)]/40 bg-[var(--tier-good)]/10 px-3 py-2 text-sm">
                <strong>{p.duty.label}.</strong> Fuera del club {p.duty.weeksLeft}{' '}
                {p.duty.weeksLeft === 1 ? 'semana más' : 'semanas más'}.
              </p>
            )}

            {!p.citizen && (
              <p className="rounded-md border bg-muted/60 px-3 py-2 text-sm">
                Sin ciudadanía argentina: sólo puede jugar la Liga Metro.
                {(() => {
                  const d = citizenshipDate(p)
                  return d ? ` La obtiene el ${formatWeek(d.season, d.week)} de ${d.season}.` : ''
                })()}
              </p>
            )}

            {p.clubBan > 0 && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                Sancionado por el club: {p.clubBan} {p.clubBan === 1 ? 'semana' : 'semanas'} sin jugar.
              </p>
            )}

            {p.injury && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                <strong>{p.injury.description}.</strong> Vuelve en {p.injury.weeksLeft}{' '}
                {p.injury.weeksLeft === 1 ? 'semana' : 'semanas'}.
              </p>
            )}

            <dl className="grid grid-cols-4 gap-2 text-center">
              {[
                ['PJ', p.stats.apps],
                ['Goles', p.stats.goals],
                ['Asist.', p.stats.assists],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border p-2">
                  <dt className="text-xs uppercase text-muted-foreground">{k}</dt>
                  <dd className="font-display text-2xl">{v}</dd>
                </div>
              ))}
              <div className="rounded-md border p-2">
                <dt className="text-xs uppercase text-muted-foreground">Tarjetas</dt>
                <dd className="mt-1.5 flex justify-center text-sm">
                  <CardsCell player={p} />
                </dd>
              </div>
            </dl>
            <p className="-mt-2 text-xs text-muted-foreground">
              Liga AFA {game.season}.
              {(hasMetro(p.category) || p.metroStats.apps > 0) &&
                ` Liga Metro: ${p.metroStats.apps} PJ, ${p.metroStats.goals} goles, ${p.metroStats.assists} asistencias.`}
            </p>

            <EditPlayerForm key={p.id} player={p} />

            <div className="space-y-2">
              <Label htmlFor="cat-select">Categoría en la que está registrado</Label>
              <Select value={p.category} onValueChange={(v) => registerIn(p.id, v as CategoryId)}>
                <SelectTrigger id="cat-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => canPlayIn(p.birthYear, c.id, game.season)).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.id === natural ? ' (por edad)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Puede jugar en su categoría por edad o en una mayor, nunca en una menor. Registrarlo más arriba lo saca
                de las categorías inferiores.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditPlayerForm({ player }: { player: Player }) {
  const { game, updatePlayer } = useActiveGame()
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState(player.firstName)
  const [lastName, setLastName] = useState(player.lastName)
  const [position, setPosition] = useState<Position>(player.position)
  const [ovr, setOvr] = useState(String(Math.round(player.ovr)))
  const [pot, setPot] = useState(String(Math.round(player.pot)))
  const [birthYear, setBirthYear] = useState(String(player.birthYear))
  const [birthMonth, setBirthMonth] = useState(String(player.birthMonth))
  const [nationality, setNationality] = useState(player.nationality)
  const [citizen, setCitizen] = useState(player.citizen)
  const range = birthYearRange(game.season)

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Editar jugador
      </Button>
    )
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const o = Number(ovr)
    const pt = Number(pot)
    if (!firstName.trim() || !lastName.trim()) return toast.error('El nombre y el apellido no pueden quedar vacíos.')
    if (!Number.isFinite(o) || o < 1 || o > 99) return toast.error('El nivel tiene que estar entre 1 y 99.')
    if (!Number.isFinite(pt) || pt < o || pt > 99) return toast.error('El potencial va del nivel actual a 99.')
    const by = Number(birthYear)
    if (!Number.isInteger(by) || by < range.min || by > range.max)
      return toast.error(
        `El año de nacimiento tiene que estar entre ${range.min} y ${range.max} para seguir en inferiores.`,
      )
    updatePlayer(player.id, {
      firstName,
      lastName,
      position,
      ovr: o,
      pot: pt,
      birthYear: by,
      birthMonth: Number(birthMonth),
      nationality,
      citizen: nationality === 'Argentina' || citizen,
    })
    toast.success('Jugador actualizado')
    setOpen(false)
  }

  return (
    <form onSubmit={save} className="grid grid-cols-2 gap-3 rounded-md border p-4">
      <div className="space-y-1">
        <Label htmlFor="ed-first">Nombre</Label>
        <Input id="ed-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ed-last">Apellido</Label>
        <Input id="ed-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div className="col-span-2 space-y-1">
        <Label htmlFor="ed-pos">Posición</Label>
        <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
          <SelectTrigger id="ed-pos" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(POSITION_NAME) as Position[]).map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos} · {POSITION_NAME[pos]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ed-by">Año de nacimiento</Label>
        <Input
          id="ed-by"
          type="number"
          min={range.min}
          max={range.max}
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ed-bm">Mes de nacimiento</Label>
        <Select value={birthMonth} onValueChange={setBirthMonth}>
          <SelectTrigger id="ed-bm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 space-y-1">
        <Label htmlFor="ed-nat">Nacionalidad</Label>
        <Select value={nationality} onValueChange={setNationality}>
          <SelectTrigger id="ed-nat" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NATIONALITIES.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {nationality !== 'Argentina' && (
        <div className="col-span-2 flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2">
          <Label htmlFor="ed-cit" className="text-sm font-normal">
            Tiene ciudadanía argentina (sin ella sólo juega Liga Metro)
          </Label>
          <Switch id="ed-cit" checked={citizen} onCheckedChange={setCitizen} />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="ed-ovr">Nivel (1–99)</Label>
        <Input id="ed-ovr" type="number" min={1} max={99} value={ovr} onChange={(e) => setOvr(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ed-pot">Potencial (hasta 99)</Label>
        <Input id="ed-pot" type="number" min={1} max={99} value={pot} onChange={(e) => setPot(e.target.value)} />
      </div>
      <div className="col-span-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  )
}
