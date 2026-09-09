import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nombreCompleto, type Jugador } from '../lib/types'
import { Modal, Spinner } from '../components/ui'
import FifaCard from '../components/FifaCard'

type Slot = { k: string; label: string; x: number; y: number }

const FORMACIONES: Record<string, Slot[]> = {
  '4-3-3': [
    { k: 'GK', label: 'POR', x: 50, y: 91 },
    { k: 'LB', label: 'LI', x: 12, y: 71 }, { k: 'LCB', label: 'DFC', x: 36, y: 78 }, { k: 'RCB', label: 'DFC', x: 64, y: 78 }, { k: 'RB', label: 'LD', x: 88, y: 71 },
    { k: 'LCM', label: 'MC', x: 27, y: 52 }, { k: 'CM', label: 'MC', x: 50, y: 56 }, { k: 'RCM', label: 'MC', x: 73, y: 52 },
    { k: 'LW', label: 'EI', x: 16, y: 26 }, { k: 'ST', label: 'DC', x: 50, y: 19 }, { k: 'RW', label: 'ED', x: 84, y: 26 },
  ],
  '4-4-2': [
    { k: 'GK', label: 'POR', x: 50, y: 91 },
    { k: 'LB', label: 'LI', x: 12, y: 72 }, { k: 'LCB', label: 'DFC', x: 37, y: 77 }, { k: 'RCB', label: 'DFC', x: 63, y: 77 }, { k: 'RB', label: 'LD', x: 88, y: 72 },
    { k: 'LM', label: 'MI', x: 13, y: 49 }, { k: 'LCM', label: 'MC', x: 39, y: 53 }, { k: 'RCM', label: 'MC', x: 61, y: 53 }, { k: 'RM', label: 'MD', x: 87, y: 49 },
    { k: 'ST1', label: 'DC', x: 38, y: 21 }, { k: 'ST2', label: 'DC', x: 62, y: 21 },
  ],
  '4-2-3-1': [
    { k: 'GK', label: 'POR', x: 50, y: 91 },
    { k: 'LB', label: 'LI', x: 12, y: 73 }, { k: 'LCB', label: 'DFC', x: 37, y: 78 }, { k: 'RCB', label: 'DFC', x: 63, y: 78 }, { k: 'RB', label: 'LD', x: 88, y: 73 },
    { k: 'LDM', label: 'MCD', x: 38, y: 59 }, { k: 'RDM', label: 'MCD', x: 62, y: 59 },
    { k: 'LAM', label: 'EI', x: 18, y: 39 }, { k: 'CAM', label: 'MCO', x: 50, y: 35 }, { k: 'RAM', label: 'ED', x: 82, y: 39 },
    { k: 'ST', label: 'DC', x: 50, y: 17 },
  ],
  '3-5-2': [
    { k: 'GK', label: 'POR', x: 50, y: 91 },
    { k: 'LCB', label: 'DFC', x: 28, y: 79 }, { k: 'CB', label: 'DFC', x: 50, y: 81 }, { k: 'RCB', label: 'DFC', x: 72, y: 79 },
    { k: 'LWB', label: 'CI', x: 10, y: 57 }, { k: 'LCM', label: 'MC', x: 33, y: 55 }, { k: 'CM', label: 'MC', x: 50, y: 59 }, { k: 'RCM', label: 'MC', x: 67, y: 55 }, { k: 'RWB', label: 'CD', x: 90, y: 57 },
    { k: 'ST1', label: 'DC', x: 40, y: 21 }, { k: 'ST2', label: 'DC', x: 60, y: 21 },
  ],
}

type Payload = { type: 'slot'; key: string } | { type: 'sub'; id: string }

