# Cierre de Olas 1 y 2 — Panel de Operaciones Mooving

**Fecha:** 31 de julio de 2026 · **Versión en GitHub `main`: v2.3.0** (fast-forward desde tu v2.2.3 local)
**Método:** 6 rondas de agentes en paralelo sobre archivos disjuntos, integrando + testeando + mergeando cada ronda. **102/102 tests verde, build de producción OK.**

---

## 1. Qué se ejecutó y mergeó a `main`

**Seguridad**
- **SEC-01** — Endpoints MCP cerrados: `/api/mcp` exige credencial (JWT del frontend o API key de Senda vía `SENDA_MCP_API_KEY`); anónimo → 401. Ya no se puede borrar empleados sin login.
- **SEC-02** — Auth falla cerrada: sin token no hay admin salvo `ENVIRONMENT=development` explícito; `/api/health` público; deploy en `production`.
- **SEC-07** — RBAC real en `/records` (POST/PUT/DELETE) desde el JWT; DELETE valida propiedad.
- **SEC-10** — CORS estricto (localhost solo en dev, sin fallback permisivo).
- **SEC-06** — Secretos hardcodeados sacados de los scripts (a `process.env`). ⚠️ **Las claves siguen comprometidas: hay que ROTARLAS** (Senda `sk_live_`, `Mooving321`, Clockify, PAT GitHub, token Cloudflare).
- **MT-01 / MT-02** — Aislamiento multi-tenant: `company_id` en todas las ops update/delete y **derivado del principal**, nunca del body.

**Datos**
- **DATA-01/02** — Importador CSV robusto (`utils/csvImport.ts`, RFC-4180) para el formato Toggl/Clockify real de 18 columnas; `work_type` inferido de proyecto+descripción (recupera reuniones/capacitaciones); validación fila-a-fila (no fabrica datos).
- **DATA-03/04/05** — Consolidación Interno→Mooving, deduplicación por clave natural, normalización de nombres.
- **DATA-06** — Persistencia de `rate_usd`/`amount_usd`/`is_billable` (migración 0017) + `status`.
- **ARCH-03** — `db/schema.sql` sincronizado con las migraciones + `MIGRATIONS_NOTES.md`.

**Negocio / Funcional**
- **FUNC-01** — Motor de validación de políticas en el servidor (`lib/policyValidation.ts`) aplicado en `/upload`.
- **FUNC-02** — Ocupación/disponibilidad netas de ausencias (vacaciones/licencias no inflan la ocupación).
- **FEAT-02** — **Flujo de aprobación de horas**: tools MCP (get_pending / approve / reject / approve_all) + vista **Aprobaciones** (admin).
- **FEAT-04** — Panel C-level con **facturación USD real** (fallback honesto si no hay datos); drilldown con USD.
- **NUEVO-3/5** — Alertas de inactividad al empleado correcto (no 2 fijos); contratos month-aware.

**Calidad / UX / Arquitectura**
- **UX-02/03** — Modal de confirmación reutilizable y accesible; se eliminan `alert()/confirm()`; corregida violación de Reglas de Hooks.
- **UX-04 / NUEVO-11** — Tokens de marca Mooving + **dark mode funcional**; animaciones definidas; clases Tailwind v4 no-op corregidas; capacidad por días hábiles reales.
- **NUEVO-4/6/7/8** — KPI top-N ordenado; ExportCSV anti-inyección; `link_external_user` con match exacto; tipos completos.
- **ARCH-02/04** — Versionado consolidado a una fuente; memoización del Dashboard (menos re-renders).
- **NUEVO-10** — Test fantasma reemplazado por cobertura real.

**Total: ~33 ítems resueltos** (Olas 1+2). Suite pasó de 30 → **102 tests**.

## 2. Trazabilidad (commits en `main`, v2.3.0)

Ola 1: `v2.2.4` — MT-01, SEC-02, SEC-07, SEC-10, NUEVO-4/7/8, SEC-06, fix crash Mis Horas.
Ola 2 (4 rondas): `v2.3.0` — SEC-01, MT-02, DATA-*, FUNC-01/02, FEAT-02/04, UX-02/03/04, ARCH-02/03/04, NUEVO-3/5/6/9/10/11.

Ramas en GitHub: `main` (v2.3.0), `backup/v2.2.3`, `fix/multi-tenant-isolation-p0-v223`, `fix/auditoria-remediacion-v223`, `fix/ola2-remediacion`.

## 3. Pendiente — requiere tu decisión o acción

| Ítem | Por qué no se auto-ejecutó |
|---|---|
| **Rotar secretos** (Senda/Clockify/GitHub/Cloudflare) | Acción tuya en cada proveedor; el código ya no los expone, pero siguen comprometidos en el historial (purgar con BFG). |
| **Deploy** + `ENVIRONMENT=production` en Cloudflare | El deploy es manual (workflow_dispatch). Mergear a main no deploya. |
| **`git pull` en tu main local** | Tu working copy quedó en v2.2.3; GitHub main está en v2.3.0 (fast-forward). Commiteá/stasheá antes tus cambios locales. |
| **FEAT-01 — Rol Coordinador + scope RACI** | Feature de producto que intersecta la app de gestión de usuarios que están centralizando; necesita el mapa RACI (qué coordinador ve qué cartera). La base ya está (RBAC real + rol de servicio). |
| **Login (SEC-04/05/08/09)** | Diferido por vos (se centraliza en otra app): hashing, `JWT_SECRET` sin fallback, rate limiting, JWT en cookie. |
| Polish menor (UX-05/06/07/08 tablas/microcopy, ARCH-05/06) | Bajo impacto; quedan como backlog. |

## 4. Antes de deployar (checklist rápido)
1. `ENVIRONMENT=production` en el Worker de Cloudflare.
2. Setear `SENDA_MCP_API_KEY` (secret) para que Senda siga llamando al MCP tras SEC-01.
3. Setear `JWT_SECRET` (secret) — hoy usa un fallback conocido.
4. Aplicar la migración `0017` a la D1 de producción.
5. Rotar los secretos expuestos.
6. Smoke test por rol (empleado carga/ve solo lo suyo; admin ve dashboard + aprobaciones).
