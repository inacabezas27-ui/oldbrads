type Bloque = { titulo: string; parrafos?: string[]; items?: string[]; sub?: Bloque[] }

const SECCIONES: Bloque[] = [
  {
    titulo: '1. Principio general',
    parrafos: [
      'Old Brads es un equipo competitivo que aspira a funcionar con estándares claros de seriedad y profesionalismo. La preparación física, la conducta, el respeto por el equipo y el cumplimiento de normas básicas son condiciones indispensables para formar parte del plantel y competir.',
      'Los beneficios deportivos y los minutos en cancha se obtienen en función del compromiso integral del jugador.',
    ],
  },
  {
    titulo: '2. Entrenamiento y compromiso físico',
    sub: [
      {
        titulo: '2.1 Entrenamiento individual',
        parrafos: ['Todos los jugadores deben mantener una rutina mínima de entrenamiento personal durante la temporada. Como señal concreta de compromiso, deberán enviar evidencia:'],
        items: ['Fotografías entrenando', 'Sesiones de gimnasio', 'Trote u otras actividades físicas'],
      },
      {
        titulo: '2.2 Entrenamiento grupal',
        parrafos: ['El equipo fomentará instancias de entrenamiento conjunto. La asistencia y disposición a participar será considerada dentro de la evaluación deportiva interna.'],
      },
      {
        titulo: '2.3 Entrenamiento grupal con balón (obligatorio)',
        parrafos: ['Un día fijo a la semana, guiado por un miembro de la directiva, enfocado en lo táctico: funcionamiento colectivo, conceptos del equipo y cohesión entre líneas.'],
        items: ['La asistencia influye en el compromiso, la preparación física y la asignación de minutos.', 'La inasistencia injustificada o reiterada es una falta deportiva y se refleja en la evaluación.'],
      },
    ],
  },
  {
    titulo: '3. Indumentaria obligatoria',
    parrafos: ['Para cada partido todo jugador debe presentarse con:'],
    items: ['Zapatos adecuados para fútbol', 'Canilleras', 'Botella de agua personal'],
    sub: [
      {
        titulo: '3.2 Falta de indumentaria',
        parrafos: ['No portar estos elementos perjudica al equipo, afecta la organización y compromete la seguridad. Se considera falta deportiva y se refleja en la asignación de minutos.'],
      },
    ],
  },
  {
    titulo: '4. Beneficios deportivos — minutos en cancha',
    parrafos: ['Los minutos de juego no son garantizados. La participación se define considerando:'],
    items: ['Compromiso con los entrenamientos', 'Condición física', 'Conducta dentro y fuera de la cancha', 'Cumplimiento de normas de indumentaria', 'Respeto por las reglas del equipo'],
  },
  {
    titulo: '5. Régimen de sanciones',
    sub: [
      {
        titulo: '5.1 Incumplimientos de entrenamiento',
        parrafos: ['Se consideran incumplimientos: no enviar evidencia, faltar a entrenamientos grupales, inasistencias al entrenamiento con balón, o desinterés sostenido por la preparación.'],
        items: ['Reducción de minutos en cancha', 'Pérdida de prioridad deportiva frente a otros jugadores'],
      },
      {
        titulo: '5.2 Conducta previa a los partidos',
        parrafos: ['Faltas graves: carretear de forma desmedida el día anterior, presentarse con signos de consumo excesivo de alcohol, o llegar en malas condiciones físicas.'],
        items: ['Reducción significativa de minutos', 'Exclusión parcial o total del partido, según criterio de la directiva'],
      },
      {
        titulo: '5.3 Sanciones durante el partido',
        parrafos: ['Solo se sancionan internamente las tarjetas rojas directas: el jugador deberá llevarse toda la ropa oficial del equipo usada en el partido para lavarla en su casa.'],
      },
    ],
  },
  {
    titulo: '6. Cierre',
    parrafos: [
      'El rendimiento deportivo es consecuencia directa del compromiso, la disciplina y el respeto por el grupo. Este reglamento busca consolidar una cultura de responsabilidad y seriedad, donde cada jugador comprenda que su comportamiento impacta al equipo completo.',
      'Pertenecer a Old Brads implica entrenar, cuidarse, respetar las normas y responder por la camiseta dentro y fuera de la cancha.',
    ],
  },
]

function BloqueView({ b, nivel = 0 }: { b: Bloque; nivel?: number }) {
  return (
    <div className={nivel === 0 ? 'rounded-2xl bg-white p-6 ring-1 ring-slate-200' : 'mt-4'}>
      <h3 className={nivel === 0 ? 'text-lg font-black text-ink-900' : 'font-bold text-ink-900'}>{b.titulo}</h3>
      {b.parrafos?.map((p, i) => (
        <p key={i} className="mt-2 text-sm leading-relaxed text-slate-600">{p}</p>
      ))}
      {b.items && (
        <ul className="mt-2 space-y-1">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="text-brand-600">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
      {b.sub?.map((s, i) => <BloqueView key={i} b={s} nivel={nivel + 1} />)}
    </div>
  )
}

export default function Reglamento() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Uso interno del club</p>
        <h1 className="mt-1 text-2xl font-black text-ink-900">Reglamento del plantel</h1>
        <p className="mt-1 text-sm text-slate-500">Entrenamiento, beneficios, indumentaria y sanciones deportivas · Old Brads – Bradford Alumni FC</p>
      </div>
      <div className="space-y-4">
        {SECCIONES.map((s, i) => <BloqueView key={i} b={s} />)}
      </div>
    </div>
  )
}
