import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nombreCompleto, type Jugador, type Partido } from '../lib/types'
import { fecha as fmtFecha } from '../lib/format'
import { PageHeader } from '../components/ui'

type Voto = { partido_id: string; votante_user_id: string; votado_jugador_id: string; posicion: number }
const PUNTOS: Record<number, number> = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 }

export default function Votaciones() {
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [partidoId, setPartidoId] = useState<string>('')
  const [votos, setVotos] = useState<Voto[]>([])
  const [plantel, setPlantel] = useState<Record<string, Jugador>>({})
  const [loading, setLoading] = useState(true)
  const [aplicando, setAplicando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

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
    supabase.from('votos').select('*').eq('partido_id', partidoId)
      .then(({ data }) => setVotos((data as Voto[]) ?? []))
    setMsg(null)
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
      .sort((a, b) => b.puntos - a.puntos)
  }, [votos])

  const votantes = useMemo(() => new Set(votos.map((v) => v.votante_user_id)).size, [votos])
  const partido = partidos.find((p) => p.id === partidoId)

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
      <PageHeader title="Votaciones del partido" subtitle="Revisa el top 5 que eligieron los jugadores (1°=5, 2°=4, 3°=3, 4°=2, 5°=1). Al cerrar, los puntos pasan a las cartas y nadie puede cambiar su voto." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select value={partidoId} onChange={(e) => setPartidoId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900">
          {partidos.map((p) => (
            <option key={p.id} value={p.id}>{fmtFecha(p.fecha)} · Old Brads {p.es_local ? 'vs' : '@'} {p.rival}</option>
          ))}
        </select>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{votantes} votante{votantes === 1 ? '' : 's'}</span>
        {partido?.estado === 'votacion' && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">Votación abierta</span>}
        {partido?.estado === 'cerrado' && <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">Cerrada</span>}
      </div>

      {ranking.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500 ring-1 ring-slate-200">
          Aún no hay votos para este partido.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Jugador</th><th className="px-4 py-3 text-center">Menciones</th><th className="px-4 py-3 text-right">Puntos</th></tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.jid} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-bold text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-ink-900">{plantel[r.jid] ? nombreCompleto(plantel[r.jid]) : '—'}</td>
                  <td className="px-4 py-2.5 text-center text-slate-500">{r.menciones}</td>
                  <td className="px-4 py-2.5 text-right font-black" style={{ color: '#c0782a' }}>+{r.puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {msg && <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{msg}</p>}

      <button onClick={aplicar} disabled={aplicando || ranking.length === 0 || partido?.estado !== 'votacion'}
        className="mt-5 rounded-xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-50">
        {aplicando ? 'Cerrando…' : 'Cerrar votación y aplicar puntos'}
      </button>
      {partido && partido.estado !== 'votacion' && (
        <p className="mt-2 text-xs text-slate-400">
          Solo se puede cerrar una votación abierta. Ábrela desde <b>Partidos</b>.
        </p>
      )}
      {partido && <p className="mt-2 text-xs text-slate-400">Partido: Old Brads {partido.es_local ? 'vs' : '@'} {partido.rival} · {fmtFecha(partido.fecha)}</p>}
    </div>
  )
}
