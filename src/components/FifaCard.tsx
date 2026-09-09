import { nivelDe } from '../lib/jugadorAuth'
import { nombreCompleto, posicionAbrev, type Jugador } from '../lib/types'
import Crest from './Crest'

// La carta sube de material con la media: bronce -> plata (78) -> oro (88).

/** Medidas de la carta chica. Se exportan para que quien la coloque reserve
 *  el espacio exacto: si el contenedor es más angosto, la carta se desborda
 *  y tapa lo que tenga al lado. */
export const MINI_ANCHO = 78
export const MINI_ALTO = Math.round(MINI_ANCHO / 0.7)

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
  const apellido = (j.apellido_paterno || nombreCompleto(j)).toUpperCase()
  const pos = dt ? 'DT' : posicionAbrev(j.posicion)

  return (
    <button
      onClick={onClick}
      className={`group relative block ${onClick ? 'cursor-pointer transition hover:-translate-y-1' : 'cursor-default'}`}
      style={{ width: mini ? MINI_ANCHO : '100%', maxWidth: mini ? MINI_ANCHO : 180, aspectRatio: '0.70' }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-[12px] shadow-lg ring-1 ring-black/15"
        style={{ background: t.bg, color: t.text }}
      >
        {/* brillo superior */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.22), transparent 60%)' }} />

        {/* Silueta / foto */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: '80%' }}>
          {j.foto_url ? (
            <img src={j.foto_url} alt={apellido} className="h-full w-full object-cover object-top" />
          ) : (
            <Silueta color={t.sil} />
          )}
        </div>

        {/* OVR / POS / escudo */}
        <div className="absolute left-0 top-0 flex flex-col items-center" style={{ padding: mini ? '4px 5px' : '9px 10px' }}>
          <span className="font-black leading-none" style={{ fontSize: mini ? '1.05rem' : '2rem' }}>{overall}</span>
          <span className="font-black leading-none tracking-wide" style={{ fontSize: mini ? '0.5rem' : '0.78rem', marginTop: mini ? 1 : 3 }}>{pos}</span>
          {!mini && <div className="my-1 h-px w-5" style={{ background: t.text, opacity: 0.4 }} />}
          {!mini && <Crest size={22} />}
        </div>

        {/* Nombre */}
        <div
          className="absolute inset-x-0 bottom-0 truncate text-center font-black uppercase tracking-wide"
          style={{
            fontSize: mini ? '0.52rem' : '0.85rem',
            padding: mini ? '2px 3px' : '4px 6px',
            borderTop: `1px solid ${t.text}`,
            background: 'rgba(255,255,255,0.16)',
          }}
        >
          {mini ? apellido.split(' ')[0] : apellido}
          {!mini && j.numero_camiseta ? <span className="ml-1" style={{ fontSize: '0.62rem' }}>#{j.numero_camiseta}</span> : null}
        </div>
      </div>
    </button>
  )
}
