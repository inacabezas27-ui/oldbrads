-- ============================================================
-- 11 de septiembre de 2026 — Apodo, y premiar en vez de castigar
--
-- Aplicado en Supabase como: apodo_del_jugador · premiar_en_vez_de_castigar ·
-- mis_datos_con_apodo · mis_cuotas_atrasadas
--
-- Matemáticamente premiar y castigar es lo mismo (la diferencia entre cumplir
-- y no cumplir sigue siendo un punto), pero el mensaje cambia por completo.
-- Para que las cuentas cuadren la base baja de 45 a 22: los puntos que antes
-- se descontaban ahora hay que ganarlos.
--
-- Queda una sola penalización: anotarte y no llegar. Es la única donde el
-- costo lo paga otro.
-- ============================================================

-- ---------- El apodo, que es el nombre de la carta ----------
alter table public.jugadores add column if not exists apodo text;

drop view if exists public.pub_plantel;
create view public.pub_plantel as
  select id, nombres, apellido_paterno, apellido_materno, apodo, numero_camiseta,
         posicion, carta_overall, foto_url, foto_accion_url, es_dt
  from public.jugadores
  where activo = true;
revoke all on public.pub_plantel from anon;
grant select on public.pub_plantel to authenticated;

drop function if exists public.mis_datos();
create function public.mis_datos()
returns table(id uuid, nombres text, apellido_paterno text, apellido_materno text,
              rut text, fecha_nacimiento date, profesion text, email text,
              telefono text, direccion text, comuna text, talla_polera text,
              talla_short text, numero_camiseta integer, posicion text, apodo text)
language sql stable security definer set search_path = public as $$
  select j.id, j.nombres, j.apellido_paterno, j.apellido_materno, j.rut,
         j.fecha_nacimiento, j.profesion, j.email, j.telefono, j.direccion,
         j.comuna, j.talla_polera, j.talla_short, j.numero_camiseta, j.posicion,
         j.apodo
  from public.jugadores j
  where j.id = public.mi_jugador_id();
$$;
revoke execute on function public.mis_datos() from public, anon;
grant execute on function public.mis_datos() to authenticated;

