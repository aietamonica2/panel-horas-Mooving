# Notas de Migraciones / Schema (ARCH-03 · NUEVO-9)

Referencia sobre el estado de la cadena de migraciones D1/SQLite y cómo
bootstrapear una base nueva. `db/schema.sql` es el **baseline consolidado**
(fuente de verdad para un bootstrap fresco); `apps/api/migrations/*.sql` es el
historial incremental que ya se aplicó en producción.

> Alcance de este cambio: solo se re-sincronizó `db/schema.sql` y se creó este
> documento. **No se modificaron migraciones existentes ni se tocó la base de
> datos.** Las recomendaciones de abajo son propuestas, no se ejecutaron.

---

## 1. Problemas de la cadena de migraciones

La cadena **no aplica desde cero** (base vacía) y tiene un paso no idempotente:

### a) Falta la migración base `0001`
No existe `apps/api/migrations/0001_*.sql`. Las tablas núcleo
(`time_records`, `employees`, `clients`, `projects`, `categories`,
`role_permissions`, `audit_logs`, `feature_flags`,
`tenant_feature_overrides`, `mcp_tool_catalog`, `mcp_user_permissions`)
solo viven en `db/schema.sql`. La numeración de migraciones arranca en `0002`,
que asume que esas tablas ya existen. En producción esto funcionó porque la DB
se bootstrapeó con `schema.sql` **antes** de correr las migraciones, pero una
DB nueva que solo corra `migrations/*` no tiene las tablas base.

### b) `0002` hace `ALTER TABLE employees` antes de que `0004` la cree
`0002_add_auth_and_rbac.sql` ejecuta:

```sql
ALTER TABLE employees ADD COLUMN password_hash TEXT;
ALTER TABLE employees ADD COLUMN role_id TEXT DEFAULT 'employee';
```

pero `employees` recién se define (con `CREATE TABLE IF NOT EXISTS`) en
`0004_add_entities_tables.sql`. Desde cero, `0002` falla con
*"no such table: employees"*. El orden de dependencias está invertido: el
`ALTER` precede al `CREATE`.

- Relacionado: `0009_merge_interno_client.sql` inserta en `clients` usando las
  columnas `industry` e `is_active`, que **ningún migration crea** — solo
  existen en `schema.sql`. O sea, la cadena depende del base implícito.
- Relacionado: `0004` reconstruye `time_records` con
  `INSERT INTO new_time_records SELECT * FROM time_records`. Como `0003` agrega
  `source` **al final** de la tabla vieja pero la tabla nueva la ubica **antes**
  de `created_at`, el `SELECT *` posicional deja `source`/`created_at`/
  `updated_at` corridos. No es un problema de estructura (la estructura final es
  correcta) pero es un riesgo de datos a tener presente si se re-corre.

### c) `0015` (`ADD COLUMN`) no es idempotente
`0015_add_daily_hours_expected.sql`:

```sql
ALTER TABLE employees ADD COLUMN daily_hours_expected REAL DEFAULT 8.0;
```

SQLite **no** soporta `ADD COLUMN IF NOT EXISTS`. Si la migración se re-aplica
(o si `daily_hours_expected` ya existe porque se bootstrapeó con el nuevo
`schema.sql`), falla con *"duplicate column name: daily_hours_expected"*.
Esto rompe reruns y rompe el bootstrap "schema.sql + migrations" en una misma
DB. El mismo patrón frágil aplica a los `ADD COLUMN` de `0002` y `0003`.

---

## 2. Recomendación (NO ejecutar ahora)

Elegir **una** de estas dos estrategias y aplicarla en una tarea aparte,
coordinada, con backup previo:

**Opción A — Crear una migración base `0001` (menos disruptiva).**
Agregar `apps/api/migrations/0001_baseline.sql` que cree las tablas núcleo con
`CREATE TABLE IF NOT EXISTS` (idéntico a las secciones base de `schema.sql`, con
`daily_hours_expected`, `source`, etc. ya incluidas). Así la cadena aplica desde
cero: `0001` crea todo el núcleo, y `0002+` operan sobre tablas existentes.
Para las DBs ya migradas, `0001` es un no-op (todo con `IF NOT EXISTS`).
Requiere además volver idempotentes los `ADD COLUMN` (ver más abajo).

