# Flujo seguro de cambios de DB en producción (sin pérdida de datos)

Este proyecto tiene drift en producción, por lo que **no** debes usar:

- `prisma migrate reset`
- `prisma db push --accept-data-loss`

## 1) Respaldo antes de cualquier cambio

```bash
pg_dump "$DATABASE_URL" > backup-prod-$(date +%Y%m%d-%H%M).sql
```

En Neon también puedes crear branch/snapshot antes de ejecutar SQL.

## 2) Hotfix puntual para `libros_del_mes`

Ejecuta el script:

- `prisma/manual/prod-hotfix-libros-del-mes.sql`

Opciones para ejecutarlo:

1. Con Prisma CLI (sin `psql`):

```bash
pnpm db:execute:librosdelmes
```

2. Con `psql`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "prisma/manual/prod-hotfix-libros-del-mes.sql"
```

Este script:
- Crea `public.libros_del_mes` solo si no existe.
- Agrega FKs e índices de forma idempotente.
- No elimina datos existentes.

## 3) Verificación rápida

```sql
SELECT to_regclass('public.libros_del_mes') AS tabla;
SELECT count(*) FROM public.libros_del_mes;
```

Si `tabla` devuelve `libros_del_mes`, el módulo ya no debe lanzar P2021.

## 3.1) Habilitar guardado de plantillas Unlayer

Para guardar HTML/diseño en DB se requiere la tabla `email_templates`:

```bash
pnpm db:execute:emailtemplates
```

Verificación:

```sql
SELECT to_regclass('public.email_templates') AS tabla;
```

## 4) Alinear historial Prisma sin reset

En local/staging (no en producción), compara schema vs DB:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/manual/prod-diff.sql
```

Revisa manualmente el SQL y aplícalo por bloques seguros (aditivos) en producción.

## 5) Despliegue

Para producción usa:

```bash
npx prisma migrate deploy
```

`migrate deploy` solo aplica migraciones existentes; no intenta resetear.
