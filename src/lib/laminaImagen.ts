import { NIVELES, nivelDe } from './jugadorAuth'
import { nombreCompleto, posicionAbrev, type Jugador } from './types'

/**
 * Las cartas del plantel como archivo: PDF o imagen, dibujadas en código.
 *
 * El botón baja el archivo solo. No se pasa por el diálogo de impresión del
 * navegador porque ahí el resultado depende de la casilla de gráficos de
 * fondo, de cómo pagine cada equipo y de si las fotos alcanzaron a cargar:
 * por eso las cartas salían vacías. Acá se dibuja todo sobre un lienzo, con
 * las fotos ya cargadas, y sale el mismo archivo siempre.
 *
 * El PDF se arma a mano con una imagen por página. Es poco código y evita
 * sumar una librería al bundle, que ya pasa el megabyte.
 */

const NAVY = '#0C244C'
const VERDE = '#066B51'
const ORO = '#ECB52B'

/* A4 a 150 ppp: suficiente para imprimir y para verlo en el teléfono. */
const PAG_W = 1240
const PAG_H = 1754
const MARGEN = 56
const COLS = 5
const FILAS = 4
const HUECO = 18
const PIE_NOMBRE = 20
const CARTA_W = Math.floor((PAG_W - MARGEN * 2 - HUECO * (COLS - 1)) / COLS)
const CARTA_H = Math.round(CARTA_W / 0.7)
const CABECERA = 128

