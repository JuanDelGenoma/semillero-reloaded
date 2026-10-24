import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { FolderOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SaveSlots, useSaveList } from '@/components/game/save-slots'
import { SiteHeader } from '@/components/game/site-header'
import { useGame } from '@/game/store'
import { useAuth } from '@/lib/auth'
import { deleteSave, loadSave } from '@/lib/saves'

export const Route = createFileRoute('/cargar')({
  head: () => ({ meta: [{ title: 'Cargar carrera · Semillero' }] }),
  component: LoadCareer,
})

function LoadCareer() {
  const { user, ready } = useAuth()
  const { load } = useGame()
  const navigate = useNavigate()
  const { saves, error, refresh } = useSaveList(!!user)
  const [busy, setBusy] = useState<number | null>(null)

  const open = async (slot: number) => {
    setBusy(slot)
    try {
      load(await loadSave(slot), slot)
      toast.success(`Carrera de la ranura ${slot} cargada`)
      navigate({ to: '/juego' })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (slot: number) => {
    if (!window.confirm(`¿Borrar la carrera de la ranura ${slot}? No se puede deshacer.`)) return
    setBusy(slot)
    try {
      await deleteSave(slot)
      toast.success('Carrera borrada')
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-content px-4 py-12 sm:px-6">
        <h1 className="text-5xl uppercase">Carreras guardadas</h1>
        <div className="mt-8 max-w-2xl">
          {!ready ? (
            <Skeleton className="h-40 w-full" />
          ) : !user ? (
            <div className="rounded-md border bg-card p-5">
              <p>Iniciá sesión para ver y cargar tus carreras guardadas.</p>
              <Button asChild className="mt-4">
                <Link to="/cuenta">Ingresar o crear cuenta</Link>
              </Button>
            </div>
          ) : (
            <SaveSlots
              saves={saves}
              error={error}
              onRetry={refresh}
              actions={(slot, meta) =>
                meta ? (
                  <>
                    <Button size="sm" disabled={busy !== null} onClick={() => open(slot)}>
                      <FolderOpen /> {busy === slot ? 'Cargando…' : 'Cargar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Borrar la carrera de la ranura ${slot}`}
                      disabled={busy !== null}
                      onClick={() => remove(slot)}
                    >
                      <Trash2 />
                    </Button>
                  </>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/nueva">Nueva carrera</Link>
                  </Button>
                )
              }
            />
          )}
        </div>
      </main>
    </div>
  )
}
