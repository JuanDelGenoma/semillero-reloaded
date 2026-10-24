import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Crest } from '@/components/game/crest'
import { clubById } from '@/game/data/clubs'
import { SAVE_SLOTS, formatSavedAt, listSaves, type SaveMeta } from '@/lib/saves'

/** Loads the user's slot list. `version` lets callers refresh it after a save or delete. */
export function useSaveList(enabled: boolean) {
  const [saves, setSaves] = useState<SaveMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    listSaves()
      .then((s) => {
        if (!alive) return
        setSaves(s)
        setError(null)
      })
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [enabled, version])

  return { saves, error, refresh: () => setVersion((v) => v + 1) }
}

/** The three save slots, each with its own actions. */
export function SaveSlots({
  saves,
  error,
  onRetry,
  actions,
}: {
  saves: SaveMeta[] | null
  error: string | null
  onRetry: () => void
  actions: (slot: number, meta: SaveMeta | undefined) => React.ReactNode
}) {
  if (error)
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p>{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          <RefreshCw /> Reintentar
        </Button>
      </div>
    )
  if (!saves)
    return (
      <ul className="space-y-3" aria-busy>
        {SAVE_SLOTS.map((s) => (
          <li key={s}>
            <Skeleton className="h-[4.5rem] w-full" />
          </li>
        ))}
      </ul>
    )
  return (
    <ul className="space-y-3">
      {SAVE_SLOTS.map((slot) => {
        const meta = saves.find((x) => x.slot === slot)
        return (
          <li key={slot} className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
            <span className="w-8 text-center font-display text-2xl text-muted-foreground">{slot}</span>
            {meta ? (
              <>
                <Crest clubId={meta.clubId} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{clubById(meta.clubId).name}</span>
                  <span className="block text-xs text-muted-foreground">
                    Temporada {meta.season} · semana {meta.week} · {meta.managerName} · guardada{' '}
                    {formatSavedAt(meta.updatedAt)}
                  </span>
                </span>
              </>
            ) : (
              <span className="flex-1 text-sm text-muted-foreground">Ranura vacía</span>
            )}
            <span className="flex gap-2">{actions(slot, meta)}</span>
          </li>
        )
      })}
    </ul>
  )
}
