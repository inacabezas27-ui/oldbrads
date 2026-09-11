# Migraciones posteriores a `esquema.sql`

`../esquema.sql` es la foto del esquema hasta el 9 de septiembre de 2026.
Lo posterior vive acá, en orden de fecha.

**La fuente de verdad es Supabase**, que guarda cada migración aplicada con su
SQL exacto. Para recuperarlas todas (incluidas las que todavía no estén en esta
carpeta):

```sql
select version, name, statements
from supabase_migrations.schema_migrations
order by version;
```

Para levantar el proyecto de cero: `esquema.sql` y después estos archivos.

> Pendiente: las migraciones del 9 de septiembre (penalizaciones, asistencia y
> puntualidad de tres estados, sanciones, lesionados, temporadas automáticas)
> todavía no están copiadas acá. Están en Supabase con la consulta de arriba.
