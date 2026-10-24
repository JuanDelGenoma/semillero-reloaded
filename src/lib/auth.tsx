import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  AuthError,
  MissingIdentityError,
  getUser,
  handleAuthCallback,
  login,
  logout,
  onAuthChange,
  requestPasswordRecovery,
  signup,
  updateUser,
  type User,
} from '@netlify/identity'

interface AuthContextValue {
  user: User | null
  /** False until the session has been read in the browser. */
  ready: boolean
  /** Set after a password-recovery link: the user is logged in and must choose a new password. */
  recovering: boolean
  signIn: (email: string, password: string) => Promise<void>
  /** Resolves to true when the account still needs email confirmation. */
  signUp: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  recover: (email: string) => Promise<void>
  setPassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Turns Identity errors into Spanish messages for the UI. */
export function authMessage(error: unknown) {
  if (error instanceof MissingIdentityError) return 'Las cuentas no están disponibles en este momento.'
  if (error instanceof AuthError) {
    if (error.status === 401) return 'Email o contraseña incorrectos, o falta confirmar el email.'
    if (error.status === 403) return 'El registro de cuentas está cerrado.'
    if (error.status === 422) return 'Revisá el email y usá una contraseña de al menos 8 caracteres.'
    if (error.status === 429) return 'Demasiados intentos. Esperá unos minutos.'
    return error.message
  }
  return 'No se pudo conectar. Probá de nuevo.'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    let alive = true
    const unsubscribe = onAuthChange((event, u) => {
      setUser(u)
      if (event === 'recovery') setRecovering(true)
    })
    ;(async () => {
      try {
        const result = await handleAuthCallback()
        if (result?.type === 'recovery') setRecovering(true)
      } catch {
        // An invalid or expired link: fall through to the normal session.
      }
      const u = await getUser()
      if (alive) {
        setUser(u)
        setReady(true)
      }
    })()
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      recovering,
      signIn: async (email, password) => {
        setUser(await login(email, password))
      },
      signUp: async (email, password) => {
        const u = await signup(email, password)
        if (u.confirmedAt) setUser(u)
        return !u.confirmedAt
      },
      signOut: async () => {
        await logout()
        setUser(null)
      },
      recover: (email) => requestPasswordRecovery(email),
      setPassword: async (password) => {
        setUser(await updateUser({ password }))
        setRecovering(false)
      },
    }),
    [user, ready, recovering],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
