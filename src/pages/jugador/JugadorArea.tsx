import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { nivelDe, siguienteNivel, usuarioAEmail } from '../../lib/jugadorAuth'
import { nombreCorto, nombreCompleto, type AjustesCarta, type Jugador, type Partido } from '../../lib/types'
import { fecha as fmtFecha } from '../../lib/format'
import Crest from '../../components/Crest'
import FifaCard from '../../components/FifaCard'
import MisDatos from './MisDatos'
import EncuestasJugador from './Encuestas'

const BRONCE = '#c0782a'

type Respuesta = 'si' | 'no' | 'duda' | 'lesionado'
const RESPUESTAS: { valor: Respuesta; label: string; color: string }[] = [
  { valor: 'si', label: 'Voy', color: '#046c54' },
  { valor: 'duda', label: 'En duda', color: '#7a6a2e' },
  { valor: 'lesionado', label: 'Lesionado', color: '#6b4a2f' },
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

type Desglose = {
  asistio: number; puntual: number; titular: number; apoyo: number; responde: number; vota: number
  victorias: number; empates: number; vallas: number
  goles: number; asistencias: number; votos: number; extra: number
  encuestas: number; cuotasAlDia: boolean
  noFue: number
}

/* De dónde sale cada punto de la media. */
function Fila({ label, cantidad, puntos, resta = false }: { label: string; cantidad: number; puntos: number; resta?: boolean }) {
  if (!cantidad || !puntos) return null
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-400">{label} <span className="text-slate-500">× {cantidad}</span></span>
      <span className={`font-bold ${resta ? 'text-rose-300' : 'text-white'}`}>{resta ? '−' : '+'}{puntos}</span>
    </div>
  )
}

type FilaPJ = {
  partido_id: string
  asistio: boolean | null; puntual: boolean | null; jugo: boolean; titular: boolean
  confirmado: string | null; pen_sin_responder: boolean
  goles: number; asistencias: number; puntos_voto: number; puntos_extra: number
  partidos: { goles_favor: number | null; goles_contra: number | null } | { goles_favor: number | null; goles_contra: number | null }[] | null
}

/* Las reglas completas, a la vista. Si nadie sabe cómo sube la carta, el
   sistema no motiva a nada. */
