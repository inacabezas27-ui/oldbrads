import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nombreCompleto, type Jugador } from '../lib/types'
import { Button, Field, Input, Modal, Select, Spinner } from '../components/ui'
import FifaCard from '../components/FifaCard'

export default function Cartas() {
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Jugador | null>(null)
  const [saving, setSaving] = useState(false)
  const [orden, setOrden] = useState<'media' | 'nombre'>('media')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('jugadores').select('*').eq('activo', true).eq('es_dt', false)
    setJugadores(data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const ordenados = useMemo(() => {
    const arr = [...jugadores]
    if (orden === 'media') arr.sort((a, b) => (b.carta_overall ?? 0) - (a.carta_overall ?? 0))
    else arr.sort((a, b) => (a.apellido_paterno || '').localeCompare(b.apellido_paterno || ''))
    return arr
  }, [jugadores, orden])

  const guardar = async () => {
    if (!edit) return
    setSaving(true)
    const patch = {
      posicion: edit.posicion,
      numero_camiseta: edit.numero_camiseta ? Number(edit.numero_camiseta) : null,
      apodo: edit.apodo || null,
      foto_url: edit.foto_url || null,
      foto_accion_url: edit.foto_accion_url || null,
    }
    await supabase.from('jugadores').update(patch).eq('id', edit.id)
    setJugadores((prev) => prev.map((j) => (j.id === edit.id ? { ...j, ...patch } : j)))
    setSaving(false)
    setEdit(null)
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink-900">Cartas del plantel</h1>
          <p className="text-sm text-slate-500">Estilo FIFA · bronce, plata, oro y leyenda · la media se calcula sola</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Ordenar:</span>
          <Select value={orden} onChange={(e) => setOrden(e.target.value as 'media' | 'nombre')} className="w-auto">
            <option value="media">Mejor media</option>
            <option value="nombre">Nombre</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {ordenados.map((j) => (
          <div key={j.id} className="flex justify-center">
            <FifaCard j={j} onClick={() => setEdit(j)} />
          </div>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? nombreCompleto(edit) : ''} wide>
        {edit && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[180px_1fr]">
            <div className="flex justify-center">
              <FifaCard j={edit} />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Posición">
                  <Select value={edit.posicion ?? ''} onChange={(e) => setEdit({ ...edit, posicion: e.target.value })}>
                    <option value="">—</option>
                    <option>Arquero</option>
                    <option>Defensa</option>
                    <option>Lateral</option>
                    <option>Medio</option>
                    <option>Extremo</option>
                    <option>Delantero</option>
                  </Select>
                </Field>
                <Field label="N° camiseta">
                  <Input type="number" value={edit.numero_camiseta ?? ''} onChange={(e) => setEdit({ ...edit, numero_camiseta: e.target.value ? Number(e.target.value) : null })} />
                </Field>
              </div>
              <Field label="Apodo (el nombre de la carta)">
                <Input value={edit.apodo ?? ''} onChange={(e) => setEdit({ ...edit, apodo: e.target.value.slice(0, 14) })} placeholder="Si está vacío sale el apellido" />
              </Field>
              <Field label="Foto de perfil (URL)">
                <Input value={edit.foto_url ?? ''} onChange={(e) => setEdit({ ...edit, foto_url: e.target.value })} placeholder="/img/jugador.jpg o https://..." />
              </Field>
              <Field label="Foto en juego (URL)">
                <Input value={edit.foto_accion_url ?? ''} onChange={(e) => setEdit({ ...edit, foto_accion_url: e.target.value })} placeholder="Se usa recién en la carta Leyenda" />
              </Field>
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <b className="text-ink-900">Media actual: {edit.carta_overall ?? 70}</b>
                <p className="mt-1 text-xs text-slate-500">
                  La media se calcula sola con lo que pasa en los partidos: ir, llegar a la hora, ser titular,
                  ganar, dejar el arco en cero, goles, asistencias y el podio de la votación. Se ajusta en
                  Configuración.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
                <Button onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
