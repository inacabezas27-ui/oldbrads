-- ============================================================
-- 11 de septiembre de 2026 — Sistema de puntos de la carta
--
-- Aplicado en Supabase en cinco migraciones:
--   sistema_de_puntos_colectivo · formula_media_colectiva ·
--   votacion_balon_de_oro_y_plazos · cron_plazos_y_foto_en_juego ·
--   votacion_desempate_por_menciones
--
-- Ideas que lo ordenan:
--   · Gol y asistencia valen lo mismo: buscar el gol propio no conviene.
--   · El arco en cero y la victoria los gana todo el que jugó.
--   · Estar, llegar a la hora y ser titular pesan parecido a lo demás.
--   · La votación funciona como el Balón de Oro: cada uno vota su top 5,
--     se suman todos los votos y solo el podio de ese total suma carta.
--   · No usar la plataforma cuesta: no responder la citación y no votar
--     descuentan un punto cada uno, al vencer el plazo.
-- ============================================================

-- ---------- 1. Ajustes ----------
alter table public.ajustes_carta
  add column if not exists pts_titular       integer not null default 1,
  add column if not exists pts_victoria      integer not null default 1,
  add column if not exists pts_empate        integer not null default 0,
  add column if not exists pts_valla         integer not null default 1,
  add column if not exists pts_valla_arquero integer not null default 2,
  add column if not exists pts_voto_1        integer not null default 3,
  add column if not exists pts_voto_2        integer not null default 2,
  add column if not exists pts_voto_3a5      integer not null default 1,
  add column if not exists pen_no_responde   integer not null default 1,
  add column if not exists pen_no_vota       integer not null default 1;

-- 12 fechas hasta diciembre, partiendo todos en bronce.
update public.ajustes_carta set
  base = 45, piso = 40, tope = 99,
  pts_asistir = 1, pts_puntual = 1, pts_titular = 1,
  pts_victoria = 1, pts_empate = 0,
  pts_valla = 1, pts_valla_arquero = 2,
  pts_gol = 2, pts_asistencia = 2,
  pts_voto = 1, pts_voto_1 = 3, pts_voto_2 = 2, pts_voto_3a5 = 1,
  pts_extra = 1,
  pen_no_fue = 3, pen_atraso = 1, pen_cuota = 2,
  pen_no_responde = 1, pen_no_vota = 1,
  actualizado_en = now()
where id = 1;

-- ---------- 2. Marcas de "no usó la plataforma" ----------
-- Se ponen una sola vez, al vencer el plazo. Responder o votar después no
-- las borra: el punto perdido no se recupera.
alter table public.partido_jugadores
  add column if not exists pen_sin_responder boolean not null default false,
  add column if not exists pen_sin_votar     boolean not null default false;

-- ---------- 3. Plazos del partido ----------
alter table public.partidos
  add column if not exists cierre_confirmacion timestamptz,
  add column if not exists cierre_votacion     timestamptz;

comment on column public.partidos.cierre_confirmacion is
  'Jueves 13:00 previo al partido: último minuto para decir si vas. En NULL no se penaliza a nadie.';
comment on column public.partidos.cierre_votacion is
  'Martes 21:00 posterior al partido: la votación se cierra sola. En NULL no se cierra ni se penaliza.';

-- El partido es el sábado: jueves = -2 días, martes = +3 días.
create or replace function public.plazos_de_partido(p_fecha date)
returns table (confirma timestamptz, vota timestamptz)
language sql immutable as $$
  select
    ((p_fecha - 2)::timestamp + time '13:00') at time zone 'America/Santiago',
    ((p_fecha + 3)::timestamp + time '21:00') at time zone 'America/Santiago';
$$;

create or replace function public.set_plazos_partido()
returns trigger language plpgsql set search_path = public as $$
begin
  if NEW.fecha is not null then
    select confirma, vota into NEW.cierre_confirmacion, NEW.cierre_votacion
      from public.plazos_de_partido(NEW.fecha);
  end if;
  return NEW;
end $$;

