import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NIVELES, nivelDe } from '../lib/jugadorAuth'
import { nombreCompleto, type Jugador } from '../lib/types'
import { NAVY } from '../lib/marca'
import Crest from './Crest'
import FifaCard from './FifaCard'
import { Button } from './ui'

/**
 * Todas las cartas juntas en una hoja, para guardarla como PDF y mandarla.
 *
 * No se arma el PDF por código a propósito: las cartas son degradados y fotos
 * que vienen de Storage, y pasarlas a un lienzo obliga a redibujarlas y a
 * pelear con CORS. Imprimir la página que el navegador ya tiene renderizada
 * sale idéntica a la pantalla. En el diálogo se elige "Guardar como PDF", y en
 * el teléfono queda para compartir por WhatsApp desde ahí mismo.
 *
 * Lo único que hay que forzar es el color: al imprimir, los navegadores botan
 * los fondos para ahorrar tinta, y sin eso las cartas salen en blanco.
 */

/* La lámina se cuelga directo del body, fuera de la app, y al imprimir se
   esconde todo lo demás. Ocultar por 'visibility' no sirve: el elemento sigue
   ocupando su lugar y la hoja sale en blanco. Y en la impresión tiene que
   quedar en flujo normal, no fija ni absoluta, o el navegador imprime solo lo
   que cabe en la primera página. */
const CSS_IMPRESION = `
@media print {
  body > *:not(.ob-lamina) { display: none !important; }
  .ob-lamina { position: static !important; overflow: visible !important; }
  .ob-no-imprimir { display: none !important; }
  .ob-carta { break-inside: avoid; page-break-inside: avoid; }
  .ob-lamina, .ob-lamina * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 12mm; }
}
`

export default function LaminaCartas({ jugadores, onCerrar }: { jugadores: Jugador[]; onCerrar: () => void }) {
  // De mayor a menor: la gracia de la lámina es ver quién va arriba.
  const orden = [...jugadores].sort(
    (a, b) => (b.carta_overall ?? 0) - (a.carta_overall ?? 0) || nombreCompleto(a).localeCompare(nombreCompleto(b)),
  )

  const porNivel = NIVELES.map((n) => ({
    nombre: n.nombre,
    cuantos: orden.filter((j) => nivelDe(j.carta_overall ?? 0).nombre === n.nombre).length,
  })).filter((n) => n.cuantos > 0).reverse()

  // Escape para cerrar, como cualquier pantalla completa.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  const hoy = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

  return createPortal(
    <div className="ob-lamina fixed inset-0 z-50 overflow-auto bg-white">
      <style>{CSS_IMPRESION}</style>

      <div className="ob-no-imprimir sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
        <p className="text-sm text-slate-500">
          {orden.length} cartas. Elige <b className="text-ink-900">Guardar como PDF</b> en el destino de la impresión.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cerrar</Button>
          <Button onClick={() => window.print()}>Descargar PDF</Button>
        </div>
      </div>

      <div className="px-8 py-6">
        <header className="mb-6 flex items-center gap-3 border-b-2 pb-4" style={{ borderColor: NAVY }}>
          <Crest size={44} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black uppercase tracking-wide" style={{ color: NAVY }}>
              Old Brads · Nivel del plantel
            </h1>
            <p className="text-xs text-slate-500">
              Al {hoy} · {porNivel.map((n) => `${n.cuantos} ${n.nombre.toLowerCase()}`).join(' · ')}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 print:grid-cols-4">
          {orden.map((j) => (
            <div key={j.id} className="ob-carta flex flex-col items-center gap-1">
              <FifaCard j={j} dt={j.es_dt} />
              <p className="w-full truncate text-center text-[10px] font-semibold leading-tight text-slate-600">
                {nombreCompleto(j)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
