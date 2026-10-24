import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Crest } from '@/components/game/crest'
import { CLUBS } from '@/game/data/clubs'
import { useGame } from '@/game/store'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/nueva')({
  head: () => ({ meta: [{ title: 'Nueva carrera · Semillero' }] }),
  component: NewCareer,
})

const academyLabel = (prestige: number) =>
  prestige >= 92 ? 'Cantera de élite' : prestige >= 84 ? 'Cantera top' : prestige >= 74 ? 'Cantera sólida' : 'Cantera en desarrollo'

function NewCareer() {
  const { start } = useGame()
  const navigate = useNavigate()
  const [clubId, setClubId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const club = CLUBS.find((c) => c.id === clubId)

  const begin = () => {
    if (!clubId) return
    start(clubId, name.trim() || 'Coordinador')
    void navigate({ to: '/juego' })
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="font-display text-2xl uppercase">
            Semillero
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10 hover:text-white">
            <Link to="/">
              <ArrowLeft /> Volver
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <h1 className="text-5xl uppercase">Elegí tu club</h1>
        <p className="mt-2 max-w-reading text-muted-foreground">
          Vas a coordinar todas las divisiones juveniles, de novena a cuarta. Los clubes grandes tienen canteras más
          fuertes; los chicos, más margen para sorprender.
        </p>

        <div className="mt-6 max-w-sm space-y-2">
          <Label htmlFor="dt">Tu nombre</Label>
          <Input id="dt" placeholder="Ej.: Coordinador" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CLUBS.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setClubId(c.id)}
                aria-pressed={clubId === c.id}
                className={cn(
                  'flex w-full items-center gap-4 rounded-md border bg-card p-4 text-left transition-colors hover:border-[var(--tier-good)] motion-reduce:transition-none',
                  clubId === c.id && 'border-primary ring-2 ring-primary',
                )}
              >
                <Crest clubId={c.id} className="size-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="block text-sm text-muted-foreground">{c.city}</span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-xl tabular-nums">{c.prestige}</span>
                  <span className="block font-['Barlow_Condensed'] text-xs uppercase tracking-wide text-muted-foreground">
                    {academyLabel(c.prestige)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-4 sm:px-6">
          {club ? (
            <div className="flex items-center gap-3">
              <Crest clubId={club.id} className="size-10" />
              <div>
                <p className="font-semibold">{club.name}</p>
                <p className="text-sm text-muted-foreground">Temporada 2027 · Liga AFA juveniles</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Seleccioná un club para empezar.</p>
          )}
          <Button size="lg" disabled={!club} onClick={begin}>
            Firmar contrato <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