create or replace function public.actualizar_mis_datos(
  p_nombres text, p_apellido_paterno text,
  p_apellido_materno text default null, p_rut text default null,
  p_fecha_nacimiento date default null, p_profesion text default null,
  p_email text default null, p_telefono text default null,
  p_direccion text default null, p_comuna text default null,
  p_talla_polera text default null, p_talla_short text default null,
  p_numero_camiseta integer default null, p_posicion text default null,
  p_apodo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare jid uuid;
begin
  jid := public.mi_jugador_id();
  if jid is null then
    raise exception 'Tu usuario no está enlazado a un jugador del plantel';
  end if;
  if coalesce(btrim(p_nombres), '') = '' or coalesce(btrim(p_apellido_paterno), '') = '' then
    raise exception 'El nombre y el apellido son obligatorios';
  end if;
  if length(coalesce(btrim(p_apodo), '')) > 14 then
    raise exception 'El apodo no puede pasar de 14 letras: tiene que caber en la carta';
  end if;

  update public.jugadores set
    nombres           = btrim(p_nombres),
    apellido_paterno  = btrim(p_apellido_paterno),
    apellido_materno  = nullif(btrim(coalesce(p_apellido_materno, '')), ''),
    rut               = nullif(btrim(coalesce(p_rut, '')), ''),
    fecha_nacimiento  = p_fecha_nacimiento,
    profesion         = nullif(btrim(coalesce(p_profesion, '')), ''),
    email             = nullif(btrim(coalesce(p_email, '')), ''),
    telefono          = nullif(btrim(coalesce(p_telefono, '')), ''),
    direccion         = nullif(btrim(coalesce(p_direccion, '')), ''),
    comuna            = nullif(btrim(coalesce(p_comuna, '')), ''),
    talla_polera      = nullif(btrim(coalesce(p_talla_polera, '')), ''),
    talla_short       = nullif(btrim(coalesce(p_talla_short, '')), ''),
    numero_camiseta   = p_numero_camiseta,
    posicion          = nullif(btrim(coalesce(p_posicion, '')), ''),
    apodo             = nullif(btrim(coalesce(p_apodo, '')), '')
  where id = jid;
end $$;

-- ---------- Los premios nuevos ----------
alter table public.ajustes_carta
  add column if not exists pts_responde      integer not null default 1,
  add column if not exists pts_vota          integer not null default 1,
  add column if not exists pts_encuesta      integer not null default 1,
  add column if not exists pts_cuotas_al_dia integer not null default 2;

update public.ajustes_carta set
  base = 22, piso = 18, tope = 99,
  pts_asistir = 1, pts_puntual = 1, pts_titular = 1,
  pts_responde = 1, pts_vota = 1, pts_encuesta = 1, pts_cuotas_al_dia = 2,
  pts_valla = 1, pts_valla_arquero = 2,
  pts_gol = 2, pts_asistencia = 2,
  pts_voto = 1, pts_voto_1 = 3, pts_voto_2 = 2, pts_voto_3a5 = 1,
  pts_extra = 1,
  pts_victoria = 0, pts_empate = 0,
  pen_atraso = 0, pen_cuota = 0, pen_no_responde = 0, pen_no_vota = 0,
  pen_no_fue = 3,
  actualizado_en = now()
where id = 1;

-- ---------- La fórmula ----------
create or replace function public.media_de_jugador(p_jugador uuid)
returns integer language sql stable set search_path = public as $$
  with a as (select * from public.ajustes_carta where id = 1),
  j as (select es_dt, lower(coalesce(posicion,'')) as posicion from public.jugadores where id = p_jugador),
  usuarios as (select user_id from public.perfiles where jugador_id = p_jugador),
  partidos_suma as (
    select coalesce(sum(
        case when pj.asistio is true then a.pts_asistir else 0 end
      + case when pj.asistio is true and pj.puntual is true then a.pts_puntual else 0 end
      + case when pj.jugo and pj.titular and not j.es_dt then a.pts_titular else 0 end
      + pj.puntos_extra * a.pts_extra
      + case when pj.confirmado is not null and not pj.pen_sin_responder then a.pts_responde else 0 end
      + case when exists (
          select 1 from public.votos v
          where v.partido_id = pj.partido_id
            and v.votante_user_id in (select user_id from usuarios)
        ) then a.pts_vota else 0 end
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
  encuestas_respondidas as (
    select count(*) as n from public.encuesta_participantes ep
    where ep.user_id in (select user_id from usuarios)
  ),
  cuotas_atrasadas as (
    select count(*) as n
    from public.pagos pg join public.cobros c on c.id = pg.cobro_id cross join a
    where pg.jugador_id = p_jugador and not pg.pagado
      and c.fecha < current_date - a.dias_gracia_cuota
  )
  select greatest(a.piso, least(a.tope,
      a.base
    + partidos_suma.total
    + encuestas_respondidas.n * a.pts_encuesta
    + case when cuotas_atrasadas.n = 0 then a.pts_cuotas_al_dia else 0 end
    - cuotas_atrasadas.n * a.pen_cuota))
  from a, partidos_suma, encuestas_respondidas, cuotas_atrasadas;
$$;
revoke execute on function public.media_de_jugador(uuid) from public, anon;
grant execute on function public.media_de_jugador(uuid) to authenticated;

-- La media depende ahora de votar y de responder encuestas: esas dos tablas
-- también tienen que gatillar el recálculo.
create or replace function public.recompute_por_usuario()
returns trigger language plpgsql set search_path = public as $$
declare uid uuid;
begin
  uid := coalesce(NEW.votante_user_id, OLD.votante_user_id);
  update public.jugadores j set carta_overall = public.media_de_jugador(j.id)
   where j.id in (select jugador_id from public.perfiles where user_id = uid and jugador_id is not null);
  return null;
end $$;

drop trigger if exists trg_recompute_por_voto on public.votos;
create trigger trg_recompute_por_voto
  after insert or delete on public.votos
  for each row execute function public.recompute_por_usuario();

create or replace function public.recompute_por_encuesta()
returns trigger language plpgsql set search_path = public as $$
declare uid uuid;
begin
  uid := coalesce(NEW.user_id, OLD.user_id);
  update public.jugadores j set carta_overall = public.media_de_jugador(j.id)
   where j.id in (select jugador_id from public.perfiles where user_id = uid and jugador_id is not null);
  return null;
end $$;

drop trigger if exists trg_recompute_por_encuesta on public.encuesta_participantes;
create trigger trg_recompute_por_encuesta
  after insert or delete on public.encuesta_participantes
  for each row execute function public.recompute_por_encuesta();

-- El jugador no puede leer los pagos (son las finanzas del club) pero sí tiene
-- que ver por qué su carta suma o no el punto de estar al día.
create or replace function public.mis_cuotas_atrasadas()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer
  from public.pagos pg
  join public.cobros c on c.id = pg.cobro_id
  cross join public.ajustes_carta a
  where a.id = 1
    and pg.jugador_id = public.mi_jugador_id()
    and not pg.pagado
    and c.fecha < current_date - a.dias_gracia_cuota;
$$;
revoke execute on function public.mis_cuotas_atrasadas() from public, anon;
grant execute on function public.mis_cuotas_atrasadas() to authenticated;
