import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  nombreCorto,
  type Jugador,
  type Partido,
  type PartidoJugador,
  type Temporada,
} from '../lib/types'
import { EmptyState, PageHeader, Select, Spinner, StatCard } from '../components/ui'

/* Una fila por jugador con todo lo acumulado. */
type Fila = {
  jugador: Jugador
  convocado: number
  fue: number
  puntual: number
  jugo: number
  titular: number
  goles: number
  asistencias: number
  votos: number
  extra: number
  media: number
}

type Columna = { k: keyof Fila | 'nombre' | 'pct'; label: string; ancho?: string; ayuda?: string }

const COLUMNAS: Columna[] = [
  { k: 'nombre', label: 'Jugador', ancho: 'w-44' },
  { k: 'convocado', label: 'Citado', ayuda: 'Veces que fue convocado' },
  { k: 'fue', label: 'Fue', ayuda: 'Veces que llegó al partido' },
  { k: 'pct', label: '% asist.', ayuda: 'Fue / citado' },
  { k: 'puntual', label: 'A la hora' },
  { k: 'jugo', label: 'Jugó' },
  { k: 'goles', label: 'Goles' },
  { k: 'asistencias', label: 'Asist.' },
  { k: 'votos', label: 'Votos', ayuda: 'Puntos que le dieron sus compañeros' },
  { k: 'media', label: 'Media' },
]

