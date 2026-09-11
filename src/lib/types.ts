export type Jugador = {
  id: string
  numero_lista: number | null
  apellido_paterno: string
  apellido_materno: string | null
  nombres: string
  rut: string | null
  fecha_nacimiento: string | null
  profesion: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  comuna: string | null
  ex_profesional: boolean
  talla_polera: string | null
  talla_short: string | null
  numero_camiseta: number | null
  posicion: string | null
  /** Como le dice el equipo. Es el nombre que sale en la carta. */
  apodo?: string | null
  grupo_wsp: string | null
  activo: boolean
  created_at: string
  carta_overall: number | null
  carta_ritmo: number | null
  carta_tiro: number | null
  carta_pase: number | null
  carta_regate: number | null
  carta_defensa: number | null
  carta_fisico: number | null
  foto_url: string | null
  /** Foto en pleno partido: se usa recién cuando la carta llega al último nivel. */
  foto_accion_url?: string | null
  es_dt?: boolean
  pos_formacion?: string | null
}

export const posicionAbrev = (posicion: string | null): string => {
  const p = (posicion ?? '').toLowerCase()
  if (p.includes('arquero')) return 'POR'
  if (p.includes('defensa') || p.includes('central') || p.includes('lateral')) return 'DEF'
  if (p.includes('delantero') || p.includes('extremo')) return 'DEL'
  if (p.includes('medio')) return 'MED'
  return 'MED'
}

export type TipoCobro = 'cuota' | 'extra'

export type Cobro = {
  id: string
  nombre: string
  tipo: TipoCobro
  periodo: string | null
  monto: number
  fecha: string
  created_at: string
}

export type Pago = {
  id: string
  cobro_id: string
  jugador_id: string
  monto: number
  pagado: boolean
  fecha_pago: string | null
  metodo: string | null
  nota: string | null
  created_at: string
}

export type TipoMovimiento = 'ingreso' | 'egreso'

export type MovimientoCaja = {
  id: string
  tipo: TipoMovimiento
  categoria: string
  descripcion: string | null
  monto: number
  fecha: string
  created_at: string
}

export const CATEGORIAS_CAJA: Record<TipoMovimiento, string[]> = {
  ingreso: ['Auspicio', 'Abono liga', 'Poleras', 'Rifa', 'Otro'],
  egreso: ['Pago liga', 'Poleras', 'Arbitraje', 'Insumos', 'Cancha', 'Otro'],
}

export type CuotaLiga = {
  id: string
  orden: number
  nombre: string
  periodo: string | null
  fecha_venc: string | null
  monto: number
  pagada: boolean
  fecha_pago: string | null
  nota: string | null
  created_at: string
}

export type Temporada = {
  id: string
  orden: number
  nombre: string
  anio: number | null
  semestre: number | null
  pj: number
  g: number
  e: number
  p: number
  gf: number
  gc: number
  puntos: number
  posicion: number | null
  resultado: string | null
  notas: string | null
  created_at: string
}

export type Premio = {
  id: string
  temporada_id: string | null
  categoria: string
  ganador: string
  detalle: string | null
  tipo: string | null
  orden: number
  created_at: string
}

export type Goleador = {
  id: string
  nombre: string
  goles: number
  temporada_id: string | null
  created_at: string
}

/** Va, no va, en duda o lesionado. null = todavía no responde. */
export type Confirmacion = 'si' | 'no' | 'duda' | 'lesionado' | null

export const CONFIRMACIONES: { valor: Exclude<Confirmacion, null>; label: string; icono: string }[] = [
  { valor: 'si', label: 'Va', icono: '✅' },
  { valor: 'duda', label: 'En duda', icono: '❓' },
  { valor: 'lesionado', label: 'Lesionado', icono: '🤕' },
  { valor: 'no', label: 'No va', icono: '❌' },
]

/** El partido avanza en este orden y no se salta pasos. */
export type EstadoPartido = 'citacion' | 'jugado' | 'votacion' | 'cerrado'

export type Partido = {
  id: string
  temporada_id: string | null
  fecha: string | null
  hora: string | null
  rival: string
  cancha: string | null
  es_local: boolean
  fase: string
  goles_favor: number | null
  goles_contra: number | null
  estado: EstadoPartido
  /** Jueves 13:00 previo: último plazo para decir si vas. null = sin plazo. */
  cierre_confirmacion: string | null
  /** Martes 21:00 posterior: la votación se cierra sola. null = sin plazo. */
  cierre_votacion: string | null
  mvp_jugador_id: string | null
  notas: string | null
  created_at: string
}

