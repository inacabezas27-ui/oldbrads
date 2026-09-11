import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { nombreCompleto, type Encuesta, type EncuestaPregunta, type Jugador } from '../../lib/types'
import { fecha as fmtFecha } from '../../lib/format'
import { BRONCE } from '../../lib/marca'


const inputCls =
  'w-full rounded-lg border border-white/15 bg-ink-800 px-3 py-2.5 text-white outline-none placeholder:text-slate-500 focus:border-white/40'

export type Valor = { jugador?: string; opcion?: string; texto?: string; numero?: string }

/* Una pregunta de encuesta, dibujada según su tipo. Vive acá y la usa también
   el post partido, que mezcla la votación con estas mismas preguntas. */
export function CampoPregunta({
  q, indice, valor, onChange, plantel,
}: {
  q: EncuestaPregunta
  indice: number
  valor: Valor
  onChange: (v: Valor) => void
  plantel: Jugador[]
}) {
  const v = valor ?? {}
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-white">
        {indice}. {q.texto}
        {!q.obligatoria && <span className="ml-1 text-xs font-normal text-slate-500">(opcional)</span>}
      </p>

      {q.tipo === 'jugador' && (
        <select value={v.jugador ?? ''} onChange={(e) => onChange({ jugador: e.target.value })} className={inputCls}>
          <option value="">— Elegir jugador —</option>
          {plantel.map((j) => <option key={j.id} value={j.id}>{nombreCompleto(j)}</option>)}
        </select>
      )}

      {q.tipo === 'opciones' && (
        <div className="space-y-2">
          {q.opciones.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => onChange({ opcion: op })}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                v.opcion === op ? 'text-white ring-2 ring-white/60' : 'text-slate-300 ring-1 ring-white/15 hover:ring-white/30'
              }`}
              style={{ background: v.opcion === op ? BRONCE : 'rgba(255,255,255,0.04)' }}
            >
              {op}
            </button>
          ))}
        </div>
      )}

      {q.tipo === 'escala' && (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ numero: String(n) })}
              className={`flex-1 rounded-lg py-3 font-black transition ${
                v.numero === String(n) ? 'text-white' : 'text-slate-400 ring-1 ring-white/15'
              }`}
              style={{ background: v.numero === String(n) ? BRONCE : 'rgba(255,255,255,0.04)' }}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {q.tipo === 'texto' && (
        <textarea
          value={v.texto ?? ''}
          onChange={(e) => onChange({ texto: e.target.value })}
          rows={3}
          className={inputCls}
          placeholder="Escribe tu respuesta…"
        />
      )}
    </div>
  )
}

/* ============ RESPONDER UNA ENCUESTA ============ */
function Responder({
  encuesta,
  plantel,
  onListo,
  onVolver,
}: {
  encuesta: Encuesta
  plantel: Jugador[]
  onListo: () => void
  onVolver: () => void
}) {
  const [preguntas, setPreguntas] = useState<EncuestaPregunta[]>([])
  const [valores, setValores] = useState<Record<string, Valor>>({})
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('encuesta_preguntas')
      .select('*')
      .eq('encuesta_id', encuesta.id)
      .order('orden')
      .then(({ data }) => {
        setPreguntas((data as EncuestaPregunta[]) ?? [])
        setLoading(false)
      })
  }, [encuesta.id])

  const set = (pid: string, v: Valor) => {
    setValores((prev) => ({ ...prev, [pid]: { ...prev[pid], ...v } }))
    setError(null)
  }

  const faltan = preguntas.filter((q) => {
    if (!q.obligatoria) return false
    const v = valores[q.id] ?? {}
    return !(v.jugador || v.opcion || v.texto?.trim() || v.numero)
  })

  const enviar = async () => {
    if (faltan.length) {
      setError(`Te faltan ${faltan.length} respuesta${faltan.length === 1 ? '' : 's'}.`)
      return
    }
    setEnviando(true)
    setError(null)
    const payload = preguntas
      .map((q) => ({ pregunta_id: q.id, ...(valores[q.id] ?? {}) }))
      .filter((r) => r.jugador || r.opcion || r.texto || r.numero)
    const { error } = await supabase.rpc('responder_encuesta', {
      p_encuesta: encuesta.id,
      p_respuestas: payload,
    })
    setEnviando(false)
    if (error) {
      setError(error.message)
      return
    }
    onListo()
  }

  if (loading) return <p className="text-center text-slate-400">Cargando…</p>

  return (
    <div>
      <button onClick={onVolver} className="mb-4 text-sm text-slate-400 hover:text-white">← Volver</button>
      <div className="mb-5 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
        <p className="text-lg font-black text-white">{encuesta.titulo}</p>
        {encuesta.descripcion && <p className="mt-1 text-sm text-slate-400">{encuesta.descripcion}</p>}
        {encuesta.anonima && (
          <p className="mt-2 text-xs" style={{ color: BRONCE }}>
            Esta encuesta es anónima: se guarda que participaste, pero no qué respondiste.
          </p>
        )}
      </div>

      <div className="space-y-5">
        {preguntas.map((q, i) => (
          <CampoPregunta
            key={q.id}
            q={q}
            indice={i + 1}
            valor={valores[q.id] ?? {}}
            onChange={(v) => set(q.id, v)}
            plantel={plantel}
          />
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-rose-500/15 px-3 py-2 text-center text-sm text-rose-200">{error}</p>}

      <button
        onClick={enviar}
        disabled={enviando}
        className="mt-6 w-full rounded-xl py-3 font-bold text-white disabled:opacity-50"
        style={{ background: BRONCE }}
      >
        {enviando ? 'Enviando…' : 'Enviar mis respuestas'}
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">Se responde una sola vez, así que revisa antes de enviar.</p>
    </div>
  )
}

/* ============ LISTA DE ENCUESTAS ============ */
export default function EncuestasJugador({ plantel }: { plantel: Jugador[] }) {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [respondidas, setRespondidas] = useState<Set<string>>(new Set())
  const [abierta, setAbierta] = useState<Encuesta | null>(null)
  const [loading, setLoading] = useState(true)
  const [gracias, setGracias] = useState<string | null>(null)

  const cargar = async () => {
    const [{ data: es }, { data: ps }] = await Promise.all([
      supabase.from('encuestas').select('*').eq('estado', 'abierta').is('partido_id', null).order('created_at', { ascending: false }),
      supabase.from('encuesta_participantes').select('encuesta_id'),
    ])
    setEncuestas((es as Encuesta[]) ?? [])
    setRespondidas(new Set(((ps ?? []) as { encuesta_id: string }[]).map((p) => p.encuesta_id)))
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  if (loading) return <p className="text-center text-slate-400">Cargando…</p>

  if (abierta) {
    return (
      <Responder
        encuesta={abierta}
        plantel={plantel}
        onVolver={() => setAbierta(null)}
        onListo={() => {
          setGracias(abierta.titulo)
          setAbierta(null)
          cargar()
        }}
      />
    )
  }

  const pendientes = encuestas.filter((e) => !respondidas.has(e.id))
  const hechas = encuestas.filter((e) => respondidas.has(e.id))

  return (
    <div>
      {gracias && (
        <p className="mb-4 rounded-lg bg-emerald-500/15 px-3 py-2 text-center text-sm text-emerald-200">
          ¡Gracias por responder «{gracias}»! 💚
        </p>
      )}

      {encuestas.length === 0 && (
        <p className="py-6 text-center text-slate-400">No hay encuestas abiertas en este momento.</p>
      )}

      {pendientes.length > 0 && (
        <>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Por responder</p>
          <div className="space-y-3">
            {pendientes.map((e) => (
              <button
                key={e.id}
                onClick={() => setAbierta(e)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/5 p-4 text-left ring-1 ring-white/10 transition hover:ring-white/30"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">{e.titulo}</span>
                  <span className="block text-xs text-slate-400">
                    {e.anonima ? 'Anónima' : 'Con tu nombre'}
                    {e.cierra_el ? ` · cierra el ${fmtFecha(e.cierra_el)}` : ''}
                  </span>
                </span>
                <span className="text-slate-500">›</span>
              </button>
            ))}
          </div>
        </>
      )}

      {hechas.length > 0 && (
        <>
          <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">Ya respondidas</p>
          <div className="space-y-2">
            {hechas.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
                <span className="shrink-0">✅</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-400">{e.titulo}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
