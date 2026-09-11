import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pedirTexto } from '../lib/ia'
import { nombreCompleto, type Encuesta, type EncuestaPregunta, type Jugador, type Partido } from '../lib/types'
import { fecha as fmtFecha } from '../lib/format'
import { Button, PageHeader } from '../components/ui'

type Voto = { partido_id: string; votante_user_id: string; votado_jugador_id: string; posicion: number }
type Respuesta = {
  pregunta_id: string
  jugador_elegido: string | null
  opcion: string | null
  texto: string | null
  numero: number | null
}

const PUNTOS: Record<number, number> = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 }
/* Lo que se lleva cada puesto del podio, como el Balón de Oro. Se configura
   en Configuración; acá va solo para mostrarlo. */
const A_LA_CARTA = [3, 2, 1, 1, 1]

/** El informe viene con los títulos en mayúsculas: se destacan al mostrarlo. */
function Informe({ texto }: { texto: string }) {
  return (
    <div className="space-y-3">
      {texto.split('\n').filter((l) => l.trim()).map((linea, i) => {
        const esTitulo = linea === linea.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(linea) && linea.length < 60
        if (esTitulo) {
          return (
            <p key={i} className="pt-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#c0782a' }}>
              {linea.replace(/[—-]\s*$/, '')}
            </p>
          )
        }
        return <p key={i} className="text-sm leading-relaxed text-slate-700">{linea}</p>
      })}
    </div>
  )
}

