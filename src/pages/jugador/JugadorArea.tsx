import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { nivelDe, siguienteNivel, usuarioAEmail } from '../../lib/jugadorAuth'
import { nombreCompleto, type AjustesCarta, type Jugador, type Partido } from '../../lib/types'
import { fecha as fmtFecha } from '../../lib/format'
import Crest from '../../components/Crest'
import FifaCard from '../../components/FifaCard'
import MisDatos from './MisDatos'
import EncuestasJugador from './Encuestas'

const BRONCE = '#c0782a'

type Respuesta = 'si' | 'no' | 'duda'
const RESPUESTAS: { valor: Respuesta; label: string; color: string }[] = [
  { valor: 'si', label: 'Voy', color: '#046c54' },
  { valor: 'duda', label: 'En duda', color: '#7a6a2e' },
  { valor: 'no', label: 'No voy', color: '#8a2f3b' },
]

/* ============ LOGIN ============ */
function JugadorLogin() {
  const { signIn } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(usuarioAEmail(usuario), password)
    if (error) setError('Usuario o clave incorrectos.')
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Crest size={80} />
          <h1 className="mt-4 text-2xl font-black text-white">Zona Jugadores</h1>
          <p className="text-sm text-slate-400">Old Brads · confirma, vota y mira tu carta</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Usuario</label>
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="tu usuario (ej. nachete)" required autoFocus autoCapitalize="none"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Clave</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500" />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg px-4 py-2.5 font-bold text-white disabled:opacity-60" style={{ background: BRONCE }}>
            {loading ? 'Ingresando…' : 'Entrar'}
          </button>
          <Link to="/" className="block text-center text-xs text-slate-400 hover:text-slate-600">← Volver al sitio</Link>
        </form>
      </div>
    </div>
  )
}

type Desglose = { asistio: number; puntual: number; goles: number; asistencias: number; votos: number; extra: number; noFue: number; atrasos: number }

/* De dónde sale cada punto de la media. */
function Fila({ label, cantidad, puntos, resta = false }: { label: string; cantidad: number; puntos: number; resta?: boolean }) {
  if (!cantidad) return null
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-400">{label} <span className="text-slate-500">× {cantidad}</span></span>
      <span className={`font-bold ${resta ? 'text-rose-300' : 'text-white'}`}>{resta ? '−' : '+'}{puntos}</span>
    </div>
  )
}

