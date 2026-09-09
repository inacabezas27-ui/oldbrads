import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import { nombreCompleto, type Cobro, type Jugador, type MovimientoCaja, type Pago } from '../lib/types'
import { clp, num, periodoActual, periodoLabel } from '../lib/format'
import { Badge, Card, EmptyState, PageHeader, Spinner, StatCard } from '../components/ui'

export default function Dashboard() {
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [movs, setMovs] = useState<MovimientoCaja[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!supabaseConfigurado) {
        setLoading(false)
        return
      }
      const [j, c, p, m] = await Promise.all([
        supabase.from('jugadores').select('*').eq('activo', true),
        supabase.from('cobros').select('*').order('fecha'),
        supabase.from('pagos').select('*'),
        supabase.from('movimientos_caja').select('*'),
      ])
      setJugadores(j.data ?? [])
      setCobros(c.data ?? [])
      setPagos(p.data ?? [])
      setMovs(m.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const pagoMap = useMemo(() => {
    const m = new Map<string, Pago>()
    for (const p of pagos) m.set(`${p.jugador_id}|${p.cobro_id}`, p)
    return m
  }, [pagos])

  const stats = useMemo(() => {
    const recaudadoCuotas = pagos.filter((p) => p.pagado).reduce((a, p) => a + p.monto, 0)
    // pendiente sobre jugadores activos
    let pendiente = 0
    for (const j of jugadores) {
      for (const c of cobros) {
        const p = pagoMap.get(`${j.id}|${c.id}`)
        if (p) pendiente += p.pagado ? 0 : p.monto
        else pendiente += c.monto
      }
    }
    const ingresosManuales = movs.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0)
    const egresos = movs.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0)
    const saldo = recaudadoCuotas + ingresosManuales - egresos
    return { recaudadoCuotas, pendiente, saldo, egresos, ingresosManuales }
  }, [jugadores, cobros, pagos, movs, pagoMap])

  // Cuota del mes actual
  const cuotaMesActual = cobros.find((c) => c.tipo === 'cuota' && c.periodo === periodoActual())
  const deudoresMes = useMemo(() => {
    if (!cuotaMesActual) return []
    return jugadores.filter((j) => {
      const p = pagoMap.get(`${j.id}|${cuotaMesActual.id}`)
      return !p?.pagado
    })
  }, [cuotaMesActual, jugadores, pagoMap])

  const chartData = useMemo(
    () =>
      cobros
        .filter((c) => c.tipo === 'cuota')
        .map((c) => {
          let recaudado = 0
          let esperado = 0
          for (const j of jugadores) {
            const p = pagoMap.get(`${j.id}|${c.id}`)
            const monto = p ? p.monto : c.monto
            esperado += monto
            if (p?.pagado) recaudado += monto
          }
          return { mes: periodoLabel(c.periodo).replace(/ \d+$/, ''), recaudado, esperado }
        }),
    [cobros, jugadores, pagoMap],
  )

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Resumen" subtitle="Estado financiero del equipo de un vistazo" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Saldo en caja" value={clp(stats.saldo)} tone={stats.saldo >= 0 ? 'brand' : 'bad'} />
        <StatCard label="Recaudado en cuotas" value={clp(stats.recaudadoCuotas)} tone="good" />
        <StatCard label="Por cobrar" value={clp(stats.pendiente)} tone="bad" hint="Cuotas pendientes del plantel activo" />
        <StatCard label="Jugadores activos" value={num(jugadores.length)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-bold text-ink-900">Recaudación por mes</h2>
          {chartData.length === 0 ? (
            <EmptyState title="Sin cuotas registradas" hint="Crea la cuota del mes en la sección Cuotas para ver el gráfico." />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(v, name) => [clp(Number(v)), name === 'recaudado' ? 'Recaudado' : 'Esperado']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  />
                  <Bar dataKey="esperado" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="recaudado" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="#0f7a41" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-ink-900">Deudores del mes</h2>
            {cuotaMesActual && <Badge tone={deudoresMes.length ? 'red' : 'green'}>{periodoLabel(cuotaMesActual.periodo)}</Badge>}
          </div>
          {!cuotaMesActual ? (
            <p className="text-sm text-slate-500">
              No hay cuota creada para este mes.{' '}
              <Link to="/cuotas" className="font-semibold text-brand-600 hover:underline">Crear cuota</Link>
            </p>
          ) : deudoresMes.length === 0 ? (
            <p className="text-sm font-medium text-brand-600">¡Todos al día este mes! 🎉</p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {deudoresMes.map((j) => (
                <li key={j.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                  <span className="text-ink-800">{nombreCompleto(j)}</span>
                  <span className="font-semibold tabular-nums text-rose-600">{clp(cuotaMesActual.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
