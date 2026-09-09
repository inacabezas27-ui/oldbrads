import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { nombreCorto, type EstadoPartido, type Jugador, type Partido, type PartidoJugador, type Temporada } from '../lib/types'
import { fecha, hoyISO } from '../lib/format'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from '../components/ui'

const FASES = ['Liga', 'Cuartos de final', 'Semifinal', 'Final', 'Amistoso']

/* El ciclo de una fecha, en orden. Cada paso habilita el siguiente. */
const CICLO: { estado: EstadoPartido; corto: string; ayuda: string; avanzar: string | null }[] = [
  {
    estado: 'citacion',
    corto: 'Citación',
    ayuda: 'Los jugadores confirman desde su celular si van. Marca aquí a los citados definitivos.',
    avanzar: 'Marcar como jugado',
  },
  {
    estado: 'jugado',
    corto: 'Jugado',
    ayuda: 'Carga el marcador, quién jugó, los goles y las asistencias. Después abre la votación.',
    avanzar: 'Abrir votación',
  },
  {
    estado: 'votacion',
    corto: 'Votación',
    ayuda: 'Los jugadores están eligiendo su top 5. Cuando hayan votado todos, cierra la votación.',
    avanzar: null,
  },
  {
    estado: 'cerrado',
    corto: 'Cerrado',
    ayuda: 'Votación cerrada y puntos aplicados a las cartas. Nadie puede cambiar su voto.',
    avanzar: null,
  },
]

function resultadoDe(p: Partido): 'ganado' | 'empatado' | 'perdido' | null {
  if (p.goles_favor == null || p.goles_contra == null) return null
  if (p.goles_favor > p.goles_contra) return 'ganado'
  if (p.goles_favor < p.goles_contra) return 'perdido'
  return 'empatado'
}

