import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Premio, Temporada } from '../lib/types'
import { Card, Spinner } from '../components/ui'

export default function Premios() {
  const [premios, setPremios] = useState<Premio[]>([])
  const [temps, setTemps] = useState<Temporada[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [p, t] = await Promise.all([
        supabase.from('premios').select('*').order('orden'),
        supabase.from('temporadas').select('*').order('orden'),
      ])
      setPremios(p.data ?? [])
      setTemps(t.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Spinner />

  const tempNombre = (id: string | null) => temps.find((t) => t.id === id)?.nombre ?? ''

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-ink-900">Premios</h1>
        <p className="text-sm text-slate-500">Reconocimientos de la temporada</p>
      </div>

      {premios.length > 0 && (
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          {tempNombre(premios[0].temporada_id)}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {premios.map((p) => (
          <Card key={p.id} className="relative overflow-hidden p-5">
            <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-gold-400 to-gold-500" style={{ background: 'linear-gradient(to bottom, #f2c14e, #e0a92e)' }} />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {p.tipo === 'estadistico' ? '📊 Estadístico' : '🗳️ Votación del equipo'}
            </p>
            <p className="mt-1 text-lg font-black text-ink-900">{p.categoria}</p>
            <p className="mt-2 text-xl font-bold text-brand-700">🏆 {p.ganador}</p>
            {p.detalle && <p className="mt-1 text-sm text-slate-500">{p.detalle}</p>}
          </Card>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Los premios de votación salieron de la encuesta del equipo. Próximamente: votación de "mejor jugador del partido"
        nativa en la plataforma.
      </p>
    </div>
  )
}
