import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Temporada, Partido } from '../lib/types'
import { fecha as fmtFecha } from '../lib/format'
import Crest from '../components/Crest'

const IG = 'https://www.instagram.com/old_brads/'
const BRONCE = '#c0782a'

const IG_POSTS = [
  { src: '/img/ig/1-playoffs.jpg', cap: 'Clasificamos a Playoffs' },
  { src: '/img/ig/2-zara.jpg', cap: 'Old Brads 2 - 0 Zara FC' },
  { src: '/img/ig/3-pelicanos.jpg', cap: 'Old Brads 2 - 1 Pelícanos' },
  { src: '/img/ig/4-semifinal.jpg', cap: 'Semifinales · vs Zara FC' },
  { src: '/img/ig/5-universitario.jpg', cap: 'vs Club Deportivo Universitario' },
  { src: '/img/ig/6-cajm.jpg', cap: 'Próximo partido · Fecha 7' },
]

const VALORES = [
  { icon: '🤝', t: 'Respeto', d: 'Dentro y fuera de la cancha, con rivales, árbitros y compañeros.' },
  { icon: '🎖️', t: 'Disciplina', d: 'Autocontrol, orden y hacer las cosas de la manera correcta.' },
  { icon: '💚', t: 'Lealtad y amistad', d: 'El vínculo del colegio, hoy en cada partido. El equipo por sobre los egos.' },
  { icon: '⚔️', t: 'Compromiso', d: 'Cuidamos la camiseta y respondemos por ella con conducta y entrega.' },
]

type ProximaFecha = { etiqueta: string; fecha: string | null }

