import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  nombreCompleto,
  type Encuesta,
  type EncuestaPregunta,
  type EncuestaRespuesta,
  type Jugador,
  type TipoPregunta,
} from '../lib/types'
import { fecha as fmtFecha } from '../lib/format'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from '../components/ui'

const TIPOS: { valor: TipoPregunta; label: string; ayuda: string }[] = [
  { valor: 'jugador', label: 'Elegir un jugador', ayuda: 'Muestra la lista del plantel.' },
  { valor: 'opciones', label: 'Alternativas', ayuda: 'Tú escribes las opciones, una por línea.' },
  { valor: 'escala', label: 'Nota del 1 al 5', ayuda: 'Para evaluar algo rápido.' },
  { valor: 'texto', label: 'Respuesta escrita', ayuda: 'Comentario libre.' },
]

/* Plantillas para no partir de cero en las encuestas de siempre. */
const PLANTILLAS: { nombre: string; titulo: string; descripcion: string; anonima: boolean; preguntas: { texto: string; tipo: TipoPregunta; opciones?: string[]; opcional?: boolean }[] }[] = [
  {
    nombre: 'Después del partido',
    titulo: 'Encuesta post partido',
    descripcion: 'Dos minutos para cerrar la fecha.',
    anonima: false,
    preguntas: [
      { texto: '¿Cómo estuvo el equipo hoy?', tipo: 'escala' },
      { texto: 'El gol o la jugada del partido fue de…', tipo: 'jugador' },
      { texto: '¿Algo que decir a la directiva? (cancha, horario, arbitraje, lo que sea)', tipo: 'texto', opcional: true },
    ],
  },
  {
    nombre: 'Premios de fin de año',
    titulo: 'Premios Old Brads',
    descripcion: 'Vota los premios de la temporada. Es anónima.',
    anonima: true,
    preguntas: [
      { texto: 'Jugador del año', tipo: 'jugador' },
      { texto: 'Alma del equipo', tipo: 'jugador' },
      { texto: 'Revelación del año', tipo: 'jugador' },
      { texto: 'Compañerismo', tipo: 'jugador' },
      { texto: 'Gol del año', tipo: 'texto', opcional: true },
    ],
  },
]

type Borrador = { texto: string; tipo: TipoPregunta; opciones: string; obligatoria: boolean }

const preguntaVacia = (): Borrador => ({ texto: '', tipo: 'jugador', opciones: '', obligatoria: true })

