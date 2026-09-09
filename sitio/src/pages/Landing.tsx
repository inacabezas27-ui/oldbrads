import { useEffect, useRef, useState } from 'react'
import Crest from '../components/Crest'

const IG = 'https://www.instagram.com/old_brads/'
const COF = 'https://cof.cl/'
const EMAIL = 'directiva@oldbrads.cl'
const CONTACTO = `mailto:${EMAIL}?subject=${encodeURIComponent('Auspicio Old Brads')}`
const ESCUELA_MAIL = `mailto:${EMAIL}?subject=${encodeURIComponent('Escuela de fútbol Old Brads — información')}`
const AMARILLO = '#ecb42c'   // oro del escudo
const VERDE = '#046c54'      // verde del escudo
const VERDE_TXT = '#0b9c78'  // mismo verde, aclarado para texto sobre navy
const D = { fontFamily: 'var(--font-display)' } as const
const PLATA = '#cfd6e2'

/* ---------- helpers de marca ---------- */
function Bg({ src, dark = 0.8, fixed = true, pos = 'center' }: { src: string; dark?: number; fixed?: boolean; pos?: string }) {
  // La imagen de fondo se descarga solo cuando la sección se acerca al viewport (ahorra ~1 MB en la primera carga)
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (visible || !ref.current) return
    if (!('IntersectionObserver' in window)) { setVisible(true); return }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect() }
    }, { rootMargin: '800px 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [visible])
  return (
    <>
      <div
        ref={ref}
        className={`absolute inset-0 bg-cover bg-no-repeat ${fixed ? 'ob-bg-fixed' : ''}`}
        style={{ backgroundImage: visible ? `url(${src})` : undefined, backgroundPosition: pos }}
      />
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(12,36,76,${dark}), rgba(12,36,76,${Math.min(dark + 0.07, 0.98)}))` }} />
    </>
  )
}

function Eyebrow({ children }: { children: string }) {
  return <p className="mb-5 text-xl font-black uppercase tracking-[0.26em] sm:text-2xl" style={{ color: AMARILLO }}>{children}</p>
}
function Title({ children, className = '' }: { children: string; className?: string }) {
  return <h2 className={`uppercase leading-[0.95] ${className}`} style={{ ...D, fontSize: 'clamp(2.6rem,6vw,4.5rem)' }}>{children}</h2>
}
function Lead({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-2xl leading-relaxed text-slate-200 sm:text-3xl ${className}`}>{children}</p>
}
const B = ({ children, c = '#ffffff' }: { children: React.ReactNode; c?: string }) => <span className="font-black" style={{ color: c }}>{children}</span>

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')


/* Logo genérico: usa una URL, si no /img/<carpeta>/<slug>.webp, si no las iniciales */
function LogoMarca({ nombre, url, carpeta, size = 64, dark = false, contener = false }: { nombre: string; url?: string | null; carpeta: string; size?: number; dark?: boolean; contener?: boolean }) {
  const [paso, setPaso] = useState(url ? 0 : 1)
  const ini = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
  if (paso < 2) {
    const src = paso === 0 && url ? url : `/img/${carpeta}/${slug(nombre)}.webp`
    return <img src={src} alt={nombre} onError={() => setPaso(paso + 1)} style={contener ? { maxHeight: size, maxWidth: '100%', objectFit: 'contain' } : { width: size, height: size, objectFit: 'contain' }} />
  }
  return (
    <div className={`flex items-center justify-center rounded-full ${dark ? 'bg-ink-900/10 text-ink-900 ring-2 ring-ink-900/15' : 'bg-white/10 ring-2 ring-white/20'}`} style={{ width: size, height: size, ...D, fontSize: size * 0.34 }}>{ini || '?'}</div>
  )
}

const SPONSORS: { nombre: string; url: string | null }[] = [
  { nombre: 'TEAM KRAMER', url: null },
  { nombre: "ENTRENA PO'", url: null },
  { nombre: 'CLUBRUT', url: null },
  { nombre: 'EXTRA LIFE', url: null },
]

