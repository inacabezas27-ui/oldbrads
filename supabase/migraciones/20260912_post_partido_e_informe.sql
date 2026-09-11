-- ============================================================
-- 12 de septiembre de 2026 — El post partido como una sola cosa
--
-- Aplicado en Supabase como: encuesta_del_partido_y_ventana_de_votacion
--
-- La encuesta queda colgada del partido y se responde junto con el top 5.
-- La ventana la marca el calendario del club: se juega el sábado, se abre el
-- domingo al mediodía y se cierra el martes a las 09:00, para que la directiva
-- llegue el miércoles a la reunión con el informe hecho.
-- ============================================================

alter table public.encuestas
  add column if not exists partido_id uuid references public.partidos(id) on delete cascade;

alter table public.partidos
  add column if not exists apertura_votacion   timestamptz,
  add column if not exists informe             text,
  add column if not exists informe_generado_en timestamptz;

comment on column public.partidos.apertura_votacion is
  'Domingo 12:00 posterior al partido: se abre la votación y la encuesta.';
comment on column public.partidos.informe is
  'Informe del partido escrito a partir de los votos y la encuesta.';

-- Sábado de partido: jueves -2 (13:00), domingo +1 (12:00), martes +3 (09:00).
drop function if exists public.plazos_de_partido(date);
create function public.plazos_de_partido(p_fecha date)
returns table (confirma timestamptz, abre timestamptz, vota timestamptz)
language sql immutable as $$
  select
    ((p_fecha - 2)::timestamp + time '13:00') at time zone 'America/Santiago',
    ((p_fecha + 1)::timestamp + time '12:00') at time zone 'America/Santiago',
    ((p_fecha + 3)::timestamp + time '09:00') at time zone 'America/Santiago';
$$;

create or replace function public.set_plazos_partido()
returns trigger language plpgsql set search_path = public as $$
begin
  if NEW.fecha is not null then
    select confirma, abre, vota
      into NEW.cierre_confirmacion, NEW.apertura_votacion, NEW.cierre_votacion
      from public.plazos_de_partido(NEW.fecha);
  end if;
  return NEW;
end $$;

-- La votación se abre sola el domingo, pero solo si la directiva ya cargó el
-- resultado: sin saber quién jugó no se puede votar por nadie.
create or replace function public.abrir_votaciones_del_domingo()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.partidos p set estado = 'votacion'
   where p.estado = 'jugado'
     and p.apertura_votacion is not null
     and now() >= p.apertura_votacion
     and p.goles_favor is not null and p.goles_contra is not null;
  get diagnostics n = row_count;

  update public.encuestas e set estado = 'abierta'
    from public.partidos p
   where p.id = e.partido_id and p.estado = 'votacion' and e.estado = 'borrador';

  update public.encuestas e set estado = 'cerrada'
    from public.partidos p
   where p.id = e.partido_id and p.estado = 'cerrado' and e.estado = 'abierta';

  return n;
end $$;
revoke execute on function public.abrir_votaciones_del_domingo() from public, anon, authenticated;

create or replace function public.tareas_programadas()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.cerrar_confirmaciones_vencidas();
  perform public.abrir_votaciones_del_domingo();
  perform public.cerrar_votaciones_vencidas();
  -- El cierre pudo dejar encuestas abiertas de partidos ya cerrados.
  perform public.abrir_votaciones_del_domingo();
end $$;
revoke execute on function public.tareas_programadas() from public, anon, authenticated;

create or replace function public.guardar_informe(p_partido uuid, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_directiva() then
    raise exception 'Solo la directiva puede guardar el informe del partido';
  end if;
  update public.partidos
     set informe = p_texto, informe_generado_en = now()
   where id = p_partido;
end $$;
revoke execute on function public.guardar_informe(uuid, text) from public, anon;
grant execute on function public.guardar_informe(uuid, text) to authenticated;

-- ============================================================
-- Añadido el mismo día: encuesta_post_partido_automatica
--
-- Cada partido nace con su encuesta lista, en borrador, y se abre sola el
-- domingo junto con la votación. Antes había que acordarse de crearla a mano
-- cada semana, y la semana que se olvide no hay nada que analizar el miércoles.
-- Se sacó la pregunta de la jugada del partido: con el top 5 votado por todos
-- ya está cubierto quién fue determinante.
-- ============================================================
create or replace function public.crear_encuesta_del_partido()
returns trigger language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  insert into public.encuestas (titulo, descripcion, tipo, estado, anonima, partido_id)
  values (
    'Encuesta post partido · ' || NEW.rival,
    'Dos minutos para cerrar la fecha.',
    'post_partido', 'borrador', true, NEW.id
  )
  returning id into eid;

  insert into public.encuesta_preguntas (encuesta_id, orden, texto, tipo, opciones, obligatoria) values
    (eid, 0, '¿Cómo estuvo el equipo hoy?', 'escala', '{}', true),
    (eid, 1, '¿Algo que decir a la directiva? (cancha, horario, arbitraje, lo que sea)', 'texto', '{}', false);

  return null;
end $$;

drop trigger if exists trg_encuesta_del_partido on public.partidos;
create trigger trg_encuesta_del_partido
  after insert on public.partidos
  for each row execute function public.crear_encuesta_del_partido();

-- ============================================================
-- Añadido el mismo día: limpieza_de_auditoria
-- ============================================================

-- Tabla de apuntes que quedó de una prueba del cálculo de temporadas. No tenía
-- RLS, así que PostgREST la exponía a cualquiera.
drop table if exists public._t;

-- Es una función de trigger: nadie tiene por qué poder llamarla como RPC.
revoke execute on function public.crear_encuesta_del_partido() from public, anon, authenticated;

-- Fijar el search_path, como el resto de las funciones.
drop function if exists public.plazos_de_partido(date);
create function public.plazos_de_partido(p_fecha date)
returns table (confirma timestamptz, abre timestamptz, vota timestamptz)
language sql immutable set search_path = public as $$
  select
    ((p_fecha - 2)::timestamp + time '13:00') at time zone 'America/Santiago',
    ((p_fecha + 1)::timestamp + time '12:00') at time zone 'America/Santiago',
    ((p_fecha + 3)::timestamp + time '09:00') at time zone 'America/Santiago';
$$;

-- Al agregar el apodo quedó viva la versión vieja de actualizar_mis_datos, sin
-- ese campo. Con dos funciones del mismo nombre, PostgREST elige según los
-- argumentos que lleguen: un día guardaría el apodo y otro lo ignoraría.
drop function if exists public.actualizar_mis_datos(
  text, text, text, text, date, text, text, text, text, text, text, text, integer, text);

comment on view public.pub_plantel is
  'Vista del plantel para la app de jugadores: solo columnas no sensibles. Es SECURITY DEFINER a propósito, porque jugadores tiene RLS de directiva. Revocada para anon.';
