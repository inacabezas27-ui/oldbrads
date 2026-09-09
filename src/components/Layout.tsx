import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { supabaseConfigurado } from '../lib/supabase'
import Crest from './Crest'

type Item = { to: string; label: string; end?: boolean; icon: string }
type Section = { titulo: string; items: Item[] }

const sections: Section[] = [
  {
    titulo: 'Club',
    items: [
      { to: '/panel', label: 'Resumen', end: true, icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
      { to: '/reglamento', label: 'Reglamento', icon: 'M9 12h6M9 16h4M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z' },
    ],
  },
  {
    titulo: 'Deportivo',
    items: [
      { to: '/temporadas', label: 'Temporadas', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' },
      { to: '/partidos', label: 'Partidos', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8l3 2-1 4h-4l-1-4 3-2z' },
      { to: '/votaciones', label: 'Votaciones', icon: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9' },
      { to: '/encuestas', label: 'Encuestas', icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m-6 8h6m-6 4h4' },
      { to: '/estadisticas', label: 'Estadísticas', icon: 'M3 3v18h18M8 17V9M13 17V5M18 17v-6' },
      { to: '/plantel', label: 'Plantel', icon: 'M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m8-4a4 4 0 1 0-8 0 4 4 0 0 0 8 0z' },
      { to: '/cartas', label: 'Cartas', icon: 'M4 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2zM18 8h2a2 2 0 0 1 2 2v10l-4-1.7' },
      { to: '/formacion', label: 'Formación', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 2v20M2 12h20M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
      { to: '/premios', label: 'Premios', icon: 'M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3' },
      { to: '/certificados', label: 'Certificados', icon: 'M9 12h6M9 16h4M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z' },
      { to: '/multimedia', label: 'Multimedia', icon: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6' },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { to: '/cuotas', label: 'Cuotas', icon: 'M3 6h18M3 12h18M3 18h18' },
      { to: '/caja', label: 'Caja', icon: 'M3 7h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7zM3 7l2-3h14l2 3M8 12h.01M16 12h4' },
      { to: '/cuotas-liga', label: 'Cuotas Liga', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
      { to: '/importar', label: 'Importar', icon: 'M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' },
      { to: '/configuracion', label: 'Configuración', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 2h-5l-.4 2.9a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.9h5l.4-2.9a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z' },
    ],
  },
]

function NavItem({ item, onClick }: { item: Item; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
          isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full" style={{ background: '#c0782a' }} />}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#c0782a' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={item.icon} />
          </svg>
          {item.label}
        </>
      )}
    </NavLink>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2 py-1">
      <Crest size={44} />
      <div className="leading-tight">
        <p className="text-xl text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>OLD BRADS</p>
        <p className="text-[11px] uppercase tracking-widest" style={{ color: '#c0782a' }}>Plataforma del club</p>
      </div>
    </div>
  )
}

function NavGroups({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {sections.map((sec) => (
        <div key={sec.titulo} className="mb-4">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{sec.titulo}</p>
          <div className="space-y-0.5">
            {sec.items.map((it) => (
              <NavItem key={it.to} item={it} onClick={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar desktop */}
      <aside className="hidden bg-ink-900 lg:flex lg:h-screen lg:flex-col lg:sticky lg:top-0">
        <div className="p-4">
          <Brand />
        </div>
        <nav className="flex-1 overflow-y-auto px-3">
          <NavGroups />
        </nav>
        <div className="border-t border-ink-700 p-3">
          <p className="truncate px-2 text-xs text-slate-400">{user?.email}</p>
          <button onClick={signOut} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-ink-700 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="flex items-center justify-between bg-ink-900 px-4 py-3 lg:hidden">
        <Brand />
        <button onClick={() => setMobileOpen((v) => !v)} className="rounded-lg p-2 text-white hover:bg-ink-700">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </header>
      {mobileOpen && (
        <nav className="bg-ink-900 px-3 pb-4 lg:hidden">
          <NavGroups onNavigate={() => setMobileOpen(false)} />
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-ink-700 hover:text-white">
            Cerrar sesión
          </button>
        </nav>
      )}

      {/* Main */}
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        {!supabaseConfigurado && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            Modo vista previa — sin base de datos conectada. Conecta Supabase para ver y guardar datos reales.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
