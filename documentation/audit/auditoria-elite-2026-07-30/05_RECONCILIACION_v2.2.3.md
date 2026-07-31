# Reconciliación de la Auditoría contra la versión real v2.2.3

**Fecha:** 30 de julio de 2026
**Motivo:** la auditoría inicial se ejecutó sobre la rama `main` de GitHub (**v1.9.1**), pero la versión en uso es **v2.2.3**, que vive **solo en la carpeta local** `C:\Users\aieta\Documents\panel-horas-Mooving` y **nunca se pusheó a GitHub** (7 commits por delante de `origin/main`).

Este documento reconcilia los hallazgos previos contra el código real v2.2.3 y agrega los hallazgos nuevos del código que no existía en v1.9.1.

---

## 0. Hallazgo de proceso (nuevo, importante)

**PROC-01 · [P1] El repositorio de referencia (GitHub) está 3 versiones detrás de lo que se usa.**
Tu `main` local está en v2.2.3 con 7 commits sin pushear (v1.9.6 → v2.2.3: fixes B1–B7, Epic 0 capacity, Epics 1–7, dark mode, contratos, comparación de empleados, drilldown ejecutivo, filtros de mes). GitHub `main` quedó en v1.9.1. Consecuencias: no hay copia de respaldo remota del trabajo real; Antigravity/colaboradores que clonen GitHub obtienen código obsoleto; el `CHANGELOG` y el versionado divergen (refuerza ARCH-02). **Acción:** pushear v2.2.3 a una rama remota cuanto antes (aunque sea `backup/v2.2.3`) para no depender de una sola máquina.

> Esto también valida la observación de Fede: el título de la auditoría decía v1.9.1 porque era lo único disponible con código (GitHub). Ya reconciliado contra v2.2.3.

---

## 1. Estado de los hallazgos previos en v2.2.3

Leído directamente sobre el código v2.2.3 (no solo grep). Resumen: **los P0/P1 de backend/seguridad/datos SIGUEN todos**; parte de UX/funcional se abordó parcialmente con las features nuevas.

| ID previo | Título | Estado en v2.2.3 | Evidencia |
|---|---|---|---|
| MT-01 | company_id en update/delete MCP | **SIGUE** (y **ya lo corregí** en el parche v2.2.3) | `server.ts` update/delete client/project/employee/category con `WHERE id = ?` sin company_id |
| SEC-01 | MCP sin auth/permisos | **SIGUE** | `auth.ts:44-47`, `mcp.ts:31-38` ("we trust the internal mapping") |
| SEC-02 | Bypass auth en prod | **SIGUE (activo)** | `auth.ts:26-35` + `wrangler.toml:11` `ENVIRONMENT="development"`; el script nuevo `test_api.mjs` consulta la API sin token |
| SEC-03 | RBAC de UI client-side | **SIGUE**, sin rol coordinador | `App.tsx:27,29`; gating solo en render |
| SEC-04 | Backdoors login | **SIGUE** (diferido) | `auth.ts:30-33` |
| SEC-05 | Fallback JWT_SECRET | **SIGUE** (diferido) | `auth.ts:55`, `routes/auth.ts:49` |
| SEC-06 | Secretos commiteados | **PEOR** | persisten `sk_live_` (3 archivos) + **nuevos**: `Mooving321` en `debug_senda_actions.js:21`, `probe_senda_api.js:11`, `ingest_rag_glosario.js:20`; **API key de Clockify** en `test_clockify.mjs` |
| SEC-07 | RBAC backend mock | **SIGUE** | `data.ts:88-89, 173-174` (`mock-user-123`) |
| DATA-01 | Parser CSV roto | **SIGUE** | `Dashboard.tsx:194` (`split('\n')` no maneja `\r\n`) y `:210` (`split(',')` sin comillas). Irónico: el nuevo `ExportExcelButton` sí entrecomilla → un round-trip export→import corrompe datos |
| DATA-02 | work_type mal inferido | **PARCIAL** | el import server-side (`import.sql`) sí clasifica `meeting`/`internal`/`project` bien; pero la carga por UI sigue con el parser roto |
| UX-01 | "Mis Horas" muestra datos de toda la empresa | **SIGUE + regresión** → **ya lo corregí** | intento incompleto (`myRecords` sin declarar) que **crasheaba** la vista; ver FIX-02 |
| UX (tablas) | orden/búsqueda/sticky | **PARCIAL** | `DistributionTable` ahora ordena por columna; falta búsqueda/sticky y en otras tablas |
| C-level sin vista | vista ejecutiva dedicada | **PARCIAL** | hay "Métricas Ejecutivas" + `ExecutiveDrilldownModal` + `ExportExcelButton`, pero bajo el rol `admin` con gating client-side |
| UX-02/03/04 | alerts nativos, Hooks, marca | **SIGUEN** | `AdminPanel.tsx:42,55,97,126`; `EditRecordModal.tsx:12` (return antes de hooks); `tailwind.config.js` sin tokens |
| FUNC-04 | alertas simuladas | **PARCIAL** | hay `InactivityAlertBanner` (UI) pero el envío sigue apuntando a 2 usuarios hardcodeados (ver NUEVO-3) |

