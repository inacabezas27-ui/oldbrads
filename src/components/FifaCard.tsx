import { esNivelMaximo, nivelDe } from '../lib/jugadorAuth'
import { nombreCompleto, posicionAbrev, type Jugador } from '../lib/types'
import Crest from './Crest'

// La carta sube de material con la media: bronce -> plata (71) -> oro (83) ->
// leyenda (95). En el último nivel la foto de perfil se cambia por una en
// pleno partido, si es que hay: es el premio que se ve de lejos.
//
// El metal del nivel enmarca; detrás del jugador van siempre los colores del
// club. Así la carta se reconoce como Old Brads de lejos y el nivel se lee
// igual de rápido, sin que uno se coma al otro.

/** Medidas de la carta chica. Se exportan para que quien la coloque reserve
 *  el espacio exacto: si el contenedor es más angosto, la carta se desborda
 *  y tapa lo que tenga al lado. */
export const MINI_ANCHO = 78
export const MINI_ALTO = Math.round(MINI_ANCHO / 0.7)

/** El panel del club arranca en diagonal: es lo que le da forma de carta y no
 *  de foto con marco. */
const CORTE = 'polygon(0 13%, 100% 0%, 100% 100%, 0% 100%)'

function Silueta({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" className="h-full w-full">
      <circle cx="50" cy="30" r="16" fill={color} />
      <path d="M16 100 C16 68 33 56 50 56 C67 56 84 68 84 100 Z" fill={color} />
    </svg>
  )
}

export default function FifaCard({
  j,
  onClick,
  mini = false,
  dt = false,
}: {
  j: Jugador
  onClick?: () => void
  mini?: boolean
  dt?: boolean
}) {
  const overall = j.carta_overall ?? 70
  const t = nivelDe(overall)
  // En la polera va solo el número, así que el nombre de la carta es el apodo
  // con el que lo llama el equipo. Si no puso ninguno, el apellido.
  const apellido = (j.apodo || j.apellido_paterno || nombreCompleto(j)).toUpperCase()
  const pos = dt ? 'DT' : posicionAbrev(j.posicion)
  const foto = (esNivelMaximo(overall) ? j.foto_accion_url : null) || j.foto_url

  const altoPlaca = mini ? 13 : 24

  return (
    <button
      onClick={onClick}
      className={`group relative block ${onClick ? 'cursor-pointer transition hover:-translate-y-1' : 'cursor-default'}`}
      style={{ width: mini ? MINI_ANCHO : '100%', maxWidth: mini ? MINI_ANCHO : 180, aspectRatio: '0.70' }}
    >
      <div
        className="relative h-full w-full overflow-hidden shadow-lg ring-1 ring-black/20"
        style={{ background: t.bg, color: t.text, borderRadius: mini ? 7 : 12 }}
      >
        {/* Brillo del metal, arriba */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(130% 55% at 50% 0%, rgba(255,255,255,0.30), transparent 62%)' }}
        />

        {/* Panel del club: el fondo contra el que se recorta el jugador */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ top: mini ? '22%' : '24%', background: t.panel, clipPath: CORTE }}
        />

        {/* Jugador */}
        <div
          className="absolute inset-x-0 overflow-hidden"
          style={{ top: mini ? '20%' : '22%', bottom: altoPlaca }}
        >
          {foto ? (
            <img src={foto} alt={apellido} className="h-full w-full object-cover object-top" />
          ) : (
            <Silueta color={t.sil} />
          )}
        </div>

        {/* Media, posición y escudo, sobre el metal */}
        <div
          className="absolute left-0 top-0 flex flex-col items-center leading-none"
          style={{ padding: mini ? '3px 5px' : '8px 10px' }}
        >
          <span className="font-black" style={{ fontSize: mini ? '1.05rem' : '2rem', letterSpacing: '-0.02em' }}>
            {overall}
          </span>
          <span
            className="font-black tracking-widest"
            style={{ fontSize: mini ? '0.46rem' : '0.7rem', marginTop: mini ? 1 : 2 }}
          >
            {pos}
          </span>
          {!mini && (
            <>
              <div className="my-1.5 h-px w-4" style={{ background: t.text, opacity: 0.45 }} />
              <Crest size={20} />
            </>
          )}
        </div>

        {/* Nombre: placa maciza en azul del club con la tinta del metal, que es
            la única forma de que se lea con una foto detrás. */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 overflow-hidden px-1"
          style={{
            height: altoPlaca,
            background: t.placa,
            color: t.placaTexto,
            borderTop: `${mini ? 1 : 2}px solid ${t.filo}`,
          }}
        >
          <span
            className="truncate font-black uppercase"
            style={{ fontSize: mini ? '0.5rem' : '0.82rem', letterSpacing: mini ? '0.02em' : '0.05em' }}
          >
            {mini ? apellido.split(' ')[0] : apellido}
          </span>
          {!mini && j.numero_camiseta != null && (
            <span className="shrink-0 font-bold opacity-70" style={{ fontSize: '0.6rem' }}>
              {j.numero_camiseta}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
