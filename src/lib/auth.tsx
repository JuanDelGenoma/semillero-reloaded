import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

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

/** Turns auth errors into Spanish messages for the UI. */
export function authMessage(error: unknown) {
  const msg = error instanceof Error ? error.message.toLowerCase() : ''
  const status = (error as { status?: number } | null)?.status
  if (msg.includes('invalid login') || msg.includes('not confirmed'))
    return 'Email o contraseña incorrectos, o falta confirmar el email.'
  if (msg.includes('signups not allowed')) return 'El registro de cuentas está cerrado.'
  if (msg.includes('password') || status === 422)
    return 'Revisá el email y usá una contraseña de al menos 8 caracteres.'
  if (status === 429 || msg.includes('rate limit')) return 'Demasiados intentos. Esperá unos minutos.'
  if (error instanceof Error && error.message) return error.message
  return 'No se pudo conectar. Probá de nuevo.'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      recovering,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/cuenta` },
        })
        if (error) throw error
        return !data.session
      },
      signOut: async () => {
        await supabase.auth.signOut()
        setUser(null)
      },
      recover: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/cuenta`,
        })
        if (error) throw error
      },
      setPassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
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
