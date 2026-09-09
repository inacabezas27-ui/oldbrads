import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import { CATEGORIAS_CAJA, type MovimientoCaja, type Pago, type TipoMovimiento } from '../lib/types'
import { clp, fecha, hoyISO } from '../lib/format'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, StatCard } from '../components/ui'

export default function Caja() {
  const [movs, setMovs] = useState<MovimientoCaja[]>([])
  const [cuotasCobradas, setCuotasCobradas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [tipo, setTipo] = useState<TipoMovimiento>('egreso')
  const [categoria, setCategoria] = useState('Pago liga')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaMov, setFechaMov] = useState(hoyISO())

  const load = async () => {
    if (!supabaseConfigurado) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [m, p] = await Promise.all([
      supabase.from('movimientos_caja').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('pagos').select('monto, pagado').eq('pagado', true),
    ])
    setMovs(m.data ?? [])
    setCuotasCobradas(((p.data as Pick<Pago, 'monto'>[]) ?? []).reduce((a, x) => a + (x.monto ?? 0), 0))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const { ingresos, egresos } = useMemo(() => {
    let ingresos = 0
    let egresos = 0
    for (const m of movs) {
      if (m.tipo === 'ingreso') ingresos += m.monto
      else egresos += m.monto
    }
    return { ingresos, egresos }
  }, [movs])

  const totalIngresos = ingresos + cuotasCobradas
  const saldo = totalIngresos - egresos

  const guardar = async () => {
    if (!monto) return
    setSaving(true)
    await supabase.from('movimientos_caja').insert({
      tipo,
      categoria,
      descripcion: descripcion || null,
      monto: Number(monto) || 0,
      fecha: fechaMov,
    })
    setSaving(false)
    setModalOpen(false)
    setDescripcion('')
    setMonto('')
    load()
  }

  const eliminar = async (m: MovimientoCaja) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    await supabase.from('movimientos_caja').delete().eq('id', m.id)
    load()
  }

  const openNew = (t: TipoMovimiento) => {
    setTipo(t)
    setCategoria(CATEGORIAS_CAJA[t][0])
    setModalOpen(true)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-ink-900">Caja</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openNew('ingreso')}>+ Ingreso</Button>
          <Button onClick={() => openNew('egreso')}>+ Egreso</Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Saldo actual" value={clp(saldo)} tone={saldo >= 0 ? 'brand' : 'bad'} />
        <StatCard label="Total ingresos" value={clp(totalIngresos)} hint={`Incluye ${clp(cuotasCobradas)} en cuotas cobradas`} tone="good" />
        <StatCard label="Total egresos" value={clp(egresos)} tone="bad" />
      </div>

      {loading ? (
        <Spinner />
      ) : movs.length === 0 ? (
        <EmptyState title="Sin movimientos en caja" hint="Registra ingresos (auspicios, abonos) y egresos (pago liga, poleras, insumos). Las cuotas cobradas se suman solas." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movs.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fecha(m.fecha)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={m.tipo === 'ingreso' ? 'green' : 'amber'}>{m.categoria}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.descripcion ?? '—'}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${m.tipo === 'ingreso' ? 'text-brand-600' : 'text-rose-600'}`}>
                      {m.tipo === 'ingreso' ? '+' : '−'} {clp(m.monto)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" onClick={() => eliminar(m)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={tipo === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo egreso'}>
        <div className="space-y-4">
          <Field label="Tipo">
            <Select
              value={tipo}
              onChange={(e) => {
                const t = e.target.value as TipoMovimiento
                setTipo(t)
                setCategoria(CATEGORIAS_CAJA[t][0])
              }}
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </Select>
          </Field>
          <Field label="Categoría">
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS_CAJA[tipo].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Descripción (opcional)">
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Auspicio Empresa X" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto (CLP)">
              <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </Field>
            <Field label="Fecha">
              <Input type="date" value={fechaMov} onChange={(e) => setFechaMov(e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving || !monto}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </Modal>
    </div>
  )
}
