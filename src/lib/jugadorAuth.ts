// Cada jugador entra con "usuario + clave". El usuario es la inicial del nombre
// pegada al apellido paterno (ej. Ignacio Cabezas -> icabezas) y por dentro se
// convierte en un correo del club. OJO: son solo identificadores de acceso, no
// casillas reales — por eso el cambio de clave se hace dentro de la app y no por
// correo de recuperación.
export const DOMINIO_JUGADORES = 'oldbrads.cl'

export const usuarioAEmail = (usuario: string) => {
  const u = usuario.toLowerCase().trim().replace(/\s+/g, '')
  return u.includes('@') ? u : `${u}@${DOMINIO_JUGADORES}`
}

/** Clave que entrega el club la primera vez. Después cada uno la cambia. */
export const claveInicial = (usuario: string) => `${usuario.toLowerCase().trim()}2026`

export const PUNTOS_POR_PUESTO = [5, 4, 3, 2, 1] // 1°=5 ... 5°=1

/* ---- Niveles de la carta ---- */
export type Nivel = { nombre: string; desde: number; bg: string; text: string; sil: string }

export const NIVELES: Nivel[] = [
  {
    nombre: 'Bronce',
    desde: 0,
    bg: 'linear-gradient(160deg,#e8c9a0 0%,#c98f52 45%,#9c6428 100%)',
    text: '#3c2410',
    sil: 'rgba(60,36,16,0.22)',
  },
  {
    nombre: 'Plata',
    desde: 78,
    bg: 'linear-gradient(160deg,#f2f4f7 0%,#cfd6e2 45%,#9aa6b8 100%)',
    text: '#26303f',
    sil: 'rgba(38,48,63,0.20)',
  },
  {
    nombre: 'Oro',
    desde: 88,
    bg: 'linear-gradient(160deg,#faecb4 0%,#ecce78 42%,#d3ab44 100%)',
    text: '#3a2e0a',
    sil: 'rgba(58,46,10,0.22)',
  },
]

export const nivelDe = (overall: number): Nivel =>
  [...NIVELES].reverse().find((n) => overall >= n.desde) ?? NIVELES[0]

/** Cuánto le falta para el siguiente nivel (null si ya está en el máximo). */
export const siguienteNivel = (overall: number): { nivel: Nivel; faltan: number } | null => {
  const sig = NIVELES.find((n) => overall < n.desde)
  return sig ? { nivel: sig, faltan: sig.desde - overall } : null
}
