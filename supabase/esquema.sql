-- =====================================================================
-- Old Brads · esquema completo de la base de datos (Supabase / Postgres)
-- Exportado del proyecto en producción el 2026-09-08.
--
-- Sirve para recrear la base desde cero en un proyecto Supabase nuevo:
-- pegar este archivo entero en el SQL Editor y ejecutar. Es idempotente
-- en lo posible (create if not exists / or replace); las constraints y
-- policies fallan si ya existen, lo cual es correcto en una base vacía.
--
-- NO contiene datos ni usuarios: ver README-migracion.md.
-- =====================================================================

-- ---------- 1. Tipos ----------
do $$ begin
  create type public.tipo_cobro as enum ('cuota', 'extra');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.tipo_movimiento as enum ('ingreso', 'egreso');
exception when duplicate_object then null; end $$;

-- ---------- 2. Tablas ----------

-- Plantel. carta_* son los atributos de la carta tipo FIFA de cada jugador.
create table if not exists public.jugadores (
  id uuid default gen_random_uuid() not null,
  numero_lista integer,
  apellido_paterno text not null,
  apellido_materno text,
  nombres text not null,
  rut text,
  fecha_nacimiento date,
  profesion text,
  email text,
  telefono text,
  direccion text,
  comuna text,
  ex_profesional boolean default false not null,
  talla_polera text,
  talla_short text,
  numero_camiseta integer,
  posicion text,
  grupo_wsp text,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  carta_overall integer default 60,   -- igual a ajustes_carta.base
  carta_ritmo integer default 74,
  carta_tiro integer default 68,
  carta_pase integer default 80,
  carta_regate integer default 78,
  carta_defensa integer default 66,
  carta_fisico integer default 70,
  foto_url text,
  es_dt boolean default false not null,
  pos_formacion text
);

