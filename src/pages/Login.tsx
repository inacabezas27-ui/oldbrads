import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Field, Input, Spinner } from '../components/ui'
import Crest from '../components/Crest'
import { BRONCE } from '../lib/marca'


/**
 * Ya hay alguien conectado en este navegador.
 *
 * Sin esta pantalla, escribir /login con una sesión abierta te lanzaba
 * derecho adentro sin decirte con qué cuenta: uno escribe su correo, no
 * alcanza a ver el formulario y termina en la herramienta de otro, creyendo
 * que entró con el suyo.
 */
function SesionAbierta({
  correo,
  esDirectiva,
  onSalir,
}: {
  correo: string
  esDirectiva: boolean
  onSalir: () => void
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 p-4">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(55% 45% at 50% 30%, rgba(0,80,32,0.30), transparent 70%)' }} />
      <div className="relative w-full max-w-sm text-center">
        <div className="mb-8 flex flex-col items-center">
          <Crest size={72} />
          <h1 className="mt-5 text-2xl text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>OLD BRADS</h1>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
          <p className="text-sm text-slate-500">En este navegador ya hay una sesión abierta:</p>
          <p className="mt-1 break-all font-bold text-ink-900">{correo}</p>
          <p className="mt-3 text-sm text-slate-500">
            {esDirectiva
              ? 'Es la cuenta de la directiva, la que administra el club.'
              : 'Es una cuenta de jugador: no abre la herramienta de gestión.'}
          </p>
          <div className="mt-5 space-y-2">
            <Link
              to={esDirectiva ? '/panel' : '/jugadores'}
              className="block w-full rounded-lg px-4 py-2.5 font-bold text-white"
              style={{ background: BRONCE }}
            >
              {esDirectiva ? 'Entrar a la herramienta' : 'Ir a mi carta'}
            </Link>
            <button
              onClick={onSalir}
              className="w-full rounded-lg px-4 py-2.5 font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Salir y entrar con otra cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { session, signIn, signOut, loading: cargandoSesion, perfilListo, esDirectiva } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Distingue la sesión que acaba de abrir este formulario de la que ya
  // estaba: la primera pasa derecho, la segunda pregunta.
  const [reciénEntro, setReciénEntro] = useState(false)

  if (cargandoSesion || (session && !perfilListo)) return <Spinner />
  // Esta puerta es la de la herramienta, pero la usa gente del plantel que
  // llega buscando su carta. Si la cuenta no es de la directiva, se la manda
  // a su zona en vez de dejarla en una pantalla que no le sirve.
  if (session && reciénEntro) return <Navigate to={esDirectiva ? '/panel' : '/jugadores'} replace />
  if (session) {
    return (
      <SesionAbierta
        correo={session.user.email ?? 'sin correo'}
        esDirectiva={esDirectiva}
        onSalir={() => { setReciénEntro(false); signOut() }}
      />
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email.trim(), password)
    if (error) setError('Correo o contraseña incorrectos.')
    else setReciénEntro(true)
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 p-4">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(55% 45% at 50% 30%, rgba(0,80,32,0.30), transparent 70%)' }} />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Crest size={88} />
          <h1 className="mt-5 text-3xl text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>OLD BRADS</h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.3em]" style={{ color: BRONCE }}>Plataforma del club</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
          <Field label="Correo">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="directiva@oldbrads.cl" required autoFocus />
          </Field>
          <Field label="Contraseña">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </Field>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg px-4 py-2.5 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ background: BRONCE }}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">Acceso solo para directiva y jugadores del club.</p>
      </div>
    </div>
  )
}
