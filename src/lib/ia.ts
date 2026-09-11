import { supabase } from './supabase'

/** Tareas que el servidor sabe hacer. Las instrucciones viven allá, no acá. */
export type TareaIA =
  | 'certificado'
  | 'informe_partido'
  | 'caption_resultado'
  | 'caption_citacion'
  | 'presentacion_jugador'

/**
 * Le pide un texto al servidor, que es el único que habla con Gemini.
 * Manda el token de la sesión: sin sesión iniciada no responde.
 */
export async function pedirTexto(tarea: TareaIA, datos: Record<string, unknown>): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Tu sesión expiró. Vuelve a entrar.')

  const r = await fetch('/api/ia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ tarea, datos }),
  })
  const cuerpo = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(cuerpo?.error ?? 'No se pudo generar el texto.')
  return cuerpo.texto as string
}
