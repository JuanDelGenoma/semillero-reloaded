import { Link } from '@tanstack/react-router'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Check, CloudUpload, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SaveSlots, useSaveList } from '@/components/game/save-slots'
import { useActiveGame } from '@/game/store'
import type { GameState } from '@/game/types'
import { useAuth } from '@/lib/auth'
import { saveCareer } from '@/lib/saves'

const AUTOSAVE_KEY = 'semillero-autosave'
const listeners = new Set<() => void>()
const autosaveStore = {
  subscribe: (fn: () => void) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  get: () => localStorage.getItem(AUTOSAVE_KEY) !== 'off',
  set: (v: boolean) => {
    localStorage.setItem(AUTOSAVE_KEY, v ? 'on' : 'off')
    listeners.forEach((fn) => fn())
  },
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

/** "Guardar" button for the top bar, the slot dialog and autosave after every week. */
export function SaveControls() {
  const { game, slot, savedGame, markSaved } = useActiveGame()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  // Browser storage is only read on the client; the server renders autosave as on.
  const autosave = useSyncExternalStore(autosaveStore.subscribe, autosaveStore.get, () => true)
  const [status, setStatus] = useState<Status>('idle')

  const save = async (target: number, state: GameState) => {
    setStatus('saving')
    try {
      await saveCareer(target, state)
      markSaved(state, target)
      setStatus('saved')
      return true
    } catch (e) {
      setStatus('error')
      toast.error('No se pudo guardar la carrera', { description: (e as Error).message })
      return false
    }
  }

  // Autosave when the calendar moves, not on every lineup tweak.
  const stamp = `${game.season}-${game.week}-${game.seasonOver}`
  useEffect(() => {
    if (!autosave || !user || !slot || savedGame === game) return
    const t = setTimeout(() => void save(slot, game), 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, autosave, user, slot])

  // Warn before closing the tab with unsaved progress.
  const dirty = savedGame !== game
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const Icon = status === 'saving' ? Loader2 : dirty ? Save : Check
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-primary-foreground hover:bg-white/10 hover:text-white"
        aria-label={dirty ? 'Guardar carrera (hay cambios sin guardar)' : 'Guardar carrera'}
      >
        <Icon className={status === 'saving' ? 'animate-spin motion-reduce:animate-none' : ''} />
        <span className="hidden md:inline">{status === 'saving' ? 'Guardando…' : dirty ? 'Guardar' : 'Guardado'}</span>
      </Button>
      <SaveDialog
        open={open}
        onClose={() => setOpen(false)}
        autosave={autosave}
        onAutosave={autosaveStore.set}
        onSave={async (target) => {
          if (await save(target, game)) {
            toast.success(`Carrera guardada en la ranura ${target}`)
            setOpen(false)
          }
        }}
        saving={status === 'saving'}
      />
    </>
  )
}

function SaveDialog({
  open,
  onClose,
  autosave,
  onAutosave,
  onSave,
  saving,
}: {
  open: boolean
  onClose: () => void
  autosave: boolean
  onAutosave: (v: boolean) => void
  onSave: (slot: number) => void
  saving: boolean
}) {
  const { slot } = useActiveGame()
  const { user, ready } = useAuth()
  const { saves, error, refresh } = useSaveList(open && !!user)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl uppercase">Guardar carrera</DialogTitle>
          <DialogDescription>
            Las carreras se guardan en tu cuenta. Podés tener hasta tres y cargarlas desde cualquier dispositivo.
          </DialogDescription>
        </DialogHeader>
        {!ready ? null : !user ? (
          <div className="rounded-md border bg-muted/50 p-4 text-sm">
            <p>Para guardar necesitás una cuenta. La carrera actual no se pierde mientras no cierres la pestaña.</p>
            <Button asChild className="mt-3" onClick={onClose}>
              <Link to="/cuenta">Ingresar o crear cuenta</Link>
            </Button>
          </div>
        ) : (
          <>
            <SaveSlots
              saves={saves}
              error={error}
              onRetry={refresh}
              actions={(s, meta) => (
                <Button
                  size="sm"
                  variant={s === slot ? 'default' : 'outline'}
                  disabled={saving}
                  onClick={() => {
                    if (meta && s !== slot && !window.confirm(`¿Reemplazar la carrera guardada en la ranura ${s}?`)) return
                    onSave(s)
                  }}
                >
                  <CloudUpload /> {s === slot ? 'Guardar' : meta ? 'Reemplazar' : 'Guardar acá'}
                </Button>
              )}
            />
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2">
              <Label htmlFor="autosave" className="text-sm font-normal">
                Autoguardado: guardar en la ranura {slot ?? 'elegida'} cada vez que avanza la semana
              </Label>
              <Switch id="autosave" checked={autosave} onCheckedChange={onAutosave} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
