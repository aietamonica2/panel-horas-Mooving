# Backlog Priorizado — Panel de Operaciones Mooving

**Fecha:** 30 de julio de 2026 · **Basado en:** `01_AUDITORIA_CONSOLIDADA.md`
**Escala de esfuerzo:** S = ≤1 día · M = 2–4 días · L = 1–2 semanas
**Prioridad:** P0 (crítico) → P3 (bajo). **Estado:** ✅ hecho · 🔜 listo para tomar · ⏸️ diferido.

> **Restricción del equipo:** el flujo de **login y hashing de contraseñas no se toca** en estos ciclos (se centraliza en una app de gestión de usuarios aparte). Las historias marcadas ⏸️ deben coordinarse con ese desarrollo.

---

## Épica 0 — Seguridad y confianza (habilita exponer la app a 3 roles)

| ID | Historia | Sev | Esf. | Estado | Criterio de aceptación |
|---|---|---|---|---|---|
| **MT-01** | Como tenant, mis clientes/proyectos/empleados no pueden ser editados ni borrados por otro tenant | P0 | S | ✅ | `AND company_id=?` en las 8 ops update/delete MCP + tests verdes |
| **SEC-06** | Rotar y purgar todos los secretos expuestos en el repo y en la carpeta compartida | P0 | S | 🔜 | `sk_live_`, `Mooving321`, PAT GitHub, token Cloudflare y Zendesk **rotados**; scripts sin secretos; historial purgado (BFG) |
| **SEC-01** | Cerrar los endpoints MCP: exigir API key + default-deny por herramienta | P0 | M | 🔜 | `/api/mcp/*` rechaza sin API key válida; `mcp_user_permissions` se valida antes de ejecutar; test que prueba 401 sin key y 403 sin permiso |
| **SEC-02** | Eliminar el bypass de auth y poner `ENVIRONMENT=production` | P0 | S | 🔜 | Sin token → 401 en prod; fallback de dev eliminado del código; secret de entorno correcto |
| **SEC-03** | Autorización de vistas por permiso real (no `localStorage`) | P0 | M | 🔜 | El gating usa `permissions` de `/auth/me`; editar `localStorage` no desbloquea vistas confidenciales |
| **SEC-07** | RBAC real en `data.ts` (POST/PUT/DELETE usan el JWT, no el mock) | P1 | S | 🔜 | Empleado no puede crear/editar/borrar horas de otros; test de 403 |
| **MT-02** | Herramientas MCP derivan `company_id` del principal, no del body | P1 | S | 🔜 | Tras SEC-01: `params.company_id` ignorado; test de aislamiento en lectura |
| **SEC-10** | Endurecer CORS (lista blanca por entorno) | P2 | S | 🔜 | No refleja localhost en prod; sin fallback permisivo |
| **SEC-09** | Mover JWT a cookie HttpOnly (o minimizar TTL) | P2 | M | ⏸️ | Coordinar con app de usuarios |
| **SEC-11** | Sacar `wrangler.toml` del repo + CC por tenant | P3 | S | 🔜 | `wrangler.toml` deja de trackearse; CC configurable |
| **SEC-04** | Hashing real de contraseñas (bcrypt/PBKDF2) | P0 | M | ⏸️ | **Login — app de usuarios** |
| **SEC-05** | Exigir `JWT_SECRET` sin fallback | P0 | S | ⏸️ | **Login/auth — app de usuarios** |
| **SEC-08** | Rate limiting en login | P1 | S | ⏸️ | **Login — app de usuarios** |

## Épica 1 — Integridad del dato (que los números sean correctos)

| ID | Historia | Sev | Esf. | Estado | Criterio de aceptación |
|---|---|---|---|---|---|
| **DATA-01** | Importador CSV que lee el formato Toggl/Clockify real (18 col, entrecomillado) | P0 | M | 🔜 | Subir `detalle.csv` real produce registros correctos; PapaParse; parser compartido con `seed-csv.mjs`; filas inválidas se reportan, no se fabrican |
| **DATA-02** | `work_type` derivado de Proyecto + `Descripción` (recupera meeting/training) | P0 | M | 🔜 | "Reunión/Daily/sync"→meeting, "capacitación"→training; la Bolsa de Horas deja de mostrar 0 reuniones |
| **DATA-03** | Consolidación Interno→Mooving en el pipeline de ingesta | P1 | S | 🔜 | Re-importar no reintroduce el cliente `interno`; totales por cliente correctos |
| **DATA-04** | Deduplicación por clave natural | P1 | S | 🔜 | Cargar ambos CSV no duplica junio; `INSERT OR IGNORE` / clave natural |
| **DATA-05** | Normalizar `employee_name` + validación fila-a-fila sin fabricar | P1 | M | 🔜 | Nombres consistentes (Nombre Propio); fila inválida marcada, no rellenada |
| **FUNC-01** | Motor de validación de políticas del Manual en el servidor | P1 | M | 🔜 | `/upload`, `/records`, `write_time_records` aplican límites (0.5h, ≤2h reunión, ≤4h interno, ≤24h/día, sin fecha futura); errores vs advertencias |
| **DATA-06** | Persistir `is_billable`, `rate_usd`, `amount_usd`, `team`, `group` | P2 | M | 🔜 | Esquema `time_records` ampliado; `/upload` setea `is_billable`; migración + schema maestro actualizado |
| **FUNC-03** | Reversión con registro negativo + `audit_logs` (no DELETE físico) | P2 | M | 🔜 | Correcciones auditables; ventanas 7/30 días |

## Épica 2 — Rol Coordinador (la audiencia hoy desatendida)

