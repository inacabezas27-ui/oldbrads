# Migrar la base a un Supabase nuevo (cuenta directiva@oldbrads.cl)

Hoy la base vive en el proyecto **`old-brads` (`sadmfnrakttuljhuauxs`)**, creado con la cuenta
personal de Ignacio. El plan es recrearla en un proyecto nuevo que pertenezca al club, con la
casilla `directiva@oldbrads.cl`, para que las credenciales no dependan de una persona.

## Qué hay que mover

| Cosa | Dónde está | Cómo se mueve |
|---|---|---|
| Estructura (tablas, funciones, RLS) | `supabase/esquema.sql` | Pegar y ejecutar en el SQL Editor |
| Datos del club (plantel, partidos, finanzas) | Solo en el proyecto viejo | `pg_dump` → `psql` (ver abajo) |
| Cuentas de acceso (25 jugadores + directiva) | Tabla `auth.users` | Copiar filas con su hash, o recrear |
| Claves de la app | `.env.local` | Cambiar URL y anon key |

## Pasos

1. **Crear la cuenta Supabase** en supabase.com con `directiva@oldbrads.cl`.
   Guardar la contraseña en el gestor de claves del club, no en un mensaje.
2. **Crear el proyecto** `old-brads`, región **South America (São Paulo)** — la misma que hoy.
   Anotar la *database password* que entrega al crearlo: se necesita para el `pg_dump`.
3. **Estructura**: SQL Editor → pegar `supabase/esquema.sql` → Run. No debe dar errores.
4. **Datos**: desde un terminal, con las dos cadenas de conexión (Project Settings → Database →
   Connection string → URI):

   ```
   pg_dump "<URI_PROYECTO_VIEJO>" --data-only --schema=public --no-owner --no-privileges \
     --disable-triggers > datos.sql
   psql "<URI_PROYECTO_NUEVO>" -f datos.sql
   ```

   `--disable-triggers` evita que el trigger de overall se dispare 500 veces durante la carga.
   Al terminar, forzar un recálculo:
   `update partido_jugadores set puntos_extra = puntos_extra;`

5. **Cuentas de acceso**. Dos caminos:
   - **Conservar las claves actuales** (los jugadores no notan el cambio): copiar las filas de
     `auth.users` y `auth.identities` tal cual, incluido `encrypted_password` (es un hash bcrypt,
     no la clave en texto). Requiere el mismo `pg_dump` pero con `--schema=auth`.
   - **Empezar de cero**: recrear los usuarios con el script de creación y repartir claves nuevas.
     Más limpio, pero hay que avisar a los 25.

   En ambos casos, después hay que revisar que la tabla `perfiles` apunte a los `user_id` correctos.

6. **Apuntar la app**: en `.env.local` cambiar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   por los del proyecto nuevo (Project Settings → API).
7. **Verificar** antes de apagar el viejo: entrar como directiva, entrar como un jugador, votar,
   cerrar una votación, ver que el overall cambie, revisar cuotas y caja.
8. **Recién entonces** pausar o borrar el proyecto viejo.

## Reglas que no hay que romper

- La **web pública (`sitio/`) no usa Supabase**. Es estática y va en Hostinger. No conectarla.
- Nada de datos personales (RUT, teléfono, dirección) en archivos del repositorio ni en la web:
  para lectura pública existe la vista `pub_plantel`, que no los expone.
- La `service_role key` no se usa nunca en el navegador. Solo la `anon key`.
