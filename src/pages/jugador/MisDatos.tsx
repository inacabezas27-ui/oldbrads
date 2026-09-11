import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { usuarioAEmail } from '../../lib/jugadorAuth'
import { POSICIONES, TALLAS, type MisDatosFicha } from '../../lib/types'

const BRONCE = '#c0782a'

const inputCls =
  'w-full rounded-lg border border-white/15 bg-ink-800 px-3 py-2.5 text-white outline-none placeholder:text-slate-500 focus:border-white/40'

/* La ficha vieja trae valores que no están en la lista (ej. "Delantero/Central").
   Se agregan como opción para no borrárselos sin querer al guardar. */
function opcionesCon(lista: readonly string[], actual: string | null) {
  return actual && !lista.includes(actual) ? [actual, ...lista] : [...lista]
}

function Campo({ label, children, ancho = 'full' }: { label: string; children: React.ReactNode; ancho?: 'full' | 'mitad' }) {
  return (
    <label className={`block ${ancho === 'mitad' ? 'col-span-1' : 'col-span-2'}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}

/* ============ CAMBIAR CLAVE ============ */
function CambiarClave() {
  const { perfil, recargarPerfil } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (nueva.length < 8) {
      setMsg({ tipo: 'error', texto: 'La clave nueva debe tener al menos 8 caracteres.' })
      return
    }
    if (nueva !== repetir) {
      setMsg({ tipo: 'error', texto: 'Las dos claves nuevas no coinciden.' })
      return
    }
    setGuardando(true)
    // Se revalida la clave actual antes de cambiarla, para que nadie
    // aproveche una sesión abierta ajena.
    const email = usuarioAEmail(perfil?.nombre_usuario ?? '')
    const { error: errLogin } = await supabase.auth.signInWithPassword({ email, password: actual })
    if (errLogin) {
      setGuardando(false)
      setMsg({ tipo: 'error', texto: 'Tu clave actual no es correcta.' })
      return
    }
    const { error } = await supabase.auth.updateUser({ password: nueva })
    if (error) {
      setGuardando(false)
      setMsg({ tipo: 'error', texto: 'No se pudo cambiar: ' + error.message })
      return
    }
    await supabase.rpc('marcar_clave_cambiada')
    await recargarPerfil()
    setGuardando(false)
    setActual(''); setNueva(''); setRepetir('')
    setMsg({ tipo: 'ok', texto: 'Listo, tu clave quedó cambiada.' })
  }

  return (
    <div className="mt-8 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
      <button onClick={() => setAbierto((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="font-bold text-white">Cambiar mi clave</span>
        <span className="text-slate-400">{abierto ? '−' : '+'}</span>
      </button>
      {abierto && (
        <form onSubmit={guardar} className="mt-4 space-y-3">
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="Clave actual" required className={inputCls} autoComplete="current-password" />
          <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Clave nueva (mínimo 8)" required className={inputCls} autoComplete="new-password" />
          <input type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} placeholder="Repetir la clave nueva" required className={inputCls} autoComplete="new-password" />
          {msg && (
            <p className={`rounded-lg px-3 py-2 text-sm ${msg.tipo === 'ok' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>
              {msg.texto}
            </p>
          )}
          <button type="submit" disabled={guardando} className="w-full rounded-xl py-3 font-bold text-white disabled:opacity-50" style={{ background: BRONCE }}>
            {guardando ? 'Guardando…' : 'Cambiar clave'}
          </button>
        </form>
      )}
    </div>
  )
}

