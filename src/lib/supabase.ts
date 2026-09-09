import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && anonKey)

if (!supabaseConfigurado) {
  // Ayuda para el primer arranque si faltan las claves. Usamos valores
  // placeholder para que la app igual renderice y puedas ver el diseño.
  console.warn(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.local. La app se muestra pero sin conexión a la base de datos.',
  )
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
)