function Podio({ titulo, filas, valor, sufijo = '' }: { titulo: string; filas: Fila[]; valor: (f: Fila) => number; sufijo?: string }) {
  const top = [...filas].filter((f) => valor(f) > 0).sort((a, b) => valor(b) - valor(a)).slice(0, 5)
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
      {top.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía sin datos.</p>
      ) : (
        <ol className="space-y-2">
          {top.map((f, i) => (
            <li key={f.jugador.id} className="flex items-center gap-3">
              <span className={`w-5 text-center text-sm font-black ${i === 0 ? 'text-amber-500' : 'text-slate-300'}`}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{nombreCorto(f.jugador)}</span>
              <span className="text-sm font-black tabular-nums text-brand-700">{valor(f)}{sufijo}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function Estadisticas() {
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [pjs, setPjs] = useState<PartidoJugador[]>([])
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [temporadaId, setTemporadaId] = useState('')
  const [orden, setOrden] = useState<{ k: Columna['k']; desc: boolean }>({ k: 'media', desc: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const [p, pj, j, t] = await Promise.all([
        supabase.from('partidos').select('*').order('fecha', { ascending: true, nullsFirst: false }),
        supabase.from('partido_jugadores').select('*'),
        supabase.from('jugadores').select('*').eq('activo', true),
        supabase.from('temporadas').select('*').order('orden'),
      ])
      setPartidos((p.data as Partido[]) ?? [])
      setPjs((pj.data as PartidoJugador[]) ?? [])
      setJugadores((j.data as Jugador[]) ?? [])
      setTemporadas((t.data as Temporada[]) ?? [])
      setLoading(false)
    }
    cargar()
  }, [])

  /* Solo los partidos ya jugados cuentan para las estadísticas. */
  const partidosContados = useMemo(
    () =>
      partidos.filter(
        (p) => p.estado !== 'citacion' && (temporadaId === '' || p.temporada_id === temporadaId),
      ),
    [partidos, temporadaId],
  )
  const idsContados = useMemo(() => new Set(partidosContados.map((p) => p.id)), [partidosContados])

  const equipo = useMemo(() => {
    let g = 0, e = 0, p = 0, gf = 0, gc = 0
    for (const m of partidosContados) {
      if (m.goles_favor == null || m.goles_contra == null) continue
      gf += m.goles_favor
      gc += m.goles_contra
      if (m.goles_favor > m.goles_contra) g++
      else if (m.goles_favor < m.goles_contra) p++
      else e++
    }
    const jugados = g + e + p
    return { jugados, g, e, p, gf, gc, dg: gf - gc, pct: jugados ? Math.round((g / jugados) * 100) : 0 }
  }, [partidosContados])

  const filas = useMemo<Fila[]>(() => {
    const porJugador = new Map<string, PartidoJugador[]>()
    for (const r of pjs) {
      if (!idsContados.has(r.partido_id)) continue
      const arr = porJugador.get(r.jugador_id) ?? []
      arr.push(r)
      porJugador.set(r.jugador_id, arr)
    }
    return jugadores.map((j) => {
      const rs = porJugador.get(j.id) ?? []
      return {
        jugador: j,
        convocado: rs.filter((r) => r.citado).length,
        fue: rs.filter((r) => r.asistio === true).length,
        puntual: rs.filter((r) => r.asistio === true && r.puntual === true).length,
        jugo: rs.filter((r) => r.jugo).length,
        titular: rs.filter((r) => r.titular).length,
        goles: rs.reduce((a, r) => a + r.goles, 0),
        asistencias: rs.reduce((a, r) => a + r.asistencias, 0),
        votos: rs.reduce((a, r) => a + r.puntos_voto, 0),
        extra: rs.reduce((a, r) => a + r.puntos_extra, 0),
        media: j.carta_overall ?? 60,
      }
    })
  }, [pjs, jugadores, idsContados])

  const pctDe = (f: Fila) => (f.convocado ? Math.round((f.fue / f.convocado) * 100) : 0)

  const ordenadas = useMemo(() => {
    const v = (f: Fila): number | string =>
      orden.k === 'nombre' ? nombreCorto(f.jugador) : orden.k === 'pct' ? pctDe(f) : (f[orden.k as keyof Fila] as number)
    return [...filas].sort((a, b) => {
      const va = v(a), vb = v(b)
      const cmp = typeof va === 'string' ? String(va).localeCompare(String(vb)) : (va as number) - (vb as number)
      return orden.desc ? -cmp : cmp
    })
  }, [filas, orden])

  const ordenarPor = (k: Columna['k']) =>
    setOrden((o) => (o.k === k ? { k, desc: !o.desc } : { k, desc: k !== 'nombre' }))

  if (loading) return <Spinner />

  if (partidosContados.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Estadísticas" subtitle="Todo lo que se acumula partido a partido." />
        <EmptyState
          title="Todavía no hay partidos jugados"
          hint="Las estadísticas aparecen cuando un partido pasa de «Citación» a «Jugado» en la sección Partidos."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Estadísticas"
        subtitle={`${partidosContados.length} partido${partidosContados.length === 1 ? '' : 's'} contabilizado${partidosContados.length === 1 ? '' : 's'}.`}
        action={
          temporadas.length > 0 ? (
            <Select value={temporadaId} onChange={(e) => setTemporadaId(e.target.value)} className="w-56">
              <option value="">Todas las temporadas</option>
              {temporadas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </Select>
          ) : undefined
        }
      />

      {/* ---- El equipo ---- */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Jugados" value={String(equipo.jugados)} />
        <StatCard label="Ganados" value={String(equipo.g)} />
        <StatCard label="Empatados" value={String(equipo.e)} />
        <StatCard label="Perdidos" value={String(equipo.p)} />
        <StatCard label="Goles a favor" value={String(equipo.gf)} />
        <StatCard label="Goles en contra" value={String(equipo.gc)} />
        <StatCard label="% victorias" value={`${equipo.pct}%`} />
      </div>

      {/* ---- Podios ---- */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Podio titulo="Goleadores" filas={filas} valor={(f) => f.goles} />
        <Podio titulo="Asistidores" filas={filas} valor={(f) => f.asistencias} />
        <Podio titulo="Más presentes" filas={filas} valor={(f) => f.fue} />
        <Podio titulo="Más votados" filas={filas} valor={(f) => f.votos} />
      </div>

      {/* ---- Tabla completa ---- */}
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {COLUMNAS.map((c) => (
                <th
                  key={String(c.k)}
                  title={c.ayuda}
                  onClick={() => ordenarPor(c.k)}
                  className={`cursor-pointer select-none px-3 py-2.5 hover:text-ink-900 ${c.k === 'nombre' ? 'text-left' : 'text-center'} ${c.ancho ?? ''}`}
                >
                  {c.label}
                  {orden.k === c.k && <span className="ml-1 text-slate-400">{orden.desc ? '▾' : '▴'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ordenadas.map((f) => (
              <tr key={f.jugador.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-ink-900">{nombreCorto(f.jugador)}</td>
                <td className="px-3 py-2 text-center tabular-nums text-slate-500">{f.convocado}</td>
                <td className="px-3 py-2 text-center tabular-nums font-semibold text-ink-900">{f.fue}</td>
                <td className="px-3 py-2 text-center tabular-nums">
                  <span className={pctDe(f) >= 80 ? 'font-bold text-brand-700' : pctDe(f) >= 50 ? 'text-slate-600' : 'text-rose-600'}>
                    {f.convocado ? `${pctDe(f)}%` : '—'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-slate-600">{f.puntual}</td>
                <td className="px-3 py-2 text-center tabular-nums text-slate-500">{f.jugo}</td>
                <td className="px-3 py-2 text-center tabular-nums font-semibold text-ink-900">{f.goles || '—'}</td>
                <td className="px-3 py-2 text-center tabular-nums text-slate-600">{f.asistencias || '—'}</td>
                <td className="px-3 py-2 text-center tabular-nums text-slate-600">{f.votos || '—'}</td>
                <td className="px-3 py-2 text-center font-black tabular-nums text-brand-700">{f.media}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Haz clic en cualquier encabezado para ordenar. Solo se cuentan los partidos que ya salieron de «Citación».
      </p>
    </div>
  )
}