create table if not exists public.temporadas (
  id uuid default gen_random_uuid() not null,
  orden integer not null,
  nombre text not null,
  anio integer,
  semestre integer,
  pj integer default 0,
  g integer default 0,
  e integer default 0,
  p integer default 0,
  gf integer default 0,
  gc integer default 0,
  puntos integer default 0,
  posicion integer,
  resultado text,
  notas text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.equipos (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  division integer,
  logo_url text,
  es_old_brads boolean default false not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.fechas (
  id uuid default gen_random_uuid() not null,
  temporada text default 'Clausura 2026'::text not null,
  etiqueta text not null,
  fecha date,
  jugable boolean default true not null,
  nota text,
  orden integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.partidos (
  id uuid default gen_random_uuid() not null,
  temporada_id uuid,
  fecha date,
  hora text,
  rival text not null,
  cancha text,
  es_local boolean default true,
  fase text default 'Liga'::text,
  goles_favor integer,
  goles_contra integer,
  -- ciclo: citacion -> jugado -> votacion -> cerrado
  estado text default 'citacion'::text not null,
  mvp_jugador_id uuid,
  notas text,
  created_at timestamp with time zone default now() not null
);

-- Participación de cada jugador en cada partido. puntos_voto lo llena
-- aplicar_votacion(); puntos_extra lo pone la directiva a mano.
create table if not exists public.partido_jugadores (
  id uuid default gen_random_uuid() not null,
  partido_id uuid,
  jugador_id uuid,
  citado boolean default false not null,
  jugo boolean default false not null,
  titular boolean default false not null,
  goles integer default 0 not null,
  asistencias integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  puntos_voto integer default 0 not null,
  puntos_extra integer default 0 not null,
  -- "fue" es distinto de "jugó": suma igual aunque se haya quedado en la banca
  asistio boolean default false not null,
  puntual boolean default false not null,
  -- lo responde el propio jugador durante la citación
  confirmado text,
  confirmado_at timestamp with time zone
);

create table if not exists public.formaciones (
  id uuid default gen_random_uuid() not null,
  nombre text default 'Titular'::text,
  formacion text default '4-3-3'::text not null,
  posiciones jsonb default '{}'::jsonb not null,
  actual boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.goleadores (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  goles integer default 0 not null,
  temporada_id uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.premios (
  id uuid default gen_random_uuid() not null,
  temporada_id uuid,
  categoria text not null,
  ganador text not null,
  detalle text,
  tipo text,
  orden integer default 0,
  created_at timestamp with time zone default now() not null
);

-- ---------- Finanzas ----------
create table if not exists public.cobros (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  tipo tipo_cobro default 'cuota'::tipo_cobro not null,
  periodo text,
  monto integer default 0 not null,
  fecha date default CURRENT_DATE not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.pagos (
  id uuid default gen_random_uuid() not null,
  cobro_id uuid not null,
  jugador_id uuid not null,
  monto integer default 0 not null,
  pagado boolean default false not null,
  fecha_pago date,
  metodo text,
  nota text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.movimientos_caja (
  id uuid default gen_random_uuid() not null,
  tipo tipo_movimiento not null,
  categoria text not null,
  descripcion text,
  monto integer default 0 not null,
  fecha date default CURRENT_DATE not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.cuotas_liga (
  id uuid default gen_random_uuid() not null,
  orden integer default 0 not null,
  nombre text not null,
  periodo text,
  fecha_venc date,
  monto integer default 0 not null,
  pagada boolean default false not null,
  fecha_pago date,
  nota text,
  created_at timestamp with time zone default now() not null
);

-- ---------- Cuentas y votación ----------
-- Un perfil por usuario de auth. rol = 'directiva' (acceso total) o
-- 'jugador' (solo su carta y su voto).
create table if not exists public.perfiles (
  user_id uuid not null,
  jugador_id uuid,
  nombre_usuario text,
  rol text default 'jugador'::text not null,
  -- false mientras siga con la clave inicial que le dio el club
  clave_cambiada boolean default false not null,
  created_at timestamp with time zone default now() not null
);

-- Top 5 que vota cada jugador después de un partido (posicion 1 = mejor).
create table if not exists public.votos (
  id uuid default gen_random_uuid() not null,
  partido_id uuid not null,
  votante_user_id uuid default auth.uid() not null,
  votado_jugador_id uuid not null,
  posicion smallint not null,
  created_at timestamp with time zone default now() not null
);

-- ---------- 3. Claves y restricciones ----------
alter table public.jugadores          add constraint jugadores_pkey PRIMARY KEY (id);
alter table public.temporadas         add constraint temporadas_pkey PRIMARY KEY (id);
alter table public.equipos            add constraint equipos_pkey PRIMARY KEY (id);
alter table public.fechas             add constraint fechas_pkey PRIMARY KEY (id);
alter table public.partidos           add constraint partidos_pkey PRIMARY KEY (id);
alter table public.partido_jugadores  add constraint partido_jugadores_pkey PRIMARY KEY (id);
alter table public.formaciones        add constraint formaciones_pkey PRIMARY KEY (id);
alter table public.goleadores         add constraint goleadores_pkey PRIMARY KEY (id);
alter table public.premios            add constraint premios_pkey PRIMARY KEY (id);
alter table public.cobros             add constraint cobros_pkey PRIMARY KEY (id);
alter table public.pagos              add constraint pagos_pkey PRIMARY KEY (id);
alter table public.movimientos_caja   add constraint movimientos_caja_pkey PRIMARY KEY (id);
alter table public.cuotas_liga        add constraint cuotas_liga_pkey PRIMARY KEY (id);
alter table public.perfiles           add constraint perfiles_pkey PRIMARY KEY (user_id);
alter table public.votos              add constraint votos_pkey PRIMARY KEY (id);

alter table public.partidos add constraint partidos_estado_check
  CHECK (estado in ('citacion','jugado','votacion','cerrado'));
alter table public.partidos add constraint partidos_temporada_id_fkey
  FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE SET NULL;
alter table public.partidos add constraint partidos_mvp_jugador_id_fkey
  FOREIGN KEY (mvp_jugador_id) REFERENCES jugadores(id) ON DELETE SET NULL;
alter table public.partido_jugadores add constraint partido_jugadores_partido_id_fkey
  FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE;
alter table public.partido_jugadores add constraint partido_jugadores_jugador_id_fkey
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE;
alter table public.partido_jugadores add constraint partido_jugadores_partido_id_jugador_id_key
  UNIQUE (partido_id, jugador_id);
alter table public.partido_jugadores add constraint pj_confirmado_check
  CHECK (confirmado is null or confirmado in ('si','no','duda'));
alter table public.goleadores add constraint goleadores_temporada_id_fkey
  FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE SET NULL;
alter table public.premios add constraint premios_temporada_id_fkey
  FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE SET NULL;
alter table public.pagos add constraint pagos_cobro_id_fkey
  FOREIGN KEY (cobro_id) REFERENCES cobros(id) ON DELETE CASCADE;
alter table public.pagos add constraint pagos_jugador_id_fkey
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE;
alter table public.pagos add constraint pagos_cobro_id_jugador_id_key UNIQUE (cobro_id, jugador_id);
alter table public.perfiles add constraint perfiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.perfiles add constraint perfiles_jugador_id_fkey
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE SET NULL;
alter table public.perfiles add constraint perfiles_rol_check
  CHECK ((rol = ANY (ARRAY['directiva'::text, 'jugador'::text])));
alter table public.votos add constraint votos_partido_id_fkey
  FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE;
alter table public.votos add constraint votos_votante_user_id_fkey
  FOREIGN KEY (votante_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.votos add constraint votos_votado_jugador_id_fkey
  FOREIGN KEY (votado_jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE;
alter table public.votos add constraint votos_posicion_check CHECK (((posicion >= 1) AND (posicion <= 5)));
-- Un jugador no puede repetir puesto ni votar dos veces por la misma persona
alter table public.votos add constraint votos_partido_id_votante_user_id_posicion_key
  UNIQUE (partido_id, votante_user_id, posicion);
alter table public.votos add constraint votos_partido_id_votante_user_id_votado_jugador_id_key
  UNIQUE (partido_id, votante_user_id, votado_jugador_id);

-- ---------- 4. Índices ----------
create index if not exists movimientos_fecha_idx on public.movimientos_caja using btree (fecha);
create index if not exists pagos_cobro_idx       on public.pagos using btree (cobro_id);
create index if not exists pagos_jugador_idx     on public.pagos using btree (jugador_id);
create index if not exists pj_jugador_idx        on public.partido_jugadores using btree (jugador_id);
create index if not exists pj_partido_idx        on public.partido_jugadores using btree (partido_id);
create index if not exists votos_partido_idx     on public.votos using btree (partido_id);

-- ---------- 4b. La economía de la carta ----------
-- Temporada tipo: 11 fechas + cuartos + semi + final = 14 partidos.
--   base 60 + (ir 1 + puntual 1) x 14 = 88  -> justo el umbral de Oro
--   de 88 a 99 se llega con goles, asistencias y votos.
create table if not exists public.ajustes_carta (
  id smallint primary key default 1 check (id = 1),
  base            integer not null default 60,
  tope            integer not null default 99,
  pts_asistir     integer not null default 1,
  pts_puntual     integer not null default 1,
  pts_gol         integer not null default 3,
  pts_asistencia  integer not null default 2,
  pts_voto        integer not null default 1,
  pts_extra       integer not null default 1,
  -- al DT lo miden los resultados del equipo, no las estadísticas personales
  pts_dt_victoria integer not null default 3,
  pts_dt_empate   integer not null default 1,
  actualizado_en  timestamptz not null default now()
);
insert into public.ajustes_carta (id) values (1) on conflict (id) do nothing;

alter table public.ajustes_carta enable row level security;
create policy "ver_ajustes" on public.ajustes_carta for SELECT to authenticated using (true);
create policy "dir_ajustes" on public.ajustes_carta for ALL to authenticated using (es_directiva()) with check (es_directiva());

-- ---------- 5. Funciones ----------

-- ¿El usuario conectado es de la directiva? SECURITY DEFINER para poder
-- leer perfiles sin caer en recursión de RLS.
CREATE OR REPLACE FUNCTION public.es_directiva()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(
    select 1 from public.perfiles
    where user_id = auth.uid() and rol = 'directiva'
  );
$function$;

-- Jugador asociado al usuario conectado (null si es directiva sin ficha).
create or replace function public.mi_jugador_id()
returns uuid language sql stable security definer set search_path = public as $$
  select jugador_id from public.perfiles where user_id = auth.uid();
$$;

-- El jugador solo puede tocar SU confirmación, y solo con la citación abierta.
create or replace function public.confirmar_asistencia(p_partido uuid, p_respuesta text)
returns void language plpgsql security definer set search_path = public as $$
declare jid uuid; est text;
begin
  if p_respuesta not in ('si','no','duda') then
    raise exception 'Respuesta inválida';
  end if;
  jid := public.mi_jugador_id();
  if jid is null then
    raise exception 'Tu usuario todavía no está enlazado a un jugador del plantel';
  end if;
  select estado into est from public.partidos where id = p_partido;
  if est is null then raise exception 'El partido no existe'; end if;
  if est <> 'citacion' then
    raise exception 'La citación de este partido ya está cerrada';
  end if;

  insert into public.partido_jugadores (partido_id, jugador_id, confirmado, confirmado_at)
  values (p_partido, jid, p_respuesta, now())
  on conflict (partido_id, jugador_id)
  do update set confirmado = excluded.confirmado, confirmado_at = now();
end $$;

-- Cierra la votación de un partido: 1°=5 pts, 2°=4, 3°=3, 4°=2, 5°=1.
CREATE OR REPLACE FUNCTION public.aplicar_votacion(p_partido uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- 1) reiniciar puntos de voto de ese partido
  update public.partido_jugadores set puntos_voto = 0 where partido_id = p_partido;

  -- 2) asignar puntos por puesto (1°=5 ... 5°=1), sumando todos los votos
  insert into public.partido_jugadores (partido_id, jugador_id, citado, jugo, puntos_voto)
  select p_partido, v.votado_jugador_id, true, true,
         sum(case v.posicion when 1 then 5 when 2 then 4 when 3 then 3 when 4 then 2 when 5 then 1 else 0 end)
  from public.votos v
  where v.partido_id = p_partido
  group by v.votado_jugador_id
  on conflict (partido_id, jugador_id)
  do update set puntos_voto = excluded.puntos_voto;

  -- 3) congelar: ya no se pueden cambiar los votos
  update public.partidos set estado = 'cerrado' where id = p_partido;
end;
$function$;

-- Una sola definición de la fórmula, para que el trigger y el recálculo
-- masivo no puedan quedar diciendo cosas distintas.
create or replace function public.media_de_jugador(p_jugador uuid)
returns integer language sql stable set search_path = public as $$
  with a as (select * from public.ajustes_carta where id = 1),
  j as (select es_dt from public.jugadores where id = p_jugador),
  suma as (
    select coalesce(sum(
        case when pj.asistio then a.pts_asistir else 0 end
      + case when pj.asistio and pj.puntual then a.pts_puntual else 0 end
      + pj.puntos_extra * a.pts_extra
      + case
          when j.es_dt then
            case
              when not pj.asistio or p.goles_favor is null or p.goles_contra is null then 0
              when p.goles_favor > p.goles_contra then a.pts_dt_victoria
              when p.goles_favor = p.goles_contra then a.pts_dt_empate
              else 0
            end
          else pj.goles * a.pts_gol + pj.asistencias * a.pts_asistencia + pj.puntos_voto * a.pts_voto
        end
    ), 0) as total
    from public.partido_jugadores pj
    join public.partidos p on p.id = pj.partido_id
    cross join a cross join j
    where pj.jugador_id = p_jugador
  )
  select least(a.tope, greatest(a.base, a.base + suma.total)) from a, suma;
$$;
revoke execute on function public.media_de_jugador(uuid) from public, anon;
grant execute on function public.media_de_jugador(uuid) to authenticated;

create or replace function public.recompute_overall()
returns trigger language plpgsql set search_path = public as $$
declare jid uuid;
begin
  jid := coalesce(NEW.jugador_id, OLD.jugador_id);
  if jid is null then return null; end if;
  update public.jugadores set carta_overall = public.media_de_jugador(jid) where id = jid;
  return null;
end $$;

-- El resultado del partido afecta la media del DT: recalcular también al
-- corregir un marcador.
create or replace function public.recompute_por_partido()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.jugadores j set carta_overall = public.media_de_jugador(j.id)
   where j.id in (select jugador_id from public.partido_jugadores where partido_id = NEW.id);
  return null;
end $$;

create or replace function public.recalcular_cartas()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_directiva() then
    raise exception 'Solo la directiva puede recalcular las cartas';
  end if;
  update public.jugadores set carta_overall = public.media_de_jugador(id);
end $$;
revoke execute on function public.recalcular_cartas() from public, anon;
grant execute on function public.recalcular_cartas() to authenticated;

-- ---------- 6. Vistas ----------
-- Plantel sin datos personales (RUT, teléfono, dirección) para uso público.
create or replace view public.pub_plantel as
  select id, nombres, apellido_paterno, apellido_materno, numero_camiseta,
         posicion, carta_overall, foto_url, es_dt
  from jugadores
  where activo = true;

-- La vista es para la plataforma (jugadores conectados), no para el público:
-- la web de oldbrads.cl es estática y no consulta la base.
revoke all on public.pub_plantel from anon;

-- ---------- 7. Triggers ----------
drop trigger if exists trg_recompute_overall on public.partido_jugadores;
CREATE TRIGGER trg_recompute_overall AFTER INSERT OR DELETE OR UPDATE
  ON public.partido_jugadores FOR EACH ROW EXECUTE FUNCTION recompute_overall();

drop trigger if exists trg_recompute_por_partido on public.partidos;
create trigger trg_recompute_por_partido
  after update of goles_favor, goles_contra on public.partidos
  for each row execute function public.recompute_por_partido();

-- ---------- 8. Row Level Security ----------
alter table public.jugadores          enable row level security;
alter table public.temporadas         enable row level security;
alter table public.equipos            enable row level security;
alter table public.fechas             enable row level security;
alter table public.partidos           enable row level security;
alter table public.partido_jugadores  enable row level security;
alter table public.formaciones        enable row level security;
alter table public.goleadores         enable row level security;
alter table public.premios            enable row level security;
alter table public.cobros             enable row level security;
alter table public.pagos              enable row level security;
alter table public.movimientos_caja   enable row level security;
alter table public.cuotas_liga        enable row level security;
alter table public.perfiles           enable row level security;
alter table public.votos              enable row level security;

-- Escritura y datos sensibles: solo directiva.
create policy "dir_jugadores"   on public.jugadores         for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_temporadas"  on public.temporadas        for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_equipos"     on public.equipos           for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_fechas"      on public.fechas            for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_partidos"    on public.partidos          for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_pj"          on public.partido_jugadores for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_formaciones" on public.formaciones       for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_goleadores"  on public.goleadores        for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_premios"     on public.premios           for ALL to authenticated using (es_directiva()) with check (es_directiva());
-- Finanzas: nunca visibles para jugadores.
create policy "dir_cobros"      on public.cobros            for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_pagos"       on public.pagos             for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_movimientos" on public.movimientos_caja  for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_cuotas_liga" on public.cuotas_liga       for ALL to authenticated using (es_directiva()) with check (es_directiva());

-- Lectura deportiva abierta (no incluye jugadores: para eso está pub_plantel).
create policy "read_temporadas"  on public.temporadas        for SELECT to anon, authenticated using (true);
create policy "read_equipos"     on public.equipos           for SELECT to anon, authenticated using (true);
create policy "read_fechas"      on public.fechas            for SELECT to anon, authenticated using (true);
create policy "read_partidos"    on public.partidos          for SELECT to anon, authenticated using (true);
create policy "read_pj"          on public.partido_jugadores for SELECT to anon, authenticated using (true);
create policy "read_formaciones" on public.formaciones       for SELECT to anon, authenticated using (true);
create policy "read_goleadores"  on public.goleadores        for SELECT to anon, authenticated using (true);
create policy "read_premios"     on public.premios           for SELECT to anon, authenticated using (true);

-- Perfiles: cada uno ve el suyo; la directiva ve y administra todos.
create policy "perfiles_select" on public.perfiles for SELECT to authenticated using (((user_id = auth.uid()) OR es_directiva()));
create policy "perfiles_admin"  on public.perfiles for ALL    to authenticated using (es_directiva()) with check (es_directiva());

-- Votos: cada jugador solo ve y borra los suyos; la directiva ve todos.
create policy "votos_select"     on public.votos for SELECT to authenticated using (((votante_user_id = auth.uid()) OR es_directiva()));
-- Solo con la votación abierta, y nadie se vota a sí mismo.
create policy "votos_insert_own" on public.votos for INSERT to authenticated
  with check (
    votante_user_id = auth.uid()
    and votado_jugador_id is distinct from public.mi_jugador_id()
    and (select estado from public.partidos where id = partido_id) = 'votacion'
  );
create policy "votos_delete_own" on public.votos for DELETE to authenticated
  using (
    (votante_user_id = auth.uid()
     and (select estado from public.partidos where id = partido_id) = 'votacion')
    or es_directiva()
  );


-- =====================================================================
-- 9. Ficha del jugador (la que pide la liga) — la edita él mismo
-- =====================================================================
-- Los datos personales no son legibles por RLS (solo directiva), así que
-- el jugador lee y escribe los suyos a través de estas dos funciones.

create or replace function public.mis_datos()
returns table (
  id uuid, nombres text, apellido_paterno text, apellido_materno text, rut text,
  fecha_nacimiento date, profesion text, email text, telefono text, direccion text,
  comuna text, talla_polera text, talla_short text, numero_camiseta integer, posicion text
) language sql stable security definer set search_path = public as $$
  select j.id, j.nombres, j.apellido_paterno, j.apellido_materno, j.rut,
         j.fecha_nacimiento, j.profesion, j.email, j.telefono, j.direccion,
         j.comuna, j.talla_polera, j.talla_short, j.numero_camiseta, j.posicion
  from public.jugadores j
  where j.id = public.mi_jugador_id();
$$;

-- OJO: reescribe la ficha completa. Lo que venga en null, queda en null.
create or replace function public.actualizar_mis_datos(
  p_nombres text, p_apellido_paterno text, p_apellido_materno text default null,
  p_rut text default null, p_fecha_nacimiento date default null, p_profesion text default null,
  p_email text default null, p_telefono text default null, p_direccion text default null,
  p_comuna text default null, p_talla_polera text default null, p_talla_short text default null,
  p_numero_camiseta integer default null, p_posicion text default null
) returns void language plpgsql security definer set search_path = public as $$
declare jid uuid;
begin
  jid := public.mi_jugador_id();
  if jid is null then raise exception 'Tu usuario no está enlazado a un jugador del plantel'; end if;
  if coalesce(btrim(p_nombres), '') = '' or coalesce(btrim(p_apellido_paterno), '') = '' then
    raise exception 'El nombre y el apellido son obligatorios';
  end if;
  update public.jugadores set
    nombres = btrim(p_nombres), apellido_paterno = btrim(p_apellido_paterno),
    apellido_materno = nullif(btrim(coalesce(p_apellido_materno,'')),''),
    rut = nullif(btrim(coalesce(p_rut,'')),''), fecha_nacimiento = p_fecha_nacimiento,
    profesion = nullif(btrim(coalesce(p_profesion,'')),''), email = nullif(btrim(coalesce(p_email,'')),''),
    telefono = nullif(btrim(coalesce(p_telefono,'')),''), direccion = nullif(btrim(coalesce(p_direccion,'')),''),
    comuna = nullif(btrim(coalesce(p_comuna,'')),''), talla_polera = nullif(btrim(coalesce(p_talla_polera,'')),''),
    talla_short = nullif(btrim(coalesce(p_talla_short,'')),''), numero_camiseta = p_numero_camiseta,
    posicion = nullif(btrim(coalesce(p_posicion,'')),'')
  where id = jid;
end $$;

create or replace function public.marcar_clave_cambiada()
returns void language sql security definer set search_path = public as $$
  update public.perfiles set clave_cambiada = true where user_id = auth.uid();
$$;

-- Usuario de acceso: inicial del nombre + apellido paterno (ej. icabezas)
create or replace function public.usuario_de_jugador(p_jugador uuid)
returns text language sql stable set search_path = public as $$
  select lower(translate(
    left(regexp_replace(j.nombres, '\s.*$', ''), 1) || regexp_replace(j.apellido_paterno, '\s+', '', 'g'),
    'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))
  from public.jugadores j where j.id = p_jugador;
$$;

-- =====================================================================
-- 10. Encuestas: la directiva las crea, los jugadores responden
-- =====================================================================
create table if not exists public.encuestas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  tipo text not null default 'general',
  estado text not null default 'borrador' check (estado in ('borrador','abierta','cerrada')),
  -- si es anónima no se guarda quién respondió qué, solo que participó
  anonima boolean not null default false,
  cierra_el date,
  created_at timestamptz not null default now()
);

create table if not exists public.encuesta_preguntas (
  id uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references public.encuestas(id) on delete cascade,
  orden integer not null default 0,
  texto text not null,
  tipo text not null default 'jugador' check (tipo in ('jugador','opciones','texto','escala')),
  opciones jsonb not null default '[]'::jsonb,
  obligatoria boolean not null default true
);
create index if not exists preguntas_encuesta_idx on public.encuesta_preguntas (encuesta_id, orden);

create table if not exists public.encuesta_respuestas (
  id uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references public.encuestas(id) on delete cascade,
  pregunta_id uuid not null references public.encuesta_preguntas(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,  -- null si es anónima
  jugador_elegido uuid references public.jugadores(id) on delete set null,
  opcion text, texto text, numero integer,
  created_at timestamptz not null default now()
);
create index if not exists respuestas_encuesta_idx on public.encuesta_respuestas (encuesta_id);

create table if not exists public.encuesta_participantes (
  encuesta_id uuid not null references public.encuestas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (encuesta_id, user_id)
);

alter table public.encuestas              enable row level security;
alter table public.encuesta_preguntas     enable row level security;
alter table public.encuesta_respuestas    enable row level security;
alter table public.encuesta_participantes enable row level security;

create policy "dir_encuestas"     on public.encuestas              for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_preguntas"     on public.encuesta_preguntas     for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_respuestas"    on public.encuesta_respuestas    for ALL to authenticated using (es_directiva()) with check (es_directiva());
create policy "dir_participantes" on public.encuesta_participantes for ALL to authenticated using (es_directiva()) with check (es_directiva());

-- Los jugadores ven lo publicado (los borradores no) y si ya participaron.
create policy "ver_encuestas" on public.encuestas for SELECT to authenticated
  using (estado in ('abierta','cerrada'));
create policy "ver_preguntas" on public.encuesta_preguntas for SELECT to authenticated
  using (exists (select 1 from public.encuestas e where e.id = encuesta_id and e.estado in ('abierta','cerrada')));
create policy "ver_mi_participacion" on public.encuesta_participantes for SELECT to authenticated
  using (user_id = auth.uid());
-- Las respuestas solo las lee la directiva: no hay policy de lectura para jugadores.

-- Responder: una sola vez, con la encuesta abierta, respetando las obligatorias.
create or replace function public.responder_encuesta(p_encuesta uuid, p_respuestas jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare e record; faltan int; r jsonb;
begin
  select * into e from public.encuestas where id = p_encuesta;
  if e is null then raise exception 'La encuesta no existe'; end if;
  if e.estado <> 'abierta' then raise exception 'Esta encuesta no está abierta'; end if;
  if exists (select 1 from public.encuesta_participantes where encuesta_id = p_encuesta and user_id = auth.uid()) then
    raise exception 'Ya respondiste esta encuesta';
  end if;

  select count(*) into faltan
  from public.encuesta_preguntas q
  where q.encuesta_id = p_encuesta and q.obligatoria
    and not exists (
      select 1 from jsonb_array_elements(p_respuestas) x
      where (x->>'pregunta_id')::uuid = q.id
        and coalesce(x->>'jugador', x->>'opcion', x->>'texto', x->>'numero') is not null
        and btrim(coalesce(x->>'jugador', x->>'opcion', x->>'texto', x->>'numero')) <> ''
    );
  if faltan > 0 then raise exception 'Faltan % respuestas obligatorias', faltan; end if;

  for r in select * from jsonb_array_elements(p_respuestas) loop
    if not exists (select 1 from public.encuesta_preguntas q
                   where q.id = (r->>'pregunta_id')::uuid and q.encuesta_id = p_encuesta) then
      raise exception 'Pregunta que no pertenece a la encuesta';
    end if;
    insert into public.encuesta_respuestas
      (encuesta_id, pregunta_id, user_id, jugador_elegido, opcion, texto, numero)
    values (p_encuesta, (r->>'pregunta_id')::uuid,
            case when e.anonima then null else auth.uid() end,
            nullif(r->>'jugador','')::uuid, nullif(r->>'opcion',''),
            nullif(r->>'texto',''), nullif(r->>'numero','')::int);
  end loop;

  insert into public.encuesta_participantes (encuesta_id, user_id) values (p_encuesta, auth.uid());
end $$;

-- Permisos: solo con sesión iniciada.
revoke execute on function public.mis_datos() from public, anon;
revoke execute on function public.actualizar_mis_datos(text,text,text,text,date,text,text,text,text,text,text,text,integer,text) from public, anon;
revoke execute on function public.marcar_clave_cambiada() from public, anon;
revoke execute on function public.responder_encuesta(uuid, jsonb) from public, anon;
revoke execute on function public.usuario_de_jugador(uuid) from public, anon;
grant execute on function public.mis_datos() to authenticated;
grant execute on function public.actualizar_mis_datos(text,text,text,text,date,text,text,text,text,text,text,text,integer,text) to authenticated;
grant execute on function public.marcar_clave_cambiada() to authenticated;
grant execute on function public.responder_encuesta(uuid, jsonb) to authenticated;

-- =====================================================================
-- 11. Cuentas: crearlas y resetearlas desde la plataforma
-- =====================================================================
-- OJO: pgcrypto vive en el esquema "extensions", por eso crypt() y
-- gen_salt() se llaman con su esquema: con search_path = public no se
-- encuentran y la función falla en tiempo de ejecución.

create or replace function public.crear_cuenta_jugador(p_jugador uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_usuario text; v_email text; v_uid uuid;
begin
  if not public.es_directiva() then
    raise exception 'Solo la directiva puede crear cuentas';
  end if;
  if exists (select 1 from public.perfiles where jugador_id = p_jugador) then
    raise exception 'Este jugador ya tiene cuenta';
  end if;

  v_usuario := public.usuario_de_jugador(p_jugador);
  if v_usuario is null or v_usuario = '' then
    raise exception 'El jugador no existe o le falta nombre/apellido';
  end if;
  v_email := v_usuario || '@oldbrads.cl';
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Ya existe una cuenta con el usuario %', v_usuario;
  end if;

  v_uid := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    v_email, extensions.crypt(v_usuario || '2026', extensions.gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  );
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
  values (gen_random_uuid(), v_uid,
          jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
          'email', v_uid::text, now(), now());
  insert into public.perfiles (user_id, jugador_id, nombre_usuario, rol, clave_cambiada)
  values (v_uid, p_jugador, v_usuario, 'jugador', false);

  return v_usuario;
end $$;

create or replace function public.resetear_clave_jugador(p_jugador uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_usuario text; v_uid uuid;
begin
  if not public.es_directiva() then
    raise exception 'Solo la directiva puede resetear claves';
  end if;
  select user_id, nombre_usuario into v_uid, v_usuario
    from public.perfiles where jugador_id = p_jugador;
  if v_uid is null then raise exception 'Ese jugador no tiene cuenta'; end if;

  update auth.users
     set encrypted_password = extensions.crypt(v_usuario || '2026', extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_uid;
  update public.perfiles set clave_cambiada = false where user_id = v_uid;
  return v_usuario;
end $$;

revoke execute on function public.crear_cuenta_jugador(uuid) from public, anon;
revoke execute on function public.resetear_clave_jugador(uuid) from public, anon;
grant execute on function public.crear_cuenta_jugador(uuid) to authenticated;
grant execute on function public.resetear_clave_jugador(uuid) to authenticated;