export default function Votaciones() {
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [partidoId, setPartidoId] = useState<string>('')
  const [votos, setVotos] = useState<Voto[]>([])
  const [plantel, setPlantel] = useState<Record<string, Jugador>>({})
  const [loading, setLoading] = useState(true)
  const [aplicando, setAplicando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // La encuesta del partido: la nota al equipo, la jugada y los comentarios.
  const [encuesta, setEncuesta] = useState<Encuesta | null>(null)
  const [preguntas, setPreguntas] = useState<EncuestaPregunta[]>([])
  const [respuestas, setRespuestas] = useState<Respuesta[]>([])
  const [respondieron, setRespondieron] = useState(0)
  const [escribiendo, setEscribiendo] = useState(false)
  const [errorInforme, setErrorInforme] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const [pt, pl] = await Promise.all([
        supabase.from('partidos').select('*').order('fecha', { ascending: false, nullsFirst: false }),
        supabase.from('pub_plantel').select('*'),
      ])
      const parts = (pt.data as Partido[]) ?? []
      setPartidos(parts)
      const map: Record<string, Jugador> = {}
      ;((pl.data as Jugador[]) ?? []).forEach((j) => { map[j.id] = j })
      setPlantel(map)
      if (parts.length) setPartidoId(parts[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!partidoId) return
    setMsg(null)
    setErrorInforme(null)
    const cargar = async () => {
      const [{ data: vs }, { data: enc }] = await Promise.all([
        supabase.from('votos').select('*').eq('partido_id', partidoId),
        supabase.from('encuestas').select('*').eq('partido_id', partidoId).maybeSingle(),
      ])
      setVotos((vs as Voto[]) ?? [])
      const e = (enc as Encuesta) ?? null
      setEncuesta(e)
      if (!e) {
        setPreguntas([]); setRespuestas([]); setRespondieron(0)
        return
      }
      const [{ data: qs }, { data: rs }, { count }] = await Promise.all([
        supabase.from('encuesta_preguntas').select('*').eq('encuesta_id', e.id).order('orden'),
        supabase.from('encuesta_respuestas').select('pregunta_id, jugador_elegido, opcion, texto, numero').eq('encuesta_id', e.id),
        supabase.from('encuesta_participantes').select('*', { count: 'exact', head: true }).eq('encuesta_id', e.id),
      ])
      setPreguntas((qs as EncuestaPregunta[]) ?? [])
      setRespuestas((rs as Respuesta[]) ?? [])
      setRespondieron(count ?? 0)
    }
    cargar()
  }, [partidoId])

  const ranking = useMemo(() => {
    const acc: Record<string, { puntos: number; menciones: number }> = {}
    votos.forEach((v) => {
      const r = (acc[v.votado_jugador_id] ??= { puntos: 0, menciones: 0 })
      r.puntos += PUNTOS[v.posicion] ?? 0
      r.menciones += 1
    })
    return Object.entries(acc)
      .map(([jid, r]) => ({ jid, ...r }))
      .sort((a, b) => b.puntos - a.puntos || b.menciones - a.menciones)
  }, [votos])

  const votantes = useMemo(() => new Set(votos.map((v) => v.votante_user_id)).size, [votos])
  const partido = partidos.find((p) => p.id === partidoId)

  /* ---- Lo que dijo el plantel, ordenado por pregunta ---- */
  const resultados = useMemo(() =>
    preguntas.map((q) => {
      const suyas = respuestas.filter((r) => r.pregunta_id === q.id)
      if (q.tipo === 'escala') {
        const nums = suyas.map((r) => r.numero).filter((n): n is number => n != null)
        const promedio = nums.length ? nums.reduce((a, n) => a + n, 0) / nums.length : null
        return { q, tipo: 'escala' as const, promedio, n: nums.length }
      }
      if (q.tipo === 'texto') {
        return { q, tipo: 'texto' as const, textos: suyas.map((r) => r.texto?.trim()).filter(Boolean) as string[] }
      }
      const conteo: Record<string, number> = {}
      suyas.forEach((r) => {
        const clave = q.tipo === 'jugador'
          ? (r.jugador_elegido && plantel[r.jugador_elegido] ? nombreCompleto(plantel[r.jugador_elegido]) : null)
          : r.opcion
        if (clave) conteo[clave] = (conteo[clave] ?? 0) + 1
      })
      return { q, tipo: 'conteo' as const, filas: Object.entries(conteo).sort((a, b) => b[1] - a[1]) }
    }),
  [preguntas, respuestas, plantel])

  const comentarios = useMemo(
    () => resultados.flatMap((r) => (r.tipo === 'texto' ? r.textos : [])),
    [resultados],
  )

  /* ---- El informe ---- */
  const generarInforme = useCallback(async (silencioso = false) => {
    if (!partido || ranking.length === 0) return
    setEscribiendo(true)
    if (!silencioso) setErrorInforme(null)
    try {
      const texto = await pedirTexto('informe_partido', {
        rival: partido.rival,
        golesFavor: partido.goles_favor,
        golesContra: partido.goles_contra,
        fecha: fmtFecha(partido.fecha),
        votantes,
        fueron: votantes,
        respondieron,
        ranking: ranking.slice(0, 8)
          .map((r, i) => `${i + 1}° ${plantel[r.jid] ? nombreCompleto(plantel[r.jid]) : '—'} · ${r.puntos} puntos · ${r.menciones} menciones`)
          .join('\n'),
        notas: resultados
          .map((r) => (r.tipo === 'escala' ? `${r.q.texto}: promedio ${r.promedio?.toFixed(1) ?? '—'} sobre 5 (${r.n} respuestas)` : ''))
          .filter(Boolean).join('\n'),
        jugadas: resultados
          .map((r) => (r.tipo === 'conteo' ? `${r.q.texto}\n${r.filas.map(([k, n]) => `  ${k}: ${n}`).join('\n')}` : ''))
          .filter(Boolean).join('\n'),
        comentarios: comentarios.map((c) => `- ${c}`).join('\n'),
      })
      await supabase.rpc('guardar_informe', { p_partido: partido.id, p_texto: texto })
      setPartidos((prev) => prev.map((p) =>
        p.id === partido.id ? { ...p, informe: texto, informe_generado_en: new Date().toISOString() } : p))
    } catch (e) {
      setErrorInforme((e as Error).message)
    } finally {
      setEscribiendo(false)
    }
  }, [partido, ranking, votantes, respondieron, resultados, comentarios, plantel])

  // El informe tiene que estar listo para la reunión del miércoles, así que se
  // escribe solo la primera vez que alguien de la directiva abre un partido ya
  // cerrado. Después queda guardado y no se vuelve a pedir.
  const idPartido = partido?.id
  const estadoPartido = partido?.estado
  const yaHayInforme = Boolean(partido?.informe)
  useEffect(() => {
    if (!idPartido || estadoPartido !== 'cerrado' || yaHayInforme) return
    if (ranking.length === 0) return
    generarInforme(true)
    // generarInforme cambia en cada render de los datos; basta con reaccionar
    // al partido y a que ya haya votos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPartido, estadoPartido, yaHayInforme, ranking.length])

  const aplicar = async () => {
    if (!partidoId) return
    setAplicando(true)
    setMsg(null)
    const { error } = await supabase.rpc('aplicar_votacion', { p_partido: partidoId })
    setAplicando(false)
    if (error) {
      setMsg('Error: ' + error.message)
      return
    }
    setMsg('✅ Votación cerrada y puntos aplicados. Las medias de las cartas ya se actualizaron.')
    setPartidos((prev) => prev.map((p) => (p.id === partidoId ? { ...p, estado: 'cerrado' } : p)))
  }

  if (loading) return <p className="text-slate-500">Cargando…</p>

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="El post partido"
        subtitle="Cada jugador vota su top 5 y responde la encuesta de la fecha. Se abre solo el domingo al mediodía y se cierra el martes a las 09:00, para que esto esté listo en la reunión del miércoles."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select value={partidoId} onChange={(e) => setPartidoId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900">
          {partidos.map((p) => (
            <option key={p.id} value={p.id}>{fmtFecha(p.fecha)} · Old Brads {p.es_local ? 'vs' : '@'} {p.rival}</option>
          ))}
        </select>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{votantes} votaron</span>
        {encuesta && <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{respondieron} contestaron</span>}
        {partido?.estado === 'votacion' && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">Abierta</span>}
        {partido?.estado === 'cerrado' && <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">Cerrada</span>}
      </div>

      {/* ---------- El informe primero: es lo que se lee en la reunión ---------- */}
      <div className="mb-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-black text-ink-900">Informe de la fecha</h2>
          <Button variant="secondary" onClick={() => generarInforme()} disabled={escribiendo || ranking.length === 0}>
            {escribiendo ? 'Escribiendo…' : partido?.informe ? 'Rehacer informe' : 'Escribir informe'}
          </Button>
        </div>
        {errorInforme && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorInforme}</p>}
        {partido?.informe ? (
          <>
            <Informe texto={partido.informe} />
            {partido.informe_generado_en && (
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
                Escrito el {new Date(partido.informe_generado_en).toLocaleString('es-CL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false })}
                {' '}con los votos y la encuesta de este partido. Léelo antes de darlo por bueno.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            {ranking.length === 0
              ? 'Todavía no hay votos de este partido. El informe se escribe cuando los haya.'
              : escribiendo
                ? 'Escribiendo el informe con los votos y los comentarios…'
                : 'Aún no hay informe. Se escribe solo al abrir un partido cerrado, o puedes pedirlo ahora.'}
          </p>
        )}
      </div>

      {/* ---------- El podio ---------- */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-black text-ink-900">Los 5 mejores</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Los votos valen 5-4-3-2-1 solo para armar este ranking. A la carta suma el podio del total: 1° +3,
            2° +2, y 3° a 5° +1. El 1° queda de MVP.
          </p>
        </div>
        {ranking.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-500">Aún no hay votos para este partido.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Jugador</th><th className="px-4 py-3 text-center">Menciones</th><th className="px-4 py-3 text-right">Votos</th><th className="px-4 py-3 text-right">A la carta</th></tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.jid} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-bold text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2.5 font-semibold text-ink-900">{plantel[r.jid] ? nombreCompleto(plantel[r.jid]) : '—'}</td>
                    <td className="px-4 py-2.5 text-center text-slate-500">{r.menciones}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-500">{r.puntos}</td>
                    <td className="px-4 py-2.5 text-right font-black" style={{ color: i < 5 ? '#c0782a' : '#cbd5e1' }}>
                      {i < 5 ? `+${A_LA_CARTA[i]}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- Lo que dijo el plantel ---------- */}
      {encuesta && (
        <div className="mb-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="mb-4 font-black text-ink-900">Lo que dijo el plantel</h2>
          {respondieron === 0 ? (
            <p className="text-sm text-slate-500">Nadie ha contestado la encuesta de este partido todavía.</p>
          ) : (
            <div className="space-y-5">
              {resultados.map((r) => (
                <div key={r.q.id}>
                  <p className="mb-2 text-sm font-semibold text-ink-900">{r.q.texto}</p>

                  {r.tipo === 'escala' && (
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-3xl font-black tabular-nums" style={{ color: '#c0782a' }}>
                        {r.promedio != null ? r.promedio.toFixed(1) : '—'}
                      </span>
                      <span className="text-sm text-slate-500">de 5 · {r.n} respuesta{r.n === 1 ? '' : 's'}</span>
                    </div>
                  )}

                  {r.tipo === 'conteo' && (
                    r.filas.length === 0
                      ? <p className="text-sm text-slate-400">Sin respuestas.</p>
                      : (
                        <div className="space-y-1.5">
                          {r.filas.map(([k, n]) => (
                            <div key={k} className="flex items-center gap-3">
                              <span className="w-44 shrink-0 truncate text-sm text-ink-800">{k}</span>
                              <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                                <div
                                  className="flex h-full items-center justify-end rounded px-2 text-xs font-bold text-white"
                                  style={{ width: `${Math.max(14, (n / r.filas[0][1]) * 100)}%`, background: '#c0782a' }}
                                >{n}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                  )}

                  {r.tipo === 'texto' && (
                    r.textos.length === 0
                      ? <p className="text-sm text-slate-400">Sin comentarios.</p>
                      : (
                        <ul className="space-y-2">
                          {r.textos.map((t, i) => (
                            <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
                              «{t}»
                            </li>
                          ))}
                        </ul>
                      )
                  )}
                </div>
              ))}
            </div>
          )}
          {encuesta.anonima && (
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
              Esta encuesta es anónima: se guarda quién participó, pero no quién dijo qué.
            </p>
          )}
        </div>
      )}

      {msg && <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{msg}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={aplicar} disabled={aplicando || ranking.length === 0 || partido?.estado !== 'votacion'}>
          {aplicando ? 'Cerrando…' : 'Cerrar ahora y aplicar puntos'}
        </Button>
        <span className="text-xs text-slate-500">
          {partido?.estado === 'votacion'
            ? 'Se cierra sola el martes a las 09:00. Este botón es solo para adelantarlo.'
            : 'Solo se puede cerrar una votación abierta.'}
        </span>
      </div>
    </div>
  )
}
