import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Crest } from '@/components/game/crest'
import { formatWeek, money } from '@/game/engine'
import { useActiveGame } from '@/game/store'

/** Pending offers, candidates and random events that need the coordinator's answer. */
export function DecisionsPanel() {
  const { game, resolve } = useActiveGame()
  if (game.decisions.length === 0) return null

  return (
    <section className="rounded-md border-2 border-[var(--gold)] bg-card" aria-labelledby="decisiones">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 id="decisiones" className="flex items-center gap-2 text-xl uppercase">
          <AlertCircle className="size-5 text-[var(--gold)]" /> Decisiones pendientes ({game.decisions.length})
        </h2>
        <span className="font-['Barlow_Condensed'] text-sm uppercase tracking-wide text-muted-foreground">
          Presupuesto {money(game.funds)}
        </span>
      </header>
      <ul className="divide-y">
        {game.decisions.map((d) => (
          <li key={d.id} className="space-y-3 px-4 py-4">
            <div className="flex gap-3">
              {d.teamId && <Crest clubId={d.teamId} className="size-9" />}
              <div className="min-w-0">
                <p className="font-semibold">{d.title}</p>
                <p className="text-sm text-muted-foreground">{d.body}</p>
                <p className="mt-1 font-['Barlow_Condensed'] text-xs uppercase tracking-wide text-muted-foreground">
                  Respondé antes del {formatWeek(d.expires.season, d.expires.week)} · si no, se toma la opción por
                  defecto
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {d.options.map((o) => {
                const broke = !!o.cost && o.cost > game.funds
                return (
                  <Button
                    key={o.id}
                    size="sm"
                    variant={o.id === d.options[0].id ? 'default' : 'outline'}
                    disabled={broke}
                    title={broke ? 'No alcanza el presupuesto' : o.hint}
                    onClick={() => {
                      const err = resolve(d.id, o.id)
                      if (err) toast.error(err)
                    }}
                  >
                    {o.label}
                    {o.hint && <span className="text-xs opacity-75">· {o.hint}</span>}
                  </Button>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
