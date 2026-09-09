# Prompt para extraer la data oficial de Old Brads (pégalo en Claude for Chrome / claude.ai)

Copia TODO lo que está entre las líneas y pégalo. Debes estar logueado en Instagram en ese navegador.

---

Necesito que actúes como analista de datos deportivos y recopiles información REAL, sin inventar nada. Si un dato no aparece, escribe "sin dato". Vamos por fases y me entregas todo en **tablas Markdown** listas para copiar.

**Equipo objetivo:** "Old Brads" (a veces escrito "Old Brats"), categoría **Junior**, que juega en la **Liga COF – Liga Oriente**, desde marzo 2025 hasta hoy.

### FASE 1 — Instagram del club: https://www.instagram.com/old_brads/
Recorre las publicaciones desde marzo 2025 hasta la más reciente. Para CADA publicación que sea un **resultado de partido** o hito deportivo, extrae:
- Fecha de la publicación
- Temporada/semestre aproximado (1, 2 o 3; temporada 1 = mar–jul 2025, temporada 2 = ago–dic 2025, temporada 3 = 2026)
- Fase (liga/fecha regular, cuartos, semifinal, final, amistoso)
- Marcador: Old Brads X – Y Rival (indica si Old Brads ganó/empató/perdió)
- Rival
- Goleadores de Old Brads (y asistencias si aparecen)
- URL del post

Devuélvelo como tabla: `Fecha | Temporada | Fase | Old Brads (GF) | Rival (GC) | Resultado | Goleadores OB | URL`

También lista aparte los **nombres de jugadores** que veas (con número si aparece) y cualquier **premio/reconocimiento** mencionado.

### FASE 2 — Instagram de la liga: https://www.instagram.com/cofligaoriente/
Busca publicaciones donde aparezca **Old Brads**: resultados, **tablas de posiciones** y **listas de goleadores**. Para cada tabla de posiciones donde esté Old Brads, extrae la tabla COMPLETA con columnas: `Pos | Equipo | Pts | PJ | G | E | P | GF | GC | DG`, e indica a qué semestre corresponde y la URL.

### FASE 3 — Web de la liga: https://cof.cl/futbol-junior/
Abre las imágenes de resultados, tablas y goleadores de la temporada. Transcribe a texto (tabla Markdown) todo lo que mencione a Old Brads: resultados por fecha, posición en la tabla y goleadores del torneo. Indica la temporada y la URL de cada imagen.

### REGLAS
- No inventes marcadores ni goleadores. Si el marcador y los goleadores no cuadran, anótalo como advertencia.
- Diferencia claramente cada temporada/semestre.
- Al final entrégame un **resumen consolidado por temporada**: PJ, G, E, P, GF, GC, DG, y el goleador del equipo.

Cuando termines, dame TODO el output en tablas Markdown para copiar y pegar.

---

## Qué hago yo con eso
Pega aquí (en Claude Code) el resultado que te entregue y yo lo cargo como la data oficial del equipo para la presentación y la plataforma.