/* ============ MI CARTA ============ */
function MiCarta({ jugador }: { jugador: Jugador | null }) {
  const [d, setD] = useState<Desglose | null>(null)
  const [ajustes, setAjustes] = useState<AjustesCarta | null>(null)

  useEffect(() => {
    if (!jugador) return
    Promise.all([
      supabase.from('partido_jugadores').select('asistio, puntual, goles, asistencias, puntos_voto, puntos_extra, confirmado').eq('jugador_id', jugador.id),
      supabase.from('ajustes_carta').select('*').eq('id', 1).maybeSingle(),
    ]).then(([{ data: pjs }, { data: aj }]) => {
      const filas = (pjs ?? []) as { asistio: boolean; puntual: boolean | null; goles: number; asistencias: number; puntos_voto: number; puntos_extra: number; confirmado: string | null }[]
      setD({
        asistio: filas.filter((f) => f.asistio).length,
        puntual: filas.filter((f) => f.asistio && f.puntual === true).length,
        goles: filas.reduce((a, f) => a + f.goles, 0),
        asistencias: filas.reduce((a, f) => a + f.asistencias, 0),
        votos: filas.reduce((a, f) => a + f.puntos_voto, 0),
        extra: filas.reduce((a, f) => a + f.puntos_extra, 0),
        noFue: filas.filter((f) => f.confirmado === 'si' && !f.asistio).length,
        atrasos: filas.filter((f) => f.asistio && f.puntual === false).length,
      })
      setAjustes((aj as AjustesCarta) ?? null)
    })
  }, [jugador])

  if (!jugador) {
    return (
      <div className="rounded-2xl bg-white/5 p-8 text-center ring-1 ring-white/10">
        <p className="text-slate-300">Tu usuario todavía no está enlazado a un jugador del plantel.</p>
        <p className="mt-1 text-sm text-slate-500">Avísale a la directiva para que lo asocie.</p>
      </div>
    )
  }
  const overall = jugador.carta_overall ?? 70
  const nivel = nivelDe(overall)
  const sig = siguienteNivel(overall)
  return (
    <div className="flex flex-col items-center">
      <div className="w-52"><FifaCard j={jugador} /></div>
      <p className="mt-5 text-lg font-black text-white">{nombreCompleto(jugador)}</p>
      <p className="text-sm text-slate-400">
        Carta <span className="font-bold" style={{ color: BRONCE }}>{nivel.nombre}</span> · media{' '}
        <span className="font-bold text-white">{overall}</span>
      </p>
      {sig ? (
        <div className="mt-4 w-full max-w-xs">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(4, Math.round(((overall - nivel.desde) / (sig.nivel.desde - nivel.desde)) * 100))}%`, background: BRONCE }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            Te faltan <b className="text-white">{sig.faltan}</b> puntos para la carta {sig.nivel.nombre}.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs" style={{ color: BRONCE }}>Estás en el nivel máximo. Crack.</p>
      )}
      {d && ajustes && (
        <div className="mt-6 w-full max-w-xs rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: BRONCE }}>De dónde sale tu media</p>
          <div className="flex items-center justify-between border-b border-white/10 py-1 text-sm">
            <span className="text-slate-400">Base</span>
            <span className="font-bold text-white">{ajustes.base}</span>
          </div>
          <Fila label="Fuiste al partido" cantidad={d.asistio} puntos={d.asistio * ajustes.pts_asistir} />
          <Fila label="Llegaste a la hora" cantidad={d.puntual} puntos={d.puntual * ajustes.pts_puntual} />
          {!jugador.es_dt && <Fila label="Goles" cantidad={d.goles} puntos={d.goles * ajustes.pts_gol} />}
          {!jugador.es_dt && <Fila label="Asistencias" cantidad={d.asistencias} puntos={d.asistencias * ajustes.pts_asistencia} />}
          {!jugador.es_dt && <Fila label="Votos de tus compañeros" cantidad={d.votos} puntos={d.votos * ajustes.pts_voto} />}
          <Fila label="Puntos extra" cantidad={d.extra} puntos={d.extra * ajustes.pts_extra} />
          <Fila label="Dijiste que ibas y no fuiste" cantidad={d.noFue} puntos={d.noFue * ajustes.pen_no_fue} resta />
          <Fila label="Llegaste tarde" cantidad={d.atrasos} puntos={d.atrasos * ajustes.pen_atraso} resta />
          {d.asistio + d.goles + d.asistencias + d.votos + d.extra === 0 && (
            <p className="py-2 text-sm text-slate-500">Todavía no hay partidos cargados. Tu media parte en {ajustes.base}.</p>
          )}
        </div>
      )}
      <p className="mt-4 max-w-xs text-center text-xs text-slate-500">
        {jugador.es_dt
          ? `Como DT tu media sube por estar, llegar a la hora y por los resultados del equipo. El máximo es ${ajustes?.tope ?? 99}.`
          : `Ir al partido suma +1 y llegar a la hora otro +1. Yendo a todos y siempre puntual terminas la temporada con carta de oro. El máximo es ${ajustes?.tope ?? 99}.`}
      </p>
    </div>
  )
}

function CabeceraPartido({ partido, etiqueta }: { partido: Partido; etiqueta: string }) {
  return (
    <div className="mb-5 rounded-2xl bg-white/5 p-5 text-center ring-1 ring-white/10">
      <p className="text-xs uppercase tracking-widest" style={{ color: BRONCE }}>{etiqueta}</p>
      <p className="mt-1 text-xl font-black text-white">Old Brads {partido.es_local ? 'vs' : '@'} {partido.rival}</p>
      <p className="text-sm text-slate-400">
        {fmtFecha(partido.fecha)}{partido.hora ? ` · ${partido.hora}` : ''}{partido.cancha ? ` · ${partido.cancha}` : ''}
      </p>
    </div>
  )
}

/* ============ LO QUE LE DEBE AL EQUIPO ============ */
function Sanciones({ jugadorId }: { jugadorId: string | null }) {
  const [pendientes, setPendientes] = useState<{ sancion: string; rival: string }[]>([])

  useEffect(() => {
    if (!jugadorId) return
    supabase
      .from('partido_jugadores')
      .select('sancion, sancion_cumplida, partidos(rival)')
      .eq('jugador_id', jugadorId)
      .not('sancion', 'is', null)
      .eq('sancion_cumplida', false)
      .then(({ data }) => {
        // La relación viene como arreglo desde PostgREST
        const filas = (data ?? []) as { sancion: string; partidos: { rival: string }[] | { rival: string } | null }[]
        setPendientes(
          filas.map((f) => ({
            sancion: f.sancion,
            rival: Array.isArray(f.partidos) ? (f.partidos[0]?.rival ?? '') : (f.partidos?.rival ?? ''),
          })),
        )
      })
  }, [jugadorId])

  if (pendientes.length === 0) return null
  return (
    <div className="mb-5 rounded-2xl bg-amber-400/10 p-4 ring-1 ring-amber-400/30">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-300">Le debes al equipo</p>
      <ul className="mt-2 space-y-1">
        {pendientes.map((p, i) => (
          <li key={i} className="text-sm text-white">
            {p.sancion} <span className="text-slate-400">· partido con {p.rival}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ============ PRÓXIMO PARTIDO: CONFIRMAR ASISTENCIA ============ */
function ProximoPartido({ partido, jugadorId }: { partido: Partido | null; jugadorId: string | null }) {
  // Ojo: las sanciones se muestran aunque no haya partido citado.
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null)
  const [conteo, setConteo] = useState({ si: 0, duda: 0, no: 0 })
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!partido) return
    const { data } = await supabase
      .from('partido_jugadores')
      .select('jugador_id, confirmado')
      .eq('partido_id', partido.id)
    const filas = (data ?? []) as { jugador_id: string; confirmado: Respuesta | null }[]
    setConteo({
      si: filas.filter((f) => f.confirmado === 'si').length,
      duda: filas.filter((f) => f.confirmado === 'duda').length,
      no: filas.filter((f) => f.confirmado === 'no').length,
    })
    setRespuesta(filas.find((f) => f.jugador_id === jugadorId)?.confirmado ?? null)
  }, [partido, jugadorId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const responder = async (valor: Respuesta) => {
    if (!partido) return
    setGuardando(true)
    setMsg(null)
    const { error } = await supabase.rpc('confirmar_asistencia', { p_partido: partido.id, p_respuesta: valor })
    setGuardando(false)
    if (error) {
      setMsg(error.message)
      return
    }
    setRespuesta(valor)
    cargar()
  }

  if (!partido) {
    return (
      <div>
        <Sanciones jugadorId={jugadorId} />
        <p className="py-10 text-center text-slate-400">No hay ningún partido citado por ahora.</p>
      </div>
    )
  }
  if (!jugadorId) {
    return (
      <div>
        <CabeceraPartido partido={partido} etiqueta="Próximo partido" />
        <p className="text-center text-sm text-slate-400">
          Tu usuario todavía no está enlazado a un jugador, así que no puedes confirmar. Avísale a la directiva.
        </p>
      </div>
    )
  }

  return (
    <div>
      <Sanciones jugadorId={jugadorId} />
      <CabeceraPartido partido={partido} etiqueta="Próximo partido" />
      <p className="mb-3 text-center text-sm text-slate-300">¿Vas a este partido?</p>
      <div className="grid grid-cols-3 gap-2">
        {RESPUESTAS.map((r) => (
          <button
            key={r.valor}
            onClick={() => responder(r.valor)}
            disabled={guardando}
            className={`rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-50 ${
              respuesta === r.valor ? 'ring-2 ring-white/70' : 'opacity-80 hover:opacity-100'
            }`}
            style={{ background: r.color }}
          >
            {r.label}
          </button>
        ))}
      </div>
      {respuesta && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Tu respuesta quedó guardada. Puedes cambiarla mientras la citación siga abierta.
        </p>
      )}
      {msg && <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-center text-sm text-white">{msg}</p>}
      <div className="mt-6 rounded-xl bg-white/5 p-4 text-center text-sm ring-1 ring-white/10">
        <span className="font-black text-white">{conteo.si}</span> <span className="text-slate-400">van</span>
        <span className="mx-2 text-slate-600">·</span>
        <span className="font-black text-white">{conteo.duda}</span> <span className="text-slate-400">en duda</span>
        <span className="mx-2 text-slate-600">·</span>
        <span className="font-black text-white">{conteo.no}</span> <span className="text-slate-400">no van</span>
      </div>
    </div>
  )
}

/* ============ VOTAR ============ */
function Votar({ partido, userId, jugadorId, plantelCompleto }: { partido: Partido | null; userId: string; jugadorId: string | null; plantelCompleto: Jugador[] }) {
  const [picks, setPicks] = useState<string[]>(['', '', '', '', ''])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  // Solo vota quien fue al partido, y solo por quienes jugaron: así el voto
  // sale de lo que la persona vio en la cancha.
  const [fui, setFui] = useState(false)
  const [idsQueJugaron, setIdsQueJugaron] = useState<Set<string>>(new Set())

  const plantel = plantelCompleto.filter(
    (j) => j.id !== jugadorId && !j.es_dt && idsQueJugaron.has(j.id),
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      if (partido) {
        const { data: participacion } = await supabase
          .from('partido_jugadores').select('jugador_id, asistio, jugo')
          .eq('partido_id', partido.id)
        const filas = (participacion ?? []) as { jugador_id: string; asistio: boolean; jugo: boolean }[]
        setFui(filas.some((f) => f.jugador_id === jugadorId && f.asistio))
        setIdsQueJugaron(new Set(filas.filter((f) => f.jugo).map((f) => f.jugador_id)))

        const { data: votos } = await supabase
          .from('votos').select('votado_jugador_id, posicion')
          .eq('partido_id', partido.id).eq('votante_user_id', userId).order('posicion')
        const next = ['', '', '', '', '']
        ;((votos ?? []) as { votado_jugador_id: string; posicion: number }[]).forEach((v) => {
          next[v.posicion - 1] = v.votado_jugador_id
        })
        setPicks(next)
      }
      setLoading(false)
    }
    load()
  }, [partido, userId, jugadorId])

  const setPick = (idx: number, val: string) => {
    setPicks((p) => p.map((x, i) => (i === idx ? val : x)))
    setMsg(null)
  }

  const opcionesPara = (idx: number) =>
    plantel.filter((j) => !picks.some((p, i) => i !== idx && p === j.id))

  const completos = picks.every((p) => p) && new Set(picks).size === 5

  const guardar = async () => {
    if (!partido || !completos) return
    setSaving(true)
    setMsg(null)
    await supabase.from('votos').delete().eq('partido_id', partido.id).eq('votante_user_id', userId)
    const rows = picks.map((jid, i) => ({ partido_id: partido.id, votado_jugador_id: jid, posicion: i + 1 }))
    const { error } = await supabase.from('votos').insert(rows)
    setSaving(false)
    setMsg(error ? 'No se pudo guardar: ' + error.message : '¡Voto guardado! Gracias por votar. 💚')
  }

  if (loading) return <p className="text-center text-slate-400">Cargando…</p>
  if (!partido) {
    return (
      <p className="py-10 text-center text-slate-400">
        No hay ninguna votación abierta. Cuando termine el próximo partido, la directiva la abre y podrás votar acá.
      </p>
    )
  }
  if (!fui) {
    return (
      <div>
        <CabeceraPartido partido={partido} etiqueta="Votación abierta" />
        <p className="text-center text-sm text-slate-400">
          Votan solo los que fueron al partido. Según la lista de la directiva, este no lo viste.
        </p>
        <p className="mt-2 text-center text-xs text-slate-500">
          Si crees que hay un error, avísale a la directiva para que revise la asistencia.
        </p>
      </div>
    )
  }
  if (plantel.length < 5) {
    return (
      <div>
        <CabeceraPartido partido={partido} etiqueta="Votación abierta" />
        <p className="text-center text-sm text-slate-400">
          La directiva todavía no termina de cargar quiénes jugaron. En cuanto lo haga, podrás votar.
        </p>
      </div>
    )
  }

  return (
    <div>
      <CabeceraPartido partido={partido} etiqueta="Vota el partido" />
      <p className="mb-3 text-center text-sm text-slate-300">
        Elige a los <b>5 mejores</b>, del 1° al 5°. Solo aparecen los que jugaron.
      </p>
      <div className="space-y-3">
        {picks.map((val, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: BRONCE }}>{idx + 1}°</span>
            <select value={val} onChange={(e) => setPick(idx, e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-ink-800 px-3 py-2.5 text-white outline-none focus:border-white/40">
              <option value="">— Elegir jugador —</option>
              {opcionesPara(idx).map((j) => (
                <option key={j.id} value={j.id}>{nombreCompleto(j)}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {msg && <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-center text-sm font-medium text-white">{msg}</p>}
      <button onClick={guardar} disabled={!completos || saving}
        className="mt-5 w-full rounded-xl px-4 py-3 font-bold text-white disabled:opacity-50" style={{ background: completos ? BRONCE : '#555' }}>
        {saving ? 'Guardando…' : completos ? 'Guardar mi voto' : 'Elige los 5 jugadores'}
      </button>
    </div>
  )
}

/* ============ CONTENEDOR ============ */
type Tab = 'carta' | 'datos' | 'partido' | 'votaciones'

export default function JugadorArea() {
  const { session, user, perfil, loading, perfilLoading, esDirectiva, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('carta')
  const [miJugador, setMiJugador] = useState<Jugador | null>(null)
  const [plantel, setPlantel] = useState<Jugador[]>([])
  const [citado, setCitado] = useState<Partido | null>(null)
  const [enVotacion, setEnVotacion] = useState<Partido | null>(null)
  const [encuestasAbiertas, setEncuestasAbiertas] = useState(0)

  const jugadorId = perfil?.jugador_id ?? null

  const cargarMiCarta = useCallback(() => {
    if (!jugadorId) { setMiJugador(null); return }
    supabase.from('pub_plantel').select('*').eq('id', jugadorId).maybeSingle()
      .then(({ data }) => setMiJugador((data as Jugador) ?? null))
  }, [jugadorId])

  useEffect(() => { cargarMiCarta() }, [cargarMiCarta])

  // El plantel lo usan tanto la votación del partido como las encuestas.
  useEffect(() => {
    if (!session) return
    supabase.from('pub_plantel').select('*').then(({ data }) =>
      setPlantel(((data as Jugador[]) ?? []).sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b)))),
    )
  }, [session])

  // Cuántas encuestas abiertas le faltan por responder (para el punto verde).
  useEffect(() => {
    if (!session) return
    const contar = async () => {
      const [{ data: es }, { data: ps }] = await Promise.all([
        supabase.from('encuestas').select('id').eq('estado', 'abierta'),
        supabase.from('encuesta_participantes').select('encuesta_id'),
      ])
      const hechas = new Set(((ps ?? []) as { encuesta_id: string }[]).map((p) => p.encuesta_id))
      setEncuestasAbiertas((((es ?? []) as { id: string }[]).filter((e) => !hechas.has(e.id))).length)
    }
    contar()
  }, [session, tab])

  // El partido por confirmar y el que está en votación son distintos y conviven.
  useEffect(() => {
    if (!session) return
    supabase
      .from('partidos').select('*')
      .in('estado', ['citacion', 'votacion'])
      .order('fecha', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        const ps = (data as Partido[]) ?? []
        setCitado(ps.find((p) => p.estado === 'citacion') ?? null)
        setEnVotacion(ps.find((p) => p.estado === 'votacion') ?? null)
      })
  }, [session])

  const saludo = useMemo(() => perfil?.nombre_usuario || (miJugador ? nombreCompleto(miJugador) : 'Jugador'), [perfil, miJugador])

  if (loading || (session && perfilLoading)) {
    return <div className="flex min-h-screen items-center justify-center bg-ink-900 text-slate-400">Cargando…</div>
  }
  if (!session) return <JugadorLogin />

  const tabs: { id: Tab; label: string; punto: boolean }[] = [
    { id: 'carta', label: 'Carta', punto: false },
    { id: 'datos', label: 'Mis datos', punto: false },
    { id: 'partido', label: 'Partido', punto: !!citado },
    { id: 'votaciones', label: 'Votaciones', punto: !!enVotacion || encuestasAbiertas > 0 },
  ]

  return (
    <div className="min-h-screen bg-ink-900 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <Crest size={36} />
          <div className="leading-tight">
            <p className="font-black">Hola, {saludo}</p>
            <p className="text-[11px] text-slate-400">Zona Jugadores</p>
          </div>
        </div>
        <button onClick={signOut} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">Salir</button>
      </header>

      {perfil && !perfil.clave_cambiada && tab !== 'datos' && (
        <button
          onClick={() => setTab('datos')}
          className="block w-full border-b border-amber-400/30 bg-amber-400/10 px-5 py-2 text-center text-xs text-amber-200"
        >
          Todavía usas la clave que te dio el club. <b className="underline">Cámbiala acá</b> para que nadie vote por ti.
        </button>
      )}

      {esDirectiva && (
        <div className="border-b border-white/10 bg-white/5 px-5 py-2 text-center text-xs text-slate-300">
          Eres directiva — <Link to="/panel" className="font-semibold underline">ir a la herramienta de gestión</Link>
        </div>
      )}

      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 grid grid-cols-4 gap-1 rounded-xl bg-white/5 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative rounded-lg px-1 py-2 text-xs font-bold ${tab === t.id ? 'text-white' : 'text-slate-400'}`}
              style={{ background: tab === t.id ? BRONCE : 'transparent' }}
            >
              {t.label}
              {t.punto && tab !== t.id && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-400" aria-label="pendiente" />
              )}
            </button>
          ))}
        </div>
        {tab === 'carta' && <MiCarta jugador={miJugador} />}
        {tab === 'datos' && <MisDatos onGuardado={cargarMiCarta} />}
        {tab === 'partido' && <ProximoPartido partido={citado} jugadorId={jugadorId} />}
        {tab === 'votaciones' && (
          <div className="space-y-8">
            <Votar partido={enVotacion} userId={user!.id} jugadorId={jugadorId} plantelCompleto={plantel} />
            <div className="border-t border-white/10 pt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: BRONCE }}>Encuestas del club</p>
              <EncuestasJugador plantel={plantel.filter((j) => !j.es_dt)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