| ID | Historia | Sev | Esf. | Estado | Criterio de aceptación |
|---|---|---|---|---|---|
| **FEAT-01** | Rol `coordinator` con scope por equipo/cartera (matriz RACI) | P0* | L | 🔜 | Tabla empleado↔clientes/equipos; filtrado server-side por scope; navegación condicionada. *(P0 para el goal de 3 roles; depende de SEC-01/03/07)* |
| **FEAT-02** | Bandeja de aprobación de horas (`status: pending/approved/rejected`) | P1 | M | 🔜 | Coordinador aprueba/rechaza con comentario; empleado ve estado; migración de `status` |
| **FUNC-02** | Disponibilidad neta de ausencias + meta configurable por empleado | P1 | S | 🔜 | Vacaciones/Licencias no cuentan como trabajadas; ocupación corregida |
| **FEAT-05** | Vista "Salud de cartera" del coordinador (RACI) | P2 | M | 🔜 | Estado por cliente: horas mes vs esperadas, responsable, última carga, alertas |
| **FUNC-04** | Alertas de inactividad reales (no simuladas) vía cron + email | P2 | M | 🔜 | `send_inactivity_alerts` envía de verdad; reglas del Manual |

## Épica 3 — Valor ejecutivo (C-level) y vista dedicada

| ID | Historia | Sev | Esf. | Estado | Criterio de aceptación |
|---|---|---|---|---|---|
| **FEAT-04** | Panel C-level con dinero real (facturación/rentabilidad USD) | P1 | M | 🔜 | Usa `rate_usd`/`amount_usd` (DATA-06); facturable vs no en USD; ingreso por hora por cliente |
| **FEAT-06** | Pestaña "Ejecutivo" con 3–5 KPIs arriba del pliegue + tendencia temporal | P2 | M | 🔜 | Ruta dedicada gateada por rol; serie mensual; sin scroll por el dashboard operativo |
| **FEAT-07** | Exportación a Excel/PDF de vistas ejecutivas | P2 | S | 🔜 | Export de distribución/facturación con filtros aplicados |
| **FEAT-08** | Deep-links contextuales a Senda por rol | P2 | S | 🔜 | Prompts sugeridos por rol (empleado/coordinador/C-level) usando los 3 agentes ya diseñados |

## Épica 4 — Calidad técnica y UX transversal

| ID | Historia | Sev | Esf. | Estado | Criterio de aceptación |
|---|---|---|---|---|---|
| **UX-01** | "Mis Horas" filtra por el usuario autenticado | P0 | S | 🔜 | Un empleado sólo ve sus horas; meta mensual correcta |
| **UX-03** | Corregir violación de Reglas de Hooks en `EditRecordModal` | P1 | S | 🔜 | Early-return después de los hooks; sin warning en consola |
| **UX-02** | Modal de confirmación reutilizable (eliminar `alert/confirm`) | P1 | S | 🔜 | Sin diálogos nativos; muestra el ítem afectado |
| **UX-04** | Tokens de marca Mooving en Tailwind | P1 | M | 🔜 | `colors.mooving`; sin `indigo/sky` de chrome; sin objetos duplicados |
| **ARCH-02** | Fuente única de versión inyectada en build | P1 | S | 🔜 | Un solo `VERSION`; sin strings hardcodeados |
| **ARCH-03** | Reparar cadena de migraciones + schema maestro único | P1 | M | 🔜 | `wrangler d1 migrations apply` desde cero funciona; `db/schema.sql` = snapshot real |
| **ARCH-04** | Performance frontend (memoización, selectores, code-split) | P1 | M | 🔜 | Sin re-render en cascada; bundle con chunks; sin `sort` mutante en render |
| **ARCH-01** | Corregir documentación (React≠Vue) + crear `AGENTS.md` | P1 | S | 🔜 | Doc de arquitectura refleja React; `AGENTS.md` presente |
| **UX-05/06/07** | Modales accesibles, tablas ordenables/sticky, color coherente | P2 | M | 🔜 | `role=dialog`+focus trap; sticky headers + orden; utilización alta=saludable |
| **ARCH-05/06** | Zod en tools MCP, tipar contexto, eliminar código muerto, `batch()` | P2 | M | 🔜 | Sin `any` en params MCP; `schemas.ts`/`.vue` eliminados; inserts en batch |
| **ARCH-07** | Ampliar cobertura de tests (escritura + integración) | P2 | M | 🔜 | Tests de happy-path de `/upload` y `/records`; unificar carpeta de tests |
| **UX-08** | Glosario de términos, parametrizar mes/CC, loading en login | P3 | S | 🔜 | Terminología única; sin fechas/nombres hardcodeados |

\* FEAT-01 es P0 respecto del **objetivo de negocio** (3 audiencias), aunque no es una brecha de seguridad; por eso se planifica al inicio de la Ola 2, una vez cerrada la seguridad de base.

---

## Vista por prioridad (orden de ataque sugerido)

1. **Ahora (ya hecho):** MT-01 ✅
2. **P0 Ola 1:** SEC-06 (rotar) → SEC-02 → SEC-01 → SEC-03 → UX-01 → DATA-01 → DATA-02 → SEC-07 → MT-02
3. **P1 Ola 2:** FEAT-01 → FEAT-02 → FUNC-01/02 → DATA-03/04/05 → FEAT-04 → ARCH-01/02/03/04 → UX-02/03/04 → DATA-06
4. **P2–P3 Ola 3:** FEAT-05/06/07/08 → FUNC-03/04 → UX-05/06/07/08 → ARCH-05/06/07 → SEC-09/10/11