export default function Formaciones() {
  const [tipo, setTipo] = useState('4-3-3')
  const [pos, setPos] = useState<Record<string, string>>({})
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [dt, setDt] = useState<Jugador | null>(null)
  const [loading, setLoading] = useState(true)
  const [picker, setPicker] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number; j: Jugador } | null>(null)

  const dragRef = useRef<{ payload: Payload; startX: number; startY: number; moved: boolean } | null>(null)
  const tipoRef = useRef(tipo); tipoRef.current = tipo
  const rowIdRef = useRef<string | null>(null)
  const posRef = useRef<Record<string, string>>(pos); posRef.current = pos

  useEffect(() => {
    const load = async () => {
      const [f, j, d] = await Promise.all([
        supabase.from('formaciones').select('*').eq('actual', true).limit(1).maybeSingle(),
        supabase.from('jugadores').select('*').eq('activo', true).eq('es_dt', false),
        supabase.from('jugadores').select('*').eq('es_dt', true).limit(1).maybeSingle(),
      ])
      if (f.data) { rowIdRef.current = f.data.id; setTipo(f.data.formacion); setPos(f.data.posiciones || {}) }
      setJugadores(j.data ?? [])
      setDt(d.data ?? null)
      setLoading(false)
    }
    load()
  }, [])

  const byId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores])
  const slots = FORMACIONES[tipo]
  const asignados = new Set(Object.values(pos).filter(Boolean))
  const suplentes = jugadores.filter((j) => !asignados.has(j.id))

  const save = (t: string, p: Record<string, string>) => {
    if (!rowIdRef.current) return
    supabase
      .from('formaciones')
      .update({ formacion: t, posiciones: p })
      .eq('id', rowIdRef.current)
      .then(({ error }) => { if (error) console.error('save formacion', error) })
  }
  const aplicar = (p: Record<string, string>) => { setPos(p); save(tipoRef.current, p) }
  const cambiarFormacion = (t: string) => { setTipo(t); save(t, pos) }
  const asignar = (slotK: string, id: string) => {
    const np = { ...pos }
    for (const k of Object.keys(np)) if (np[k] === id) delete np[k]
    np[slotK] = id
    aplicar(np); setPicker(null)
  }
  const quitar = (slotK: string) => { const np = { ...pos }; delete np[slotK]; aplicar(np); setPicker(null) }

  // Arrastre con puntero (mouse + touch)
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 6) d.moved = true
      setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g))
    }
    const up = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) { setGhost(null); return }
      dragRef.current = null
      setGhost(null)
      if (!d.moved) {
        if (d.payload.type === 'slot') setPicker(d.payload.key)
        return
      }
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const slotEl = el?.closest('[data-slot]') as HTMLElement | null
      const benchEl = el?.closest('[data-bench]') as HTMLElement | null
      const np = { ...posRef.current }
      if (slotEl?.dataset.slot) {
        const targetK = slotEl.dataset.slot
        if (d.payload.type === 'slot') {
          if (d.payload.key === targetK) return
          const a = np[d.payload.key]
          const b = np[targetK]
          if (b) np[d.payload.key] = b; else delete np[d.payload.key]
          np[targetK] = a
        } else {
          for (const k of Object.keys(np)) if (np[k] === d.payload.id) delete np[k]
          np[targetK] = d.payload.id
        }
      } else if (benchEl && d.payload.type === 'slot') {
        delete np[d.payload.key]
      } else {
        return
      }
      setPos(np)
      save(tipoRef.current, np)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [])

  const startDrag = (e: React.PointerEvent, payload: Payload, jugador: Jugador) => {
    if (e.button !== undefined && e.button !== 0) return
    dragRef.current = { payload, startX: e.clientX, startY: e.clientY, moved: false }
    setGhost({ x: e.clientX, y: e.clientY, j: jugador })
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-3xl select-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink-900">Formación</h1>
          <p className="text-sm text-slate-500">Arrastra las cartas para moverlas · toca una para elegir/quitar</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(FORMACIONES).map((t) => (
            <button key={t} onClick={() => cambiarFormacion(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${tipo === t ? 'bg-brand-600 text-white' : 'bg-white text-ink-700 ring-1 ring-slate-300 hover:bg-slate-50'}`}>{t}</button>
          ))}
        </div>
      </div>

      {dt && (
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-ink-900 p-3 text-white">
          <div className="w-12"><FifaCard j={dt} mini dt /></div>
          <div><p className="text-xs uppercase tracking-widest text-brand-300">Director Técnico</p><p className="font-bold">{nombreCompleto(dt)}</p></div>
        </div>
      )}

      <div className="relative w-full overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10"
        style={{ containerType: 'inline-size', aspectRatio: '0.74', background: 'repeating-linear-gradient(0deg, #1c7a45 0 9%, #1a7040 9% 18%)' }}>
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/20" />
        <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 bg-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" style={{ width: '26cqw', height: '26cqw' }} />
        <div className="pointer-events-none absolute left-1/2 top-3 h-[15%] w-[42%] -translate-x-1/2 border-2 border-t-0 border-white/20" />
        <div className="pointer-events-none absolute bottom-3 left-1/2 h-[15%] w-[42%] -translate-x-1/2 border-2 border-b-0 border-white/20" />

        {slots.map((s) => {
          const j = pos[s.k] ? byId.get(pos[s.k]) : null
          return (
            <div key={s.k} data-slot={s.k}
              className="absolute flex flex-col items-center"
              style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-50%)', width: '15cqw' }}
            >
              {j ? (
                <div
                  onPointerDown={(e) => startDrag(e, { type: 'slot', key: s.k }, j)}
                  className="flex w-full cursor-grab flex-col items-center rounded-md px-1 py-1 shadow active:cursor-grabbing"
                  style={{ background: 'linear-gradient(160deg,#f6e6ad,#e2c877 55%,#c9ab55)', color: '#3a2e0a', touchAction: 'none' }}
                >
                  <span className="font-black leading-none" style={{ fontSize: '4.6cqw' }}>{j.carta_overall ?? 70}</span>
                  <span className="w-full truncate text-center font-bold uppercase leading-tight" style={{ fontSize: '2.1cqw' }}>{(j.apellido_paterno || '').split(' ')[0]}</span>
                </div>
              ) : (
                <button onClick={() => setPicker(s.k)}
                  className="flex items-center justify-center rounded-full border-2 border-dashed border-white/70 text-white/85"
                  style={{ width: '9cqw', height: '9cqw' }}><span style={{ fontSize: '4.5cqw' }}>+</span></button>
              )}
              <span className="mt-0.5 rounded bg-black/45 px-1 font-bold text-white" style={{ fontSize: '1.9cqw' }}>{s.label}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-5" data-bench="1">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Suplentes ({suplentes.length}) <span className="font-normal normal-case text-slate-400">· arrástralos a la cancha</span></h2>
        <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
          {suplentes.map((j) => (
            <div key={j.id} onPointerDown={(e) => startDrag(e, { type: 'sub', id: j.id }, j)} className="cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
              <FifaCard j={j} mini />
            </div>
          ))}
          {suplentes.length === 0 && <p className="text-sm text-slate-400">Todos en la cancha.</p>}
        </div>
      </div>

      {/* Ghost que sigue al puntero */}
      {ghost && (
        <div className="pointer-events-none fixed z-[60] opacity-90" style={{ left: ghost.x - 30, top: ghost.y - 40, width: 62 }}>
          <FifaCard j={ghost.j} mini />
        </div>
      )}

      <Modal open={!!picker} onClose={() => setPicker(null)} title="Elegir jugador">
        <div className="max-h-[60vh] space-y-1 overflow-y-auto">
          {picker && pos[picker] && (
            <button onClick={() => quitar(picker)} className="mb-2 w-full rounded-lg bg-rose-50 px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-100">✕ Quitar de esta posición</button>
          )}
          {[...jugadores].sort((a, b) => (b.carta_overall ?? 0) - (a.carta_overall ?? 0)).map((j) => (
            <button key={j.id} onClick={() => picker && asignar(picker, j.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50">
              <span className="font-medium text-ink-900">{nombreCompleto(j)} {asignados.has(j.id) && <span className="text-xs text-slate-400">(en cancha)</span>}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-black text-white">{j.carta_overall ?? 70}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
