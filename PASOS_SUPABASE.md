# Conectar Old Brads con tu nuevo proyecto Supabase

Sigue estos pasos cuando tengas creada la cuenta nueva. Toma ~5 minutos.

## 1. Crear el proyecto
1. Entra a [supabase.com](https://supabase.com) con tu **mail nuevo** y crea una organización (plan **Free**).
2. **New project** → Nombre: `old-brads` → Región: **South America (São Paulo)** → define una contraseña de base de datos (guárdala) → Create.
3. Espera ~2 min a que quede listo.

## 2. Crear las tablas
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql), copia **todo** y pégalo.
3. Presiona **Run**. Debe decir "Success".

## 3. Cargar el plantel 2026
1. En **SQL Editor** → **New query**.
2. Abre [`supabase/seed_plantel_2026.sql`](supabase/seed_plantel_2026.sql), copia todo y pégalo.
3. **Run**. Quedan cargados los 31 jugadores.

## 4. Crear tu usuario de administrador (para el login)
1. Menú izquierdo → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Pon tu **email** y una **contraseña**, y marca **Auto Confirm User** (importante).
3. Create. Ese será tu login en la app.

## 5. Pasarme las claves
1. Menú izquierdo → **Project Settings** (engranaje) → **API**.
2. Copia:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public** (o **publishable key**)
3. Pégamelas en el chat. Yo creo el archivo `.env.local`, conecto la app y la dejamos andando en http://localhost:7001.

> Nota: la *anon key* es segura de usar en el navegador porque las tablas tienen RLS (solo un usuario logueado puede leer/escribir).
