import { useEffect, useState } from 'react'
import { BRONCE } from '../lib/marca'

/**
 * Invitación a dejar la plataforma como app en el teléfono.
 *
 * Android y Chrome avisan solos con `beforeinstallprompt` y basta un botón.
 * Safari en iPhone NO tiene ese evento: ahí no hay forma de disparar la
 * instalación desde la página y la única salida es explicarle a la persona
 * dónde tocar. Por eso son dos caminos y no uno.
 */

type PromptInstalacion = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> }

const YA_LO_VIO = 'ob-instalar-oculto'

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function yaEstaInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true
}

export default function InstalarApp() {
  const [prompt, setPrompt] = useState<PromptInstalacion | null>(null)
  const [oculto, setOculto] = useState(true)
  const [pasos, setPasos] = useState(false)

  useEffect(() => {
    if (yaEstaInstalada()) return
    try {
      if (localStorage.getItem(YA_LO_VIO) === '1') return
    } catch {
      // Navegación privada: no se puede recordar, se muestra igual.
    }
    setOculto(false)
    const alPoder = (e: Event) => {
      e.preventDefault()
      setPrompt(e as PromptInstalacion)
    }
    window.addEventListener('beforeinstallprompt', alPoder)
    return () => window.removeEventListener('beforeinstallprompt', alPoder)
  }, [])

  const cerrar = () => {
    setOculto(true)
    try { localStorage.setItem(YA_LO_VIO, '1') } catch { /* da lo mismo */ }
  }

  const instalar = async () => {
    if (!prompt) return
    await prompt.prompt()
    setPrompt(null)
    cerrar()
  }

  // En Android sin el evento todavía no hay nada que ofrecer; en iPhone
  // siempre se pueden dar los pasos.
  if (oculto || (!prompt && !esIOS())) return null

  return (
    <div className="border-b border-white/10 bg-white/5 px-5 py-3">
      <div className="mx-auto flex max-w-md items-start gap-3">
        <span className="mt-0.5 text-lg" aria-hidden>📲</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Déjala como app en tu teléfono</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Se abre directo en tu carta, sin buscar el link ni la clave cada vez.
          </p>

          {prompt ? (
            <button
              onClick={instalar}
              className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
              style={{ background: BRONCE }}
            >
              Instalar
            </button>
          ) : pasos ? (
            <ol className="mt-2 space-y-1 text-xs text-slate-300">
              <li>1. Toca <b>Compartir</b> abajo en Safari (el cuadrado con la flecha)</li>
              <li>2. Baja y elige <b>Agregar a pantalla de inicio</b></li>
              <li>3. Toca <b>Agregar</b></li>
            </ol>
          ) : (
            <button
              onClick={() => setPasos(true)}
              className="mt-2 text-xs font-bold underline"
              style={{ color: BRONCE }}
            >
              Cómo se hace
            </button>
          )}
        </div>
        <button onClick={cerrar} className="shrink-0 px-1 text-slate-500 hover:text-white" aria-label="Cerrar">✕</button>
      </div>
    </div>
  )
}