/* ============ MIS DATOS ============ */
export default function MisDatos({ onGuardado }: { onGuardado?: () => void }) {
  const { perfil } = useAuth()
  const [f, setF] = useState<MisDatosFicha | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    supabase.rpc('mis_datos').then(({ data }) => {
      const fila = (data as MisDatosFicha[] | null)?.[0] ?? null
      setF(fila)
      setLoading(false)
    })
  }, [])

  const set = (k: keyof MisDatosFicha, v: string) =>
    setF((prev) => (prev ? { ...prev, [k]: v } : prev))

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f) return
    setGuardando(true)
    setMsg(null)
    const { error } = await supabase.rpc('actualizar_mis_datos', {
      p_nombres: f.nombres,
      p_apellido_paterno: f.apellido_paterno,
      p_apellido_materno: f.apellido_materno,
      p_rut: f.rut,
      p_fecha_nacimiento: f.fecha_nacimiento || null,
      p_profesion: f.profesion,
      p_email: f.email,
      p_telefono: f.telefono,
      p_direccion: f.direccion,
      p_comuna: f.comuna,
      p_talla_polera: f.talla_polera,
      p_talla_short: f.talla_short,
      p_numero_camiseta: f.numero_camiseta === null || (f.numero_camiseta as unknown as string) === '' ? null : Number(f.numero_camiseta),
      p_posicion: f.posicion,
      p_apodo: f.apodo,
    })
    setGuardando(false)
    if (error) {
      setMsg({ tipo: 'error', texto: 'No se pudo guardar: ' + error.message })
      return
    }
    setMsg({ tipo: 'ok', texto: 'Datos guardados. Gracias 💚' })
    onGuardado?.()
  }

  if (loading) return <p className="text-center text-slate-400">Cargando…</p>
  if (!f) {
    return (
      <div className="rounded-2xl bg-white/5 p-8 text-center ring-1 ring-white/10">
        <p className="text-slate-300">Tu usuario todavía no está enlazado a un jugador del plantel.</p>
        <p className="mt-1 text-sm text-slate-500">Avísale a la directiva para que lo asocie.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-400">
        Estos son los datos que el club presenta a la liga. Revísalos y corrige lo que esté mal o falte.
      </p>

      <form onSubmit={guardar} className="grid grid-cols-2 gap-3">
        <Campo label="Nombres" ancho="mitad">
          <input value={f.nombres ?? ''} onChange={(e) => set('nombres', e.target.value)} required className={inputCls} />
        </Campo>
        <Campo label="Apellido paterno" ancho="mitad">
          <input value={f.apellido_paterno ?? ''} onChange={(e) => set('apellido_paterno', e.target.value)} required className={inputCls} />
        </Campo>
        <Campo label="Apellido materno" ancho="mitad">
          <input value={f.apellido_materno ?? ''} onChange={(e) => set('apellido_materno', e.target.value)} className={inputCls} />
        </Campo>
        <Campo label="RUT" ancho="mitad">
          <input value={f.rut ?? ''} onChange={(e) => set('rut', e.target.value)} placeholder="12.345.678-9" className={inputCls} />
        </Campo>
        <Campo label="Fecha de nacimiento" ancho="mitad">
          <input type="date" value={f.fecha_nacimiento ?? ''} onChange={(e) => set('fecha_nacimiento', e.target.value)} className={inputCls} />
        </Campo>
        <Campo label="Profesión" ancho="mitad">
          <input value={f.profesion ?? ''} onChange={(e) => set('profesion', e.target.value)} className={inputCls} />
        </Campo>
        <Campo label="Correo personal">
          <input type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="tucorreo@gmail.com" className={inputCls} />
        </Campo>
        <Campo label="Teléfono" ancho="mitad">
          <input value={f.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} placeholder="+56 9 ..." className={inputCls} />
        </Campo>
        <Campo label="Comuna" ancho="mitad">
          <input value={f.comuna ?? ''} onChange={(e) => set('comuna', e.target.value)} className={inputCls} />
        </Campo>
        <Campo label="Dirección">
          <input value={f.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} className={inputCls} />
        </Campo>
        <Campo label="Apodo">
          <input
            value={f.apodo ?? ''}
            onChange={(e) => set('apodo', e.target.value.slice(0, 14))}
            maxLength={14}
            placeholder="Como te dice el equipo"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-slate-500">
            Es el nombre que sale en tu carta. En la polera va solo el número, así que este es el nombre con el
            que te conoce el equipo. Máximo 14 letras; si lo dejas vacío sale tu apellido.
          </p>
        </Campo>
        <Campo label="Posición" ancho="mitad">
          <select value={f.posicion ?? ''} onChange={(e) => set('posicion', e.target.value)} className={inputCls}>
            <option value="">—</option>
            {opcionesCon(POSICIONES, f.posicion).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Campo>
        <Campo label="N° de camiseta" ancho="mitad">
          <input type="number" min="1" max="99" value={f.numero_camiseta ?? ''} onChange={(e) => set('numero_camiseta', e.target.value)} className={inputCls} />
        </Campo>
        <Campo label="Talla polera" ancho="mitad">
          <select value={f.talla_polera ?? ''} onChange={(e) => set('talla_polera', e.target.value)} className={inputCls}>
            <option value="">—</option>
            {opcionesCon(TALLAS, f.talla_polera).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Campo>
        <Campo label="Talla short" ancho="mitad">
          <select value={f.talla_short ?? ''} onChange={(e) => set('talla_short', e.target.value)} className={inputCls}>
            <option value="">—</option>
            {opcionesCon(TALLAS, f.talla_short).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Campo>

        {msg && (
          <p className={`col-span-2 rounded-lg px-3 py-2 text-sm ${msg.tipo === 'ok' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>
            {msg.texto}
          </p>
        )}

        <button type="submit" disabled={guardando} className="col-span-2 mt-1 w-full rounded-xl py-3 font-bold text-white disabled:opacity-50" style={{ background: BRONCE }}>
          {guardando ? 'Guardando…' : 'Guardar mis datos'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500">
        Tu usuario para entrar es <b className="text-slate-300">{perfil?.nombre_usuario}</b>. Eso no cambia aunque corrijas tu nombre.
      </p>

      <CambiarClave />
    </div>
  )
}