function Reglas({ a, esArquero }: { a: AjustesCarta; esArquero: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const porFecha: [string, number][] = [
    ['Fuiste al partido', a.pts_asistir],
    ['Llegaste a la hora', a.pts_puntual],
    ['Fuiste titular', a.pts_titular],
    ['Fuiste igual sin poder jugar', a.pts_apoyo],
    ['Dijiste a tiempo si ibas', a.pts_responde],
    ['Votaste el partido', a.pts_vota],
    [esArquero ? 'Arco en cero (eres arquero)' : 'Arco en cero (a todo el que jugó)', a.pts_valla + (esArquero ? a.pts_valla_arquero : 0)],
    ['Ganamos (si jugaste)', a.pts_victoria],
    ['Empatamos (si jugaste)', a.pts_empate],
    ['Gol', a.pts_gol],
    ['Asistencia', a.pts_asistencia],
    ['1° de la votación (MVP)', a.pts_voto_1],
    ['2° de la votación', a.pts_voto_2],
    ['3° a 5° de la votación', a.pts_voto_3a5],
  ]
  const deLaTemporada: [string, number][] = [
    ['Cada encuesta del club que respondes', a.pts_encuesta],
    ['Estar al día con las cuotas', a.pts_cuotas_al_dia],
  ]
  const resta: [string, number][] = [
    ['Estabas citado y no llegaste', a.pen_no_fue],
    ['Llegaste tarde', a.pen_atraso],
    ['Cada cuota atrasada', a.pen_cuota],
  ]
  const lista = (items: [string, number][], signo: '+' | '−') =>
    items.filter(([, v]) => v > 0).map(([k, v]) => (
      <div key={k} className="flex justify-between py-0.5 text-sm">
        <span className="text-slate-400">{k}</span>
        <span className={`font-bold ${signo === '+' ? 'text-white' : 'text-rose-300'}`}>{signo}{v}</span>
      </div>
    ))
  const hayResta = resta.some(([, v]) => v > 0)
  return (
    <div className="mt-4 w-full max-w-xs">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/10 hover:bg-white/10"
      >
        {abierto ? 'Ocultar las reglas' : 'Cómo sube tu carta'}
      </button>
      {abierto && (
        <div className="mt-2 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: BRONCE }}>En cada fecha</p>
          {lista(porFecha, '+')}
          <p className="mt-3 text-xs font-bold uppercase tracking-wide" style={{ color: BRONCE }}>Durante la temporada</p>
          {lista(deLaTemporada, '+')}
          {hayResta && (
            <>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-rose-300">Lo único que resta</p>
              {lista(resta, '−')}
            </>
          )}
          <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">
            Casi todo suma: la carta sube haciendo las cosas, no baja por no hacerlas. La única resta es anotarte y
            no llegar, porque ahí el equipo se queda con menos gente de la que contaba. Avisar que no vas, o que
            estás lesionado, no te quita nada, y si estás lesionado y vas igual a la cancha, suma. Un gol y una
            asistencia valen lo mismo, y el arco en cero lo ganan todos los que jugaron.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Los plazos: el <b className="text-slate-400">jueves a las 13:00</b> para decir si vas y el{' '}
            <b className="text-slate-400">martes a las 21:00</b> para votar. Después de esa hora el punto de esa
            fecha ya no se puede ganar.
          </p>
        </div>
      )}
    </div>
  )
}

/* ============ MI CARTA ============ */
function MiCarta({ jugador, userId }: { jugador: Jugador | null; userId: string }) {
  const [d, setD] = useState<Desglose | null>(null)
  const [ajustes, setAjustes] = useState<AjustesCarta | null>(null)

  useEffect(() => {
    if (!jugador) return
    Promise.all([
      supabase
        .from('partido_jugadores')
        .select('partido_id, asistio, puntual, jugo, titular, confirmado, pen_sin_responder, goles, asistencias, puntos_voto, puntos_extra, partidos(goles_favor, goles_contra)')
        .eq('jugador_id', jugador.id),
      supabase.from('ajustes_carta').select('*').eq('id', 1).maybeSingle(),
      supabase.from('votos').select('partido_id').eq('votante_user_id', userId),
      supabase.from('encuesta_participantes').select('encuesta_id'),
      supabase.rpc('mis_cuotas_atrasadas'),
    ]).then(([{ data: pjs }, { data: aj }, { data: vts }, { data: eps }, { data: atrasadas }]) => {
      const filas = (pjs ?? []) as FilaPJ[]
      // La relación llega como arreglo desde PostgREST según cómo se pida.
      const marcador = (f: FilaPJ) => (Array.isArray(f.partidos) ? f.partidos[0] : f.partidos) ?? null
      const jugados = filas.filter((f) => {
        const m = marcador(f)
        return f.jugo && m && m.goles_favor != null && m.goles_contra != null
      })
      const votados = new Set(((vts ?? []) as { partido_id: string }[]).map((v) => v.partido_id))
      setD({
        asistio: filas.filter((f) => f.asistio === true).length,
        puntual: filas.filter((f) => f.asistio === true && f.puntual === true).length,
        titular: filas.filter((f) => f.jugo && f.titular).length,
        apoyo: filas.filter((f) => f.asistio === true && !f.jugo).length,
        responde: filas.filter((f) => f.confirmado !== null && !f.pen_sin_responder).length,
        vota: filas.filter((f) => votados.has(f.partido_id)).length,
        victorias: jugados.filter((f) => marcador(f)!.goles_favor! > marcador(f)!.goles_contra!).length,
        empates: jugados.filter((f) => marcador(f)!.goles_favor! === marcador(f)!.goles_contra!).length,
        vallas: jugados.filter((f) => marcador(f)!.goles_contra === 0).length,
        goles: filas.reduce((a, f) => a + f.goles, 0),
        asistencias: filas.reduce((a, f) => a + f.asistencias, 0),
        votos: filas.reduce((a, f) => a + f.puntos_voto, 0),
        extra: filas.reduce((a, f) => a + f.puntos_extra, 0),
        encuestas: ((eps ?? []) as unknown[]).length,
        cuotasAlDia: Number(atrasadas ?? 0) === 0,
        noFue: filas.filter((f) => f.asistio === false).length,
      })
      setAjustes((aj as AjustesCarta) ?? null)
    })
  }, [jugador, userId])

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
  const esArquero = (jugador.posicion ?? '').toLowerCase().includes('arquero')
  const puntosValla = ajustes ? ajustes.pts_valla + (esArquero ? ajustes.pts_valla_arquero : 0) : 0
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
          {!jugador.es_dt && <Fila label="Fuiste titular" cantidad={d.titular} puntos={d.titular * ajustes.pts_titular} />}
          {!jugador.es_dt && <Fila label="Fuiste igual sin poder jugar" cantidad={d.apoyo} puntos={d.apoyo * ajustes.pts_apoyo} />}
          <Fila label="Dijiste a tiempo si ibas" cantidad={d.responde} puntos={d.responde * ajustes.pts_responde} />
          <Fila label="Votaste el partido" cantidad={d.vota} puntos={d.vota * ajustes.pts_vota} />
          {!jugador.es_dt && <Fila label="Arco en cero" cantidad={d.vallas} puntos={d.vallas * puntosValla} />}
          {!jugador.es_dt && <Fila label="Ganamos" cantidad={d.victorias} puntos={d.victorias * ajustes.pts_victoria} />}
          {!jugador.es_dt && <Fila label="Empatamos" cantidad={d.empates} puntos={d.empates * ajustes.pts_empate} />}
          {jugador.es_dt && <Fila label="Ganamos" cantidad={d.victorias} puntos={d.victorias * ajustes.pts_dt_victoria} />}
          {jugador.es_dt && <Fila label="Empatamos" cantidad={d.empates} puntos={d.empates * ajustes.pts_dt_empate} />}
          {!jugador.es_dt && <Fila label="Goles" cantidad={d.goles} puntos={d.goles * ajustes.pts_gol} />}
          {!jugador.es_dt && <Fila label="Asistencias" cantidad={d.asistencias} puntos={d.asistencias * ajustes.pts_asistencia} />}
          {!jugador.es_dt && <Fila label="Podio de la votación" cantidad={d.votos} puntos={d.votos * ajustes.pts_voto} />}
          <Fila label="Encuestas respondidas" cantidad={d.encuestas} puntos={d.encuestas * ajustes.pts_encuesta} />
          <Fila label="Al día con las cuotas" cantidad={d.cuotasAlDia ? 1 : 0} puntos={ajustes.pts_cuotas_al_dia} />
          <Fila label="Puntos extra" cantidad={d.extra} puntos={d.extra * ajustes.pts_extra} />
          <Fila label="Estabas citado y no fuiste" cantidad={d.noFue} puntos={d.noFue * ajustes.pen_no_fue} resta />
          {d.asistio + d.responde + d.goles + d.asistencias + d.votos + d.extra === 0 && (
            <p className="py-2 text-sm text-slate-500">Todavía no sumas nada. Tu media parte en {ajustes.base}.</p>
          )}
        </div>
      )}
      {ajustes && <Reglas a={ajustes} esArquero={esArquero} />}
      <p className="mt-4 max-w-xs text-center text-xs text-slate-500">
        {jugador.es_dt
          ? `Como DT tu media sube por ir al partido, llegar a la hora, cumplir con el equipo y por cada partido que gana el equipo estando tú en la cancha. El máximo es ${ajustes?.tope ?? 99}.`
          : `Casi todo suma y casi nada resta: la carta sube haciendo las cosas. El máximo es ${ajustes?.tope ?? 99}.`}
      </p>
    </div>
  )
}

