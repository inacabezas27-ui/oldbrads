import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Goleador, Temporada } from '../lib/types'
import { Badge, Card, Input, Spinner } from '../components/ui'

export default function Temporadas() {
  const [temps, setTemps] = useState<Temporada[]>([])
  const [goleadores, setGoleadores] = useState<Goleador[]>([])
  const [loading, setLoading] = useState(true)
  const [conPartidos, setConPartidos] = useState<Set<string>>(new Set())

  useEffect(() => {
    const load = async () => {
      const [t, g, p] = await Promise.all([
        supabase.from('temporadas').select('*').order('orden'),
        supabase.from('goleadores').select('*').order('goles', { ascending: false }),
        supabase.from('partidos').select('temporada_id').not('goles_favor', 'is', null),
      ])
      setTemps(t.data ?? [])
      setGoleadores(g.data ?? [])
      // Las que tienen partidos cargados se calculan solas; las viejas siguen
      // con los números escritos a mano.
      setConPartidos(new Set(((p.data ?? []) as { temporada_id: string | null }[])
        .map((x) => x.temporada_id).filter((x): x is string => Boolean(x))))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Spinner />

  const maxGoles = goleadores[0]?.goles ?? 1

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink-900">Temporadas</h1>
        <p className="text-sm text-slate-500">La historia del club, temporada a temporada</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {temps.map((t) => {
          const winRate = t.pj ? Math.round((t.g / t.pj) * 100) : 0
          return (
            <Card key={t.id} className="overflow-hidden">
              <div className="border-b border-slate-100 bg-ink-900 px-5 py-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">Semestre {t.orden}</p>
                <p className="text-lg font-black">{t.nombre}</p>
                {t.resultado && (
                  <div className="mt-1">
                    <Badge tone={t.resultado.includes('Subcampeón') ? 'amber' : 'slate'}>{t.resultado}</Badge>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black tabular-nums text-ink-900">{t.puntos}</span>
                    <span className="mb-1 text-sm text-slate-400">pts</span>
                  </div>
                  {/* La posición depende del resto de la liga, así que es el
                      único número que hay que escribir a mano. */}
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    Puesto
                    <Input
                      type="number"
                      min="1"
                      className="w-16 py-1 text-center"
                      value={t.posicion ?? ''}
                      onChange={(e) => {
                        const v = e.target.value === '' ? null : Number(e.target.value)
                        setTemps((prev) => prev.map((x) => (x.id === t.id ? { ...x, posicion: v } : x)))
                        supabase.from('temporadas').update({ posicion: v }).eq('id', t.id).then(() => {})
                      }}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-brand-50 py-2"><p className="text-lg font-bold text-brand-700">{t.g}</p><p className="text-[10px] uppercase text-slate-400">Ganados</p></div>
                  <div className="rounded-lg bg-slate-50 py-2"><p className="text-lg font-bold text-slate-600">{t.e}</p><p className="text-[10px] uppercase text-slate-400">Empates</p></div>
                  <div className="rounded-lg bg-rose-50 py-2"><p className="text-lg font-bold text-rose-600">{t.p}</p><p className="text-[10px] uppercase text-slate-400">Perdidos</p></div>
                </div>
                <div className="mt-3 flex justify-between text-sm text-slate-600">
                  <span>GF <b className="text-ink-900">{t.gf}</b></span>
                  <span>GC <b className="text-ink-900">{t.gc}</b></span>
                  <span>DG <b className={t.gf - t.gc >= 0 ? 'text-brand-600' : 'text-rose-600'}>{t.gf - t.gc >= 0 ? '+' : ''}{t.gf - t.gc}</b></span>
                  <span>{winRate}% <span className="text-slate-400">victorias</span></span>
                </div>
                <p className="mt-3 text-[11px] text-slate-400">
                  {conPartidos.has(t.id)
                    ? 'Se calcula solo con los partidos cargados. Solo el puesto se escribe a mano.'
                    : 'Números históricos cargados a mano: esta temporada no tiene partidos en la plataforma.'}
                </p>
                {t.notas && <p className="mt-2 text-xs leading-relaxed text-slate-400">{t.notas}</p>}
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-bold text-ink-900">Goleadores históricos</h2>
        <div className="space-y-2">
          {goleadores.map((g) => (
            <div key={g.id} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-sm font-medium text-ink-800">{g.nombre}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                <div className="flex h-full items-center justify-end rounded bg-gradient-to-r from-brand-500 to-brand-600 px-2 text-xs font-bold text-white" style={{ width: `${Math.max(12, (g.goles / maxGoles) * 100)}%` }}>{g.goles}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Conteo histórico de las 3 primeras temporadas, cargado a mano. Los goles del Clausura 2026 en adelante
          salen de los partidos y se ven en Estadísticas.
        </p>
      </Card>
    </div>
  )
}