---

## 2. Hallazgos NUEVOS en v2.2.3 (código que no existía en v1.9.1)

### 🔴 NUEVO-1 · [P0] `MyTime.tsx` crashea la vista del empleado — **RESUELTO (FIX-02)**
`MyTime.tsx` usaba `myRecords` (líneas 168/176) que **no estaba declarada** → `ReferenceError` en el render de "Mis Horas" (la vista por defecto de los no-admin). `vite build` usa esbuild y **no** type-checkea, por eso el bug llegó a producción. `tsc --noEmit` lo detecta. **Corregido:** ver FIX-02.

### 🟠 NUEVO-2 · [P1] Nuevos secretos hardcodeados (SEC-06 empeoró)
Credenciales admin `monica@mooving.ai / Mooving321` en 3 scripts nuevos (`debug_senda_actions.js`, `probe_senda_api.js`, `ingest_rag_glosario.js`) y **API key de Clockify** en `test_clockify.mjs`. Además `import.sql` commitea 218 filas con PII de empleados y datos de clientes reales. **Rotar Clockify también.**

### 🟡 NUEVO-3 · [P2] `InactivityAlertBanner` siempre alerta a 2 personas fijas
`InactivityAlertBanner.tsx:58-66` + `Dashboard.tsx:94`: el handler ignora el empleado clickeado y envía siempre `users: ['monica.aieta','federico.gomez']`. Además la inactividad se calcula sobre `filteredRecords` → falsos positivos si el empleado cargó en una categoría no seleccionada.

### 🟡 NUEVO-4 · [P2] KPI "Concentración de Riesgo" sobre datos truncados
`Dashboard.tsx:276-284`: `clientData` se `slice(0,6)` **sin ordenar antes** (toma los primeros por orden de inserción, no el top-6 real) y recién ordena esos 6. El `ExecutiveDrilldownModal` calcula el top sobre todos → **la tarjeta y su drilldown pueden mostrar clientes distintos**. Igual patrón en "Horas por Empleado" (`slice(0,8)`).

### 🟡 NUEVO-5 · [P2] `ClientContractsSection` compara bolsa mensual contra consumo multi-mes
`ClientContractsSection.tsx`: el prop `selectedMonth` se ignora; el consumo agrega todo el rango filtrado, pero el contrato es mensual y el mapa `client_id→horas` no considera el mes → **% de ejecución inflado** y semáforos poco fiables.

### 🟡 NUEVO-6 · [P2] `ExportExcelButton`: CSV etiquetado como "Excel" y sin protección de inyección de fórmulas
`ExportExcelButton.tsx`: genera un CSV a mano (no usa librería) y lo llama "Excel"; no neutraliza celdas que empiezan con `= + - @` → una descripción como `=WEBSERVICE(...)` se ejecuta al abrir en Excel (inyección CSV). Escapa solo algunas columnas.

