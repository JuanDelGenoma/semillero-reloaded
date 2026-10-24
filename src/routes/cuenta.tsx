import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { LogOut, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SiteHeader } from '@/components/game/site-header'
import { useGame } from '@/game/store'
import { authMessage, useAuth } from '@/lib/auth'

export const Route = createFileRoute('/cuenta')({
  head: () => ({ meta: [{ title: 'Tu cuenta · Semillero' }] }),
  component: Account,
})

function Account() {
  const { user, ready, recovering } = useAuth()
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <h1 className="text-5xl uppercase">Tu cuenta</h1>
        <p className="mt-2 text-muted-foreground">
          Con una cuenta guardás tus carreras en la nube y las seguís desde cualquier dispositivo. Tenés tres ranuras de
          guardado.
        </p>
        <div className="mt-8">
          {!ready ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : recovering ? (
            <NewPasswordForm />
          ) : user ? (
            <SignedIn />
          ) : (
            <AuthForms />
          )}
        </div>
      </main>
    </div>
  )
}

function SignedIn() {
  const { user, signOut } = useAuth()
  const { game } = useGame()
  return (
    <div className="space-y-4 rounded-md border bg-card p-5">
      <p>
        Sesión iniciada como <strong>{user?.email}</strong>.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to={game ? '/juego' : '/cargar'}>
            <Save /> {game ? 'Volver a la carrera' : 'Mis carreras guardadas'}
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut()
            toast.success('Cerraste sesión')
          }}
        >
          <LogOut /> Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

function useSubmit() {
  const [pending, setPending] = useState(false)
  const run = async (fn: () => Promise<void>) => {
    setPending(true)
    try {
      await fn()
    } catch (e) {
      toast.error(authMessage(e))
    } finally {
      setPending(false)
    }
  }
  return { pending, run }
}

function AuthForms() {
  const { signIn, signUp, recover } = useAuth()
  const { game } = useGame()
  const navigate = useNavigate()
  const { pending, run } = useSubmit()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const after = () => navigate({ to: game ? '/juego' : '/cargar' })

  const fields = (autoComplete: string) => (
    <>
      <div className="space-y-1">
        <Label htmlFor={`email-${autoComplete}`}>Email</Label>
        <Input
          id={`email-${autoComplete}`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`pass-${autoComplete}`}>Contraseña</Label>
        <Input
          id={`pass-${autoComplete}`}
          type="password"
          required
          minLength={8}
          autoComplete={autoComplete}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    </>
  )

  return (
    <Tabs defaultValue="ingresar" onValueChange={() => setNotice(null)}>
      <TabsList className="w-full">
        <TabsTrigger value="ingresar">Ingresar</TabsTrigger>
        <TabsTrigger value="crear">Crear cuenta</TabsTrigger>
        <TabsTrigger value="olvide">Olvidé la clave</TabsTrigger>
      </TabsList>

      {notice && (
        <p role="status" className="mt-4 rounded-md border border-[var(--tier-good)]/40 bg-[var(--tier-good)]/10 p-3 text-sm">
          {notice}
        </p>
      )}

      <TabsContent value="ingresar">
        <form
          className="mt-4 space-y-4 rounded-md border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              await signIn(email, password)
              toast.success('¡Bienvenido de nuevo!')
              after()
            })
          }}
        >
          {fields('current-password')}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="crear">
        <form
          className="mt-4 space-y-4 rounded-md border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              const needsConfirmation = await signUp(email, password)
              if (needsConfirmation) {
                setNotice('Te mandamos un email para confirmar la cuenta. Abrí el enlace y después ingresá.')
              } else {
                toast.success('Cuenta creada')
                after()
              }
            })
          }}
        >
          {fields('new-password')}
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="olvide">
        <form
          className="mt-4 space-y-4 rounded-md border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              await recover(email)
              setNotice('Si el email tiene una cuenta, te llega un enlace para elegir una contraseña nueva.')
            })
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="email-recover">Email</Label>
            <Input
              id="email-recover"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  )
}

function NewPasswordForm() {
  const { setPassword } = useAuth()
  const { pending, run } = useSubmit()
  const [password, setValue] = useState('')
  return (
    <form
      className="space-y-4 rounded-md border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault()
        run(async () => {
          await setPassword(password)
          toast.success('Contraseña actualizada')
        })
      }}
    >
      <p className="font-semibold">Elegí una contraseña nueva</p>
      <div className="space-y-1">
        <Label htmlFor="new-pass">Contraseña nueva</Label>
        <Input
          id="new-pass"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar contraseña'}
      </Button>
    </form>
  )
}
