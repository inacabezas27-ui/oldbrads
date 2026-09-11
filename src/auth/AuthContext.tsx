import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Perfil = {
  user_id: string
  jugador_id: string | null
  nombre_usuario: string | null
  rol: 'directiva' | 'jugador'
  /** false mientras siga con la clave inicial que le dio el club */
  clave_cambiada: boolean
}

type AuthState = {
  session: Session | null
  user: User | null
  perfil: Perfil | null
  loading: boolean
  perfilLoading: boolean
  /** true cuando ya se sabe el rol del usuario conectado (o no hay sesión).
   *  Sin esto, el primer render tiene sesión pero todavía no rol, y quien
   *  decide a dónde mandar a alguien lo manda al lugar equivocado. */
  perfilListo: boolean
  esDirectiva: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  recargarPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [perfilLoading, setPerfilLoading] = useState(false)
  // De qué usuario es el perfil que está cargado ahora mismo.
  const [perfilDe, setPerfilDe] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const cargarPerfil = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('perfiles')
      .select('user_id, jugador_id, nombre_usuario, rol, clave_cambiada')
      .eq('user_id', uid)
      .maybeSingle()
    return (data as Perfil) ?? null
  }, [])

  // Cargar el perfil (rol) cada vez que cambia el usuario
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      setPerfil(null)
      setPerfilDe(null)
      return
    }
    let cancel = false
    setPerfilLoading(true)
    cargarPerfil(uid).then((p) => {
      if (!cancel) {
        setPerfil(p)
        setPerfilDe(uid)
        setPerfilLoading(false)
      }
    })
    return () => {
      cancel = true
    }
  }, [session?.user?.id, cargarPerfil])

  const recargarPerfil = useCallback(async () => {
    const uid = session?.user?.id
    if (uid) setPerfil(await cargarPerfil(uid))
  }, [session?.user?.id, cargarPerfil])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? error.message : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        perfil,
        loading,
        perfilLoading,
        perfilListo: !session || perfilDe === session.user.id,
        esDirectiva: perfil?.rol === 'directiva',
        signIn,
        signOut,
        recargarPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
