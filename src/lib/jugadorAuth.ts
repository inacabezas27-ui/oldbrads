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

/* ---- Niveles de la carta ----
   La temporada son 12 fechas y todos parten en bronce (45). Yendo a todas y
   siempre a la hora se llega a plata; siendo además titular, a oro. El último
   nivel pide aportar en la cancha y que los compañeros te voten: son pocos, y
   esa es la gracia. */
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
    desde: 65,
    bg: 'linear-gradient(160deg,#f2f4f7 0%,#cfd6e2 45%,#9aa6b8 100%)',
    text: '#26303f',
    sil: 'rgba(38,48,63,0.20)',
  },
  {
    nombre: 'Oro',
    desde: 83,
    bg: 'linear-gradient(160deg,#faecb4 0%,#ecce78 42%,#d3ab44 100%)',
    text: '#3a2e0a',
    sil: 'rgba(58,46,10,0.22)',
  },
  {
    nombre: 'Leyenda',
    desde: 95,
    bg: 'linear-gradient(160deg,#2a3b63 0%,#111d36 45%,#05090f 100%)',
    text: '#f0cf7c',
    sil: 'rgba(240,207,124,0.20)',
  },
]

export const nivelDe = (overall: number): Nivel =>
  [...NIVELES].reverse().find((n) => overall >= n.desde) ?? NIVELES[0]

/** El último nivel cambia la foto: de la de perfil a una en pleno partido. */
export const esNivelMaximo = (overall: number) => overall >= NIVELES[NIVELES.length - 1].desde

/** Cuánto le falta para el siguiente nivel (null si ya está en el máximo). */
export const siguienteNivel = (overall: number): { nivel: Nivel; faltan: number } | null => {
  const sig = NIVELES.find((n) => overall < n.desde)
  return sig ? { nivel: sig, faltan: sig.desde - overall } : null
}
