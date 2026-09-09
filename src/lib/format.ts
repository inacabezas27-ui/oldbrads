export const clp = (n: number | null | undefined) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n ?? 0)

export const num = (n: number | null | undefined) =>
  new Intl.NumberFormat('es-CL').format(n ?? 0)

export const fecha = (s: string | null | undefined) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** "2026-03" -> "Marzo 2026" */
export const periodoLabel = (periodo: string | null | undefined) => {
  if (!periodo) return ''
  const [y, m] = periodo.split('-')
  const idx = parseInt(m, 10) - 1
  return `${MESES[idx] ?? m} ${y}`
}

export const hoyISO = () => new Date().toISOString().slice(0, 10)

/** Mes actual como "2026-03" */
export const periodoActual = () => new Date().toISOString().slice(0, 7)

export { MESES }
