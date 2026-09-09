/**
 * Certificado oficial de Old Brads, pensado para imprimirse en A4 horizontal.
 * Una hoja por premio. Los tamaños van en milímetros para que lo que se ve en
 * pantalla sea exactamente lo que sale de la impresora.
 */
const NAVY = '#0c244c'
const VERDE = '#046c54'
const ORO = '#ecb42c'

/** Timbre circular, girado como si lo hubieran estampado a mano. */
function Timbre({ codigo }: { codigo: string }) {
  return (
    <svg viewBox="0 0 200 200" width="30mm" height="30mm" style={{ transform: 'rotate(-12deg)' }} aria-hidden>
      <defs>
        <path id="ob-timbre-arriba" d="M100,100 m-72,0 a72,72 0 1,1 144,0" fill="none" />
        <path id="ob-timbre-abajo" d="M100,100 m-62,0 a62,62 0 1,0 124,0" fill="none" />
      </defs>
      <circle cx="100" cy="100" r="94" fill="none" stroke={VERDE} strokeWidth="3" opacity="0.75" />
      <circle cx="100" cy="100" r="86" fill="none" stroke={VERDE} strokeWidth="1.5" opacity="0.75" />
      <circle cx="100" cy="100" r="52" fill="none" stroke={VERDE} strokeWidth="1.5" opacity="0.6" />
      <text fill={VERDE} opacity="0.85" style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3 }}>
        <textPath href="#ob-timbre-arriba" startOffset="50%" textAnchor="middle">OLD BRADS</textPath>
      </text>
      <text fill={VERDE} opacity="0.85" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2 }}>
        <textPath href="#ob-timbre-abajo" startOffset="50%" textAnchor="middle">CERTIFICADO OFICIAL</textPath>
      </text>
      <text x="100" y="90" textAnchor="middle" fill={VERDE} opacity="0.85" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>
        FAITH &amp;
      </text>
      <text x="100" y="108" textAnchor="middle" fill={VERDE} opacity="0.85" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>
        CONFIDENCE
      </text>
      <text x="100" y="126" textAnchor="middle" fill={VERDE} opacity="0.7" style={{ fontSize: 10, letterSpacing: 1 }}>
        {codigo}
      </text>
    </svg>
  )
}

function Firma({ nombre, cargo }: { nombre: string; cargo: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '58mm' }}>
      <p className="ob-cert-firma" style={{ fontSize: '10mm', lineHeight: 1.1, color: NAVY, margin: 0, whiteSpace: 'nowrap' }}>
        {nombre}
      </p>
      <div style={{ borderTop: `0.4mm solid ${NAVY}`, opacity: 0.5, margin: '1.5mm 0 1.5mm' }} />
      <p style={{ fontSize: '3.2mm', letterSpacing: '0.8mm', textTransform: 'uppercase', color: NAVY, opacity: 0.7, margin: 0 }}>
        {cargo}
      </p>
    </div>
  )
}

export type DatosCertificado = {
  id: string
  categoria: string
  ganador: string
  motivo: string | null
  temporada: string
  fecha: string
  numero: string
  firmaDirectiva: string
  firmaEquipo: string
}

export default function Certificado({ d }: { d: DatosCertificado }) {
  // Hay premios compartidos ("Fulano y Mengano"): el nombre se achica para que
  // nunca empuje las firmas fuera de la hoja.
  const largo = d.ganador.length
  const tamNombre = largo > 34 ? '12mm' : largo > 24 ? '15mm' : largo > 16 ? '18mm' : '22mm'
  return (
    <div
      className="ob-cert"
      style={{
        width: '297mm',
        height: '210mm',
        background: '#fffdf7',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        margin: '0 auto',
      }}
    >
      {/* Marco doble */}
      <div style={{ position: 'absolute', inset: '8mm', border: `1.2mm solid ${NAVY}` }} />
      <div style={{ position: 'absolute', inset: '11mm', border: `0.3mm solid ${ORO}` }} />

      {/* Filigrana: el escudo enorme y muy tenue detrás de todo */}
      <img
        src="/img/logo.png"
        alt=""
        aria-hidden
        style={{
          position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%,-50%)',
          width: '150mm', height: '150mm', borderRadius: '50%', objectFit: 'cover',
          opacity: 0.06, pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative', height: '100%', padding: '14mm 26mm 11mm',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        }}
      >
        <img src="/img/logo.png" alt="Old Brads" style={{ width: '18mm', height: '18mm', borderRadius: '50%' }} />

        <p style={{ margin: '2.5mm 0 0', fontFamily: 'Anton, sans-serif', fontSize: '5mm', letterSpacing: '2.6mm', color: NAVY }}>
          OLD BRADS
        </p>
        <p className="ob-cert-serif" style={{ margin: '0.5mm 0 0', fontSize: '3.4mm', letterSpacing: '1.2mm', color: VERDE, textTransform: 'uppercase' }}>
          Bradford Alumni Football Club
        </p>

        <p className="ob-cert-serif" style={{ margin: '5mm 0 0', fontSize: '8mm', letterSpacing: '3mm', color: NAVY, textTransform: 'uppercase' }}>
          Certificado
        </p>
        <div style={{ width: '40mm', borderTop: `0.5mm solid ${ORO}`, margin: '2mm 0 0' }} />

        {/* Este bloque absorbe el espacio sobrante: así las firmas quedan
            siempre a la misma altura, con nombre corto o largo. */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
          <p className="ob-cert-serif" style={{ margin: '0', fontSize: '4.4mm', color: NAVY, opacity: 0.75 }}>
            se otorga a
          </p>

          {/* El nombre, en letra ligada: es el centro de la hoja */}
          <p className="ob-cert-nombre" style={{ margin: '1mm 0 0', fontSize: tamNombre, lineHeight: 1.15, color: NAVY }}>
            {d.ganador}
          </p>

          <p className="ob-cert-serif" style={{ margin: '3.5mm 0 0', fontSize: '4.4mm', color: NAVY, opacity: 0.75 }}>
            por haber obtenido el reconocimiento
          </p>
          <p style={{ margin: '1.5mm 0 0', fontFamily: 'Anton, sans-serif', fontSize: '7.5mm', letterSpacing: '1mm', color: VERDE, textTransform: 'uppercase' }}>
            {d.categoria}
          </p>

          {d.motivo && (
            <p className="ob-cert-serif" style={{ margin: '4mm auto 0', fontSize: '4.4mm', lineHeight: 1.45, color: NAVY, maxWidth: '185mm', fontStyle: 'italic' }}>
              «{d.motivo}»
            </p>
          )}

          <p className="ob-cert-serif" style={{ margin: '3.5mm 0 0', fontSize: '3.8mm', color: NAVY, opacity: 0.7 }}>
            {d.temporada} · Vitacura, {d.fecha}
          </p>
        </div>

        {/* Firmas y timbre, a altura fija */}
        <div
          style={{
            width: '100%', display: 'flex', flexShrink: 0,
            alignItems: 'flex-end', justifyContent: 'space-between', gap: '10mm',
          }}
        >
          <Firma nombre={d.firmaDirectiva} cargo="Directiva Old Brads" />
          <Timbre codigo={d.numero} />
          <Firma nombre={d.firmaEquipo} cargo="En representación del equipo" />
        </div>

        <p style={{ position: 'absolute', right: '16mm', bottom: '4mm', fontSize: '2.6mm', letterSpacing: '0.5mm', color: NAVY, opacity: 0.45 }}>
          N° {d.numero}
        </p>
      </div>
    </div>
  )
}