/** Saca los colores de un `linear-gradient(...)`: fillStyle no los entiende. */
function paradas(grad: string): { color: string; en: number }[] {
  const m = [...grad.matchAll(/(#[0-9a-f]{3,8})\s*([\d.]+)?%?/gi)]
  if (!m.length) return [{ color: '#999', en: 0 }, { color: '#555', en: 1 }]
  return m.map((x, i) => ({
    color: x[1],
    en: x[2] !== undefined ? Number(x[2]) / 100 : i / Math.max(1, m.length - 1),
  }))
}

function degradado(c: CanvasRenderingContext2D, def: string, x0: number, y0: number, x1: number, y1: number) {
  const g = c.createLinearGradient(x0, y0, x1, y1)
  for (const p of paradas(def)) g.addColorStop(Math.min(1, Math.max(0, p.en)), p.color)
  return g
}

function rectRedondo(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/** Carga la foto permitiendo dibujarla sin ensuciar el lienzo. */
function cargarFoto(url: string): Promise<HTMLImageElement | null> {
  return new Promise((listo) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    let resuelto = false
    const fin = (v: HTMLImageElement | null) => { if (!resuelto) { resuelto = true; listo(v) } }
    img.onload = () => fin(img)
    img.onerror = () => fin(null)
    img.src = url
    setTimeout(() => fin(null), 8000)
  })
}

function silueta(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  const k = Math.min(w, h) / 100
  const cx = x + w / 2
  const base = y + h
  c.fillStyle = color
  c.beginPath(); c.arc(cx, base - 70 * k, 16 * k, 0, Math.PI * 2); c.fill()
  c.beginPath()
  c.moveTo(cx - 34 * k, base)
  c.bezierCurveTo(cx - 34 * k, base - 32 * k, cx - 17 * k, base - 44 * k, cx, base - 44 * k)
  c.bezierCurveTo(cx + 17 * k, base - 44 * k, cx + 34 * k, base - 32 * k, cx + 34 * k, base)
  c.closePath(); c.fill()
}

function dibujarCarta(c: CanvasRenderingContext2D, j: Jugador, x: number, y: number, foto: HTMLImageElement | null) {
  const overall = j.carta_overall ?? 70
  const t = nivelDe(overall)
  const w = CARTA_W, h = CARTA_H
  const placaH = Math.round(h * 0.105)

  c.save()
  rectRedondo(c, x, y, w, h, 13)
  c.clip()

  c.fillStyle = degradado(c, t.bg, x, y, x + w * 0.34, y + h)
  c.fillRect(x, y, w, h)

  const br = c.createRadialGradient(x + w / 2, y, 0, x + w / 2, y, w * 0.95)
  br.addColorStop(0, 'rgba(255,255,255,0.28)')
  br.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = br
  c.fillRect(x, y, w, h * 0.6)

  // Panel del club con el corte en diagonal
  c.fillStyle = degradado(c, t.panel, x, y + h * 0.24, x, y + h)
  c.beginPath()
  c.moveTo(x, y + h * 0.24 + h * 0.13)
  c.lineTo(x + w, y + h * 0.24)
  c.lineTo(x + w, y + h)
  c.lineTo(x, y + h)
  c.closePath(); c.fill()

  // Jugador
  const jy = y + h * 0.22
  const jh = h - placaH - h * 0.22
  if (foto) {
    const k = Math.max(w / foto.width, jh / foto.height)
    const fw = foto.width * k, fh = foto.height * k
    c.save(); c.beginPath(); c.rect(x, jy, w, jh); c.clip()
    c.drawImage(foto, x + (w - fw) / 2, jy, fw, fh)
    c.restore()
  } else {
    silueta(c, x, jy, w, jh, t.sil)
  }

  // Media, posición y sello
  c.fillStyle = t.text
  c.textAlign = 'center'
  c.font = `900 ${Math.round(h * 0.145)}px Arial, Helvetica, sans-serif`
  c.fillText(String(overall), x + w * 0.165, y + h * 0.125)
  c.font = `900 ${Math.round(h * 0.047)}px Arial, Helvetica, sans-serif`
  c.fillText(posicionAbrev(j.posicion) || (j.es_dt ? 'DT' : ''), x + w * 0.165, y + h * 0.175)
  c.globalAlpha = 0.45
  c.fillRect(x + w * 0.125, y + h * 0.198, w * 0.08, 1.5)
  c.globalAlpha = 1
  c.beginPath(); c.arc(x + w * 0.165, y + h * 0.245, h * 0.028, 0, Math.PI * 2)
  c.fillStyle = NAVY; c.fill()
  c.lineWidth = 2; c.strokeStyle = ORO; c.stroke()

  // Placa del nombre
  c.fillStyle = t.placa
  c.fillRect(x, y + h - placaH, w, placaH)
  c.fillStyle = t.filo
  c.fillRect(x, y + h - placaH, w, 2.5)
  c.fillStyle = t.placaTexto
  c.font = `900 ${Math.round(h * 0.052)}px Arial, Helvetica, sans-serif`
  const etiqueta = (j.apodo || j.apellido_paterno || nombreCompleto(j)).toUpperCase()
  let txt = etiqueta
  while (c.measureText(txt).width > w - 34 && txt.length > 3) txt = txt.slice(0, -1)
  const numero = j.numero_camiseta != null ? String(j.numero_camiseta) : ''
  // El ancho del apodo se mide con SU fuente, antes de cambiarla para el número.
  const anchoApodo = c.measureText(txt).width
  const corrimiento = numero ? 11 : 0
  c.fillText(txt, x + w / 2 - corrimiento, y + h - placaH * 0.3)
  if (numero) {
    c.globalAlpha = 0.7
    c.font = `700 ${Math.round(h * 0.038)}px Arial, Helvetica, sans-serif`
    c.textAlign = 'left'
    c.fillText(numero, x + w / 2 - corrimiento + anchoApodo / 2 + 7, y + h - placaH * 0.32)
    c.textAlign = 'center'
    c.globalAlpha = 1
  }
  c.restore()
}

function cabecera(c: CanvasRenderingContext2D, total: number, resumen: string, pagina: number, paginas: number) {
  c.fillStyle = NAVY
  c.textAlign = 'left'
  c.font = '900 34px Arial, Helvetica, sans-serif'
  c.fillText('OLD BRADS · CARTAS DEL PLANTEL', MARGEN, MARGEN + 34)
  c.fillStyle = '#64748b'
  c.font = '500 17px Arial, Helvetica, sans-serif'
  const hoy = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  c.fillText(`Al ${hoy} · ${total} cartas · ${resumen}`, MARGEN, MARGEN + 62)
  if (paginas > 1) {
    c.textAlign = 'right'
    c.fillText(`Página ${pagina} de ${paginas}`, PAG_W - MARGEN, MARGEN + 62)
    c.textAlign = 'left'
  }
  const anchoFranja = (PAG_W - MARGEN * 2) / 3
  ;[NAVY, VERDE, ORO].forEach((col, i) => {
    c.fillStyle = col
    c.fillRect(MARGEN + i * anchoFranja, MARGEN + 80, anchoFranja, 5)
  })
}

/** Dibuja una página y devuelve su lienzo. */
function paginaLienzo(
  grupo: Jugador[], fotos: (HTMLImageElement | null)[], total: number, resumen: string,
  pagina: number, paginas: number,
): HTMLCanvasElement {
  const lienzo = document.createElement('canvas')
  lienzo.width = PAG_W
  lienzo.height = PAG_H
  const c = lienzo.getContext('2d')!
  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, PAG_W, PAG_H)
  cabecera(c, total, resumen, pagina, paginas)

  grupo.forEach((j, i) => {
    const col = i % COLS
    const fila = Math.floor(i / COLS)
    const x = MARGEN + col * (CARTA_W + HUECO)
    const y = CABECERA + fila * (CARTA_H + HUECO + PIE_NOMBRE)
    dibujarCarta(c, j, x, y, fotos[i])
    c.fillStyle = '#475569'
    c.textAlign = 'center'
    c.font = '600 13px Arial, Helvetica, sans-serif'
    let n = nombreCompleto(j)
    while (c.measureText(n).width > CARTA_W + 10 && n.length > 4) n = n.slice(0, -1)
    c.fillText(n, x + CARTA_W / 2, y + CARTA_H + 16)
  })

  c.fillStyle = '#94a3b8'
  c.textAlign = 'left'
  c.font = '500 13px Arial, Helvetica, sans-serif'
  c.fillText('Old Brads · Bradford Alumni Football Club · La media se calcula sola con lo que pasa en los partidos.',
    MARGEN, PAG_H - MARGEN)
  return lienzo
}

async function armarPaginas(jugadores: Jugador[]) {
  const orden = [...jugadores].sort(
    (a, b) => (b.carta_overall ?? 0) - (a.carta_overall ?? 0) || nombreCompleto(a).localeCompare(nombreCompleto(b)),
  )
  const fotos = await Promise.all(orden.map((j) => (j.foto_url ? cargarFoto(j.foto_url) : Promise.resolve(null))))
  const resumen = NIVELES.map((n) => ({
    nombre: n.nombre,
    cuantos: orden.filter((j) => nivelDe(j.carta_overall ?? 0).nombre === n.nombre).length,
  })).filter((n) => n.cuantos > 0).reverse().map((n) => `${n.cuantos} ${n.nombre.toLowerCase()}`).join(' · ')

  const porPagina = COLS * FILAS
  const paginas = Math.max(1, Math.ceil(orden.length / porPagina))
  const lienzos: HTMLCanvasElement[] = []
  for (let p = 0; p < paginas; p++) {
    const desde = p * porPagina
    lienzos.push(paginaLienzo(
      orden.slice(desde, desde + porPagina), fotos.slice(desde, desde + porPagina),
      orden.length, resumen, p + 1, paginas,
    ))
  }
  return lienzos
}

const bytesDeJpeg = (lienzo: HTMLCanvasElement): Uint8Array => {
  const b64 = lienzo.toDataURL('image/jpeg', 0.92).split(',')[1]
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** PDF mínimo: una página A4 por lienzo, con la imagen ocupándola entera. */
function construirPDF(paginas: { datos: Uint8Array; w: number; h: number }[]): Blob {
  const A4_W = 595.28, A4_H = 841.89
  const trozos: (string | Uint8Array)[] = []
  const desplazamientos: number[] = []
  let largo = 0
  const texto = (s: string) => { trozos.push(s); largo += s.length }
  const crudo = (b: Uint8Array) => { trozos.push(b); largo += b.length }
  const objeto = (n: number) => { desplazamientos[n] = largo }

  const nObjetos = 2 + paginas.length * 3
  texto('%PDF-1.4\n')

  objeto(1); texto('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  const idsPagina = paginas.map((_, i) => 3 + i * 3)
  objeto(2)
  texto(`2 0 obj\n<< /Type /Pages /Kids [${idsPagina.map((i) => `${i} 0 R`).join(' ')}] /Count ${paginas.length} >>\nendobj\n`)

  paginas.forEach((p, i) => {
    const idPag = 3 + i * 3, idCont = idPag + 1, idImg = idPag + 2
    objeto(idPag)
    texto(`${idPag} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] ` +
      `/Resources << /XObject << /Im0 ${idImg} 0 R >> >> /Contents ${idCont} 0 R >>\nendobj\n`)
    const flujo = `q\n${A4_W} 0 0 ${A4_H} 0 0 cm\n/Im0 Do\nQ\n`
    objeto(idCont)
    texto(`${idCont} 0 obj\n<< /Length ${flujo.length} >>\nstream\n${flujo}endstream\nendobj\n`)
    objeto(idImg)
    texto(`${idImg} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.datos.length} >>\nstream\n`)
    crudo(p.datos)
    texto('\nendstream\nendobj\n')
  })

  const inicioXref = largo
  let xref = `xref\n0 ${nObjetos + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= nObjetos; i++) xref += `${String(desplazamientos[i] ?? 0).padStart(10, '0')} 00000 n \n`
  texto(xref)
  texto(`trailer\n<< /Size ${nObjetos + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`)

  const partes = trozos.map((t) => (typeof t === 'string' ? new TextEncoder().encode(t) : t))
  return new Blob(partes as BlobPart[], { type: 'application/pdf' })
}

function bajar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

const hoyArchivo = () => new Date().toISOString().slice(0, 10)

/** El PDF con todas las cartas, descargado directo. */
export async function descargarLaminaPDF(jugadores: Jugador[]) {
  const lienzos = await armarPaginas(jugadores)
  const paginas = lienzos.map((l) => ({ datos: bytesDeJpeg(l), w: l.width, h: l.height }))
  bajar(construirPDF(paginas), `Cartas Old Brads ${hoyArchivo()}.pdf`)
}

/** La misma lámina como imagen, para pegarla en el grupo. */
export async function descargarLaminaCartas(jugadores: Jugador[]) {
  const lienzos = await armarPaginas(jugadores)
  // Las páginas van una debajo de otra, en una sola imagen.
  const total = document.createElement('canvas')
  total.width = PAG_W
  total.height = PAG_H * lienzos.length
  const c = total.getContext('2d')!
  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, total.width, total.height)
  lienzos.forEach((l, i) => c.drawImage(l, 0, i * PAG_H))
  total.toBlob((b) => { if (b) bajar(b, `Cartas Old Brads ${hoyArchivo()}.png`) }, 'image/png')
}
