import type { ReactNode } from 'react'
import { Card } from './ui'

export default function Placeholder({
  title,
  descripcion,
  fase,
  children,
}: {
  title: string
  descripcion: string
  fase?: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-ink-900">{title}</h1>
        {fase && (
          <span className="rounded-full bg-ink-900/5 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink-700">
            {fase}
          </span>
        )}
      </div>
      <Card className="p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-ink-900">Módulo en construcción</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">{descripcion}</p>
          </div>
          {children}
        </div>
      </Card>
    </div>
  )
}