/** "jueves 10 de septiembre a las 13:00" — el plazo dicho como lo diría uno. */
function textoPlazo(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const dia = d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${dia} a las ${hora}`
}

/** El plazo, y si ya venció. */
function Plazo({ hasta, texto, vencido }: { hasta: string | null; texto: string; vencido: string }) {
  const p = textoPlazo(hasta)
  if (!p) return null
  const paso = new Date(hasta!).getTime() < Date.now()
  return (
    <p className={`mt-3 rounded-lg px-3 py-2 text-center text-xs ${paso ? 'bg-rose-400/10 text-rose-200' : 'bg-white/5 text-slate-400'}`}>
      {paso ? vencido : `${texto} ${p}.`}
    </p>
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
/* Quién va y quién no, a la vista de todos: así nadie tiene que armar la
   lista a mano en el grupo de WhatsApp. */
type Grupo = { titulo: string; color: string; jugadores: Jugador[] }

function ListaGrupo({ g }: { g: Grupo }) {
  if (!g.jugadores.length) return null
  return (
    <div className="border-t border-white/10 py-2.5 first:border-0 first:pt-0">
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: g.color }}>
        {g.titulo} <span className="text-slate-500">({g.jugadores.length})</span>
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">
        {g.jugadores.map((j) => nombreCorto(j)).join(' · ')}
      </p>
    </div>
  )
}

function ProximoPartido({
  partido,
  jugadorId,
  plantel,
  onRespuesta,
}: {
  partido: Partido | null
  jugadorId: string | null
  plantel: Jugador[]
  onRespuesta?: (r: Respuesta) => void
}) {
  // Ojo: las sanciones se muestran aunque no haya partido citado.
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null)
  const [porJugador, setPorJugador] = useState<Record<string, Respuesta | null>>({})
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!partido) return
    const { data } = await supabase
      .from('partido_jugadores')
      .select('jugador_id, confirmado')
      .eq('partido_id', partido.id)
    const mapa: Record<string, Respuesta | null> = {}
    for (const f of (data ?? []) as { jugador_id: string; confirmado: Respuesta | null }[]) {
      mapa[f.jugador_id] = f.confirmado
    }
    setPorJugador(mapa)
    setRespuesta(jugadorId ? mapa[jugadorId] ?? null : null)
  }, [partido, jugadorId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const grupos: Grupo[] = useMemo(() => {
    const de = (test: (r: Respuesta | null) => boolean) =>
      plantel.filter((j) => test(porJugador[j.id] ?? null))
    return [
      { titulo: 'Van', color: '#4ade80', jugadores: de((r) => r === 'si') },
      { titulo: 'En duda', color: '#fbbf24', jugadores: de((r) => r === 'duda') },
      { titulo: 'Lesionados', color: '#fb923c', jugadores: de((r) => r === 'lesionado') },
      { titulo: 'No van', color: '#f87171', jugadores: de((r) => r === 'no') },
      { titulo: 'Todavía no responden', color: '#94a3b8', jugadores: de((r) => r === null) },
    ]
  }, [plantel, porJugador])

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
    onRespuesta?.(valor)
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

  const van = grupos[0].jugadores.length

  return (
    <div>
      <Sanciones jugadorId={jugadorId} />
      <CabeceraPartido partido={partido} etiqueta="Próximo partido" />
      <p className="mb-1 text-center text-sm font-semibold text-white">Está citado todo el plantel.</p>
      <p className="mb-3 text-center text-sm text-slate-300">¿Vas a este partido?</p>
      <div className="grid grid-cols-2 gap-2">
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
      {respuesta ? (
        <p className="mt-3 text-center text-xs text-slate-400">
          Tu respuesta quedó guardada. Puedes cambiarla mientras la citación siga abierta.
        </p>
      ) : (
        <p className="mt-3 text-center text-xs" style={{ color: BRONCE }}>
          Todavía no respondes. Con tu respuesta la directiva arma la nómina.
        </p>
      )}
      {msg && <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-center text-sm text-white">{msg}</p>}

      <Plazo
        hasta={partido.cierre_confirmacion}
        texto="Tienes plazo hasta el"
        vencido="El plazo para responder venció. La citación se publicó con la nómina de ese momento; responder ahora no devuelve el punto."
      />

      <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <p className="mb-2 text-center text-sm">
          <span className="text-2xl font-black text-white">{van}</span>{' '}
          <span className="text-slate-400">de {plantel.length} confirmaron que van</span>
        </p>
        {grupos.map((g) => (
          <ListaGrupo key={g.titulo} g={g} />
        ))}
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
  // Votar es una decisión, no un formulario que queda abierto para siempre.
  // Una vez votado se muestra lo elegido, y se vuelve a abrir solo si la
  // persona dice que quiere cambiarlo.
  const [yaVoto, setYaVoto] = useState(false)
  const [editando, setEditando] = useState(false)

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
        const filas = (participacion ?? []) as { jugador_id: string; asistio: boolean | null; jugo: boolean }[]
        setFui(filas.some((f) => f.jugador_id === jugadorId && f.asistio === true))
        setIdsQueJugaron(new Set(filas.filter((f) => f.jugo).map((f) => f.jugador_id)))

        const { data: votos } = await supabase
          .from('votos').select('votado_jugador_id, posicion')
          .eq('partido_id', partido.id).eq('votante_user_id', userId).order('posicion')
        const next = ['', '', '', '', '']
        ;((votos ?? []) as { votado_jugador_id: string; posicion: number }[]).forEach((v) => {
          next[v.posicion - 1] = v.votado_jugador_id
        })
        setPicks(next)
        const votado = next.every(Boolean)
        setYaVoto(votado)
        setEditando(!votado)
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
    if (error) {
      setMsg('No se pudo guardar: ' + error.message)
      return
    }
    setMsg('¡Voto guardado! Gracias por votar. 💚')
    setYaVoto(true)
    setEditando(false)
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
  const nombreDe = (id: string) => {
    const j = plantelCompleto.find((x) => x.id === id)
    return j ? nombreCompleto(j) : '—'
  }

  // Ya votó: se muestra lo que eligió, cerrado.
  if (yaVoto && !editando) {
    return (
      <div>
        <CabeceraPartido partido={partido} etiqueta="Ya votaste" />
        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="mb-3 text-center text-sm text-slate-300">Tu top 5 de este partido</p>
          <div className="space-y-2">
            {picks.map((id, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: BRONCE }}>{idx + 1}°</span>
                <span className="text-sm text-white">{nombreDe(id)}</span>
              </div>
            ))}
          </div>
        </div>
        {msg && <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-center text-sm font-medium text-white">{msg}</p>}
        <Plazo
          hasta={partido.cierre_votacion}
          texto="Puedes cambiarlo hasta el"
          vencido="La votación ya se cerró: tu voto quedó como está."
        />
        <button
          onClick={() => { setEditando(true); setMsg(null) }}
          className="mt-4 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20"
        >
          Cambiar mi voto
        </button>
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
      <p className="mb-1 text-center text-sm text-slate-300">
        Elige a los <b>5 mejores</b>, del 1° al 5°. Solo aparecen los que jugaron.
      </p>
      <p className="mb-3 text-center text-xs text-slate-500">
        Se suman todos los votos del equipo y solo el podio de ese total suma carta: 1° +3, 2° +2, 3° a 5° +1.
        El 1° es el MVP del partido.
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
      <Plazo
        hasta={partido.cierre_votacion}
        texto="La votación se cierra sola el"
        vencido="La votación ya se cerró."
      />
      {msg && <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-center text-sm font-medium text-white">{msg}</p>}
      <button onClick={guardar} disabled={!completos || saving}
        className="mt-5 w-full rounded-xl px-4 py-3 font-bold text-white disabled:opacity-50" style={{ background: completos ? BRONCE : '#555' }}>
        {saving ? 'Guardando…' : completos ? 'Guardar mi voto' : 'Elige los 5 jugadores'}
      </button>
      {yaVoto && (
        <button
          onClick={() => { setEditando(false); setMsg(null) }}
          className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white"
        >
          Dejar mi voto como estaba
        </button>
      )}
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
  // Lo que el jugador tiene pendiente, para avisarle apenas entra.
  const [miConfirmacion, setMiConfirmacion] = useState<Respuesta | null>(null)
  const [votoPendiente, setVotoPendiente] = useState(false)

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

  // ¿Ya respondió la citación?
  useEffect(() => {
    if (!citado || !jugadorId) { setMiConfirmacion(null); return }
    supabase
      .from('partido_jugadores').select('confirmado')
      .eq('partido_id', citado.id).eq('jugador_id', jugadorId).maybeSingle()
      .then(({ data }) => setMiConfirmacion(((data as { confirmado: Respuesta | null } | null)?.confirmado) ?? null))
  }, [citado, jugadorId, tab])

  // ¿Le toca votar y todavía no vota? Solo vota quien fue al partido.
  useEffect(() => {
    if (!enVotacion || !jugadorId || !user) { setVotoPendiente(false); return }
    const revisar = async () => {
      const [{ data: fila }, { data: votos }] = await Promise.all([
        supabase.from('partido_jugadores').select('asistio')
          .eq('partido_id', enVotacion.id).eq('jugador_id', jugadorId).maybeSingle(),
        supabase.from('votos').select('id')
          .eq('partido_id', enVotacion.id).eq('votante_user_id', user.id).limit(1),
      ])
      const fue = ((fila as { asistio: boolean | null } | null)?.asistio) === true
      setVotoPendiente(fue && (votos ?? []).length === 0)
    }
    revisar()
  }, [enVotacion, jugadorId, user, tab])

  const saludo = useMemo(() => perfil?.nombre_usuario || (miJugador ? nombreCompleto(miJugador) : 'Jugador'), [perfil, miJugador])

  if (loading || (session && perfilLoading)) {
    return <div className="flex min-h-screen items-center justify-center bg-ink-900 text-slate-400">Cargando…</div>
  }
  if (!session) return <JugadorLogin />
  // La cuenta de la directiva no es de nadie del plantel: no tiene carta que
  // mirar ni partido que confirmar, así que va derecho a lo suyo.
  if (esDirectiva && !jugadorId) return <Navigate to="/panel" replace />

  const tabs: { id: Tab; label: string; punto: boolean }[] = [
    { id: 'carta', label: 'Carta', punto: false },
    { id: 'datos', label: 'Mis datos', punto: false },
    { id: 'partido', label: 'Partido', punto: !!citado && !miConfirmacion },
    { id: 'votaciones', label: 'Votaciones', punto: votoPendiente || encuestasAbiertas > 0 },
  ]

  /* Lo que el jugador tiene pendiente. Es lo primero que ve al entrar: la
     mayoría abre la app una vez y si no se lo decimos acá, no se entera. */
  const avisos: { texto: string; accion: string; ir: Tab }[] = []
  if (citado && jugadorId && !miConfirmacion) {
    avisos.push({
      texto: `Estás citado para el partido con ${citado.rival}. Falta tu respuesta.`,
      accion: 'Decir si voy',
      ir: 'partido',
    })
  }
  if (enVotacion && votoPendiente) {
    avisos.push({
      texto: `Votación abierta del partido con ${enVotacion.rival}. Todavía no votas.`,
      accion: 'Votar ahora',
      ir: 'votaciones',
    })
  }
  if (encuestasAbiertas > 0) {
    avisos.push({
      texto: `Tienes ${encuestasAbiertas} ${encuestasAbiertas === 1 ? 'encuesta' : 'encuestas'} del club sin responder.`,
      accion: 'Responder',
      ir: 'votaciones',
    })
  }

  return (
    <div className="min-h-screen bg-ink-900 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <Crest size={36} />
          <div className="leading-tight">
            <p className="font-black">Hola, {saludo}</p>
            {/* El correo a la vista: con 26 cuentas en los mismos celulares,
                saber con cuál estás conectado evita la mitad de los enredos. */}
            <p className="text-[11px] text-slate-400">{user?.email ?? 'Zona Jugadores'}</p>
          </div>
        </div>
        <button onClick={signOut} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">Salir</button>
      </header>

      {avisos.length > 0 && (
        <div className="border-b border-white/10 bg-white/5 px-5 py-3">
          <div className="mx-auto max-w-md space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: BRONCE }}>
              {avisos.length === 1 ? 'Tienes algo pendiente' : `Tienes ${avisos.length} cosas pendientes`}
            </p>
            {avisos.map((a) => (
              <button
                key={a.texto}
                onClick={() => setTab(a.ir)}
                className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-left ring-1 ring-white/10 hover:bg-white/10"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <span className="flex-1 text-sm text-white">{a.texto}</span>
                <span className="shrink-0 text-xs font-bold underline" style={{ color: BRONCE }}>{a.accion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
        {tab === 'carta' && <MiCarta jugador={miJugador} userId={user!.id} />}
        {tab === 'datos' && <MisDatos onGuardado={cargarMiCarta} />}
        {tab === 'partido' && (
          <ProximoPartido partido={citado} jugadorId={jugadorId} plantel={plantel} onRespuesta={setMiConfirmacion} />
        )}
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
