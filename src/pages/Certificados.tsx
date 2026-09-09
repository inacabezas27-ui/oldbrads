import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { pedirTexto } from '../lib/ia'
import type { Premio, Temporada } from '../lib/types'
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Spinner } from '../components/ui'
import Certificado, { type DatosCertificado } from '../components/Certificado'

/** Número único y estable: siempre el mismo para el mismo premio. */
const numeroDe = (premioId: string, anio: number) =>
  `OB-${anio}-${premioId.replace(/-/g, '').slice(0, 6).toUpperCase()}`

const hoyLargo = () =>
  new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Certificados() {
  const [premios, setPremios] = useState<Premio[]>([])
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [temporadaId, setTemporadaId] = useState('')
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [firmaDirectiva, setFirmaDirectiva] = useState('Ignacio Cabezas')
  const [firmaEquipo, setFirmaEquipo] = useState('Old Brads')
  const [fecha, setFecha] = useState(hoyLargo())

  const cargar = async () => {
    const [{ data: ps }, { data: ts }] = await Promise.all([
      supabase.from('premios').select('*').order('orden'),
      supabase.from('temporadas').select('*').order('orden', { ascending: false }),
    ])
    setPremios((ps as Premio[]) ?? [])
    setTemporadas((ts as Temporada[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const visibles = useMemo(
    () => premios.filter((p) => temporadaId === '' || p.temporada_id === temporadaId),
    [premios, temporadaId],
  )
  const nombreTemporada = (id: string | null) => temporadas.find((t) => t.id === id)?.nombre ?? 'Temporada'
  const anioTemporada = (id: string | null) => temporadas.find((t) => t.id === id)?.anio ?? new Date().getFullYear()

  const alternar = (id: string) =>
    setElegidos((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })

  const todos = () =>
    setElegidos(elegidos.size === visibles.length ? new Set() : new Set(visibles.map((p) => p.id)))

  /* El motivo se guarda en el premio, así el certificado sale siempre igual. */
  const generarMotivo = async (p: Premio) => {
    setGenerando(p.id)
    setMsg(null)
    try {
      const texto = await pedirTexto('certificado', {
        categoria: p.categoria,
        ganador: p.ganador,
        temporada: nombreTemporada(p.temporada_id),
        detalle: p.detalle,
      })
      await supabase.from('premios').update({ detalle: texto }).eq('id', p.id)
      setPremios((prev) => prev.map((x) => (x.id === p.id ? { ...x, detalle: texto } : x)))
      setMsg({ tipo: 'ok', texto: 'Motivo generado. Puedes editarlo antes de imprimir.' })
    } catch (e) {
      setMsg({ tipo: 'error', texto: (e as Error).message })
    } finally {
      setGenerando(null)
    }
  }

  const editarMotivo = async (p: Premio, texto: string) => {
    setPremios((prev) => prev.map((x) => (x.id === p.id ? { ...x, detalle: texto } : x)))
    await supabase.from('premios').update({ detalle: texto }).eq('id', p.id)
  }

  const paraImprimir: DatosCertificado[] = visibles
    .filter((p) => elegidos.has(p.id))
    .map((p) => ({
      id: p.id,
      categoria: p.categoria,
      ganador: p.ganador,
      motivo: p.detalle,
      temporada: nombreTemporada(p.temporada_id),
      fecha,
      numero: numeroDe(p.id, anioTemporada(p.temporada_id)),
      firmaDirectiva,
      firmaEquipo,
    }))

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Certificados"
        subtitle="Certificados oficiales del club, listos para imprimir en A4 horizontal."
        action={
          temporadas.length > 0 ? (
            <Select value={temporadaId} onChange={(e) => { setTemporadaId(e.target.value); setElegidos(new Set()) }} className="w-56">
              <option value="">Todas las temporadas</option>
              {temporadas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </Select>
          ) : undefined
        }
      />

      {visibles.length === 0 ? (
        <EmptyState
          title="No hay premios para certificar"
          hint="Los certificados se generan desde los premios de la temporada. Cárgalos primero en la sección Premios."
        />
      ) : (
        <>
          <Card className="mb-5 p-5">
            <p className="mb-4 text-sm font-bold text-ink-900">Cómo va firmado</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Firma de la directiva">
                <Input value={firmaDirectiva} onChange={(e) => setFirmaDirectiva(e.target.value)} />
              </Field>
              <Field label="Firma en representación del equipo">
                <Input value={firmaEquipo} onChange={(e) => setFirmaEquipo(e.target.value)} />
              </Field>
              <Field label="Fecha que aparece impresa">
                <Input value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </Field>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Los nombres salen en letra ligada sobre la línea de firma. El timbre y el número de serie se generan solos.
            </p>
          </Card>

          {msg && (
            <p className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.tipo === 'ok' ? 'bg-brand-50 text-brand-800' : 'bg-rose-50 text-rose-700'}`}>
              {msg.texto}
            </p>
          )}

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {elegidos.size} de {visibles.length} seleccionados
            </p>
            <Button variant="secondary" onClick={todos}>
              {elegidos.size === visibles.length ? 'Quitar todos' : 'Seleccionar todos'}
            </Button>
          </div>

          <div className="space-y-3">
            {visibles.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-brand-600"
                    checked={elegidos.has(p.id)}
                    onChange={() => alternar(p.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink-900">{p.categoria}</span>
                      <Badge tone="slate">{nombreTemporada(p.temporada_id)}</Badge>
                      <span className="font-mono text-[11px] text-slate-400">
                        {numeroDe(p.id, anioTemporada(p.temporada_id))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-lg font-black text-brand-700">🏆 {p.ganador}</p>
                    <textarea
                      value={p.detalle ?? ''}
                      onChange={(e) => setPremios((prev) => prev.map((x) => (x.id === p.id ? { ...x, detalle: e.target.value } : x)))}
                      onBlur={(e) => editarMotivo(p, e.target.value)}
                      rows={2}
                      placeholder="Motivo que aparece en el certificado (opcional)"
                      className="mt-2 w-full rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-brand-500"
                    />
                  </div>
                  <Button variant="secondary" onClick={() => generarMotivo(p)} disabled={generando === p.id}>
                    {generando === p.id ? 'Escribiendo…' : '✨ Redactar motivo'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="sticky bottom-4 mt-6 flex items-center gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
            <Button onClick={() => window.print()} disabled={elegidos.size === 0}>
              Imprimir {elegidos.size > 0 ? `${elegidos.size} certificado${elegidos.size === 1 ? '' : 's'}` : ''}
            </Button>
            <span className="text-xs text-slate-500">
              Se abre el diálogo de impresión. Para guardarlo como archivo, elige «Guardar como PDF» y deja el papel en
              horizontal.
            </span>
          </div>

          {/* Vista previa en pantalla, reducida */}
          {paraImprimir.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Vista previa</p>
              <div className="overflow-x-auto rounded-xl bg-slate-100 p-4">
                <div style={{ width: '297mm', transform: 'scale(0.62)', transformOrigin: 'top left', height: '135mm' }}>
                  <Certificado d={paraImprimir[0]} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Lo que realmente se imprime. Va colgado del <body> con un portal: la
          regla de impresión oculta a los hermanos de esta caja, y si viviera
          dentro de #root se ocultaría a sí misma junto con la app. */}
      {createPortal(
        <div className="ob-print">
          {paraImprimir.map((d) => <Certificado key={d.id} d={d} />)}
        </div>,
        document.body,
      )}
    </div>
  )
}