**Opción B — Resetear/consolidar la cadena en un baseline.**
Reemplazar `0002..0016` por un único `0001_baseline.sql` == `db/schema.sql`
(estructura) + los seeds/catálogo MCP necesarios, y marcar ese baseline como ya
aplicado en las DBs existentes (registrar en la tabla de migraciones de D1 sin
re-ejecutar). Más limpio a largo plazo, pero exige cuidado con el tracking de
migraciones de Wrangler/D1 para no re-correr DDL destructivo (`DROP TABLE
time_records` de `0004`) sobre datos productivos.

**Independiente de A o B — Idempotencia de `ADD COLUMN`.**
Como SQLite no tiene `ADD COLUMN IF NOT EXISTS`, para futuros cambios de columna
preferir el patrón *table-rebuild* con `CREATE TABLE IF NOT EXISTS ... _new` +
copia + rename, o guardar cada `ADD COLUMN` detrás de un check de
`PRAGMA table_info(<tabla>)` desde el runner de migraciones.

> Ninguna de estas opciones debe ejecutarse como parte de esta tarea. Las
> migraciones `0002..0016` son destructivas (p. ej. `DROP TABLE time_records`
> en `0004`) y **ya se aplicaron**; modificarlas o re-correrlas sobre la DB
> productiva es riesgoso.

---

## 3. Cómo bootstrapear una D1 nueva

Para una base **desde cero**, usar el baseline consolidado, **no** la cadena de
migraciones (que no aplica desde vacío, ver §1):

```bash
# Local (D1 local / Miniflare)
wrangler d1 execute <DB_NAME> --local --file=db/schema.sql

# Remoto (producción / preview) — requiere confirmación
wrangler d1 execute <DB_NAME> --remote --file=db/schema.sql
```

`db/schema.sql` es idempotente (`CREATE TABLE IF NOT EXISTS` +
`CREATE INDEX IF NOT EXISTS`), así que re-ejecutarlo es seguro y no pisa datos.

Pasos siguientes según necesidad:

1. **Catálogo MCP y permisos**: el catálogo `mcp_tool_catalog` y los
   `mcp_user_permissions` se poblaban vía migraciones
   (`0006..0014`). Para una DB nueva, cargar esos INSERT del catálogo/permisos
   por separado (extraerlos de esos migrations) o mediante un seed dedicado.
   El `schema.sql` crea las **tablas** pero no las filas del catálogo.
2. **Datos semilla / históricos**: opcionalmente `db/seed-data.sql`.
3. **Verificar estructura** contra este baseline:

   ```bash
   wrangler d1 execute <DB_NAME> --local \
     --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
   ```

### Estado final de estructura que representa `db/schema.sql`

Tablas: `time_records`, `employees`, `employee_aliases`, `role_permissions`,
`clients`, `client_contracts`, `projects`, `categories`, `audit_logs`,
`feature_flags`, `tenant_feature_overrides`, `bulk_load_schedules`,
`email_reminder_settings`, `mcp_tool_catalog`, `mcp_user_permissions`.

Deltas de migraciones ya incorporados al baseline:

| Delta                                     | Migración | Reflejado en schema.sql |
|-------------------------------------------|-----------|--------------------------|
| `time_records.source`                     | 0003/0004 | Sí                       |
| índice `idx_time_records_project`         | 0004      | Sí                       |
| `employees.daily_hours_expected` (8.0)    | 0015      | Sí                       |
| tabla `bulk_load_schedules`               | 0012      | Sí                       |
| tabla `email_reminder_settings`           | 0013      | Sí                       |
| tabla `employee_aliases`                  | 0014      | Sí                       |
| tabla `client_contracts` (UNIQUE mes)     | 0016      | Sí                       |

> `db/mcp-schema.sql` es un subset (solo tablas MCP) redundante con
> `db/schema.sql`; se mantiene por compatibilidad. La fuente de verdad es
> `db/schema.sql`.