drop trigger if exists trg_plazos_partido on public.partidos;
create trigger trg_plazos_partido
  before insert or update of fecha on public.partidos
  for each row execute function public.set_plazos_partido();

-- ---------- 4. La fórmula ----------
create or replace function public.media_de_jugador(p_jugador uuid)
returns integer language sql stable set search_path = public as $$
  with a as (select * from public.ajustes_carta where id = 1),
  j as (select es_dt, lower(coalesce(posicion,'')) as posicion from public.jugadores where id = p_jugador),
  partidos_suma as (
    select coalesce(sum(
        -- ---- estar ----
        case when pj.asistio is true then a.pts_asistir else 0 end
      + case when pj.asistio is true and pj.puntual is true then a.pts_puntual else 0 end
      + case when pj.jugo and pj.titular and not j.es_dt then a.pts_titular else 0 end
      + pj.puntos_extra * a.pts_extra

        -- ---- lo que logra el equipo ----
      + case
          when j.es_dt or not pj.jugo or p.goles_favor is null or p.goles_contra is null then 0
          when p.goles_favor > p.goles_contra then a.pts_victoria
          when p.goles_favor = p.goles_contra then a.pts_empate
          else 0
        end
      + case
          when j.es_dt or not pj.jugo or p.goles_contra is null or p.goles_contra > 0 then 0
          else a.pts_valla + case when j.posicion like '%arquero%' then a.pts_valla_arquero else 0 end
        end

        -- ---- lo propio (al DT lo miden los resultados) ----
      + case
          when j.es_dt then
            case
              when pj.asistio is not true or p.goles_favor is null or p.goles_contra is null then 0
              when p.goles_favor > p.goles_contra then a.pts_dt_victoria
              when p.goles_favor = p.goles_contra then a.pts_dt_empate
              else 0
            end
          else pj.goles * a.pts_gol + pj.asistencias * a.pts_asistencia + pj.puntos_voto * a.pts_voto
        end

        -- ---- penalizaciones ----
      - case
          when p.estado = 'citacion' or pj.asistio is not false then 0
          when pj.confirmado in ('no','lesionado') then 0
          when pj.confirmado = 'si' or pj.citado then a.pen_no_fue
          else 0
        end
      - case when pj.asistio is true and pj.puntual is false then a.pen_atraso else 0 end
      - case when pj.pen_sin_responder then a.pen_no_responde else 0 end
      - case when pj.pen_sin_votar     then a.pen_no_vota     else 0 end
    ), 0) as total
    from public.partido_jugadores pj
    join public.partidos p on p.id = pj.partido_id
    cross join a cross join j
    where pj.jugador_id = p_jugador
  ),
  cuotas_atrasadas as (
    select count(*) as n
    from public.pagos pg join public.cobros c on c.id = pg.cobro_id cross join a
    where pg.jugador_id = p_jugador and not pg.pagado
      and c.fecha < current_date - a.dias_gracia_cuota
  )
  select greatest(a.piso, least(a.tope, a.base + partidos_suma.total - cuotas_atrasadas.n * a.pen_cuota))
  from a, partidos_suma, cuotas_atrasadas;
$$;
revoke execute on function public.media_de_jugador(uuid) from public, anon;
grant execute on function public.media_de_jugador(uuid) to authenticated;