function Paso({ n, activo, hecho, children }: { n: number; activo: boolean; hecho: boolean; children: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${
          activo ? 'bg-brand-600 text-white' : hecho ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500'
        }`}
      >
        {hecho && !activo ? '✓' : n}
      </span>
      <span className={`text-xs font-semibold ${activo ? 'text-ink-900' : 'text-slate-400'}`}>{children}</span>
    </div>
  )
}

export default function Partidos() {
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(true)

  // nuevo partido
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ rival: '', temporada_id: '', fecha: hoyISO(), hora: '', cancha: '', es_local: 'true', fase: 'Liga' })

  // detalle
  const [detalle, setDetalle] = useState<Partido | null>(null)
  const [rows, setRows] = useState<(PartidoJugador & { jugador: Jugador })[]>([])
  const [votantes, setVotantes] = useState(0)
  const [trabajando, setTrabajando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [p, t, j] = await Promise.all([
      supabase.from('partidos').select('*').order('fecha', { ascending: false, nullsFirst: false }),
      supabase.from('temporadas').select('*').order('orden'),
      supabase.from('jugadores').select('*').eq('activo', true).order('apellido_paterno'),
    ])
    setPartidos(p.data ?? [])
    setTemporadas(t.data ?? [])
    setJugadores(j.data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const crearPartido = async () => {
    if (!form.rival.trim()) return
    setSaving(true)
    const { data: partido } = await supabase
      .from('partidos')
      .insert({
        rival: form.rival.trim(),
        temporada_id: form.temporada_id || null,
        fecha: form.fecha || null,
        hora: form.hora || null,
        cancha: form.cancha || null,
        es_local: form.es_local === 'true',
        fase: form.fase,
        estado: 'citacion',
      })
      .select()
      .single()
    if (partido) {
      const cit = jugadores.map((j) => ({ partido_id: partido.id, jugador_id: j.id, citado: false }))
      if (cit.length) await supabase.from('partido_jugadores').insert(cit)
    }
    setSaving(false)
    setNuevoOpen(false)
    setForm({ rival: '', temporada_id: '', fecha: hoyISO(), hora: '', cancha: '', es_local: 'true', fase: 'Liga' })
    load()
  }

  const cargarFilas = async (p: Partido) => {
    const [{ data }, { data: votos }] = await Promise.all([
      supabase.from('partido_jugadores').select('*').eq('partido_id', p.id),
      supabase.from('votos').select('votante_user_id').eq('partido_id', p.id),
    ])
    setVotantes(new Set((votos ?? []).map((v: { votante_user_id: string }) => v.votante_user_id)).size)
    const existentes = new Map((data ?? []).map((r) => [r.jugador_id, r]))
    // asegurar una fila por jugador activo
    const faltantes = jugadores.filter((j) => !existentes.has(j.id))
    if (faltantes.length) {
      const { data: nuevos } = await supabase
        .from('partido_jugadores')
        .insert(faltantes.map((j) => ({ partido_id: p.id, jugador_id: j.id, citado: false })))
        .select()
      for (const n of nuevos ?? []) existentes.set(n.jugador_id, n)
    }
    setRows(
      jugadores
        .map((j) => ({ ...(existentes.get(j.id) as PartidoJugador), jugador: j }))
        .filter((r) => r.id),
    )
  }

  const abrirDetalle = async (p: Partido) => {
    setDetalle(p)
    setMsg(null)
    await cargarFilas(p)
  }

  const updatePartido = async (patch: Partial<Partido>) => {
    if (!detalle) return
    const nuevo = { ...detalle, ...patch }
    setDetalle(nuevo)
    setPartidos((prev) => prev.map((x) => (x.id === nuevo.id ? nuevo : x)))
    await supabase.from('partidos').update(patch).eq('id', detalle.id)
  }

  const updateRow = async (rowId: string, patch: Partial<PartidoJugador>) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)))
    await supabase.from('partido_jugadores').update(patch).eq('id', rowId)
  }

  const eliminarPartido = async (p: Partido) => {
    if (!confirm(`¿Eliminar el partido vs ${p.rival}?`)) return
    await supabase.from('partidos').delete().eq('id', p.id)
    setDetalle(null)
    load()
  }

  /* Pasar al siguiente estado del ciclo. */
  const avanzar = async () => {
    if (!detalle) return
    const i = CICLO.findIndex((c) => c.estado === detalle.estado)
    const siguiente = CICLO[i + 1]
    if (!siguiente) return
    if (siguiente.estado === 'votacion' && (detalle.goles_favor == null || detalle.goles_contra == null)) {
      setMsg('Carga el marcador antes de abrir la votación.')
      return
    }
    setMsg(null)
    // Al cerrar la citación, los que dijeron que iban quedan citados.
    if (siguiente.estado === 'jugado') {
      for (const r of rows.filter((x) => x.confirmado === 'si' && !x.citado)) {
        await updateRow(r.id, { citado: true })
      }
    }
    await updatePartido({ estado: siguiente.estado })
  }

  /* Cierra la votación y reparte los puntos (la función valida que seas directiva). */
  const cerrarVotacion = async () => {
    if (!detalle) return
    setTrabajando(true)
    setMsg(null)
    const { error } = await supabase.rpc('aplicar_votacion', { p_partido: detalle.id })
    setTrabajando(false)
    if (error) {
      setMsg('No se pudo cerrar: ' + error.message)
      return
    }
    const cerrado = { ...detalle, estado: 'cerrado' as const }
    setDetalle(cerrado)
    setPartidos((prev) => prev.map((x) => (x.id === cerrado.id ? cerrado : x)))
    await cargarFilas(cerrado)
    setMsg('Votación cerrada. Los puntos ya están en las cartas.')
  }

  /* Marcar a todos de una: con 26 jugadores, hacerlo uno por uno es inviable. */
  const marcarTodos = async (patch: Partial<PartidoJugador>, soloCitados = true) => {
    const objetivo = rows.filter((r) => (soloCitados ? r.citado || r.confirmado === 'si' : true))
    if (!objetivo.length) return
    const ids = objetivo.map((r) => r.id)
    setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, ...patch } : r)))
    await supabase.from('partido_jugadores').update(patch).in('id', ids)
  }

  const citados = useMemo(() => rows.filter((r) => r.citado), [rows])
  const confirmaciones = useMemo(
    () => ({
      si: rows.filter((r) => r.confirmado === 'si').length,
      no: rows.filter((r) => r.confirmado === 'no').length,
      duda: rows.filter((r) => r.confirmado === 'duda').length,
      sinResponder: rows.filter((r) => !r.confirmado).length,
    }),
    [rows],
  )
  const golesTotales = useMemo(() => rows.reduce((a, r) => a + (r.goles || 0), 0), [rows])
  const asistieron = useMemo(() => rows.filter((r) => r.asistio).length, [rows])
  const puntuales = useMemo(() => rows.filter((r) => r.asistio && r.puntual).length, [rows])

  if (loading) return <Spinner />

  const titulo = (p: Partido) => (p.es_local ? `Old Brads vs ${p.rival}` : `${p.rival} vs Old Brads`)
  const marcador = (p: Partido) =>
    p.goles_favor != null && p.goles_contra != null
      ? p.es_local
        ? `${p.goles_favor} - ${p.goles_contra}`
        : `${p.goles_contra} - ${p.goles_favor}`
      : null

  const pasoActual = detalle ? CICLO.findIndex((c) => c.estado === detalle.estado) : -1
  const info = pasoActual >= 0 ? CICLO[pasoActual] : null

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink-900">Partidos</h1>
          <p className="text-sm text-slate-500">{partidos.length} partidos · citación, resultado y votación</p>
        </div>
        <Button onClick={() => setNuevoOpen(true)}>+ Nuevo partido</Button>
      </div>

      {partidos.length === 0 ? (
        <EmptyState title="Aún no hay partidos" hint='Crea el primero con "Nuevo partido": los jugadores confirman asistencia, después cargas el resultado y abres la votación.' />
      ) : (
        <div className="space-y-3">
          {partidos.map((p) => {
            const r = resultadoDe(p)
            const m = marcador(p)
            return (
              <Card key={p.id} className="flex items-center gap-4 p-4 hover:ring-brand-200">
                <div className="w-24 shrink-0 text-center">
                  {r ? (
                    <span className="font-display text-2xl font-black tabular-nums text-ink-900">{m}</span>
                  ) : (
                    <Badge tone="amber">Próximo</Badge>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{titulo(p)}</p>
                  <p className="text-xs text-slate-400">
                    {fecha(p.fecha)}{p.hora ? ` · ${p.hora}` : ''} · {p.fase}{p.cancha ? ` · ${p.cancha}` : ''}
                  </p>
                </div>
                {p.estado === 'votacion' && <Badge tone="amber">Votación abierta</Badge>}
                {r === 'ganado' && <Badge tone="green">Ganado</Badge>}
                {r === 'empatado' && <Badge tone="slate">Empate</Badge>}
                {r === 'perdido' && <Badge tone="red">Perdido</Badge>}
                <Button variant="secondary" onClick={() => abrirDetalle(p)}>Abrir</Button>
              </Card>
            )
          })}
        </div>
      )}

      {/* Nuevo partido */}
      <Modal open={nuevoOpen} onClose={() => setNuevoOpen(false)} title="Nuevo partido">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Rival *"><Input value={form.rival} onChange={(e) => set('rival', e.target.value)} placeholder="Ej. Old Boys" /></Field>
          <Field label="Temporada">
            <Select value={form.temporada_id} onChange={(e) => set('temporada_id', e.target.value)}>
              <option value="">—</option>
              {temporadas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Fecha"><Input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} /></Field>
          <Field label="Hora"><Input value={form.hora} onChange={(e) => set('hora', e.target.value)} placeholder="Ej. 11:15" /></Field>
          <Field label="Cancha"><Input value={form.cancha} onChange={(e) => set('cancha', e.target.value)} placeholder="Ej. Cancha 3" /></Field>
          <Field label="Localía">
            <Select value={form.es_local} onChange={(e) => set('es_local', e.target.value)}>
              <option value="true">Local</option>
              <option value="false">Visita</option>
            </Select>
          </Field>
          <Field label="Fase">
            <Select value={form.fase} onChange={(e) => set('fase', e.target.value)}>
              {FASES.map((f) => <option key={f}>{f}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setNuevoOpen(false)}>Cancelar</Button>
          <Button onClick={crearPartido} disabled={saving || !form.rival.trim()}>{saving ? 'Creando…' : 'Crear partido'}</Button>
        </div>
      </Modal>

      {/* Detalle */}
      <Modal open={!!detalle} onClose={() => { setDetalle(null); load() }} title={detalle ? titulo(detalle) : ''} wide>
        {detalle && info && (
          <div>
            {/* Ciclo del partido */}
            <div className="mb-4 rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {CICLO.map((c, i) => (
                  <Paso key={c.estado} n={i + 1} activo={i === pasoActual} hecho={i < pasoActual}>{c.corto}</Paso>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="flex-1 text-xs text-slate-500">{info.ayuda}</p>
                {info.avanzar && <Button onClick={avanzar}>{info.avanzar}</Button>}
                {detalle.estado === 'votacion' && (
                  <>
                    <span className="text-xs font-semibold text-slate-500">{votantes} votaron</span>
                    <Button onClick={cerrarVotacion} disabled={trabajando}>
                      {trabajando ? 'Cerrando…' : 'Cerrar votación y aplicar puntos'}
                    </Button>
                  </>
                )}
                {detalle.estado === 'cerrado' && (
                  <Button variant="secondary" onClick={() => updatePartido({ estado: 'votacion' })}>Reabrir votación</Button>
                )}
                {(detalle.estado === 'votacion' || detalle.estado === 'cerrado') && (
                  <Link to="/votaciones" className="text-xs font-semibold text-brand-700 underline">Ver los votos</Link>
                )}
              </div>
              {msg && <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-medium text-ink-900 ring-1 ring-slate-200">{msg}</p>}
            </div>

            {/* Marcador y conteos */}
            <div className="mb-4 flex flex-wrap items-end gap-4">
              <Field label="Goles Old Brads">
                <Input type="number" className="w-24" value={detalle.goles_favor ?? ''} onChange={(e) => updatePartido({ goles_favor: e.target.value === '' ? null : Number(e.target.value) })} />
              </Field>
              <Field label={`Goles ${detalle.rival}`}>
                <Input type="number" className="w-24" value={detalle.goles_contra ?? ''} onChange={(e) => updatePartido({ goles_contra: e.target.value === '' ? null : Number(e.target.value) })} />
              </Field>
              <div className="ml-auto text-right text-xs text-slate-500">
                {detalle.estado === 'citacion' ? (
                  <p>
                    <b className="text-brand-700">{confirmaciones.si} van</b> · {confirmaciones.duda} en duda ·{' '}
                    {confirmaciones.no} no van · {confirmaciones.sinResponder} sin responder
                  </p>
                ) : (
                  <p>Citados: <b className="text-ink-900">{citados.length}</b></p>
                )}
                <p>Goles cargados: <b className={golesTotales === (detalle.goles_favor ?? golesTotales) ? 'text-brand-600' : 'text-amber-600'}>{golesTotales}</b>{detalle.goles_favor != null ? ` / ${detalle.goles_favor}` : ''}</p>
              </div>
            </div>

            {detalle.goles_favor != null && golesTotales !== detalle.goles_favor && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                ⚠️ Los goles cargados a jugadores ({golesTotales}) no cuadran con el marcador ({detalle.goles_favor}).
              </p>
            )}

            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Marcar de una vez:</span>
              <Button variant="secondary" onClick={() => marcarTodos({ asistio: true })}>Fueron todos los citados</Button>
              <Button variant="secondary" onClick={() => marcarTodos({ asistio: true, puntual: true })}>…y todos a la hora</Button>
              <Button variant="secondary" onClick={() => marcarTodos({ asistio: false, puntual: false }, false)}>Limpiar asistencia</Button>
              <span className="ml-auto text-xs text-slate-500">
                Fueron <b className="text-ink-900">{asistieron}</b> · a la hora <b className="text-ink-900">{puntuales}</b>
              </span>
            </div>

            <div className="max-h-[55vh] overflow-x-auto overflow-y-auto rounded-xl ring-1 ring-slate-100">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Jugador</th>
                    <th className="px-2 py-2 text-center">Confirmó</th>
                    <th className="px-2 py-2 text-center">Citado</th>
                    <th className="px-2 py-2 text-center" title="Fue al partido, aunque no haya jugado">Fue</th>
                    <th className="px-2 py-2 text-center" title="Llegó a la hora citada">A la hora</th>
                    <th className="px-2 py-2 text-center">Jugó</th>
                    <th className="px-2 py-2 text-center">Titular</th>
                    <th className="px-2 py-2 text-center">Goles</th>
                    <th className="px-2 py-2 text-center">Asist.</th>
                    <th className="px-2 py-2 text-center" title="Puntos a mano: arco en cero, esfuerzo, etc.">Extra</th>
                    <th className="px-2 py-2 text-center" title="Puntos que le dieron sus compañeros">Votos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((r) => (
                    <tr key={r.id} className={r.citado || r.confirmado === 'si' ? '' : 'opacity-50'}>
                      <td className="whitespace-nowrap px-3 py-1.5 font-medium text-ink-900">{nombreCorto(r.jugador)}</td>
                      <td className="px-2 py-1.5 text-center">
                        {r.confirmado === 'si' && <span title="Confirmó que va">✅</span>}
                        {r.confirmado === 'no' && <span title="Avisó que no va">❌</span>}
                        {r.confirmado === 'duda' && <span title="En duda">❓</span>}
                        {!r.confirmado && <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-2 py-1.5 text-center"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={r.citado} onChange={(e) => updateRow(r.id, { citado: e.target.checked })} /></td>
                      <td className="px-2 py-1.5 text-center"><input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={r.asistio} onChange={(e) => updateRow(r.id, { asistio: e.target.checked, puntual: e.target.checked ? r.puntual : false })} /></td>
                      <td className="px-2 py-1.5 text-center"><input type="checkbox" className="h-4 w-4 accent-emerald-600" disabled={!r.asistio} checked={r.asistio && r.puntual} onChange={(e) => updateRow(r.id, { puntual: e.target.checked })} /></td>
                      <td className="px-2 py-1.5 text-center"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={r.jugo} onChange={(e) => updateRow(r.id, { jugo: e.target.checked })} /></td>
                      <td className="px-2 py-1.5 text-center"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={r.titular} onChange={(e) => updateRow(r.id, { titular: e.target.checked })} /></td>
                      <td className="px-2 py-1.5 text-center"><input type="number" min="0" className="w-14 rounded border-0 bg-slate-50 px-2 py-1 text-center ring-1 ring-slate-200 focus:ring-brand-500" value={r.goles} onChange={(e) => updateRow(r.id, { goles: Number(e.target.value) || 0 })} /></td>
                      <td className="px-2 py-1.5 text-center"><input type="number" min="0" className="w-14 rounded border-0 bg-slate-50 px-2 py-1 text-center ring-1 ring-slate-200 focus:ring-brand-500" value={r.asistencias} onChange={(e) => updateRow(r.id, { asistencias: Number(e.target.value) || 0 })} /></td>
                      <td className="px-2 py-1.5 text-center"><input type="number" className="w-14 rounded border-0 bg-slate-50 px-2 py-1 text-center ring-1 ring-slate-200 focus:ring-brand-500" value={r.puntos_extra} onChange={(e) => updateRow(r.id, { puntos_extra: Number(e.target.value) || 0 })} /></td>
                      <td className="px-2 py-1.5 text-center font-bold tabular-nums text-slate-500">{r.puntos_voto || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              La media se recalcula sola desde 60: ir al partido +1 · llegar a la hora +1 · gol +3 · asistencia +2 ·
              punto de voto +1 · extra +1. El tope es 99.
            </p>

            <div className="mt-4 flex justify-between">
              <Button variant="ghost" onClick={() => eliminarPartido(detalle)}>Eliminar partido</Button>
              <Button onClick={() => { setDetalle(null); load() }}>Listo</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
