import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import { nombreCompleto, type Jugador } from '../lib/types'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from '../components/ui'

type FormState = Partial<Jugador>

const empty: FormState = {
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  rut: '',
  email: '',
  telefono: '',
  comuna: '',
  posicion: '',
  numero_camiseta: null,
  talla_polera: '',
  talla_short: '',
  grupo_wsp: '',
  activo: true,
}

export default function Jugadores() {
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [soloActivos, setSoloActivos] = useState(true)
  const [query, setQuery] = useState('')

  const load = async () => {
    if (!supabaseConfigurado) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('jugadores')
      .select('*')
      .order('apellido_paterno', { ascending: true })
    setJugadores(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setForm(empty)
    setModalOpen(true)
  }
  const openEdit = (j: Jugador) => {
    setForm(j)
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.nombres || !form.apellido_paterno) return
    setSaving(true)
    const payload = {
      nombres: form.nombres,
      apellido_paterno: form.apellido_paterno,
      apellido_materno: form.apellido_materno || null,
      rut: form.rut || null,
      email: form.email || null,
      telefono: form.telefono || null,
      comuna: form.comuna || null,
      posicion: form.posicion || null,
      numero_camiseta: form.numero_camiseta ? Number(form.numero_camiseta) : null,
      talla_polera: form.talla_polera || null,
      talla_short: form.talla_short || null,
      grupo_wsp: form.grupo_wsp || null,
      activo: form.activo ?? true,
    }
    if (form.id) {
      await supabase.from('jugadores').update(payload).eq('id', form.id)
    } else {
      await supabase.from('jugadores').insert(payload)
    }
    setSaving(false)
    setModalOpen(false)
    load()
  }

  const toggleActivo = async (j: Jugador) => {
    await supabase.from('jugadores').update({ activo: !j.activo }).eq('id', j.id)
    load()
  }

  const filtered = jugadores
    .filter((j) => (soloActivos ? j.activo : true))
    .filter((j) => nombreCompleto(j).toLowerCase().includes(query.toLowerCase()))

  const set = (k: keyof FormState, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink-900">Plantel</h1>
          <p className="text-sm text-slate-500">{filtered.length} jugadores</p>
        </div>
        <Button onClick={openNew}>+ Nuevo jugador</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Input placeholder="Buscar jugador…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
          Solo activos
        </label>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="Sin jugadores" hint="Agrega el primer jugador para empezar." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Jugador</th>
                  <th className="px-4 py-3">Posición</th>
                  <th className="px-4 py-3">Grupo</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold tabular-nums text-slate-400">{j.numero_camiseta ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-900">{nombreCompleto(j)}</p>
                      {j.rut && <p className="text-xs text-slate-400">{j.rut}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{j.posicion ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{j.grupo_wsp ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-600">{j.telefono ?? '—'}</p>
                      {j.email && <p className="text-xs text-slate-400">{j.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {j.activo ? <Badge tone="green">Activo</Badge> : <Badge tone="slate">Inactivo</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" onClick={() => openEdit(j)}>Editar</Button>
                        <Button variant="ghost" onClick={() => toggleActivo(j)}>{j.activo ? 'Dar de baja' : 'Reactivar'}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Editar jugador' : 'Nuevo jugador'} wide>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombres *">
            <Input value={form.nombres ?? ''} onChange={(e) => set('nombres', e.target.value)} />
          </Field>
          <Field label="Apellido paterno *">
            <Input value={form.apellido_paterno ?? ''} onChange={(e) => set('apellido_paterno', e.target.value)} />
          </Field>
          <Field label="Apellido materno">
            <Input value={form.apellido_materno ?? ''} onChange={(e) => set('apellido_materno', e.target.value)} />
          </Field>
          <Field label="RUT">
            <Input value={form.rut ?? ''} onChange={(e) => set('rut', e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} />
          </Field>
          <Field label="Comuna">
            <Input value={form.comuna ?? ''} onChange={(e) => set('comuna', e.target.value)} />
          </Field>
          <Field label="Posición">
            <Input value={form.posicion ?? ''} onChange={(e) => set('posicion', e.target.value)} />
          </Field>
          <Field label="N° camiseta">
            <Input type="number" value={form.numero_camiseta ?? ''} onChange={(e) => set('numero_camiseta', e.target.value)} />
          </Field>
          <Field label="Grupo WhatsApp">
            <Select value={form.grupo_wsp ?? ''} onChange={(e) => set('grupo_wsp', e.target.value)}>
              <option value="">—</option>
              <option>Grupo 1</option>
              <option>Grupo 2</option>
              <option>Grupo 3</option>
            </Select>
          </Field>
          <Field label="Talla polera">
            <Input value={form.talla_polera ?? ''} onChange={(e) => set('talla_polera', e.target.value)} />
          </Field>
          <Field label="Talla short">
            <Input value={form.talla_short ?? ''} onChange={(e) => set('talla_short', e.target.value)} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.nombres || !form.apellido_paterno}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
