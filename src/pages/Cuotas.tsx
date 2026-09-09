import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import { nombreCompleto, type Cobro, type Jugador, type Pago } from '../lib/types'
import { clp, hoyISO, periodoActual, periodoLabel } from '../lib/format'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from '../components/ui'

export default function Cuotas() {
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // form nuevo cobro
  const [tipo, setTipo] = useState<'cuota' | 'extra'>('cuota')
  const [periodo, setPeriodo] = useState(periodoActual())
  const [nombreExtra, setNombreExtra] = useState('')
  const [monto, setMonto] = useState('25000')

  const load = async () => {
    if (!supabaseConfigurado) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [j, c, p] = await Promise.all([
      supabase.from('jugadores').select('*').eq('activo', true).order('apellido_paterno'),
      supabase.from('cobros').select('*').order('fecha', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('pagos').select('*'),
    ])
    setJugadores(j.data ?? [])
    setCobros(c.data ?? [])
    setPagos(p.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // mapa rápido: `${jugadorId}|${cobroId}` -> Pago
  const pagoMap = useMemo(() => {
    const m = new Map<string, Pago>()
    for (const p of pagos) m.set(`${p.jugador_id}|${p.cobro_id}`, p)
    return m
  }, [pagos])

  const togglePago = async (jugador: Jugador, cobro: Cobro) => {
    const key = `${jugador.id}|${cobro.id}`
    const existing = pagoMap.get(key)
    if (existing) {
      const nuevo = !existing.pagado
      // optimista
      setPagos((prev) =>
        prev.map((p) => (p.id === existing.id ? { ...p, pagado: nuevo, fecha_pago: nuevo ? hoyISO() : null } : p)),
      )
      await supabase
        .from('pagos')
        .update({ pagado: nuevo, fecha_pago: nuevo ? hoyISO() : null })
        .eq('id', existing.id)
    } else {
      // el jugador no tenía fila para este cobro: crearla como pagada
      const { data } = await supabase
        .from('pagos')
        .insert({ cobro_id: cobro.id, jugador_id: jugador.id, monto: cobro.monto, pagado: true, fecha_pago: hoyISO() })
        .select()
        .single()
      if (data) setPagos((prev) => [...prev, data])
    }
  }

  const crearCobro = async () => {
    setSaving(true)
    const nombre = tipo === 'cuota' ? `Cuota ${periodoLabel(periodo)}` : nombreExtra.trim() || 'Cobro extra'
    const { data: cobro } = await supabase
      .from('cobros')
      .insert({
        nombre,
        tipo,
        periodo: tipo === 'cuota' ? periodo : null,
        monto: Number(monto) || 0,
        fecha: hoyISO(),
      })
      .select()
      .single()
    if (cobro) {
      const nuevosPagos = jugadores.map((j) => ({
        cobro_id: cobro.id,
        jugador_id: j.id,
        monto: Number(monto) || 0,
        pagado: false,
      }))
      if (nuevosPagos.length) await supabase.from('pagos').insert(nuevosPagos)
    }
    setSaving(false)
    setModalOpen(false)
    setNombreExtra('')
    load()
  }

  const eliminarCobro = async (cobro: Cobro) => {
    if (!confirm(`¿Eliminar "${cobro.nombre}" y todos sus pagos? Esta acción no se puede deshacer.`)) return
    await supabase.from('pagos').delete().eq('cobro_id', cobro.id)
    await supabase.from('cobros').delete().eq('id', cobro.id)
    load()
  }

  // Totales
  const deudaJugador = (jid: string) =>
    cobros.reduce((acc, c) => {
      const p = pagoMap.get(`${jid}|${c.id}`)
      if (p) return acc + (p.pagado ? 0 : p.monto)
      return acc + c.monto // sin fila = pendiente
    }, 0)

  const totalCobro = (c: Cobro) => {
    let recaudado = 0
    let esperado = 0
    for (const j of jugadores) {
      const p = pagoMap.get(`${j.id}|${c.id}`)
      const m = p ? p.monto : c.monto
      esperado += m
      if (p?.pagado) recaudado += m
    }
    return { recaudado, esperado }
  }

  const totalRecaudado = cobros.reduce((a, c) => a + totalCobro(c).recaudado, 0)
  const totalPendiente = jugadores.reduce((a, j) => a + deudaJugador(j.id), 0)

  return (
    <div className="mx-auto max-w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink-900">Cuotas y pagos</h1>
          <p className="text-sm text-slate-500">
            Recaudado <span className="font-semibold text-brand-600">{clp(totalRecaudado)}</span> · Por cobrar{' '}
            <span className="font-semibold text-rose-600">{clp(totalPendiente)}</span>
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Nuevo cobro / mes</Button>
      </div>

      {loading ? (
        <Spinner />
      ) : cobros.length === 0 ? (
        <EmptyState title="Aún no hay cobros" hint='Crea el primer cobro con "Nuevo cobro / mes" (ej. la cuota del mes) y aparecerá una columna para marcar quién pagó.' />
      ) : jugadores.length === 0 ? (
        <EmptyState title="No hay jugadores activos" hint="Agrega jugadores en la sección Plantel para poder cobrarles." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left">Jugador</th>
                  {cobros.map((c) => (
                    <th key={c.id} className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="whitespace-nowrap">{c.tipo === 'cuota' ? periodoLabel(c.periodo) : c.nombre}</span>
                        <span className="font-normal normal-case text-slate-400">{clp(c.monto)}</span>
                        <button onClick={() => eliminarCobro(c)} className="mt-0.5 text-[10px] font-medium text-slate-300 hover:text-rose-500">eliminar</button>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Deuda</th>
                </tr>
              </thead>
              <tbody>
                {jugadores.map((j) => {
                  const deuda = deudaJugador(j.id)
                  return (
                    <tr key={j.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-ink-900">
                        {nombreCompleto(j)}
                      </td>
                      {cobros.map((c) => {
                        const p = pagoMap.get(`${j.id}|${c.id}`)
                        const pagado = p?.pagado ?? false
                        return (
                          <td key={c.id} className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => togglePago(j, c)}
                              title={pagado ? 'Pagado — clic para desmarcar' : 'Pendiente — clic para marcar pagado'}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                                pagado
                                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                                  : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {pagado ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              ) : (
                                <span className="text-lg leading-none">·</span>
                              )}
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-4 py-2.5 text-right">
                        {deuda > 0 ? <Badge tone="red">{clp(deuda)}</Badge> : <Badge tone="green">Al día</Badge>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <td className="sticky left-0 z-10 bg-slate-50 px-4 py-3">Recaudado / esperado</td>
                  {cobros.map((c) => {
                    const { recaudado, esperado } = totalCobro(c)
                    return (
                      <td key={c.id} className="px-3 py-3 text-center">
                        <span className="text-brand-600">{clp(recaudado)}</span>
                        <span className="text-slate-400"> / {clp(esperado)}</span>
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-right text-rose-600">{clp(totalPendiente)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo cobro">
        <div className="space-y-4">
          <Field label="Tipo de cobro">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'cuota' | 'extra')}>
              <option value="cuota">Cuota mensual</option>
              <option value="extra">Cobro extra (poleras, rifa, etc.)</option>
            </Select>
          </Field>
          {tipo === 'cuota' ? (
            <Field label="Mes">
              <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
            </Field>
          ) : (
            <Field label="Nombre del cobro">
              <Input value={nombreExtra} onChange={(e) => setNombreExtra(e.target.value)} placeholder="Ej. Poleras 2026" />
            </Field>
          )}
          <Field label="Monto por jugador (CLP)">
            <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </Field>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Se generará el cobro para los <b>{jugadores.length}</b> jugadores activos. Luego marcas quién pagó en la grilla.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={crearCobro} disabled={saving}>{saving ? 'Creando…' : 'Crear cobro'}</Button>
        </div>
      </Modal>
    </div>
  )
}
