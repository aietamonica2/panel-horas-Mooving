# Auditoría de Élite Consolidada — Panel de Operaciones Mooving

**Fecha:** 30 de julio de 2026 · **Versión auditada:** v1.9.1 · **Repo:** `panel-horas-Mooving` (rama `main`)
**Metodología:** revisión estática del código + análisis de datos reales (CSV) + revisión de la documentación de contexto, ejecutada por 5 auditores especializados en paralelo (Seguridad/AppSec, Arquitectura/Código, Funcional/Negocio, UX/Accesibilidad, Datos). Cada hallazgo está verificado con evidencia (`archivo:línea`).

> **Convención de severidad:** **P0** = crítico (bloquea producción / brecha de seguridad o corrupción de datos) · **P1** = alto · **P2** = medio · **P3** = bajo.

---

## Índice

1. [Contexto y arquitectura real](#1-contexto-y-arquitectura-real)
2. [Seguridad y control de acceso](#2-seguridad-y-control-de-acceso)
3. [Aislamiento multi-tenant (parcialmente resuelto)](#3-aislamiento-multi-tenant)
4. [Calidad de datos y pipeline de ingesta](#4-calidad-de-datos)
5. [Ajuste funcional a las 3 audiencias](#5-ajuste-funcional)
6. [UX y accesibilidad](#6-ux-y-accesibilidad)
7. [Arquitectura, código y proceso](#7-arquitectura-codigo-y-proceso)
8. [Matriz consolidada de hallazgos](#8-matriz-consolidada)

---

## 1. Contexto y arquitectura real

El proyecto es un **Panel de Operaciones** para gestionar la bolsa de horas del equipo Mooving. Monorepo NPM Workspaces:

- **`apps/web`** — React 18 + Vite + Zustand + TailwindCSS + Recharts (SPA). ~5.700 líneas.
- **`apps/api`** — Hono + Cloudflare Workers + D1 (SQLite). ~3.300 líneas. Incluye un **servidor MCP con ~24 herramientas**, crons (recordatorios de email, carga masiva) y RBAC en esquema.
- **Datos**: `time_records` (1.436 registros reales, ene–jun 2026), `employees`, `clients`, `projects`, `categories`, tablas RBAC y catálogo MCP.
- **IA**: integración con **Senda** (copiloto + agentes Router/Analista/QA) vía MCP.

**Discrepancia base:** la documentación de arquitectura (`documentation/architecture/README.md`, `REFACTOR_SUMMARY.md`) describe un stack **Vue 3 + Pinia + Chart.js que no existe** — la app real es React. Esto se detalla en §7.

---

## 2. Seguridad y control de acceso

> Esta sección concentra los hallazgos más graves. Salvo indicación contraria, todos están **confirmados con evidencia en código**. Por decisión del equipo, **el login y el hashing de contraseñas NO se modifican en este ciclo** (se centralizan en otra app); los hallazgos SEC-04/SEC-05 quedan documentados para coordinar con ese desarrollo.

### 🔴 SEC-01 · [P0] Endpoints MCP sin autenticación ni control de permisos
- **Evidencia:** `apps/api/src/middleware/auth.ts:44-47` deja pasar **todo** `/api/mcp/*` sin validar JWT ("*Allow MCP endpoints to bypass JWT check*"). `apps/api/src/routes/mcp.ts:31-32` tiene la validación de permisos **comentada** ("*Optional: Add DB validation here… For now, we trust…*"). El frontend llama con `mcp_user_id` fijo `default-user` (`apps/web/src/api.ts:48`).
- **Riesgo:** `POST /api/mcp/u/:mcp_user_id/tools/call` es **público**. Un anónimo puede invocar `delete_employee`, `delete_client`, `write_time_records`, `create_bulk_time_records`, `sync_clockify_hours`, `send_email_reminders`, etc. El `mcp_user_id` de la URL es decorativo. Contradice frontalmente el "Default Deny / per-user scoping" que el propio proyecto declara como regla crítica.
- **Fix:** exigir API key verificada contra DB en el middleware para `/api/mcp`; validar en cada llamada que `mcp_user_id` tenga permiso explícito sobre `toolName` (default deny); derivar `company_id` del principal autenticado.
- *Corroborado por: Seguridad, Arquitectura, Funcional (H-2).*

### 🔴 SEC-02 · [P0] Bypass total de autenticación en producción
- **Evidencia:** `apps/api/src/middleware/auth.ts:27-35` — si no hay token y `c.env.ENVIRONMENT === 'development'` (o `c.env` es falsy), asigna automáticamente `{ company_id: 'mooving-default', role: 'admin' }`. `apps/api/wrangler.toml:11-12` define `ENVIRONMENT = "development"` en las `vars` del Worker desplegado.
- **Riesgo:** **cualquier petición sin cabecera `Authorization` recibe rol `admin`**. La autenticación es efectivamente opcional en todo `/api/*`.
- **Fix:** eliminar el fallback de dev del código; configurar `ENVIRONMENT="production"` en el entorno desplegado; nunca derivar identidad/rol de la ausencia de token.
- *Corroborado por: Seguridad, Funcional (H-3).*

### 🔴 SEC-03 · [P0] Control de acceso por rol es cosmético (client-side)
- **Evidencia:** `apps/web/src/App.tsx:27-31` y `QuickLogModal.tsx` derivan `isAdmin` de `localStorage.getItem('mooving_user_role')`, editable por el usuario. La sección "Métricas Ejecutivas (C-Level) — Confidencial" (`Dashboard.tsx:443-490`) se muestra a cualquier `admin`.
- **Riesgo:** cambiar ese valor a `admin` en el navegador desbloquea Dashboard, AdminPanel y CRUD, incluidas vistas marcadas como confidenciales.
- **Fix:** gating de vistas por permiso real devuelto por `/auth/me` (que ya entrega `permissions`); no confiar en `localStorage` para autorización.
- *Corroborado por: Funcional (H-1), UX (#1/#2), Seguridad.*

### 🔴 SEC-04 · [P0] Backdoors de contraseña y comparación en texto plano *(login — diferido)*
- **Evidencia:** `apps/api/src/routes/auth.ts:29-33` — `isValid = password === 'Mooving2026!' || password === 'moovingadm' || password === user.password_hash`. Los "hashes" sembrados son literales (`migrations/0002_add_auth_and_rbac.sql:31,36-39`).
- **Riesgo:** conocer **un email válido** + una de las dos contraseñas maestras da acceso como ese usuario (incluido admin). No hay hashing real.
- **Estado:** **DIFERIDO por decisión del equipo** (login se centraliza en otra app). Documentado para coordinar la migración a hashing (bcrypt/scrypt/argon2 o PBKDF2 vía WebCrypto) en ese desarrollo.
- *Corroborado por: Seguridad, Arquitectura, Funcional.*

### 🔴 SEC-05 · [P0] Fallback de `JWT_SECRET` a valor público conocido *(login/auth — diferido)*
- **Evidencia:** `apps/api/src/middleware/auth.ts:55` y `apps/api/src/routes/auth.ts:49` — `verify/sign(token, c.env.JWT_SECRET || 'mooving-dev-secret')`. `JWT_SECRET` no aparece en `wrangler.toml`.
- **Riesgo:** si el secreto no está definido, se firma/verifica con `'mooving-dev-secret'` (público en el repo) → un atacante **forja un JWT con cualquier `company_id`/`role`**.
- **Estado:** **DIFERIDO** (parte del flujo de auth). Acción mínima recomendada al coordinar con la app de usuarios: exigir `JWT_SECRET` como secret de Workers y **fallar el arranque si falta** (no usar fallback).
- *Corroborado por: Seguridad, Arquitectura.*

### 🔴 SEC-06 · [P0] API key de producción (`sk_live_`) y credenciales de admin commiteadas
- **Evidencia:**
  - `apps/api/setup_senda_actions.js:3` → `MCP_TOKEN = "sk_live_8e8cb42b7fc7e15edf2fd6d6dadaa631713967cc1511f016a2fa76a0863e2c85"`
  - `apps/api/test_senda_post.js:2` y `apps/api/test_senda_setup.js:86` → misma `sk_live_...`
  - `apps/api/test_senda_setup.js:36`, `test_minimal.js:7`, `test_senda_login.js:5-6` → `email: "monica@mooving.ai", password: "Mooving321"` (cuenta admin).
  - Además, el archivo de contexto `ANTIGRAVITY_CREDENTIALS_AND_CONFIG.md` (carpeta del proyecto) contiene tokens de **Cloudflare, GitHub PAT y Zendesk** en texto plano.
- **Riesgo:** secretos de larga vida expuestos en el historial de git y en la carpeta compartida.
- **Fix (URGENTE):** **rotar/revocar** la key `sk_live_`, la contraseña `Mooving321`, el PAT de GitHub, el token de Cloudflare y el de Zendesk. Purgar del historial (`git filter-repo`/BFG). Mover secretos a Workers Secrets / variables de entorno. Sacar los scripts del control de versiones.
- *Corroborado por: Seguridad, Arquitectura (P1-3).*

### 🟠 SEC-07 · [P1] RBAC del backend mockeado con `admin` hardcodeado
- **Evidencia:** `apps/api/src/routes/data.ts:88-89` (POST `/records`) y `173-174` (PUT) fijan `currentUserRole = 'admin'` y `currentUserId = 'mock-user-123'`; la verificación de línea 92 nunca falla. El `DELETE` (`data.ts:199-208`) no verifica rol. El `GET` (`data.ts:123-135`) **sí** usa el rol real del JWT, evidenciando el descuido.
- **Riesgo:** cualquier usuario autenticado puede crear/editar/borrar horas a nombre de terceros.
- **Fix:** usar `c.get('auth')?.role` y `?.user_id` reales en POST/PUT/DELETE (como ya hace el GET). *Nota: intersecta con la autorización que la nueva app de usuarios definirá; coordinar contratos de rol.*
- *Corroborado por: Seguridad (P1-1), Arquitectura (P0), Funcional (H-3), UX.*

### 🟠 SEC-08 · [P1] `/api/auth/login` sin rate limiting *(login — diferido)*
- **Evidencia:** `apps/api/src/routes/auth.ts:14` — sin throttling. Agravado por SEC-04.
- **Estado:** DIFERIDO (login). Recomendación para la app de usuarios: rate limiting por IP/email + bloqueo tras N fallos (Cloudflare Rate Limiting / KV).

### 🟡 SEC-09 · [P2] Token JWT en `localStorage` (robable vía XSS)
- **Evidencia:** `apps/web/src/api.ts:4`, `Login.tsx:31` (`localStorage`). TTL de 24h.
- **Fix:** cookie `HttpOnly`+`Secure`+`SameSite` gestionada por backend, o minimizar TTL. *(Coordinar con la app de usuarios.)*

### 🟡 SEC-10 · [P2] CORS refleja `localhost` y hace fallback permisivo
- **Evidencia:** `apps/api/src/middleware/cors.ts:20-25` — refleja cualquier `http://localhost:*` y, para orígenes no permitidos, responde `Access-Control-Allow-Origin: allowedOrigins[0]`. No usa `Allow-Credentials` (mitiga el peor caso).
- **Fix:** lista blanca estricta condicionada al entorno; no reflejar localhost en producción.

### 🟢 SEC-11 · [P3] `wrangler.toml` versionado (expone `database_id`) y PII hardcodeada
- **Evidencia:** `apps/api/wrangler.toml:7` está trackeado pese a estar en `.gitignore:31`. Emails de empleados como CC por defecto en `mcp/server.ts:853,1108`.
- **Fix:** sacar `wrangler.toml` del control de versiones; mover CC a configuración por tenant.

### ✅ Verificaciones sin hallazgo (higiene positiva)
- **SQL injection:** todas las queries D1 usan `prepare().bind()` con placeholders. No se encontró concatenación de input en SQL.
- **XSS:** no hay `dangerouslySetInnerHTML` ni `v-html`; `react-markdown` se usa sin `rehype-raw` (no renderiza HTML crudo).

---

## 3. Aislamiento multi-tenant

### ✅ MT-01 · [P0] Operaciones `update/delete` sin `company_id` — **RESUELTO EN ESTA AUDITORÍA**
- **Evidencia original:** en `apps/api/src/mcp/server.ts`, las 8 operaciones `update_client`/`delete_client`/`update_project`/`delete_project`/`update_employee`/`delete_employee`/`update_category`/`delete_category` filtraban **solo por `id`**, sin `company_id`. Un tenant podía modificar/borrar entidades de otro conociendo el `id`. Las lecturas correspondientes sí filtraban por `company_id`, evidenciando la inconsistencia.
- **Acción ejecutada:** se añadió `AND company_id = ?` a las 8 queries, resolviendo `company_id` desde el contexto de autenticación (patrón ya usado en el resto del archivo). **Sin cambios en el flujo de login.**
- **Verificación:** nuevo archivo `apps/api/src/tests/mcp_tenant_isolation.test.ts` (2 tests) que prueba que cada mutador incluye `company_id = ?` y liga el `company_id` autenticado. **Suite completa: 32/32 verde. Build OK.**
- **Entrega:** rama `fix/multi-tenant-isolation-p0`, commit `fix(mcp): enforce company_id scope on all update/delete tools`.
- *Corroborado por: Seguridad (P0-7), Arquitectura (P0), Funcional.*

### 🟠 MT-02 · [P1] Herramientas MCP toman `company_id` del body del request
- **Evidencia:** casi todas las tools de `mcp/server.ts` usan `params.company_id || c.get('auth')?.company_id || 'mooving-default'` (p. ej. `get_time_records:270-273`, `get_availability_metrics:292-295`). Combinado con SEC-01 (MCP sin auth), permite leer/escribir datos de cualquier empresa pasando el `company_id` deseado.
- **Fix:** una vez cerrado SEC-01, **ignorar `company_id` del body** y tomarlo siempre del principal autenticado; eliminar el fallback `'mooving-default'`. (No incluido en el fix de MT-01 porque requiere primero cerrar la autenticación MCP para no romper el frontend actual.)
- *Corroborado por: Seguridad (P0-6), Arquitectura.*

---

## 4. Calidad de datos

> Los CSV en sí tienen **buena calidad intrínseca** (UTF-8 correcto, acentos íntegros, fechas válidas, sin horas absurdas: máx 9h/registro, 12,5h/día). El riesgo está en la **lógica de procesamiento**. Datos: `detalle.csv` = 3.097,3h / 1.436 filas (coincide con el glosario), 9 colaboradores, 18 proyectos, 10 clientes, ene–jun 2026.

### 🔴 DATA-01 · [P0] El importador CSV de la web es incompatible con el formato real
- **Evidencia:** `Dashboard.tsx` (`handleCsvUpload`, L170-205) asume un CSV **de 10 columnas normalizado y sin comillas**. El archivo real es un export **Toggl/Clockify de 18 columnas, todas entrecomilladas**, en otro orden (`Proyecto, Cliente, Descripción, Equipo, Usuario, Grupo, Correo, Etiquetas, Facturable, Fecha inicio…`). Al subir `detalle.csv` tal cual:
  - `Correo electrónico` se guarda como `duration_decimal` → `NaN` → **fallback fabricado 1.0h**.
  - `Etiquetas` (98,5% vacío) se guarda como `date` → vacío → **fallback fabricado `hoy()`**.
  - `Facturable` ("Sí"/"No") se guarda como `work_type` → no matchea → todo cae a `project`.
  - `line.split(',')` **no maneja comillas** → se rompe con el cliente `"Camuzzi, team soporte"` (coma interna desalinea toda la fila).
- **Riesgo:** importar por UI produce datos basura; y como el API valida el lote completo con Zod, **una fila inválida rechaza todo el lote** (o entra corrupto, o no entra nada).
- **Fix:** usar PapaParse (respeta comillas); parsear el formato Toggl de 18 columnas reutilizando el mapeo ya correcto de `apps/api/scripts/seed-csv.mjs`; validar fila-a-fila y reportar filas rechazadas.
- *Corroborado por: Datos (P0-1), Arquitectura (P1), Funcional (H-5).*

### 🔴 DATA-02 · [P0] `work_type` se infiere del nombre de proyecto → reuniones y capacitaciones siempre en 0
- **Evidencia:** no existe columna "tipo de trabajo"; `seed-csv.mjs` (`mapWorkType`) lo infiere del **nombre del Proyecto**. Resultado empírico: `project: 831 · internal: 605 · meeting: 0 · training: 0`. Pero en `Descripción` hay **265 filas con "Daily/Reunión/sync"** y **32 con "capacitación"**, todas mal clasificadas.
- **Riesgo:** la sección "Bolsa de Horas" (filtra `work_type==='meeting'`) **siempre muestra 0 reuniones**; los % de ocupación quedan sesgados.
- **Fix:** derivar `work_type` combinando Proyecto + heurística sobre `Descripción` (reunión/daily/sync→meeting; capacitación/onboarding→training), o categorizar en el origen (tags de Toggl / `Grupo`).
- *Corroborado por: Datos (P0-2), Funcional.*

### 🟠 DATA-03 · [P1] Re-importar el CSV reintroduce el cliente "Interno" que la migración fusionó
- **Evidencia:** el CSV tiene `Interno` (689 filas) y `Mooving` (157) separados; la migración `0009_merge_interno_client.sql` los fusiona en `mooving`. El glosario confirma la fusión.
- **Riesgo:** re-importar crudo duplica el cliente y parte los totales "por cliente Mooving" en dos, distorsionando la métrica ejecutiva de "Concentración de Riesgo".
- **Fix:** aplicar el merge Interno→Mooving **en el pipeline de ingesta**, no sólo como migración one-shot.

### 🟠 DATA-04 · [P1] Solapamiento entre los dos CSV → doble conteo
- **Evidencia:** las **77 filas de junio de `detalle.csv` están contenidas en `detalle (2).csv`** (superset, 218 filas de junio). `seed-csv.mjs` no deduplica.
- **Fix:** clave natural (usuario+fecha+hora inicio+proyecto) + dedup en la ingesta; tratar `detalle (2).csv` como canónico de junio.

### 🟠 DATA-05 · [P1] Nombres de empleado inconsistentes + validación "todo o nada" + fabricación silenciosa
- **Evidencia:** columna `Usuario` mezcla `monica.aieta` (7 casos) con `Augusto Morelli` (2). El match del frontend por nombre falla para los de formato punto. Además `data.ts` valida el array completo (una fila mala tira el lote) mientras el frontend fabrica `1.0h`/`hoy()` ante faltantes.
- **Fix:** normalizar `employee_name` a Nombre Propio (derivar del correo); validar por fila; **nunca fabricar** duración/fecha — marcar la fila inválida.

### 🟡 DATA-06 · [P2] Se pierden datos monetarios y de clasificación
- **Evidencia:** el CSV trae `Tarifa facturable (USD)`, `Importe facturable (USD)`, `Facturable` (747 "Sí"/689 "No"), `Grupo` (Desarrollo/Funcional/operaciones) y `Equipo`, pero el endpoint `/upload` **no setea `is_billable`** (default 0) y el esquema `time_records` no persiste tarifa/importe/grupo. 10 duplicados exactos en `detalle.csv`.
- **Fix:** ampliar `time_records` con `rate_usd`, `amount_usd`, `team`, `group`; setear `is_billable` en `/upload`. (Habilita el panel C-level real — ver FEAT-04.)

---

## 5. Ajuste funcional

**Veredicto:** sirve bien al **empleado**, parcialmente al **C-level** (proxies %, sin dinero) y **no tiene identidad propia para el coordinador** (colapsado en `admin`). La jerarquía de equipos/RACI que existe en el negocio no se explota.

| Rol | Necesita | Hay hoy | Brecha |
|---|---|---|---|
| **Empleado** | Cargar rápido, ver progreso, saber qué falta | `MyTime`, QuickLog, meta 160h, Senda | Menor: no ve estado de aprobación; meta fija ignora part-time/licencias |
| **Coordinador** | Gestionar su equipo/cartera, validar horas, reasignar, alertas | **No existe el rol**; todo cae en `admin` sin scope | **Grande**: sin rol, sin scope RACI, sin bandeja de validación |
| **C-Level** | Facturación USD, facturable vs no, rentabilidad por cliente, tendencia | Panel C-level con **proxies %**, sin USD, sin serie temporal, sin export | **Media-grande**: faltan datos monetarios y tendencias |

**Funcionalidades existentes (inventario):** Login (JWT en localStorage), Sidebar con navegación admin/empleado, `MyTime` (carga + meta + dona + historial), `Dashboard` admin (KPIs, panel C-level proxy, gráficos, filtros multiselección, tablas de distribución, disponibilidad, bolsa de horas, analytics, tabla paginada con edición, import CSV, botonera Senda), `AdminPanel` (CRUD vía MCP, sync Clockify, recordatorios), modales (QuickLog, EditRecord, EmailReminders), Documentation. Backend: rutas auth/data/mcp/health, ~24 tools MCP, crons.

**Hallazgos funcionales adicionales** (además de los ya listados como SEC/DATA):

### 🟠 FUNC-01 · [P1] Las políticas del "Manual de Carga de Horas" no se aplican en el servidor
- **Evidencia:** ni `/upload` ni `/records` validan los límites documentados (min 0.5h, reunión ≤2h/día, interno ≤4h/día, ≤24h/día, no fechas futuras, descripción ≥10 chars). Zod sólo exige `number positive` + enum. El "QA valida antes de escribir" es promesa del doc, no código.
- **Fix:** motor de validación reutilizable (mismos límites del Manual) compartido por `/upload`, `/records` y `write_time_records`, con errores vs advertencias.

### 🟠 FUNC-02 · [P1] Disponibilidad/ocupación cuentan Vacaciones y Licencias como "horas trabajadas"
- **Evidencia:** Vacaciones/Licencias se registran como `Tareas Internas` (equipos "Vacaciones"/"Licencias"). El cálculo las suma como registradas → **infla ocupación y oculta ausencias**. Un empleado de vacaciones aparece "ocupado".
- **Fix:** descontar ausencias de las horas esperadas; meta mensual configurable por empleado (full/part-time).

### 🟡 FUNC-03 · [P2] `DELETE /records` contradice la política "NUNCA eliminar"
- **Evidencia:** el Manual exige reversión con registro negativo y trazabilidad; el endpoint borra físicamente y no escribe en `audit_logs` (que existe en schema pero no se usa).
- **Fix:** reemplazar DELETE físico por reversión + escritura en `audit_logs` (quién/cuándo/qué), respetando ventanas 7/30 días del Manual.

### 🟡 FUNC-04 · [P2] Herramientas simuladas presentadas como reales
- **Evidencia:** `send_inactivity_alerts` (`mcp/server.ts:569-579`) **no envía nada**, retorna `alerts_sent` simulado. ROI hardcodeado en `Dashboard.tsx:324,331,338` ("42h/mes", "15 anomalías", "92%").
- **Fix:** conectar alertas al cron + email real (Resend); calcular ROI de datos reales o etiquetar como demo.

---

## 6. UX y accesibilidad

### 🔴 UX-01 · [P0] "Mis Horas" muestra datos de TODA la organización como si fueran del empleado
- **Evidencia:** `MyTime.tsx:35` llama `api.listRecords()` sin filtro de usuario (`api.ts:35`, `GET /api/data/records` sin parámetros). Luego `MyTime.tsx:93` calcula "Horas este mes / 160h" y `:181,200` titula "**Tu** Historial" sobre **todos** los registros. El gráfico de clientes (`:232`) agrega horas de toda la empresa.
- **Riesgo:** privacidad, corrección y confianza para el rol empleado; su meta mensual es incorrecta (suma de toda la empresa).
- **Fix:** filtrar en servidor por el usuario autenticado en todas las vistas "Mis…".
- *Corroborado por: UX, Funcional.*

### 🟠 UX-02 · [P1] `alert()`/`confirm()` nativos (prohibidos por las reglas del proyecto)
- **Evidencia:** `AdminPanel.tsx:55` (`confirm`), `:84` (`alert`); `EditRecordModal.tsx:69` (`confirm`). No indican qué se elimina.
- **Fix:** modal de confirmación reutilizable que muestre el nombre del ítem.

### 🟠 UX-03 · [P1] `EditRecordModal` viola las Reglas de Hooks de React
- **Evidencia:** `EditRecordModal.tsx:12` hace `if (!isOpen || !record) return null` **antes** de `useState`/`useEffect` (L14-41). Puede lanzar "Rendered fewer hooks than expected" y romper la edición del admin.
- **Fix:** mover el early-return después de declarar todos los hooks.

### 🟠 UX-04 · [P1] Marca visual inconsistente: la UI usa indigo/sky, no los colores Mooving
- **Evidencia:** `tailwind.config.js:8` (`theme.extend` vacío); los colores oficiales `#1a5f7a`/`#f97316` viven en un objeto `MOOVING_COLORS` **duplicado en 8+ archivos** aplicado por `style` inline, mientras el "chrome" (Sidebar, botones, login) usa `indigo`/`sky`. El producto se ve morado, no azul-Mooving.
- **Fix:** definir `colors.mooving` en Tailwind y reemplazar duplicados y clases `indigo-*`.

### 🟡 UX-05 · [P2] Sin roles ARIA / gestión de foco en modales; sin responsive real
- **Evidencia:** ningún modal declara `role="dialog"`/`aria-modal`, no atrapan foco ni cierran con `Esc`. `Sidebar.tsx:29` (`w-64` fijo, sin hamburguesa) + `Documentation.tsx:30` consumen ~512px en un móvil de 375px.
- **Fix:** componente Modal accesible (focus trap, Esc, aria); sidebar colapsable con breakpoints.

### 🟡 UX-06 · [P2] Tablas grandes sin orden/búsqueda/sticky header; C-level sin destino propio
- **Evidencia:** solo la tabla de registros pagina (`Dashboard.tsx:637`), sin orden ni búsqueda; las tablas maestras y analíticas no paginan. El C-level debe hacer scroll por todo el dashboard operativo para ver 3 métricas. Contenido duplicado: `BagOfHoursTable` (`:595`) y `TimeBagSection` (`:608`) muestran lo mismo dos veces.
- **Fix:** headers `sticky`, orden por columna, paginación; pestaña "Ejecutivo" con 3–5 KPIs arriba del pliegue; eliminar duplicación.

### 🟡 UX-07 · [P2] Semántica de color de disponibilidad invertida + KPIs redundantes
- **Evidencia:** `EmployeeAvailability.tsx:134` pinta `>80%` de **rojo** (un empleado 100% utilizado se ve "malo"). `AvailabilityMetrics.tsx:49,54` muestran "Ocupación" y "Utilización" con la **misma fórmula** y valor idéntico como dos tarjetas.
- **Fix:** convención de utilización coherente (alta = saludable, con umbral de sobrecarga); consolidar KPIs redundantes.

### 🟢 UX-08 · [P3] Microcopy con jerga técnica, terminología inconsistente y datos personales hardcodeados
- **Evidencia:** "Filtros Anidados Reactivos", "Capa 6 Senda AI: ROI Medible • vía MCP"; "Empleado/trabajador/Usuario" intercambiados; mes `'2026-07'` y CC con nombres reales fijos en `EmailRemindersModal.tsx:17-19` (quedará obsoleto). Login no usa su `isLoading` (`Login.tsx:120-125`).
- **Fix:** glosario único de términos; parametrizar mes/CC; estado de carga en el botón de login.

---

## 7. Arquitectura, código y proceso

### 🟠 ARCH-01 · [P1] Documentación describe un stack Vue que no existe (la app es React)
- **Evidencia:** `documentation/architecture/README.md:10-17,99` declara "Vue 3 / Pinia / Chart.js / Vue Router / `.vue` PascalCase"; la realidad es React 18 / Zustand / Recharts / React Router / `.tsx`. `REFACTOR_SUMMARY.md` y `documentacion para challenge.md` repiten "Vue 3". Además el código referencia un `AGENTS.md` que **no está en el repo** (`auth.test.ts:12`, `senda_actions.test.ts:4-8`).
- **Fix:** reescribir la doc de arquitectura al stack real; crear el `AGENTS.md` que el código ya asume como fuente de verdad.

### 🟠 ARCH-02 · [P1] Versionado incoherente (regla "estricta" incumplida)
- **Evidencia:** `VERSION`=`1.9.1`, `version.ts`=`v1.9.1`, `package.json` raíz=`1.0.1`, `apps/web|api/package.json`=`1.0.0`, `dataStore.ts:24`=`v1.0.0`, respuestas de `data.ts`=`v1.0.0`, `index.ts`=`v1.9.0`. Al menos 6 fuentes en desacuerdo.
- **Fix:** una única fuente (`VERSION`) inyectada en build; eliminar strings hardcodeados.

### 🟠 ARCH-03 · [P1] Cadena de migraciones D1 rota / schema maestro desincronizado
- **Evidencia:** `0009_merge_interno_client.sql:23` inserta en `clients(...industry, is_active)` columnas que `0004` no crea → falla aplicando solo migraciones. No existe migración base `0001` (las tablas base sólo viven en `db/schema.sql`). Hay **3 esquemas divergentes** (`db/schema.sql`, `documentation/database/schema.sql`, `db/mcp-schema.sql`). `0004` usa `INSERT ... SELECT *` posicional (frágil).
- **Fix:** añadir `industry/is_active` en una migración anterior a 0009; crear `0001` base; regenerar `db/schema.sql` como snapshot único post-migraciones.

### 🟠 ARCH-04 · [P1] Performance frontend: re-renders en cascada y cálculos sin memoizar
- **Evidencia:** `Dashboard.tsx:38` suscribe al store completo; `:57` ejecuta `getFilteredRecords()` en cada render devolviendo array nuevo (re-renderiza todos los hijos); KPIs (`:144-147`) y series (`:228-247`) sin `useMemo`; `:481,485` `.sort()` **muta en render**. Bundle único de 828KB (build sin code-splitting).
- **Fix:** selectores atómicos de Zustand, `useMemo` para `filteredRecords` y series, evitar `sort` mutante, `manualChunks`/lazy import.

### 🟡 ARCH-05 · [P2] Tipado débil y validación ausente en MCP; código muerto
- **Evidencia:** las ~24 tools son `(params: any)` sin Zod (57 usos de `any` en `server.ts`); `c.get('auth')` no está tipado (tsc reporta errores preexistentes). `types/schemas.ts` define un `TimeRecordSchema` en español **no usado**. `DocumentationViewer.vue` es un componente **Vue huérfano** en una app React (no compila, no se importa). `data.ts` filtra errores internos al cliente (`error.message`).
- **Fix:** esquemas Zod por tool; tipar el `Variables` del contexto Hono; eliminar `schemas.ts` y `DocumentationViewer.vue`; no exponer `error.message`.

### 🟡 ARCH-06 · [P2] N+1 de inserts a D1
- **Evidencia:** `data.ts:42-57` y `mcp/server.ts:232-258` (`create_bulk_time_records`) hacen un `INSERT` por fila en bucle.
- **Fix:** `c.env.DB.batch([...])`.

### 🟢 ARCH-07 · [P3] Tests superficiales y dos convenciones de carpeta
- **Evidencia:** los tests **no son phantom** (importan e invocan código de producción ✅), pero `tests/data.test.ts` tiene una sola aserción (`status 400`) y **ningún test cubría los P0** (aislamiento, bypass MCP, RBAC mock) — hasta el añadido en esta auditoría. Conviven `apps/api/src/__tests__/` y `apps/api/src/tests/`.
- **Fix:** tests de aislamiento e integración de escritura; unificar ubicación.

---

## 8. Matriz consolidada

| ID | Sev | Dimensión | Título | Estado |
|---|---|---|---|---|
| MT-01 | P0 | Multi-tenant | `company_id` en update/delete MCP | ✅ **Resuelto + tests** |
| SEC-01 | P0 | Seguridad | MCP sin autenticación/permisos | Backlog · Ola 1 |
| SEC-02 | P0 | Seguridad | Bypass de auth en producción (`ENVIRONMENT`) | Backlog · Ola 1 |
| SEC-03 | P0 | Seguridad | RBAC de UI client-side (localStorage) | Backlog · Ola 1 |
| SEC-06 | P0 | Seguridad | Secretos reales commiteados | Backlog · Ola 1 (rotar YA) |
| DATA-01 | P0 | Datos | Importador CSV incompatible | Backlog · Ola 1 |
| DATA-02 | P0 | Datos | `work_type` mal inferido (meeting/training=0) | Backlog · Ola 1 |
| UX-01 | P0 | UX | "Mis Horas" muestra datos de toda la empresa | Backlog · Ola 1 |
| SEC-04 | P0 | Seguridad | Backdoors de password / texto plano | ⏸️ Diferido (login) |
| SEC-05 | P0 | Seguridad | Fallback de `JWT_SECRET` | ⏸️ Diferido (login) |
| SEC-07 | P1 | Seguridad | RBAC backend mockeado | Backlog · Ola 1 |
| MT-02 | P1 | Multi-tenant | `company_id` desde el body | Backlog · Ola 1 (tras SEC-01) |
| DATA-03/04/05 | P1 | Datos | Merge Interno, dedup, nombres/validación | Backlog · Ola 2 |
| FUNC-01/02 | P1 | Funcional | Políticas en server; ausencias en ocupación | Backlog · Ola 2 |
| ARCH-01/02/03/04 | P1 | Arquitectura | Docs, versionado, migraciones, performance | Backlog · Ola 2 |
| UX-02/03/04 | P1 | UX | alerts nativos, Hooks, marca | Backlog · Ola 2 |
| SEC-08/09/10 | P1–P2 | Seguridad | rate limit (login), JWT storage, CORS | Backlog · Ola 2/3 |
| DATA-06, FUNC-03/04 | P2 | Datos/Func | USD/grupo, reversión, tools simuladas | Backlog · Ola 2/3 |
| UX-05/06/07/08 | P2–P3 | UX | a11y, tablas, color, microcopy | Backlog · Ola 3 |
| ARCH-05/06/07 | P2–P3 | Arquitectura | tipado, N+1, tests | Backlog · Ola 3 |
| SEC-11 | P3 | Seguridad | wrangler.toml / PII | Backlog · Ola 3 |

**Totales (hallazgos + backlog de mejoras/features):** 45 ítems — **10 P0** (1 resuelto ✅, 2 diferidos por login ⏸️, 7 activos en Ola 1), 18 P1, 14 P2, 3 P3. La cifra incluye las historias de tipo `FEAT-*` (mejoras propuestas) además de los bugs/riesgos; el detalle vive en `02_BACKLOG_PRIORIZADO.md` y el tablero interactivo `dashboard_auditoria.html`.

---

*Ver `02_BACKLOG_PRIORIZADO.md` para las historias de usuario accionables y `03_PLAN_DE_EJECUCION.md` para el plan por olas/sprints.*