export default function Landing() {
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [proxima, setProxima] = useState<ProximaFecha | null>(null)
  const [resultados, setResultados] = useState<Partido[]>([])

  useEffect(() => {
    const load = async () => {
      const hoy = new Date().toISOString().slice(0, 10)
      const [t, f, p] = await Promise.all([
        supabase.from('temporadas').select('*').order('orden'),
        supabase.from('fechas').select('etiqueta, fecha').eq('jugable', true).gte('fecha', hoy).order('fecha').limit(1),
        supabase.from('partidos').select('*').eq('estado', 'jugado').order('fecha', { ascending: false }).limit(6),
      ])
      setTemporadas(t.data ?? [])
      setProxima(f.data?.[0] ?? null)
      setResultados((p.data as Partido[]) ?? [])
    }
    load()
  }, [])

  const totales = temporadas.reduce(
    (a, t) => ({ pj: a.pj + t.pj, g: a.g + t.g, gf: a.gf + t.gf }),
    { pj: 0, g: 0, gf: 0 },
  )

  const resultadoTag = (p: Partido) => {
    const gf = p.goles_favor ?? 0
    const gc = p.goles_contra ?? 0
    if (gf > gc) return { txt: 'G', bg: 'var(--color-brand-600)', label: 'Ganado' }
    if (gf < gc) return { txt: 'P', bg: '#7a2020', label: 'Perdido' }
    return { txt: 'E', bg: '#4a4a4a', label: 'Empate' }
  }

  return (
    <div className="min-h-screen bg-ink-900 text-white">
      {/* ===== INTRO — escudo solo ===== */}
      <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 40%, rgba(0,80,32,0.28), transparent 70%), #0a1633' }} />
        <div className="relative">
          <div className="ob-anim-crest mx-auto w-fit"><Crest size={150} /></div>
          <h1 className="ob-anim-up mt-6 font-black leading-none" style={{ fontFamily: "'Anton', system-ui, sans-serif", fontSize: 'clamp(3rem,10vw,6.5rem)', letterSpacing: '1px' }}>OLD BRADS</h1>
          <p className="ob-anim-up-2 mt-3 text-sm font-semibold uppercase tracking-[0.35em]" style={{ color: BRONCE }}>Bradford Alumni Football Club</p>
          <p className="ob-anim-up-3 mt-5 text-base italic text-slate-300">"Faith &amp; Confidence"</p>
        </div>
        <a href="#contenido" className="ob-bounce absolute bottom-8 flex flex-col items-center gap-1 text-slate-400 hover:text-white">
          <span className="text-[11px] uppercase tracking-widest">Entrar</span>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </a>
      </section>

      {/* ===== CONTENIDO ===== */}
      <div id="contenido">
        {/* Nav */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-ink-900/90 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <Crest size={38} />
            <div className="leading-tight">
              <p className="font-black">Old Brads</p>
              <p className="text-[11px] text-slate-400">Bradford Alumni FC</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex">
            <a href="#nosotros" className="hover:text-white">Nosotros</a>
            <a href="#categorias" className="hover:text-white">Categorías</a>
            <a href="#historia" className="hover:text-white">Historia</a>
            {resultados.length > 0 && <a href="#resultados" className="hover:text-white">Resultados</a>}
            <a href="#instagram" className="hover:text-white">Instagram</a>
          </nav>
          <a href={IG} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">Instagram ↗</a>
        </header>

        {/* Identidad */}
        <section className="relative overflow-hidden px-6 py-20 text-center">
          <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: 'url(/img/equipo.jpg)' }} />
          <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,22,51,0.85), rgba(10,22,51,0.97))' }} />
          <div className="relative mx-auto max-w-3xl">
            <h2 className="font-black" style={{ fontFamily: "'Anton', system-ui, sans-serif", fontSize: 'clamp(1.8rem,5vw,3rem)' }}>EL FÚTBOL DE LA COMUNIDAD BRADFORD</h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              Club de fútbol 11 formado por ex alumnos del Colegio Bradford. Competimos en la Liga COF — Liga Oriente
              y en la Liga Británica de Ex Alumnos, con la identidad y los valores de una formación de tradición británica.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={IG} target="_blank" rel="noopener noreferrer" className="rounded-xl px-5 py-3 font-bold text-white hover:opacity-90" style={{ background: BRONCE }}>Síguenos en Instagram</a>
              {proxima && (
                <div className="rounded-xl bg-white/10 px-5 py-3 text-sm">
                  <span className="text-slate-400">Próximo: </span><span className="font-bold">{proxima.etiqueta}</span> · {fmtFecha(proxima.fecha)}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Números */}
        <section className="border-y border-white/10 bg-white/5 px-6 py-10">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 text-center sm:grid-cols-4">
            <div><p className="text-4xl font-black text-brand-400">{temporadas.length || 3}</p><p className="text-xs uppercase tracking-wide text-slate-400">Temporadas</p></div>
            <div><p className="text-4xl font-black text-brand-400">{totales.pj}</p><p className="text-xs uppercase tracking-wide text-slate-400">Partidos</p></div>
            <div><p className="text-4xl font-black text-brand-400">{totales.gf}</p><p className="text-xs uppercase tracking-wide text-slate-400">Goles</p></div>
            <div><p className="text-4xl font-black" style={{ color: BRONCE }}>2025</p><p className="text-xs uppercase tracking-wide text-slate-400">Desde</p></div>
          </div>
        </section>

        {/* Nosotros */}
        <section id="nosotros" className="px-6 py-16">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-black" style={{ fontFamily: "'Anton', system-ui, sans-serif" }}>NOSOTROS</h2>
              <p className="text-slate-300">
                Old Brads nace como un equipo formado por ex alumnos del Colegio Bradford. Surge de la necesidad de
                volver a juntarse, competir y mantener vivo un vínculo que se construyó durante los años de colegio,
                donde el deporte siempre fue parte de nuestra formación.
              </p>
              <p className="mt-4 text-slate-300">
                El fútbol fue el punto de encuentro, pero la idea fue desde el inicio algo más grande: crear un equipo
                con <span className="font-semibold text-white">identidad, continuidad y sentido de pertenencia</span> —
                no solo un grupo que se junta a jugar.
              </p>
              <p className="mt-4 text-slate-300">
                Nos organizamos con una directiva y un capitán que representa al equipo en la cancha. El orden y la
                claridad son parte de lo que nos permite funcionar y mantenernos en el tiempo.
              </p>
            </div>
            <div className="overflow-hidden rounded-3xl ring-1 ring-white/10">
              <img src="/img/accion.jpg" alt="Old Brads en cancha" className="h-full w-full object-cover" />
            </div>
          </div>
        </section>

        {/* Categorías */}
        <section id="categorias" className="border-y border-white/10 bg-white/5 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 text-center text-3xl font-black" style={{ fontFamily: "'Anton', system-ui, sans-serif" }}>NUESTRAS CATEGORÍAS</h2>
            <p className="mb-8 text-center text-slate-400">Un club, dos generaciones</p>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Junior */}
              <div className="rounded-3xl bg-ink-900/70 p-8 ring-2" style={{ borderColor: BRONCE, boxShadow: '0 0 0 1px rgba(192,120,42,0.35)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black" style={{ fontFamily: "'Anton', system-ui, sans-serif" }}>JUNIOR</h3>
                  <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: BRONCE }}>Equipo actual</span>
                </div>
                <p className="mt-3 text-slate-300">
                  El corazón del club hoy. Fútbol 11 en la <span className="font-semibold text-white">Liga COF — Liga Oriente</span>
                  {' '}y en la <span className="font-semibold text-white">Liga Británica de Ex Alumnos</span> (Old Boys, Old Macks, COBS).
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-300">
                  <li>• 3 temporadas de continuidad</li>
                  <li>• <span style={{ color: BRONCE }} className="font-semibold">Subcampeones</span> del último torneo (Final de Oro)</li>
                  <li>• Plantel de 25+ jugadores y directiva electa</li>
                </ul>
              </div>
              {/* Senior */}
              <div className="rounded-3xl bg-ink-900/70 p-8 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black" style={{ fontFamily: "'Anton', system-ui, sans-serif" }}>SENIOR</h3>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-300">Raíces</span>
                </div>
                <p className="mt-3 text-slate-300">
                  La categoría Senior es parte de la historia y del ADN de Old Brads — la generación que dio origen
                  al proyecto y sostiene la identidad del club dentro de la comunidad Bradford.
                </p>
                <p className="mt-4 text-sm text-slate-500">Más sobre la Senior, muy pronto.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Historia */}
        {temporadas.length > 0 && (
          <section id="historia" className="px-6 py-16">
            <div className="mx-auto max-w-5xl">
              <h2 className="mb-2 text-center text-3xl font-black" style={{ fontFamily: "'Anton', system-ui, sans-serif" }}>NUESTRA HISTORIA</h2>
              <p className="mb-8 text-center text-slate-400">El camino de la Junior, temporada a temporada</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {temporadas.map((t) => (
                  <div key={t.id} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                    <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">{t.nombre}</p>
                    <p className="mt-1 text-2xl font-black">{t.puntos} pts</p>
                    <p className="text-sm text-slate-400">{t.g}G · {t.e}E · {t.p}P{t.posicion ? ` · ${t.posicion}°` : ''}</p>
                    {t.resultado && <p className="mt-2 text-sm font-semibold" style={{ color: BRONCE }}>🏆 {t.resultado}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Resultados */}
        {resultados.length > 0 && (
          <section id="resultados" className="border-y border-white/10 bg-white/5 px-6 py-16">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-2 text-center text-3xl font-black" style={{ fontFamily: "'Anton', system-ui, sans-serif" }}>ÚLTIMOS RESULTADOS</h2>
              <p className="mb-8 text-center text-slate-400">Liga COF · categoría Junior</p>
              <div className="space-y-2">
                {resultados.map((p) => {
                  const r = resultadoTag(p)
                  return (
                    <div key={p.id} className="flex items-center gap-4 rounded-xl bg-ink-900/60 px-4 py-3 ring-1 ring-white/10">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: r.bg }}>{r.txt}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">Old Brads {p.es_local ? 'vs' : '@'} {p.rival}</p>
                        <p className="text-xs text-slate-400">{fmtFecha(p.fecha)}</p>
                      </div>
                      <p className="text-xl font-black tabular-nums">{p.goles_favor ?? 0} - {p.goles_contra ?? 0}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* Valores */}
        <section id="valores" className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 text-center text-3xl font-black" style={{ fontFamily: "'Anton', system-ui, sans-serif" }}>NUESTROS VALORES</h2>
            <p className="mb-8 text-center text-slate-400">Respeto · Disciplina · Lealtad · Compromiso</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VALORES.map((v) => (
                <div key={v.t} className="rounded-2xl bg-white/5 p-6 text-center ring-1 ring-white/10">
                  <div className="text-4xl">{v.icon}</div>
                  <p className="mt-3 text-lg font-black">{v.t}</p>
                  <p className="mt-2 text-sm text-slate-400">{v.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Instagram */}
        <section id="instagram" className="border-t border-white/10 bg-white/5 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 text-center text-3xl font-black" style={{ fontFamily: "'Anton', system-ui, sans-serif" }}>EN INSTAGRAM</h2>
            <p className="mb-8 text-center text-slate-400">Así vivimos cada fecha · <a href={IG} target="_blank" rel="noopener noreferrer" style={{ color: BRONCE }} className="hover:underline">@old_brads</a></p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {IG_POSTS.map((p) => (
                <a key={p.src} href={IG} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-2xl ring-1 ring-white/10">
                  <img src={p.src} alt={p.cap} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                    <p className="text-xs font-semibold">{p.cap}</p>
                  </div>
                </a>
              ))}
            </div>
            <div className="mt-8 text-center">
              <a href={IG} target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl px-6 py-3 font-bold text-white hover:opacity-90" style={{ background: BRONCE }}>Ver más en Instagram ↗</a>
            </div>
          </div>
        </section>

        {/* Footer + acceso */}
        <footer className="border-t border-white/10 px-6 py-14 text-center">
          <Crest size={56} />
          <p className="mt-3 font-black">Old Brads · Bradford Alumni FC</p>
          <p className="text-sm text-slate-400">Faith &amp; Confidence · Liga COF</p>
          <a href={IG} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm hover:underline" style={{ color: BRONCE }}>@old_brads</a>
          <div className="mt-10 flex flex-wrap justify-center gap-3 border-t border-white/10 pt-6">
            <Link to="/jugadores" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-slate-300 ring-1 ring-white/15 transition hover:text-white hover:ring-white/40">
              ⚽ Zona jugadores
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 ring-1 ring-white/10 transition hover:text-white hover:ring-white/30">
              🔒 Acceso equipo
            </Link>
          </div>
          <p className="mt-6 text-[11px] text-slate-600">© {new Date().getFullYear()} Old Brads · oldbrads.cl</p>
        </footer>
      </div>
    </div>
  )
}
