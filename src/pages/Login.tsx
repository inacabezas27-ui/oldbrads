import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Field, Input } from '../components/ui'
import Crest from '../components/Crest'

const BRONCE = '#c0782a'

export default function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/panel" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email.trim(), password)
    if (error) setError('Correo o contraseña incorrectos.')
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
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="directiva@oldbrads.com" required autoFocus />
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
