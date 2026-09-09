import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pedirTexto, type TareaIA } from '../lib/ia'
import { nombreCorto, type Jugador, type Partido, type PartidoJugador } from '../lib/types'
import { fecha as fmtFecha } from '../lib/format'
import { Badge, Button, Card, EmptyState, PageHeader, Select, Spinner } from '../components/ui'

type Pestana = 'nomina' | 'resultado' | 'jugador'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "sábado 12 de septiembre" — como se escribe en un post, no como fecha de sistema. */
function fechaLarga(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${d.toLocaleDateString('es-CL', { month: 'long' })}`
}

function Copiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }
  return (
    <Button onClick={copiar} disabled={!texto}>
      {copiado ? '✓ Copiado' : 'Copiar texto'}
    </Button>
  )
}

/** Caja con el texto final, editable antes de copiar. */
function Salida({
  valor,
  onChange,
  vacio,
}: {
  valor: string
  onChange: (v: string) => void
  vacio: string
}) {
  return (
    <div>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        placeholder={vacio}
        className="w-full rounded-xl border-0 bg-slate-50 p-4 font-mono text-sm leading-relaxed ring-1 ring-slate-200 focus:ring-brand-500"
      />
      <div className="mt-3 flex items-center gap-3">
        <Copiar texto={valor} />
        <span className="text-xs text-slate-400">
          Puedes editarlo antes de copiar. Se pega tal cual en Instagram o en el grupo.
        </span>
      </div>
    </div>
  )
}

export default function Multimedia() {
  const [tab, setTab] = useState<Pestana>('nomina')
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [pjs, setPjs] = useState<PartidoJugador[]>([])
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(true)

  const [partidoId, setPartidoId] = useState('')
  const [jugadorId, setJugadorId] = useState('')
  const [texto, setTexto] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      const [p, pj, j] = await Promise.all([
        supabase.from('partidos').select('*').order('fecha', { ascending: false, nullsFirst: false }),
        supabase.from('partido_jugadores').select('*'),
        supabase.from('jugadores').select('*').eq('activo', true).order('apellido_paterno'),
      ])
      const ps = (p.data as Partido[]) ?? []
      setPartidos(ps)
      setPjs((pj.data as PartidoJugador[]) ?? [])
      setJugadores((j.data as Jugador[]) ?? [])
      if (ps.length) setPartidoId(ps[0].id)
      setLoading(false)
    }
    cargar()
  }, [])

  const jugadorPorId = useMemo(() => {
    const m = new Map<string, Jugador>()
    jugadores.forEach((j) => m.set(j.id, j))
    return m
  }, [jugadores])

  const partido = partidos.find((p) => p.id === partidoId) ?? null
  const filas = useMemo(() => pjs.filter((r) => r.partido_id === partidoId), [pjs, partidoId])

  /* ---- La nómina la arma la plataforma, no el modelo: los nombres tienen que
     salir exactos. Se prefiere quién quedó citado; si aún no hay citados, se
     usa a los que confirmaron que van. ---- */
  const nomina = useMemo(() => {
    const citados = filas.filter((r) => r.citado)
    const base = citados.length ? citados : filas.filter((r) => r.confirmado === 'si')
    return base
      .map((r) => jugadorPorId.get(r.jugador_id))
      .filter((j): j is Jugador => Boolean(j))
      .sort((a, b) => (a.numero_camiseta ?? 99) - (b.numero_camiseta ?? 99))
  }, [filas, jugadorPorId])

  const goleadores = useMemo(
    () =>
      filas
        .filter((r) => r.goles > 0)
        .map((r) => ({ j: jugadorPorId.get(r.jugador_id), goles: r.goles }))
        .filter((x) => x.j)
        .sort((a, b) => b.goles - a.goles),
    [filas, jugadorPorId],
  )

  const figura = useMemo(() => {
    const mejor = [...filas].sort((a, b) => b.puntos_voto - a.puntos_voto)[0]
    return mejor && mejor.puntos_voto > 0 ? jugadorPorId.get(mejor.jugador_id) : null
  }, [filas, jugadorPorId])

  const listaNomina = () =>
    nomina.map((j) => `${j.numero_camiseta ? `${j.numero_camiseta}. ` : '· '}${nombreCorto(j)}`).join('\n')

  const generar = async () => {
    setTrabajando(true)
    setError(null)
    try {
      let tarea: TareaIA
      let datos: Record<string, unknown>
      if (tab === 'nomina') {
        if (!partido) return
        tarea = 'caption_citacion'
        datos = {
          rival: partido.rival,
          fecha: fechaLarga(partido.fecha),
          hora: partido.hora,
          cancha: partido.cancha,
        }
      } else if (tab === 'resultado') {
        if (!partido) return
        tarea = 'caption_resultado'
        datos = {
          golesFavor: partido.goles_favor,
          golesContra: partido.goles_contra,
          rival: partido.rival,
          fecha: fechaLarga(partido.fecha),
          goleadores: goleadores.map((g) => `${nombreCorto(g.j!)}${g.goles > 1 ? ` (${g.goles})` : ''}`).join(', '),
          figura: figura ? nombreCorto(figura) : '',
        }
      } else {
        const j = jugadorPorId.get(jugadorId)
        if (!j) return
        const suyas = pjs.filter((r) => r.jugador_id === j.id)
        tarea = 'presentacion_jugador'
        datos = {
          nombre: nombreCorto(j),
          posicion: j.posicion,
          numero: j.numero_camiseta,
          media: j.carta_overall,
          goles: suyas.reduce((a, r) => a + r.goles, 0),
        }
      }
      const generado = await pedirTexto(tarea, datos)

      // En la citación, debajo del texto va la nómina real
      if (tab === 'nomina' && nomina.length) {
        setTexto(`${generado}\n\nNÓMINA (${nomina.length})\n${listaNomina()}`)
      } else {
        setTexto(generado)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTrabajando(false)
    }
  }

  if (loading) return <Spinner />

  const jugados = partidos.filter((p) => p.goles_favor != null && p.goles_contra != null)
  const opcionPartido = (p: Partido) =>
    `${fmtFecha(p.fecha)} · Old Brads ${p.es_local ? 'vs' : '@'} ${p.rival}`

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Multimedia"
        subtitle="Los textos para Instagram y el grupo, armados con los datos reales del club."
      />

      <div className="mb-6 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
        {([
          ['nomina', 'Citación y nómina'],
          ['resultado', 'Resultado'],
          ['jugador', 'Presentar jugador'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setTab(id); setTexto(''); setError(null) }}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              tab === id ? 'bg-white text-ink-900 shadow-sm' : 'text-slate-500 hover:text-ink-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {partidos.length === 0 && tab !== 'jugador' ? (
        <EmptyState title="Todavía no hay partidos" hint="Crea el primero en la sección Partidos." />
      ) : (
        <Card className="p-5">
          {/* ---- Elegir de qué se habla ---- */}
          {tab === 'jugador' ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Jugador</span>
              <Select value={jugadorId} onChange={(e) => { setJugadorId(e.target.value); setTexto('') }}>
                <option value="">— Elegir —</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>{nombreCorto(j)}</option>
                ))}
              </Select>
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Partido</span>
              <Select value={partidoId} onChange={(e) => { setPartidoId(e.target.value); setTexto('') }}>
                {(tab === 'resultado' ? jugados : partidos).map((p) => (
                  <option key={p.id} value={p.id}>{opcionPartido(p)}</option>
                ))}
              </Select>
            </label>
          )}

          {/* ---- Lo que el club ya sabe del partido ---- */}
          {tab === 'nomina' && partido && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                <b className="text-ink-900">Old Brads {partido.es_local ? 'vs' : '@'} {partido.rival}</b>
                {' · '}{fechaLarga(partido.fecha) || 'sin fecha'}
                {partido.hora ? ` · ${partido.hora}` : ' · sin hora'}
                {partido.cancha ? ` · ${partido.cancha}` : ''}
              </p>
              {nomina.length === 0 ? (
                <p className="mt-2 text-sm text-amber-700">
                  Nadie citado todavía. Marca a los citados en <b>Partidos</b> y la nómina aparece sola acá.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Nómina ({nomina.length})
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                    {nomina.map((j) => (
                      <span key={j.id}>
                        {j.numero_camiseta ? <b className="text-slate-400">{j.numero_camiseta} </b> : null}
                        {nombreCorto(j)}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'resultado' && partido && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
              <span className="font-display text-2xl font-black tabular-nums text-ink-900">
                {partido.goles_favor} - {partido.goles_contra}
              </span>
              <span className="text-sm text-slate-600">vs {partido.rival}</span>
              {goleadores.length > 0 && (
                <Badge tone="green">
                  {goleadores.map((g) => `${nombreCorto(g.j!)}${g.goles > 1 ? ` (${g.goles})` : ''}`).join(', ')}
                </Badge>
              )}
              {figura && <Badge tone="amber">Figura: {nombreCorto(figura)}</Badge>}
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="mt-4">
            <Button
              onClick={generar}
              disabled={trabajando || (tab === 'jugador' ? !jugadorId : !partido)}
            >
              {trabajando ? 'Escribiendo…' : '✨ Redactar publicación'}
            </Button>
          </div>

          <div className="mt-5">
            <Salida
              valor={texto}
              onChange={setTexto}
              vacio="Pulsa «Redactar publicación» y el texto aparece acá."
            />
          </div>
        </Card>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Los nombres de la nómina y los goleadores los pone la plataforma con los datos cargados, no el modelo:
        así nunca sale un nombre inventado ni mal escrito.
      </p>
    </div>
  )
}