export default function Encuestas() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [plantel, setPlantel] = useState<Record<string, Jugador>>({})
  const [loading, setLoading] = useState(true)

  // crear
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [cab, setCab] = useState({ titulo: '', descripcion: '', anonima: 'false', cierra_el: '' })
  const [preguntas, setPreguntas] = useState<Borrador[]>([preguntaVacia()])

  // resultados
  const [verId, setVerId] = useState<string | null>(null)
  const [detPreg, setDetPreg] = useState<EncuestaPregunta[]>([])
  const [detResp, setDetResp] = useState<EncuestaRespuesta[]>([])
  const [detParticipantes, setDetParticipantes] = useState(0)

  const cargar = async () => {
    const [{ data: es }, { data: pl }] = await Promise.all([
      supabase.from('encuestas').select('*').order('created_at', { ascending: false }),
      supabase.from('pub_plantel').select('*'),
    ])
    setEncuestas((es as Encuesta[]) ?? [])
    const map: Record<string, Jugador> = {}
    ;((pl as Jugador[]) ?? []).forEach((j) => { map[j.id] = j })
    setPlantel(map)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const aplicarPlantilla = (nombre: string) => {
    const p = PLANTILLAS.find((x) => x.nombre === nombre)
    if (!p) return
    setCab({ titulo: p.titulo, descripcion: p.descripcion, anonima: String(p.anonima), cierra_el: '' })
    setPreguntas(p.preguntas.map((q) => ({ texto: q.texto, tipo: q.tipo, opciones: (q.opciones ?? []).join('\n'), obligatoria: !q.opcional })))
  }

  const setPregunta = (i: number, patch: Partial<Borrador>) =>
    setPreguntas((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)))

  const crear = async () => {
    const validas = preguntas.filter((q) => q.texto.trim())
    if (!cab.titulo.trim() || validas.length === 0) return
    setGuardando(true)
    const { data: enc } = await supabase
      .from('encuestas')
      .insert({
        titulo: cab.titulo.trim(),
        descripcion: cab.descripcion.trim() || null,
        anonima: cab.anonima === 'true',
        cierra_el: cab.cierra_el || null,
        estado: 'borrador',
      })
      .select()
      .single()
    if (enc) {
      await supabase.from('encuesta_preguntas').insert(
        validas.map((q, i) => ({
          encuesta_id: enc.id,
          orden: i,
          texto: q.texto.trim(),
          tipo: q.tipo,
          opciones: q.tipo === 'opciones' ? q.opciones.split('\n').map((o) => o.trim()).filter(Boolean) : [],
          obligatoria: q.obligatoria,
        })),
      )
    }
    setGuardando(false)
    setNuevaOpen(false)
    setCab({ titulo: '', descripcion: '', anonima: 'false', cierra_el: '' })
    setPreguntas([preguntaVacia()])
    cargar()
  }

  const cambiarEstado = async (e: Encuesta, estado: Encuesta['estado']) => {
    await supabase.from('encuestas').update({ estado }).eq('id', e.id)
    setEncuestas((prev) => prev.map((x) => (x.id === e.id ? { ...x, estado } : x)))
  }

  const eliminar = async (e: Encuesta) => {
    if (!confirm(`¿Eliminar la encuesta "${e.titulo}" y todas sus respuestas?`)) return
    await supabase.from('encuestas').delete().eq('id', e.id)
    cargar()
  }

  const verResultados = async (e: Encuesta) => {
    setVerId(e.id)
    const [{ data: qs }, { data: rs }, { data: ps }] = await Promise.all([
      supabase.from('encuesta_preguntas').select('*').eq('encuesta_id', e.id).order('orden'),
      supabase.from('encuesta_respuestas').select('*').eq('encuesta_id', e.id),
      supabase.from('encuesta_participantes').select('user_id').eq('encuesta_id', e.id),
    ])
    setDetPreg((qs as EncuestaPregunta[]) ?? [])
    setDetResp((rs as EncuestaRespuesta[]) ?? [])
    setDetParticipantes((ps ?? []).length)
  }

  const encuestaVista = useMemo(() => encuestas.find((e) => e.id === verId) ?? null, [encuestas, verId])

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink-900">Encuestas</h1>
          <p className="text-sm text-slate-500">Las creas acá y les aparecen a los jugadores en su celular.</p>
        </div>
        <Button onClick={() => setNuevaOpen(true)}>+ Nueva encuesta</Button>
      </div>

      {encuestas.length === 0 ? (
        <EmptyState
          title="Todavía no hay encuestas"
          hint='Parte con una plantilla: "Después del partido" o "Premios de fin de año".'
        />
      ) : (
        <div className="space-y-3">
          {encuestas.map((e) => (
            <Card key={e.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{e.titulo}</p>
                <p className="text-xs text-slate-400">
                  {fmtFecha(e.created_at)} · {e.anonima ? 'anónima' : 'con nombre'}
                  {e.cierra_el ? ` · cierra ${fmtFecha(e.cierra_el)}` : ''}
                </p>
              </div>
              {e.estado === 'borrador' && <Badge tone="slate">Borrador</Badge>}
              {e.estado === 'abierta' && <Badge tone="green">Abierta</Badge>}
              {e.estado === 'cerrada' && <Badge tone="amber">Cerrada</Badge>}

              {/* La encuesta de un partido la abre y la cierra el calendario,
                  junto con la votación. Abrirla a mano acá la descoordinaría
                  del post partido, así que esos botones no van. */}
              {e.partido_id ? (
                <span className="text-xs text-slate-400">Se abre y cierra sola con el partido</span>
              ) : (
                <>
                  {e.estado === 'borrador' && <Button onClick={() => cambiarEstado(e, 'abierta')}>Publicar</Button>}
                  {e.estado === 'abierta' && <Button variant="secondary" onClick={() => cambiarEstado(e, 'cerrada')}>Cerrar</Button>}
                  {e.estado === 'cerrada' && <Button variant="secondary" onClick={() => cambiarEstado(e, 'abierta')}>Reabrir</Button>}
                </>
              )}
              <Button variant="secondary" onClick={() => verResultados(e)}>Resultados</Button>
              {!e.partido_id && <Button variant="ghost" onClick={() => eliminar(e)}>Eliminar</Button>}
            </Card>
          ))}
        </div>
      )}

      {/* ---- Nueva encuesta ---- */}
      <Modal open={nuevaOpen} onClose={() => setNuevaOpen(false)} title="Nueva encuesta" wide>
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
          <span className="text-xs font-semibold text-slate-500">Partir de una plantilla:</span>
          {PLANTILLAS.map((p) => (
            <Button key={p.nombre} variant="secondary" onClick={() => aplicarPlantilla(p.nombre)}>{p.nombre}</Button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Título *">
            <Input value={cab.titulo} onChange={(e) => setCab({ ...cab, titulo: e.target.value })} placeholder="Ej. Encuesta post partido" />
          </Field>
          <Field label="Cierra el (opcional)">
            <Input type="date" value={cab.cierra_el} onChange={(e) => setCab({ ...cab, cierra_el: e.target.value })} />
          </Field>
          <Field label="Descripción">
            <Input value={cab.descripcion} onChange={(e) => setCab({ ...cab, descripcion: e.target.value })} placeholder="Una línea explicando de qué se trata" />
          </Field>
          <Field label="¿Anónima?">
            <Select value={cab.anonima} onChange={(e) => setCab({ ...cab, anonima: e.target.value })}>
              <option value="false">No — quedan con el nombre de cada uno</option>
              <option value="true">Sí — no se guarda quién respondió qué</option>
            </Select>
          </Field>
        </div>

        <p className="mb-2 mt-6 text-sm font-bold text-ink-900">Preguntas</p>
        <div className="space-y-3">
          {preguntas.map((q, i) => (
            <div key={i} className="rounded-xl ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-2 p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">{i + 1}</span>
                <Input
                  className="min-w-[220px] flex-1"
                  value={q.texto}
                  onChange={(e) => setPregunta(i, { texto: e.target.value })}
                  placeholder="Escribe la pregunta"
                />
                <Select className="w-48" value={q.tipo} onChange={(e) => setPregunta(i, { tipo: e.target.value as TipoPregunta })}>
                  {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                </Select>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={q.obligatoria} onChange={(e) => setPregunta(i, { obligatoria: e.target.checked })} />
                  Obligatoria
                </label>
                {preguntas.length > 1 && (
                  <button onClick={() => setPreguntas((prev) => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-600" title="Quitar">✕</button>
                )}
              </div>
              {q.tipo === 'opciones' && (
                <div className="border-t border-slate-100 p-3">
                  <textarea
                    value={q.opciones}
                    onChange={(e) => setPregunta(i, { opciones: e.target.value })}
                    rows={3}
                    placeholder={'Una opción por línea\nEj. Sí\nNo\nMe da lo mismo'}
                    className="w-full rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <Button variant="secondary" className="mt-3" onClick={() => setPreguntas((prev) => [...prev, preguntaVacia()])}>+ Agregar pregunta</Button>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setNuevaOpen(false)}>Cancelar</Button>
          <Button onClick={crear} disabled={guardando || !cab.titulo.trim()}>
            {guardando ? 'Creando…' : 'Crear como borrador'}
          </Button>
        </div>
        <p className="mt-2 text-right text-xs text-slate-400">Queda en borrador: nadie la ve hasta que pulses "Publicar".</p>
      </Modal>

      {/* ---- Resultados ---- */}
      <Modal open={!!verId} onClose={() => setVerId(null)} title={encuestaVista?.titulo ?? ''} wide>
        {encuestaVista && (
          <div>
            <p className="mb-4 text-sm text-slate-500">
              Respondieron <b className="text-ink-900">{detParticipantes}</b> personas
              {encuestaVista.anonima ? ' · encuesta anónima, no se guarda quién dijo qué' : ''}
            </p>
            <div className="space-y-6">
              {detPreg.map((q, i) => {
                const rs = detResp.filter((r) => r.pregunta_id === q.id)
                if (q.tipo === 'texto') {
                  return (
                    <div key={q.id}>
                      <p className="mb-2 font-semibold text-ink-900">{i + 1}. {q.texto}</p>
                      {rs.length === 0 ? <p className="text-sm text-slate-400">Sin respuestas.</p> : (
                        <ul className="space-y-2">
                          {rs.map((r) => (
                            <li key={r.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">“{r.texto}”</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                }
                // conteo por valor
                const conteo: Record<string, number> = {}
                rs.forEach((r) => {
                  const k = q.tipo === 'jugador'
                    ? (r.jugador_elegido && plantel[r.jugador_elegido] ? nombreCompleto(plantel[r.jugador_elegido]) : '—')
                    : q.tipo === 'escala' ? String(r.numero ?? '—') : (r.opcion ?? '—')
                  conteo[k] = (conteo[k] ?? 0) + 1
                })
                const filas = Object.entries(conteo).sort((a, b) => b[1] - a[1])
                const max = filas[0]?.[1] ?? 1
                return (
                  <div key={q.id}>
                    <p className="mb-2 font-semibold text-ink-900">{i + 1}. {q.texto}</p>
                    {filas.length === 0 ? <p className="text-sm text-slate-400">Sin respuestas.</p> : (
                      <div className="space-y-1.5">
                        {filas.map(([k, n]) => (
                          <div key={k} className="flex items-center gap-3">
                            <span className="w-52 shrink-0 truncate text-sm text-slate-700">{k}</span>
                            <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                              <div className="h-full rounded bg-brand-500" style={{ width: `${(n / max) * 100}%` }} />
                            </div>
                            <span className="w-8 text-right text-sm font-bold tabular-nums text-slate-600">{n}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.tipo === 'escala' && rs.length > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        Promedio: <b>{(rs.reduce((a, r) => a + (r.numero ?? 0), 0) / rs.length).toFixed(1)}</b> de 5
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
