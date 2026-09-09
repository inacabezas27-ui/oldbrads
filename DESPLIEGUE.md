# Dejar la plataforma en línea (Railway)

La plataforma es una app React que se compila y se sirve desde un servidor Express
(`server/index.js`). Ese mismo servidor expone `/api/ia`, que es el único que habla
con Gemini — por eso la llave de Gemini vive en el servidor y nunca en el navegador.

## 1. Subir el repositorio a GitHub

Solo la primera vez:

    git remote add origin https://github.com/inacabezas27-ui/oldbrads.git
    git push -u origin main

GitHub pide usuario y un **token** (no la contraseña): se crea en
Settings → Developer settings → Personal access tokens → Tokens (classic),
con el permiso `repo`.

## 2. Crear el proyecto en Railway

1. railway.com → **New Project** → **Deploy from GitHub repo**
2. Autoriza el acceso y elige **oldbrads**
3. Railway detecta `railway.json` y usa:
   - build: `npm ci && npm run build`
   - start: `node server/index.js`

## 3. Variables de entorno (antes del primer despliegue)

En el proyecto → pestaña **Variables** → añade las tres:

| Variable | Valor |
|---|---|
| `GEMINI_API_KEY` | la tuya (la pegas tú, no va en el repositorio) |
| `VITE_SUPABASE_URL` | la URL del proyecto (Supabase → Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | la publishable del proyecto (Supabase → Project Settings → API Keys) |

**Importante:** las dos que empiezan con `VITE_` se compilan dentro de la app, así que
tienen que estar puestas *antes* de que Railway construya. Si las agregas después,
hay que volver a desplegar (**Deployments → Redeploy**), si no la app no sabrá a qué
base de datos conectarse.

## 4. Generar la dirección pública

Proyecto → **Settings** → **Networking** → **Generate Domain**.
Queda algo como `oldbrads-production.up.railway.app`.

- Jugadores: esa dirección + `/jugadores`
- Directiva: esa dirección + `/login`

## 5. Comprobar que quedó bien

- `…/api/salud` debe devolver `{"ok":true,"gemini":true,"supabase":true}`
  Si dice `gemini:false` o `supabase:false`, falta una variable.
- Entrar como jugador y ver la carta.
- Entrar como directiva y abrir Partidos.

## Cuando oldbrads.cl funcione

Se puede apuntar un subdominio, por ejemplo `plataforma.oldbrads.cl`, a Railway:
en Railway → Settings → Networking → **Custom Domain**, y en el DNS del dominio se
agrega el CNAME que Railway indique. La web pública sigue en Hostinger; son cosas
separadas a propósito.

## Cada vez que haya cambios

`git push` y Railway vuelve a desplegar solo.