export type PartidoJugador = {
  id: string
  partido_id: string
  jugador_id: string
  citado: boolean
  jugo: boolean
  titular: boolean
  goles: number
  asistencias: number
  puntos_voto: number
  puntos_extra: number
  /** null = sin registrar · true = fue · false = no llegó. */
  asistio: boolean | null
  /** null = sin registrar · true = a la hora · false = llegó tarde. */
  puntual: boolean | null
  /** Lo que le debe al equipo por faltar o llegar tarde (una promo, etc.). */
  sancion: string | null
  sancion_cumplida: boolean
  /** Se puso cuando venció el plazo y no había respondido. No se revierte. */
  pen_sin_responder: boolean
  /** Fue al partido y no votó antes del martes a las 21:00. No se revierte. */
  pen_sin_votar: boolean
  /** Lo responde el jugador o lo marca la directiva durante la citación. */
  confirmado: Confirmacion
  confirmado_at: string | null
  created_at: string
}

/** Primer nombre + apellido paterno. Para tablas donde el nombre completo no cabe. */
export const nombreCorto = (j: Pick<Jugador, 'nombres' | 'apellido_paterno'>) =>
  `${(j.nombres ?? '').split(' ')[0]} ${j.apellido_paterno ?? ''}`.trim()

export const nombreCompleto = (j: Pick<Jugador, 'nombres' | 'apellido_paterno' | 'apellido_materno'>) =>
  `${j.nombres} ${j.apellido_paterno}${j.apellido_materno ? ' ' + j.apellido_materno : ''}`.trim()

/* ================= Encuestas ================= */
export type TipoPregunta = 'jugador' | 'opciones' | 'texto' | 'escala'

export type Encuesta = {
  id: string
  titulo: string
  descripcion: string | null
  tipo: string
  estado: 'borrador' | 'abierta' | 'cerrada'
  anonima: boolean
  cierra_el: string | null
  created_at: string
}

export type EncuestaPregunta = {
  id: string
  encuesta_id: string
  orden: number
  texto: string
  tipo: TipoPregunta
  opciones: string[]
  obligatoria: boolean
}

export type EncuestaRespuesta = {
  id: string
  encuesta_id: string
  pregunta_id: string
  user_id: string | null
  jugador_elegido: string | null
  opcion: string | null
  texto: string | null
  numero: number | null
  created_at: string
}

/** Ficha del jugador tal como la pide la liga. */
export type MisDatosFicha = {
  id: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  rut: string | null
  fecha_nacimiento: string | null
  profesion: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  comuna: string | null
  talla_polera: string | null
  talla_short: string | null
  numero_camiseta: number | null
  posicion: string | null
  apodo: string | null
}

export const POSICIONES = ['Arquero', 'Defensa central', 'Lateral', 'Mediocampista', 'Extremo', 'Delantero'] as const
export const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

/** La economía de la carta, editable desde la base (tabla ajustes_carta). */
export type AjustesCarta = {
  id: number
  base: number
  tope: number
  pts_asistir: number
  pts_puntual: number
  pts_gol: number
  pts_asistencia: number
  pts_voto: number
  pts_extra: number
  /** Al DT lo miden los resultados del equipo, no las estadísticas personales. */
  /** Ser titular pesa igual que ir o llegar a la hora. */
  pts_titular: number
  /** El resultado es de todos los que jugaron, no solo de los que marcaron. */
  pts_victoria: number
  pts_empate: number
  /** Arco en cero: lo gana todo el equipo, y el arquero se lleva un plus. */
  pts_valla: number
  pts_valla_arquero: number
  /** Cumplir con el equipo desde la plataforma. */
  pts_responde: number
  pts_vota: number
  pts_encuesta: number
  pts_cuotas_al_dia: number
  /** El podio de la votación, estilo Balón de Oro. */
  pts_voto_1: number
  pts_voto_2: number
  pts_voto_3a5: number
  pts_dt_victoria: number
  pts_dt_empate: number
  /** Penalizaciones: se guardan en positivo y la fórmula las descuenta. */
  pen_no_fue: number
  pen_atraso: number
  pen_cuota: number
  /** No marcar si vas antes del jueves 13:00. */
  pen_no_responde: number
  /** Fuiste al partido y no votaste antes del martes 21:00. */
  pen_no_vota: number
  dias_gracia_cuota: number
  /** La media no baja de aquí por muchas penalizaciones que haya. */
  piso: number
}