-- ---------- 5. La votación, como el Balón de Oro ----------
-- El empate en puntos se rompe por menciones: quién apareció en el top 5 de
-- más compañeros.
create or replace function public.cerrar_votacion_interno(p_partido uuid, p_penalizar boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare a record; lim timestamptz; mvp uuid;
begin
  select * into a from public.ajustes_carta where id = 1;
  select cierre_votacion into lim from public.partidos where id = p_partido;

  create temp table if not exists _ob_podio (jid uuid, puesto integer) on commit drop;
  delete from _ob_podio;

  insert into _ob_podio (jid, puesto)
  select jid, rank() over (order by puntos desc, menciones desc)
  from (
    select v.votado_jugador_id as jid,
           sum(case v.posicion when 1 then 5 when 2 then 4 when 3 then 3 when 4 then 2 when 5 then 1 else 0 end) as puntos,
           count(*) as menciones
    from public.votos v where v.partido_id = p_partido
    group by v.votado_jugador_id
  ) b;

  update public.partido_jugadores set puntos_voto = 0 where partido_id = p_partido;

  insert into public.partido_jugadores (partido_id, jugador_id, puntos_voto)
  select p_partido, jid,
         case puesto when 1 then a.pts_voto_1 when 2 then a.pts_voto_2 else a.pts_voto_3a5 end
  from _ob_podio where puesto <= 5
  on conflict (partido_id, jugador_id) do update set puntos_voto = excluded.puntos_voto;

  select jid into mvp from _ob_podio where puesto = 1 limit 1;
  update public.partidos set mvp_jugador_id = mvp where id = p_partido;

  -- El que fue al partido y no votó pierde un punto, pero solo si el plazo
  -- venció de verdad: cerrar antes de tiempo no puede castigar a nadie.
  if p_penalizar and lim is not null and now() >= lim then
    update public.partido_jugadores pj set pen_sin_votar = true
     where pj.partido_id = p_partido
       and pj.asistio is true
       and not pj.pen_sin_votar
       and not exists (
         select 1 from public.votos v
          join public.perfiles pf on pf.user_id = v.votante_user_id
         where v.partido_id = p_partido and pf.jugador_id = pj.jugador_id
       );
  end if;

  update public.partidos set estado = 'cerrado' where id = p_partido;
  drop table if exists _ob_podio;
end $$;
revoke execute on function public.cerrar_votacion_interno(uuid, boolean) from public, anon, authenticated;

create or replace function public.aplicar_votacion(p_partido uuid)
returns void language plpgsql security definer set search_path = public as $$
declare est text;
begin
  if not public.es_directiva() then
    raise exception 'Solo la directiva puede cerrar la votación';
  end if;
  select estado into est from public.partidos where id = p_partido;
  if est is null then raise exception 'El partido no existe'; end if;
  if est not in ('votacion','cerrado') then
    raise exception 'La votación de este partido no está abierta';
  end if;
  perform public.cerrar_votacion_interno(p_partido, true);
end $$;
revoke execute on function public.aplicar_votacion(uuid) from public, anon;
grant execute on function public.aplicar_votacion(uuid) to authenticated;

-- ---------- 6. Los plazos, sin que nadie tenga que acordarse ----------
create or replace function public.cerrar_confirmaciones_vencidas()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.partido_jugadores pj set pen_sin_responder = true
    from public.partidos p
   where p.id = pj.partido_id
     and p.estado = 'citacion'
     and p.cierre_confirmacion is not null
     and now() >= p.cierre_confirmacion
     and pj.confirmado is null
     and not pj.pen_sin_responder;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.cerrar_confirmaciones_vencidas() from public, anon, authenticated;

create or replace function public.cerrar_votaciones_vencidas()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in
    select id from public.partidos
     where estado = 'votacion' and cierre_votacion is not null and now() >= cierre_votacion
  loop
    perform public.cerrar_votacion_interno(r.id, true);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.cerrar_votaciones_vencidas() from public, anon, authenticated;

create or replace function public.tareas_programadas()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.cerrar_confirmaciones_vencidas();
  perform public.cerrar_votaciones_vencidas();
end $$;
revoke execute on function public.tareas_programadas() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule('old-brads-plazos') where exists (select 1 from cron.job where jobname = 'old-brads-plazos');
select cron.schedule('old-brads-plazos', '*/10 * * * *', $$select public.tareas_programadas();$$);

-- ---------- 7. La foto en juego, premio del último nivel ----------
alter table public.jugadores add column if not exists foto_accion_url text;

drop view if exists public.pub_plantel;
create view public.pub_plantel as
  select id, nombres, apellido_paterno, apellido_materno, numero_camiseta,
         posicion, carta_overall, foto_url, foto_accion_url, es_dt
  from public.jugadores
  where activo = true;
revoke all on public.pub_plantel from anon;
grant select on public.pub_plantel to authenticated;