/* ---------- contenido estático ---------- */
const PRINCIPIOS = [
  ['01', 'Respeto', 'Con rivales, árbitros y compañeros. Dentro y fuera de la cancha.'],
  ['02', 'Disciplina', 'Autocontrol, orden y hacer las cosas bien, aunque el entorno haga lo contrario.'],
  ['03', 'Lealtad', 'Hacia los compañeros: estar siempre, en la cancha y fuera de ella.'],
  ['04', 'Compromiso', 'Cuidamos la camiseta y respondemos por ella con conducta y entrega.'],
]
const BENEFICIOS: [string, string, string][] = [
  ['camiseta', 'Tu marca en nuestra camiseta', 'Visibilidad en cada partido.'],
  ['redes', 'Menciones en nuestras redes sociales', 'Alcanza a toda nuestra comunidad.'],
  ['cancha', 'Presencia en la cancha y eventos del club', 'Tu marca presente en cada evento.'],
]
function Icono({ k }: { k: string }) {
  const c = { width: 40, height: 40, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (k === 'camiseta') return <svg {...c}><path d="M8 3l4 2 4-2 4 3-2 4-2-1v12H8V9L6 10 4 6z" /></svg>
  if (k === 'redes') return <svg {...c}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M12 15.5l-2.2-2.1a1.4 1.4 0 012-2l.2.2.2-.2a1.4 1.4 0 012 2z" /></svg>
  return <svg {...c}><rect x="2" y="5" width="20" height="14" rx="1" /><path d="M12 5v14M2 9h4v6H2M22 9h-4v6h4" /><circle cx="12" cy="12" r="2" /></svg>
}
const FUNCIONAMIENTO: [string, string, React.ReactNode][] = [
  ['01', 'Directiva', <>Una <B>directiva elegida por votación</B>, en democracia, por los propios jugadores. Organiza el equipo, toma las decisiones y lo proyecta en el tiempo.</>],
  ['02', 'Capitán', <>Representa al equipo <B>dentro de la cancha</B> y es el nexo entre los jugadores, la directiva y el árbitro.</>],
  ['03', 'Entrenamientos', <>Un <B>entrenamiento grupal semanal con balón</B>, guiado por la directiva, más la preparación personal de cada jugador.</>],
  ['04', 'Compromiso', <>Respeto, autocontrol y conducta <B>dentro y fuera de la cancha</B>. El equipo está por sobre los egos.</>],
]
const ESCUELA_DATOS: [string, string, string][] = [
  ['1° a 4°', 'Básico', 'Edades'],
  ['2 × 1h', 'Por semana', 'Clases'],
  ['Tarde', 'Después del colegio', 'Horario'],
  ['Vitacura', 'Cancha por confirmar', 'Lugar'],
]
const ESCUELA_APRENDEN: [string, string][] = [
  ['Técnica', 'Control, pase, conducción y remate, con trabajo adecuado a cada edad.'],
  ['Juego en equipo', 'Aprender a jugar con otros, ganar y perder, y respetar al rival.'],
  ['Valores', 'Los mismos del club: respeto, disciplina, lealtad y compromiso.'],
]
const PALMARES: { cat: string; badge: string; torneo: string; t1: string; t2: string; det: string; icono: string; color: string; tinte: string }[] = [
  { cat: 'Junior', badge: AMARILLO, torneo: 'Torneo de Ex Colegios Británicos · 2026', t1: 'Campeones', t2: 'de Plata', det: 'Primera edición del torneo', icono: '🏆', color: PLATA, tinte: 'rgba(207,214,226,0.16)' },
  { cat: 'Junior', badge: AMARILLO, torneo: 'Liga COF · Apertura 2026', t1: 'Subcampeones', t2: 'Copa de Oro', det: 'Liga COF · clasificación a playoffs, semifinal y final', icono: '🥈', color: AMARILLO, tinte: 'rgba(236,180,44,0.20)' },
  { cat: 'Senior', badge: VERDE_TXT, torneo: 'Liga Británica Senior · Apertura 2023', t1: 'Subcampeones', t2: 'Copa de Oro', det: 'Liga Británica · el primer palmarés del club', icono: '🥈', color: AMARILLO, tinte: 'rgba(236,180,44,0.20)' },
]
const HISTORICOS: { rival: string; gf: number; gc: number; etiqueta: string }[] = [
  { rival: 'Old Boys', gf: 3, gc: 0, etiqueta: 'El clásico' },
  { rival: 'AS Caris', gf: 7, gc: 0, etiqueta: 'La goleada' },
  { rival: 'Pelícanos', gf: 2, gc: 1, etiqueta: 'Cuartos de final' },
  { rival: 'Zara FC', gf: 2, gc: 0, etiqueta: 'Semifinal' },
]


export default function Landing() {




  const card = 'group rounded-2xl bg-white/[0.06] ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.09] hover:ring-[#ecb42c]/60 hover:shadow-[0_20px_50px_-20px_rgba(236,180,44,0.40)]'

  return (
    <div className="min-h-screen bg-ink-900 text-white" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* ================= INTRO ================= */}
      <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 40%, rgba(4,108,84,0.38), transparent 70%), #0c244c' }} />
        <div className="relative">
          <div className="ob-anim-crest mx-auto w-fit"><Crest size={150} /></div>
          <h1 className="ob-anim-up mt-6 leading-none" style={{ ...D, fontSize: 'clamp(3rem,10vw,6.5rem)', letterSpacing: '1px', color: VERDE_TXT }}>OLD BRADS</h1>
          <p className="ob-anim-up-2 mt-3 text-sm font-black uppercase tracking-[0.35em]" style={{ color: AMARILLO }}>Bradford Alumni Football Club</p>
          <p className="ob-anim-up-3 mt-6 text-3xl text-white sm:text-5xl" style={{ fontFamily: 'var(--font-script)' }}>Faith &amp; Confidence</p>
        </div>
        <a href="#top" className="ob-bounce absolute bottom-10 flex flex-col items-center gap-2 transition hover:scale-110">
          <span className="text-xl uppercase tracking-[0.3em] sm:text-2xl" style={{ color: AMARILLO }}>Entrar</span>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={AMARILLO} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </a>
      </section>

      <div id="top">
        {/* ================= NAV ================= */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-900/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
            <a href="#top" className="flex items-center gap-3"><Crest size={38} /><span className="text-xl" style={{ ...D, letterSpacing: '0.5px' }}>OLD BRADS</span></a>
            <nav className="hidden items-center gap-6 text-[13px] font-black uppercase tracking-wider text-slate-300 lg:flex">
              <a href="#club" className="hover:text-white">Club</a>
              <a href="#modelo" className="hover:text-white">Modelo</a>
              <a href="#palmares" className="hover:text-white">Palmarés</a>
              <a href="#equipos" className="hover:text-white">Equipos</a>
              <a href="#escuela" className="hover:text-white">Escuela</a>
              <a href="#galeria" className="hover:text-white">Galería</a>
              <a href="#sponsors" className="hover:text-white">Crece con nosotros</a>
            </nav>
            <a href={IG} target="_blank" rel="noopener noreferrer" aria-label="Instagram de Old Brads" className="transition hover:scale-110" style={{ color: AMARILLO }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" stroke="none" /></svg>
            </a>
          </div>
        </header>

        {/* ================= HERO ================= */}
        <section className="relative flex min-h-[86vh] items-end overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundImage: 'url(/img/bg/bg-hero.webp)', backgroundSize: 'cover', backgroundPosition: 'center 35%' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(12,36,76,0.30) 0%, rgba(12,36,76,0.70) 55%, #0c244c 100%)' }} />
          <div className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-28">
            <h2 className="mt-3 max-w-5xl leading-[0.9]" style={{ ...D, fontSize: 'clamp(3rem,9vw,7.5rem)' }}>
              ESTO ES<br /><span style={{ color: VERDE_TXT }}>OLD BRADS</span>
            </h2>
            <p className="mt-6 max-w-2xl text-2xl font-bold leading-tight sm:text-3xl" style={D}>
              EL FÚTBOL DE LA <span style={{ color: VERDE_TXT }}>COMUNIDAD BRADFORD</span>
            </p>
            <Lead className="mt-4 max-w-xl">Un club de <B>ex alumnos y amigos</B> con identidad, historia y una forma británica de entender el deporte.</Lead>
          </div>
        </section>

        {/* ================= SOMOS ================= */}
        <section id="club" className="relative overflow-hidden">
          <Bg src="/img/bg/bg-somos.webp" dark={0.7} />
          <div className="relative mx-auto max-w-7xl px-5 py-28">
          <div className="text-center">
            <Eyebrow>El club</Eyebrow>
            <h2 className="uppercase leading-[0.85]" style={{ ...D, fontSize: 'clamp(3.5rem,13vw,10rem)' }}>
              Somos <span style={{ color: VERDE_TXT }}>Old Brads</span>
            </h2>
          </div>
          <div className="mt-16 grid items-center gap-14 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl">
              <img src="/img/equipo.webp" alt="Plantel de Old Brads reunido en la cancha" width={1400} height={936} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
            </div>
            <div>
              <h3 className="uppercase leading-[0.95]" style={{ ...D, fontSize: 'clamp(2rem,4vw,3rem)' }}>Forma parte de la <span style={{ color: AMARILLO }}>familia</span></h3>
              <Lead className="mt-6">Somos <B>ex alumnos y amigos</B> del Colegio Bradford. Nacimos para volver a juntarnos, competir y mantener vivo un vínculo donde el deporte siempre fue parte de nuestra formación.</Lead>
              <Lead className="mt-4 text-slate-300">Más que un grupo que se junta a jugar: un club con <B>identidad</B>, <B>continuidad</B> y <B>sentido de pertenencia</B>.</Lead>
            </div>
          </div>
          </div>
        </section>

        {/* ================= CÓMO FUNCIONAMOS ================= */}
        <section id="club-funciona" className="relative overflow-hidden border-y border-white/10">
          <Bg src="/img/bg/bg-estructura.webp" dark={0.82} />
          <div className="relative mx-auto max-w-7xl px-5 py-24">
            <Eyebrow>Reglas del club</Eyebrow>
            <h2 className="uppercase leading-[0.95]" style={{ ...D, fontSize: 'clamp(2.6rem,6vw,4.5rem)' }}>Cómo <span style={{ color: AMARILLO }}>funcionamos</span></h2>
            <Lead className="mt-6 max-w-4xl">Somos un equipo competitivo con <B>estándares claros</B>: organización, preparación y respeto por el grupo son la base para competir.</Lead>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {FUNCIONAMIENTO.map(([n, t, d]) => (
                <div key={n} className={`${card} p-8`}>
                  <p className="text-5xl leading-none transition group-hover:scale-110" style={{ ...D, color: AMARILLO, transformOrigin: 'left' }}>{n}</p>
                  <p className="mt-5 text-2xl uppercase leading-none sm:text-3xl" style={D}>{t}</p>
                  <p className="mt-4 text-lg leading-relaxed text-slate-200">{d}</p>
                </div>
              ))}
            </div>
            <div className="relative mt-10 overflow-hidden rounded-2xl p-8 text-center ring-1 ring-white/10 sm:p-12" style={{ background: 'linear-gradient(135deg,#046c54,#0c244c)' }}>
              <p className="text-2xl uppercase leading-[1.05] sm:text-4xl" style={D}>Pertenecer a Old Brads implica <span style={{ color: AMARILLO }}>entrenar</span>, <span style={{ color: AMARILLO }}>cuidarse</span> <span style={{ color: AMARILLO }}>y responder</span> por la camiseta dentro y fuera de la cancha.</p>
            </div>
          </div>
        </section>

        {/* ================= MODELO ================= */}
        <section id="modelo" className="relative overflow-hidden">
          <Bg src="/img/bg/bg-modelo.webp" dark={0.80} />
          <div className="relative mx-auto max-w-7xl px-5 py-24">
            <Eyebrow>Misión · Visión · Principios</Eyebrow>
            <Title>Modelo Old Brads</Title>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <div className={`${card} p-8 backdrop-blur`}>
                <p className="text-xl font-black uppercase tracking-[0.26em]" style={{ color: AMARILLO }}>Misión</p>
                <p className="mt-4 text-3xl uppercase leading-[1.05] sm:text-4xl" style={D}>Competir con <span style={{ color: AMARILLO }}>seriedad</span>, cuidar la camiseta y ser <span style={{ color: VERDE_TXT }}>coherentes</span> con los valores que nos dieron origen.</p>
                <p className="mt-6 text-2xl leading-relaxed text-slate-200">El deporte como competencia y como forma de construir carácter.</p>
              </div>
              <div className={`${card} p-8 backdrop-blur`}>
                <p className="text-xl font-black uppercase tracking-[0.26em]" style={{ color: AMARILLO }}>Visión</p>
                <p className="mt-4 text-3xl uppercase leading-[1.05] sm:text-4xl" style={D}>Un club que <span style={{ color: VERDE_TXT }}>perdure en el tiempo</span>: reglas claras, organización y <span style={{ color: AMARILLO }}>disciplina</span>.</p>
                <p className="mt-6 text-2xl leading-relaxed text-slate-200">Cuidar al grupo y que el proyecto siga existiendo más allá de quienes lo integran hoy.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPIOS.map(([n, t, d]) => (
                <div key={n} className={`${card} p-7 backdrop-blur`}>
                  <p className="text-5xl leading-none transition group-hover:scale-110" style={{ ...D, color: AMARILLO, transformOrigin: 'left' }}>{n}</p>
                  <p className="mt-4 text-3xl uppercase leading-none" style={D}>{t}</p>
                  <p className="mt-3 text-base font-medium text-slate-300">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= PALMARÉS ================= */}
        <section id="palmares" className="relative overflow-hidden">
          <Bg src="/img/bg/bg-palmares.webp" dark={0.8} />
          <div className="relative mx-auto max-w-7xl px-5 py-24">
            <Eyebrow>Lo conseguido</Eyebrow>
            <Title>Palmarés</Title>

            {/* Los títulos, en grande */}
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {PALMARES.map((t) => (
                <div key={t.t1 + t.torneo} className={`${card} relative overflow-hidden p-8 sm:p-9`} style={{ background: `linear-gradient(135deg, ${t.tinte}, rgba(12,36,76,0.65))` }}>
                  <span className="pointer-events-none absolute -bottom-12 -right-6 text-[9rem] leading-none opacity-[0.07]" style={D}>{t.icono}</span>
                  <span className="relative inline-block rounded px-3 py-1 text-sm font-black uppercase tracking-[0.2em] text-ink-900" style={{ background: t.badge }}>{t.cat}</span>
                  <p className="relative mt-5 text-base font-black uppercase leading-snug tracking-[0.16em] text-slate-300">{t.torneo}</p>
                  <p className="relative mt-4 break-words uppercase leading-[0.92]" style={{ ...D, fontSize: 'clamp(1.9rem,2.9vw,2.8rem)' }}>{t.t1}<br /><span style={{ color: t.color }}>{t.t2}</span></p>
                  <p className="relative mt-5 text-lg leading-relaxed text-slate-200">{t.det}</p>
                </div>
              ))}
            </div>

            {/* Resultados históricos */}
            <div className="mt-20">
              <Eyebrow>Partidos para el recuerdo</Eyebrow>
              <h3 className="uppercase leading-[0.95]" style={{ ...D, fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>Resultados <span style={{ color: AMARILLO }}>históricos</span></h3>
              <div className="mt-12 grid gap-6 md:grid-cols-2">
                {HISTORICOS.map((h) => (
                  <div key={h.rival} className={`${card} relative overflow-hidden`} style={{ background: 'linear-gradient(135deg, rgba(236,180,44,0.16), rgba(12,36,76,0.72))', boxShadow: '0 0 0 1px rgba(236,180,44,0.35)' }}>
                    <div className="flex items-center justify-between px-6 py-3" style={{ background: AMARILLO }}>
                      <span className="text-base font-black uppercase tracking-[0.22em] text-ink-900 sm:text-lg">{h.etiqueta}</span>
                      <span className="text-base font-black uppercase tracking-[0.22em] text-ink-900 sm:text-lg">Victoria</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-9">
                      <div className="flex flex-col items-center gap-3"><Crest size={88} /><span className="text-2xl uppercase" style={D}>Old Brads</span></div>
                      <div className="tabular-nums leading-none" style={{ ...D, fontSize: 'clamp(3.5rem,7vw,5.5rem)', color: AMARILLO }}>{h.gf}<span className="mx-1 text-slate-500">-</span>{h.gc}</div>
                      <div className="flex flex-col items-center gap-3"><LogoMarca nombre={h.rival} carpeta="equipos" size={88} /><span className="text-center text-2xl uppercase" style={D}>{h.rival}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= EQUIPOS ================= */}
        <section id="equipos" className="border-y border-white/10 bg-white/[0.04]">
          <div className="mx-auto max-w-7xl px-5 py-24">
            <Eyebrow>Categorías</Eyebrow>
            <Title>Equipos</Title>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <a href="#equipos" className="group relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-white/10">
                <img src="/img/junior.webp" alt="Equipo Junior de Old Brads" width={1400} height={933} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(12,36,76,0.96) 100%)' }} />
                <div className="absolute bottom-0 p-7">
                  <p className="mt-2 text-6xl leading-none" style={D}>JUNIOR</p>
                  <p className="mt-2 text-base font-bold text-slate-200">Liga COF — Liga Oriente · <B>Subcampeones</B> · <B>Campeones de Plata</B></p>
                </div>
              </a>
              <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-white/10">
                <img src="/img/senior.webp" alt="Equipo Senior de Old Brads" width={1365} height={909} loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(12,36,76,0.96) 100%)' }} />
                <div className="absolute bottom-0 p-7">
                  <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Raíces</span>
                  <p className="mt-2 text-6xl leading-none" style={D}>SENIOR</p>
                  <p className="mt-2 text-base font-bold text-slate-200">La generación que <B>dio origen</B> al proyecto. Compite en la <B>Liga Británica Oficial</B>.</p>
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center gap-5">
              <p className="text-center text-sm font-bold uppercase tracking-[0.18em] text-slate-300">Liga COF — Liga Oriente · Liga Británica Oficial</p>
              <a href={COF} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 rounded-md px-7 py-3.5 text-sm font-black uppercase tracking-wider text-ink-900 transition hover:scale-[1.02]" style={{ background: AMARILLO }}>
                Ver el torneo en cof.cl
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
              </a>
              <p className="max-w-md text-center text-lg leading-relaxed text-slate-300">Tabla de posiciones, fixture y resultados oficiales del campeonato</p>
            </div>
          </div>
        </section>

        {/* ================= ESCUELA DE FÚTBOL ================= */}
        <section id="escuela" className="relative overflow-hidden">
          <Bg src="/img/bg/bg-escuela.webp" dark={0.82} />
          <div className="relative mx-auto max-w-7xl px-5 py-24">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <span className="mb-5 inline-block rounded px-4 py-1.5 text-base font-black uppercase tracking-[0.2em] text-ink-900 sm:text-lg" style={{ background: AMARILLO }}>Próximamente</span>
                <Eyebrow>Escuela de fútbol · 1° a 4° básico</Eyebrow>
                <h2 className="mt-2 uppercase leading-[0.9]" style={{ ...D, fontSize: 'clamp(2.8rem,7vw,5.5rem)' }}>Escuela<br /><span style={{ color: VERDE_TXT }}>Old Brads</span></h2>
                <Lead className="mt-6">Clases de fútbol para <B>niños de 1° a 4° básico</B>: alumnos del Bradford School y <B>cualquier niño que quiera jugar</B>.</Lead>
                <Lead className="mt-4 text-slate-300">Dictadas por <B>profesores de fútbol titulados</B> que además son jugadores del club. Se entrena con los mismos valores con que competimos.</Lead>
                <div className="mt-8 space-y-4">
                  {ESCUELA_APRENDEN.map(([t, d]) => (
                    <div key={t} className="flex items-start gap-4 border-l-4 pl-4" style={{ borderColor: AMARILLO }}>
                      <div>
                        <p className="text-xl uppercase leading-none sm:text-2xl" style={D}>{t}</p>
                        <p className="mt-2 text-lg leading-relaxed text-slate-300">{d}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <a href={ESCUELA_MAIL} className="mt-10 flex items-center gap-4 rounded-xl px-6 py-5 text-white transition hover:scale-[1.02]" style={{ background: VERDE }}>
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink-900">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                  </span>
                  <span>
                    <span className="block text-3xl uppercase leading-none sm:text-4xl" style={D}>Quiero información</span>
                    <span className="block text-xs font-black uppercase tracking-wider sm:text-sm">Te contactamos con horarios, valores y cupos</span>
                  </span>
                </a>
                <p className="mt-3 text-sm font-bold text-slate-400">Estamos abriendo la escuela · cupos limitados · o escríbenos por DM a <a href={IG} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">@old_brads</a></p>
              </div>
              <div className="grid gap-3 self-center sm:grid-cols-2">
                {ESCUELA_DATOS.map(([v, d, l]) => {
                  const tono = AMARILLO
                  return (
                    <div key={l} className={`${card} p-7`}>
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">{l}</p>
                      <p className="mt-3 text-4xl uppercase leading-none transition duration-300 group-hover:translate-x-1 sm:text-5xl" style={{ ...D, color: tono }}>{v}</p>
                      <p className="mt-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-300">{d}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ================= GALERÍA ================= */}
        <section id="galeria" className="border-y border-white/10 bg-white/[0.04]">
          <div className="mx-auto max-w-7xl px-5 py-24">
            <div className="mb-10 flex items-end justify-between">
              <div><Eyebrow>Fotos</Eyebrow><Title>Galería</Title></div>
              <a href={IG} target="_blank" rel="noopener noreferrer" className="hidden text-sm font-black uppercase tracking-wider text-slate-300 hover:text-white sm:block">Más fotos →</a>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 21 }, (_, i) => `g${String(i + 1).padStart(2, '0')}`).map((g, i) => (
                <div key={g} className={`overflow-hidden rounded-xl ring-1 ring-white/10 ${i % 7 === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'}`}>
                  <img src={`/img/fotos/${g}.webp`} alt={`Old Brads — foto ${g.slice(1)}`} loading="lazy" decoding="async" width={1200} height={800} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= AUSPICIADORES ================= */}
        <section id="sponsors" className="relative overflow-hidden">
          <Bg src="/img/bg/bg-crece.webp" dark={0.88} fixed={false} />
          <div className="relative py-24">

            {/* --- Nuestros auspiciadores (cinta) --- */}
            <div className="mx-auto max-w-7xl px-5 text-center">
              <Eyebrow>Ellos nos apoyan</Eyebrow>
              <Title>Nuestros auspiciadores</Title>
            </div>
            <div className="mt-14 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
              <div className="ob-marquee flex items-center gap-20">
                {[...SPONSORS, ...SPONSORS, ...SPONSORS, ...SPONSORS, ...SPONSORS, ...SPONSORS].map((s2, i) => (
                  <div key={s2.nombre + i} className="flex h-24 shrink-0 items-center justify-center" style={{ minWidth: 200 }}>
                    <LogoMarca nombre={s2.nombre} url={s2.url} carpeta="sponsors" size={88} contener />
                  </div>
                ))}
              </div>
            </div>

            {/* --- Buscamos auspiciador --- */}
            <div className="mx-auto mt-24 max-w-4xl px-5 text-center">
              <div className="mx-auto mb-10 h-px w-24" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <Eyebrow>¿Quieres ser parte?</Eyebrow>
              <h2 className="mt-2 uppercase leading-[0.9]" style={{ ...D, fontSize: 'clamp(2.6rem,7vw,5rem)' }}>Buscamos<br /><span style={{ color: AMARILLO }}>auspiciador</span></h2>
              <Lead className="mx-auto mt-5 max-w-2xl">Suma tu marca a <B c={AMARILLO}>nuestra camiseta</B> y crece con un club que se mueve todo el año.</Lead>

              <div className="mt-12 grid gap-6 sm:grid-cols-3">
                {BENEFICIOS.map(([k, t, d]) => (
                  <div key={k} className="flex flex-col items-center px-2 text-center">
                    <span style={{ color: AMARILLO }}><Icono k={k} /></span>
                    <p className="mt-5 text-2xl uppercase leading-[1.05]" style={D}>{t}</p>
                    <p className="mt-3 text-base font-medium leading-relaxed text-slate-300">{d}</p>
                  </div>
                ))}
              </div>

              <a href={CONTACTO} className="mx-auto mt-12 inline-flex items-center gap-4 rounded-xl px-8 py-5 text-ink-900 transition hover:scale-[1.02]" style={{ background: AMARILLO }}>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                </span>
                <span className="text-left">
                  <span className="block text-3xl uppercase leading-none sm:text-4xl" style={D}>Escríbenos</span>
                  <span className="block text-xs font-black uppercase tracking-wider sm:text-sm">Hablemos de cómo podemos crecer juntos</span>
                </span>
              </a>
              <p className="mt-4 text-sm font-bold text-slate-300">{EMAIL} · o por DM en <a href={IG} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">@old_brads</a></p>
            </div>
          </div>
        </section>

        {/* ================= FOOTER ================= */}
        <footer className="border-t border-white/10 bg-black/40">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 py-14 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Crest size={52} />
              <p className="mt-3 text-2xl" style={{ ...D, color: VERDE_TXT }}>OLD BRADS</p>
              <p className="text-sm font-bold text-slate-400">Bradford Alumni Football Club</p>
              <p className="mt-2 text-2xl" style={{ fontFamily: 'var(--font-script)', color: AMARILLO }}>Faith &amp; Confidence</p>
            </div>
            {[
              ['Club', [['#club', 'Somos Old Brads'], ['#modelo', 'Modelo'], ['#palmares', 'Palmarés'], ['#equipos', 'Equipos'], ['#escuela', 'Escuela de fútbol']]],
              ['Comunidad', [['#galeria', 'Galería'], [IG, 'Instagram @old_brads'], ['#sponsors', 'Crece con nosotros']]],
            ].map(([t, links]) => (
              <div key={String(t)}>
                <p className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-slate-300">{t as string}</p>
                <ul className="space-y-2 text-sm font-bold text-slate-300">
                  {(links as string[][]).map(([h, l]) => <li key={l}><a href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="hover:text-white">{l}</a></li>)}
                </ul>
              </div>
            ))}
            <div>
              <p className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-slate-300">Contacto</p>
              <ul className="space-y-2 text-sm font-bold text-slate-300">
                <li><a href={CONTACTO} className="hover:text-white">{EMAIL}</a></li>
              </ul>
            </div>
          </div>
          <p className="py-6 text-center text-xs font-bold uppercase tracking-wider text-slate-400">© {new Date().getFullYear()} Old Brads · Bradford Alumni Football Club · oldbrads.cl</p>
        </footer>
      </div>
    </div>
  )
}