### 🟡 NUEVO-7 · [P2] `link_external_user` reasigna registros con `LIKE %...%`
`server.ts:683-689`: el `UPDATE` de conciliación de identidades usa `LOWER(employee_id) LIKE %alias%`, que con un alias corto/común puede **reasignar masivamente** `time_records` de empleados no relacionados. Además `INSERT OR REPLACE` con id aleatorio no deduplica alias (índice no UNIQUE).

### 🟡 NUEVO-8 · [P2] `is_billable`/`source` no están en el tipo `TimeRecord`
`types/index.ts` no declara `is_billable` ni `source`, pero 6+ componentes los leen → en runtime son `undefined` y **siempre** caen al fallback `work_type==='project'`. El texto "basado en is_billable real" (`Dashboard.tsx:532`) es engañoso: la facturabilidad se deriva del tipo, no de un flag real (coincide con DATA-06).

### 🟢 NUEVO-9 · [P3] Migración `0015` no idempotente + drift de esquema
`0015_add_daily_hours_expected.sql` (`ALTER TABLE … ADD COLUMN`) falla si se re-ejecuta; `db/schema.sql` no incluye `daily_hours_expected`, `client_contracts` ni `employee_aliases` → bootstrapear solo con `schema.sql` deja la DB inconsistente y `create_employee` falla en runtime. (Refuerza ARCH-03.)

### 🟢 NUEVO-10 · [P3] Test fantasma `zendesk_and_filters.test.ts`
`apps/api/src/tests/zendesk_and_filters.test.ts` **no importa nada de `src/`**: prueba lógica reimplementada inline (viola la regla anti-phantom del proyecto). Da falsa sensación de cobertura sobre las features nuevas de Zendesk/alias.

### 🟢 NUEVO-11 · [P3] `get_unlinked_external_users` JOIN sin tenant; capacidad con denominador sesgado; dark mode roto
- `server.ts:641`: `LEFT JOIN employees … ON tr.employee_id=e.id OR tr.employee_name=e.name` sin `company_id` → un homónimo de otro tenant altera el resultado.
- `EmployeeWorkloadBreakdown.tsx:35,47`: horas esperadas = `dailyExpected * díasConDatos` (no días hábiles) → subestima la brecha.
- Dark mode: **no usa localStorage** (correcto), pero solo cambia el fondo raíz; `tailwind.config` sin `darkMode:'class'` y sin variantes `dark:` → tarjetas quedan claras sobre fondo oscuro.
- Clases Tailwind v4 (`backdrop-blur-xs`, `shadow-2xs`) y `animate-fade-in-*` sin keyframes → no-ops en el proyecto v3.

---

## 3. Fixes ejecutados sobre v2.2.3 (ya hechos y verificados)

Rama `fix/multi-tenant-isolation-p0-v223` · parche `FIX_v2.2.3_isolation_and_mytime.patch` · **35/35 tests verde · build OK**. **No tocan el login.**

- **FIX-01 (MT-01, P0):** `company_id` añadido a las 8 operaciones update/delete del MCP + 2 tests de regresión.
- **FIX-02 (NUEVO-1, P0):** declarada `myRecords` en `MyTime.tsx` filtrando por el usuario logueado; las vistas personales ("Horas este mes", meta, historial, dona por cliente) ahora usan sólo los registros del propio empleado. Resuelve el crash y mitiga (client-side) la exposición de datos entre empleados. *(La corrección completa de privacidad requiere filtrar también en el servidor por el usuario autenticado — se coordina con la app de gestión de usuarios.)*

---

## 4. Impacto en el backlog

- **Nada del backlog anterior se cae:** los P0/P1 de seguridad, RBAC, multi-tenant, CSV y datos siguen todos vigentes en v2.2.3.
- **Se agregan** NUEVO-2 … NUEVO-11 al backlog (Épicas de Seguridad, Integridad del dato y Calidad técnica).
- **Ya resueltos:** MT-01 y NUEVO-1 (crash de "Mis Horas").
- **Prioridad inmediata sin cambios:** rotar secretos (ahora incluye Clockify), cerrar MCP, quitar bypass de auth, arreglar parser CSV. Y **pushear v2.2.3 a un remoto** (PROC-01).
