import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import type { CuotaLiga } from '../lib/types'
import { clp, fecha, hoyISO } from '../lib/format'
import { Badge, Card, EmptyState, Spinner, StatCard } from '../components/ui'

export default function CuotasLiga() {
  const [cuotas, setCuotas] = useState<CuotaLiga[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!supabaseConfigurado) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('cuotas_liga').select('*').order('orden', { ascending: true })
    setCuotas(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const togglePagada = async (c: CuotaLiga) => {
    const nueva = !c.pagada
    setCuotas((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, pagada: nueva, fecha_pago: nueva ? hoyISO() : null } : x)),
    )
    await supabase
      .from('cuotas_liga')
      .update({ pagada: nueva, fecha_pago: nueva ? hoyISO() : null })
      .eq('id', c.id)
  }

  const { total, pagado, pendiente } = useMemo(() => {
    let total = 0
    let pagado = 0
    for (const c of cuotas) {
      total += c.monto
      if (c.pagada) pagado += c.monto
    }
    return { total, pagado, pendiente: total - pagado }
  }, [cuotas])

  const hoy = hoyISO()

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink-900">Cuotas de la Liga</h1>
        <p className="text-sm text-slate-500">Lo que el equipo le paga a la Liga COF — temporada 2026</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total a pagar" value={clp(total)} />
        <StatCard label="Pagado" value={clp(pagado)} tone="good" />
        <StatCard label="Pendiente" value={clp(pendiente)} tone={pendiente > 0 ? 'bad' : 'good'} />
      </div>

      {loading ? (
        <Spinner />
      ) : cuotas.length === 0 ? (
        <EmptyState title="Sin cuotas de la liga" hint="No hay cuotas cargadas." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cuota</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cuotas.map((c) => {
                  const vencida = !c.pagada && c.fecha_venc && c.fecha_venc < hoy
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink-900">{c.nombre}</p>
                        {c.nota && <p className="text-xs text-slate-400">{c.nota}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fecha(c.fecha_venc)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-ink-900">{clp(c.monto)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => togglePagada(c)}
                          title={c.pagada ? 'Pagada — clic para marcar pendiente' : 'Pendiente — clic para marcar pagada'}
                          className="inline-flex items-center gap-2"
                        >
                          {c.pagada ? (
                            <Badge tone="green">✓ Pagada</Badge>
                          ) : vencida ? (
                            <Badge tone="red">Vencida</Badge>
                          ) : (
                            <Badge tone="amber">Pendiente</Badge>
                          )}
                        </button>
                        {c.pagada && c.fecha_pago && (
                          <p className="mt-1 text-[11px] text-slate-400">{fecha(c.fecha_pago)}</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm font-bold text-ink-900">
                  <td className="px-4 py-3" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{clp(total)}</td>
                  <td className="px-4 py-3 text-center text-rose-600">{pendiente > 0 ? `Falta ${clp(pendiente)}` : 'Al día'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Marca cada cuota como pagada a medida que la transfieres a la liga. Las cuotas de marzo a julio probablemente ya
        estén pagadas — márcalas para que el "pendiente" quede real.
      </p>
    </div>
  )
}
