import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nombreCorto, type AjustesCarta, type Jugador } from '../lib/types'
import { NIVELES } from '../lib/jugadorAuth'
import { Badge, Button, Card, Field, Input, PageHeader, Spinner } from '../components/ui'

type Cuenta = { jugador_id: string | null; nombre_usuario: string | null; rol: string; clave_cambiada: boolean }

const CAMPOS: { k: keyof AjustesCarta; label: string; ayuda: string }[] = [
  { k: 'base', label: 'Media de partida', ayuda: 'Con cuánto parte cada jugador la temporada.' },
  { k: 'tope', label: 'Media máxima', ayuda: 'Nadie pasa de aquí, por bien que juegue.' },
  { k: 'pts_asistir', label: 'Ir al partido', ayuda: 'Suma aunque no haya jugado.' },
  { k: 'pts_puntual', label: 'Llegar a la hora', ayuda: 'Solo si además fue.' },
  { k: 'pts_titular', label: 'Ser titular', ayuda: 'Al que el DT pone de entrada.' },
  { k: 'pts_apoyo', label: 'Fue igual sin jugar', ayuda: 'Lesionado o sin minutos, pero fue a alentar. No debería pagar más que jugar.' },
  { k: 'pts_responde', label: 'Dijo a tiempo si iba', ayuda: 'Antes del jueves a las 13:00.' },
  { k: 'pts_vota', label: 'Votó el partido', ayuda: 'Antes del martes a las 21:00, si fue al partido.' },
  { k: 'pts_encuesta', label: 'Cada encuesta respondida', ayuda: 'Una sola vez por encuesta, no por partido.' },
  { k: 'pts_cuotas_al_dia', label: 'Al día con las cuotas', ayuda: 'Una sola vez, mientras no deba ninguna.' },
  { k: 'pts_victoria', label: 'Ganamos', ayuda: 'A todos los que jugaron ese partido.' },
  { k: 'pts_empate', label: 'Empatamos', ayuda: 'A todos los que jugaron ese partido.' },
  { k: 'pts_valla', label: 'Arco en cero', ayuda: 'A todos los que jugaron: defender es de los once.' },
  { k: 'pts_valla_arquero', label: '…y al arquero', ayuda: 'Se suma al anterior, solo para el arquero.' },
  { k: 'pts_gol', label: 'Gol', ayuda: 'Vale lo mismo que una asistencia, a propósito.' },
  { k: 'pts_asistencia', label: 'Asistencia', ayuda: 'Vale lo mismo que un gol, a propósito.' },
  { k: 'pts_voto_1', label: 'Votación: 1°', ayuda: 'El más votado del partido. Es el MVP.' },
  { k: 'pts_voto_2', label: 'Votación: 2°', ayuda: '' },
  { k: 'pts_voto_3a5', label: 'Votación: 3° a 5°', ayuda: 'Los otros tres del podio.' },
  { k: 'pts_voto', label: 'Multiplicador de voto', ayuda: 'Déjalo en 1: los puntos del podio ya vienen calculados.' },
  { k: 'pts_extra', label: 'Punto extra', ayuda: 'Los que pone la directiva a mano.' },
  { k: 'pts_dt_victoria', label: 'DT: partido ganado', ayuda: 'Solo para el entrenador.' },
  { k: 'pts_dt_empate', label: 'DT: partido empatado', ayuda: 'Solo para el entrenador.' },
  { k: 'pen_no_fue', label: 'Dijo que iba y no fue', ayuda: 'Se descuenta de la media.' },
  { k: 'pen_atraso', label: 'Llegó tarde', ayuda: 'Además de no ganar el punto por puntualidad.' },
  { k: 'pen_cuota', label: 'Cuota atrasada', ayuda: 'Por cada cuota vencida sin pagar.' },
  { k: 'pen_no_responde', label: 'No dijo si iba', ayuda: 'Se aplica solo al vencer el jueves a las 13:00.' },
  { k: 'pen_no_vota', label: 'Fue y no votó', ayuda: 'Se aplica solo al vencer el martes a las 21:00.' },
  { k: 'dias_gracia_cuota', label: 'Días de gracia', ayuda: 'La cuota pesa recién después de estos días.' },
  { k: 'piso', label: 'Media mínima', ayuda: 'Por muchas penalizaciones, nadie baja de aquí.' },
]

const ES_PENALIZACION = (k: string) => k.startsWith('pen_') || k === 'dias_gracia_cuota' || k === 'piso'

