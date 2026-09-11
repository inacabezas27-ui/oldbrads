import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Spinner } from './ui'

/**
 * La herramienta de gestión es solo de la directiva.
 *
 * Tener la sesión iniciada no alcanza: las 26 cuentas del plantel entran con
 * el mismo Supabase, así que si acá solo se mirara la sesión, cualquier
 * jugador podría abrir las finanzas del club escribiendo /panel en la barra.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, perfilListo, esDirectiva } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!perfilListo) return <Spinner />
  if (!esDirectiva) return <Navigate to="/jugadores" replace />
  return <>{children}</>
}
