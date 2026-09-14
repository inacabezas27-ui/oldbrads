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

/* ---- Niveles de la carta ----
   Todos parten en 60, como una carta de verdad, y el tope es 99. La fecha
   cumplida entera vale un punto, así que la escalera se sube jugando: yendo a
   todas y cumpliendo se llega a plata, siendo además titular a oro, y leyenda
   pide goles, asistencias y que los compañeros te voten. */
export type Nivel = {
  nombre: string
  desde: number
  /** El metal del nivel. Es el marco de la carta, no el fondo del jugador. */
  bg: string
  /** Tinta sobre el metal: la media, la posición, el escudo. */
  text: string
  /** Detrás del jugador van los colores del club, iguales en los cuatro
   *  niveles. Sobre ese fondo oscuro el recorte se apoya parejo y el nombre
   *  se lee; el metal queda enmarcando, que es lo que distingue al nivel. */
  panel: string
  /** Silueta de quien todavía no tiene foto. */
  sil: string
  /** Placa del nombre: fondo y tinta. Máximo contraste, a propósito. */
  placa: string
  placaTexto: string
  /** Filo metálico que separa la placa de la foto. */
  filo: string
}

const CLUB = 'linear-gradient(180deg,#14325c 0%,#0c244c 46%,#04503c 100%)'

export const NIVELES: Nivel[] = [
  {
    nombre: 'Bronce',
    desde: 0,
    bg: 'linear-gradient(160deg,#f0d6b2 0%,#c98f52 46%,#8d5a23 100%)',
    text: '#3c2410',
    panel: CLUB,
    sil: 'rgba(240,214,178,0.22)',
    placa: '#0c244c',
    placaTexto: '#f0d6b2',
    filo: '#c98f52',
  },
  {
    nombre: 'Plata',
    desde: 71,
    bg: 'linear-gradient(160deg,#f7f9fc 0%,#cfd6e2 46%,#8e9bb0 100%)',
    text: '#26303f',
    panel: CLUB,
    sil: 'rgba(247,249,252,0.22)',
    placa: '#0c244c',
    placaTexto: '#f2f5fa',
    filo: '#cfd6e2',
  },
  {
    nombre: 'Oro',
    desde: 83,
    bg: 'linear-gradient(160deg,#fdf0bd 0%,#ecce78 44%,#c79a33 100%)',
    text: '#3a2e0a',
    panel: CLUB,
    sil: 'rgba(253,240,189,0.22)',
    placa: '#0c244c',
    placaTexto: '#fbe9a8',
    filo: '#ecce78',
  },
  {
    // El nivel máximo se sale del metal: azul profundo y dorado, como las
    // cartas del equipo del año.
    nombre: 'Leyenda',
    desde: 95,
    bg: 'linear-gradient(160deg,#35508c 0%,#132247 46%,#050b16 100%)',
    text: '#f0cf7c',
    panel: 'linear-gradient(180deg,#1b2a4a 0%,#0a1224 55%,#05090f 100%)',
    sil: 'rgba(240,207,124,0.22)',
    placa: '#f0cf7c',
    placaTexto: '#0a1224',
    filo: '#f0cf7c',
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