/* ============ ECONOMÍA DE LA CARTA ============ */
function AjustesDeCarta() {
  const [a, setA] = useState<AjustesCarta | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [partidos, setPartidos] = useState(12)

  useEffect(() => {
    supabase.from('ajustes_carta').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => setA((data as AjustesCarta) ?? null))
  }, [])

  /* La cuenta que importa: cómo termina la temporada cada tipo de jugador.
     Si el que solo asiste ya llega al tope, el fútbol dejó de pesar. */
  const simulacion = useMemo(() => {
    if (!a) return null
    const cerrar = (bruto: number) => Math.max(a.piso, Math.min(a.tope, bruto))
    const nivel = (m: number) => [...NIVELES].reverse().find((n) => m >= n.desde)
    const victorias = Math.round(partidos * 0.6) // temporada normal: se gana algo más de la mitad
    const banca = cerrar(
      a.base
      + partidos * (a.pts_asistir + a.pts_puntual + a.pts_responde + a.pts_vota)
      + victorias * a.pts_victoria
      + a.pts_cuotas_al_dia,
    )
    const titular = cerrar(banca + partidos * a.pts_titular)
    return {
      victorias,
      banca: { media: banca, nivel: nivel(banca) },
      titular: { media: titular, nivel: nivel(titular) },
      faltanParaTope: Math.max(0, a.tope - titular),
    }
  }, [a, partidos])

  const guardar = async () => {
    if (!a) return
    setGuardando(true)
    setMsg(null)
    // Se arma desde CAMPOS para que agregar un ajuste nuevo no obligue a
    // acordarse de sumarlo aquí (así se me quedaron fuera los del DT).
    const cambios = Object.fromEntries(CAMPOS.map((c) => [c.k, a[c.k]]))
    const { error } = await supabase.from('ajustes_carta')
      .update({ ...cambios, actualizado_en: new Date().toISOString() })
      .eq('id', 1)
    if (error) {
      setGuardando(false)
      setMsg({ tipo: 'error', texto: 'No se pudo guardar: ' + error.message })
      return
    }
    const { error: err2 } = await supabase.rpc('recalcular_cartas')
    setGuardando(false)
    setMsg(err2
      ? { tipo: 'error', texto: 'Se guardó, pero no se pudieron recalcular las cartas: ' + err2.message }
      : { tipo: 'ok', texto: 'Guardado. Las medias del plantel se recalcularon con los valores nuevos.' })
  }

  if (!a) return <Spinner />

  return (
    <Card className="p-6">
      <h2 className="text-lg font-black text-ink-900">Cómo sube la carta</h2>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        Cambia un número y todas las medias del plantel se recalculan al guardar.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CAMPOS.filter((c) => !String(c.k).startsWith('pts_dt') && !ES_PENALIZACION(String(c.k))).map((c) => (
          <Field key={c.k} label={c.label}>
            <Input
              type="number"
              value={a[c.k] as number}
              title={c.ayuda}
              onChange={(e) => setA({ ...a, [c.k]: Number(e.target.value) || 0 })}
            />
          </Field>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Solo para el DT</p>
        <p className="mb-3 text-sm text-slate-600">
          El entrenador no hace goles ni recibe votos. Su media sube por estar, llegar a la hora, por los
          resultados del equipo y por los puntos extra que le pongas cuando cumple lo suyo.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CAMPOS.filter((c) => String(c.k).startsWith('pts_dt')).map((c) => (
            <Field key={c.k} label={c.label}>
              <Input
                type="number"
                value={a[c.k] as number}
                title={c.ayuda}
                onChange={(e) => setA({ ...a, [c.k]: Number(e.target.value) || 0 })}
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-rose-50/60 p-4 ring-1 ring-rose-100">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-rose-700">Lo que resta</p>
        <p className="mb-3 text-sm text-slate-600">
          Se anotan en positivo y la fórmula los descuenta. Anotarse y no ir es lo que más pesa, porque deja al
          equipo con menos gente de la que contaba.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {CAMPOS.filter((c) => ES_PENALIZACION(String(c.k))).map((c) => (
            <Field key={c.k} label={c.label}>
              <Input
                type="number"
                value={a[c.k] as number}
                title={c.ayuda}
                onChange={(e) => setA({ ...a, [c.k]: Number(e.target.value) || 0 })}
              />
            </Field>
          ))}
        </div>
      </div>

      {simulacion && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Con una temporada de</span>
            <Input
              type="number"
              className="w-20"
              value={partidos}
              onChange={(e) => setPartidos(Math.max(1, Number(e.target.value) || 1))}
            />
            <span>partidos:</span>
          </div>
          <p className="text-sm text-slate-700">
            Ganando <b>{simulacion.victorias}</b> de esos partidos, quien va a todos, llega a la hora, responde
            siempre, vota siempre y está al día con las cuotas, pero entra desde la banca, termina en{' '}
            <b className="text-brand-700">{simulacion.banca.media}</b>
            {simulacion.banca.nivel && <> — carta <b>{simulacion.banca.nivel.nombre}</b></>}. El mismo jugador,
            de titular fijo, termina en <b className="text-brand-700">{simulacion.titular.media}</b>
            {simulacion.titular.nivel && <> — carta <b>{simulacion.titular.nivel.nombre}</b></>}.
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {simulacion.faltanParaTope > 0
              ? <>Para llegar al máximo le faltan <b>{simulacion.faltanParaTope}</b> puntos, que solo salen de
                  goles, asistencias, arcos en cero, encuestas y de que sus compañeros lo voten.</>
              : <>Ya llega al máximo sin jugar bien.</>}
          </p>
          {simulacion.faltanParaTope === 0 && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              Ojo: así el fútbol deja de importar para la carta. Baja los puntos por asistir o sube el tope.
            </p>
          )}
        </div>
      )}

      {msg && (
        <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${msg.tipo === 'ok' ? 'bg-brand-50 text-brand-800' : 'bg-rose-50 text-rose-700'}`}>
          {msg.texto}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando y recalculando…' : 'Guardar y recalcular las cartas'}
        </Button>
        <span className="text-xs text-slate-400">
          Niveles: {NIVELES.map((n) => `${n.nombre} desde ${n.desde}`).join(' · ')}
        </span>
      </div>
    </Card>
  )
}

/* ============ CUENTAS DE LOS JUGADORES ============ */
function Cuentas() {
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const cargar = async () => {
    const [{ data: js }, { data: cs }] = await Promise.all([
      supabase.from('jugadores').select('*').eq('activo', true).order('apellido_paterno'),
      supabase.from('perfiles').select('jugador_id, nombre_usuario, rol, clave_cambiada'),
    ])
    setJugadores((js as Jugador[]) ?? [])
    setCuentas((cs as Cuenta[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const cuentaDe = (id: string) => cuentas.find((c) => c.jugador_id === id) ?? null

  const crear = async (j: Jugador) => {
    setTrabajando(j.id)
    setMsg(null)
    const { data, error } = await supabase.rpc('crear_cuenta_jugador', { p_jugador: j.id })
    setTrabajando(null)
    if (error) {
      setMsg({ tipo: 'error', texto: error.message })
      return
    }
    setMsg({ tipo: 'ok', texto: `Cuenta creada para ${nombreCorto(j)} — usuario ${data}, clave ${data}2026` })
    cargar()
  }

  const resetear = async (j: Jugador) => {
    if (!confirm(`¿Devolver la clave de ${nombreCorto(j)} a la inicial?`)) return
    setTrabajando(j.id)
    setMsg(null)
    const { data, error } = await supabase.rpc('resetear_clave_jugador', { p_jugador: j.id })
    setTrabajando(null)
    if (error) {
      setMsg({ tipo: 'error', texto: error.message })
      return
    }
    setMsg({ tipo: 'ok', texto: `Clave de ${nombreCorto(j)} devuelta a ${data}2026. Avísale que la cambie.` })
    cargar()
  }

  const sinCuenta = jugadores.filter((j) => !cuentaDe(j.id)).length
  const sinCambiarClave = cuentas.filter((c) => !c.clave_cambiada).length

  if (loading) return <Spinner />

  return (
    <Card className="p-6">
      <h2 className="text-lg font-black text-ink-900">Cuentas del plantel</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        El usuario es la inicial del nombre pegada al apellido. La clave inicial es ese mismo usuario seguido de 2026.
        {sinCuenta > 0 && <> Hay <b className="text-amber-700">{sinCuenta}</b> sin cuenta.</>}
        {sinCambiarClave > 0 && <> Todavía <b>{sinCambiarClave}</b> no cambian su clave inicial.</>}
      </p>

      {msg && (
        <p className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.tipo === 'ok' ? 'bg-brand-50 text-brand-800' : 'bg-rose-50 text-rose-700'}`}>
          {msg.texto}
        </p>
      )}

      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Jugador</th>
              <th className="px-3 py-2.5">Usuario</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jugadores.map((j) => {
              const c = cuentaDe(j.id)
              return (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-ink-900">{nombreCorto(j)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{c?.nombre_usuario ?? '—'}</td>
                  <td className="px-3 py-2">
                    {!c && <Badge tone="amber">Sin cuenta</Badge>}
                    {c && c.rol === 'directiva' && <Badge tone="green">Directiva</Badge>}
                    {c && c.rol !== 'directiva' && (c.clave_cambiada
                      ? <Badge tone="green">Clave propia</Badge>
                      : <Badge tone="slate">Clave inicial</Badge>)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {c ? (
                      <Button variant="secondary" onClick={() => resetear(j)} disabled={trabajando === j.id}>
                        {trabajando === j.id ? '…' : 'Resetear clave'}
                      </Button>
                    ) : (
                      <Button onClick={() => crear(j)} disabled={trabajando === j.id}>
                        {trabajando === j.id ? 'Creando…' : 'Crear cuenta'}
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Cuando entre un jugador nuevo: agrégalo en Plantel, vuelve acá y créale la cuenta. Él después completa
        sus datos y cambia su clave desde el celular.
      </p>
    </Card>
  )
}

export default function Configuracion() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Configuración" subtitle="Las reglas del juego y las cuentas del plantel." />
      <div className="space-y-6">
        <AjustesDeCarta />
        <Cuentas />
      </div>
    </div>
  )
}
