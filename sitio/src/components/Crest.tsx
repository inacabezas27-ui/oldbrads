import { useId, useState } from 'react'

/** Escudo Old Brads. Usa el logo oficial (/img/logo.png) si existe;
 *  si no, muestra una recreación en vector (azul marino · verde · dorado). */
export default function Crest({ size = 48, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const [useReal, setUseReal] = useState(true)

  if (useReal) {
    return (
      <img
        src="/img/logo.png"
        width={size}
        height={size}
        alt="Old Brads"
        className={className}
        style={{ objectFit: 'cover', borderRadius: '50%', display: 'block' }}
        onError={() => setUseReal(false)}
      />
    )
  }

  const top = `ringTop-${id}`
  const bot = `ringBot-${id}`
  const shield = `shield-${id}`
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} role="img" aria-label="Escudo Old Brads">
      <defs>
        <path id={top} d="M100,100 m-82,0 a82,82 0 1,1 164,0" />
        <path id={bot} d="M100,100 m82,0 a82,82 0 1,1 -164,0" />
        <clipPath id={shield}><circle cx="100" cy="104" r="52" /></clipPath>
      </defs>
      <circle cx="100" cy="100" r="94" fill="#0a1b3a" stroke="#efb937" strokeWidth="4" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="#efb937" strokeWidth="1" opacity="0.45" />
      <text fontFamily="Oswald, system-ui, sans-serif" fontSize="15" fontWeight="700" letterSpacing="2" fill="#f5c542">
        <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">OLD BRADS</textPath>
      </text>
      <text fontFamily="Oswald, system-ui, sans-serif" fontSize="8.5" fontWeight="500" letterSpacing="1.2" fill="#efb937">
        <textPath href={`#${bot}`} startOffset="50%" textAnchor="middle">BRADFORD ALUMNI FOOTBALL CLUB</textPath>
      </text>
      <g clipPath={`url(#${shield})`}>
        <rect x="48" y="52" width="104" height="104" fill="#0f2a4d" />
        <rect x="48" y="52" width="14" height="104" fill="#1f8a4c" />
        <rect x="76" y="52" width="14" height="104" fill="#1f8a4c" />
        <rect x="104" y="52" width="14" height="104" fill="#1f8a4c" />
        <rect x="132" y="52" width="14" height="104" fill="#1f8a4c" />
      </g>
      <circle cx="100" cy="104" r="52" fill="none" stroke="#efb937" strokeWidth="2.5" />
    </svg>
  )
}
