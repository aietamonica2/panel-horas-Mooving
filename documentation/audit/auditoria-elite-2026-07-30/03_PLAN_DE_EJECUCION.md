# Plan de Ejecución — Panel de Operaciones Mooving

**Fecha:** 30 de julio de 2026 · **Horizonte:** ~6 semanas (3 olas de 2 semanas)
**Basado en:** `02_BACKLOG_PRIORIZADO.md`

Este plan ordena el backlog en tres olas con una meta de negocio por ola. Cada ola termina con un hito verificable. El flujo de trabajo respeta el modelo del equipo (Claude en ramas `feature/*`/`fix/*`, revisión de Fede, merge y deploy por Antigravity) documentado en `IMPORTANTE_CAMBIOS.md`.

---

## Estado de partida (hecho en esta auditoría)

- ✅ **MT-01** — Aislamiento multi-tenant en las 8 operaciones update/delete del servidor MCP.
- ✅ 2 tests de regresión (`mcp_tenant_isolation.test.ts`).
- ✅ Suite: **32/32 verde**. Build de producción OK.
- ✅ Rama `fix/multi-tenant-isolation-p0` lista para revisión y merge.

**Acción inmediata previa a todo (día 0):** ejecutar **SEC-06** — rotar `sk_live_`, `Mooving321`, PAT de GitHub, token de Cloudflare y de Zendesk, y purgar del historial. Es independiente del código y reduce el riesgo activo mientras se planifica el resto.

---

## Ola 1 — Seguridad y confianza (Semanas 1–2)

**Meta:** que la app pueda exponerse a distintos perfiles sin fugar datos ni permitir acciones no autorizadas, y que importar datos reales no los corrompa.

| # | Historia | Esf. | Dependencias | Responsable sugerido |
|---|---|---|---|---|
| 1 | SEC-06 rotar/purgar secretos | S | — | Antigravity (infra) |
| 2 | SEC-02 quitar bypass + `ENVIRONMENT=production` | S | — | Claude + Antigravity |
| 3 | SEC-01 cerrar MCP (API key + default-deny) | M | SEC-06 | Claude |
| 4 | MT-02 `company_id` del principal en tools | S | SEC-01 | Claude |
| 5 | SEC-07 RBAC real en `data.ts` | S | — | Claude |
| 6 | SEC-03 gating de vistas por permiso real | M | SEC-07 | Claude |
| 7 | UX-01 "Mis Horas" filtra por usuario | S | SEC-07 | Claude |
| 8 | DATA-01 importador CSV real | M | — | Claude |
| 9 | DATA-02 `work_type` correcto | M | DATA-01 | Claude |
| 10 | SEC-10 CORS estricto | S | — | Claude |

**Hito 1 (fin S2):** un usuario sin token no obtiene datos; el MCP exige credencial; un empleado sólo ve lo suyo; subir `detalle.csv` real carga datos correctos con reuniones/capacitaciones bien clasificadas. **Pruebas:** ver `04_PLAN_DE_PRUEBAS_INTEGRAL_v2.md` §Ola 1 (regresión de seguridad + ingesta).

> **Coordinación con la app de usuarios:** SEC-01/03/07 definen el "contrato de roles y permisos". Alinear con el equipo que centraliza login para que los claims del JWT (o el mecanismo que definan) traigan `role`, `company_id` y scope. SEC-04/05/08 (hashing, secreto, rate-limit) quedan en ese lado.

## Ola 2 — Cierre del ciclo del dato + Rol Coordinador (Semanas 3–4)

**Meta:** cerrar el ciclo "cargar → validar → distribuir → decidir" y dar identidad propia al coordinador; que el C-level vea dinero real.

| # | Historia | Esf. | Dependencias |
|---|---|---|---|
| 1 | FEAT-01 rol coordinador + scope RACI | L | SEC-01/03/07 |
| 2 | FEAT-02 bandeja de aprobación de horas | M | FEAT-01 |
| 3 | FUNC-01 motor de políticas en server | M | DATA-01 |
| 4 | FUNC-02 disponibilidad neta de ausencias | S | — |
| 5 | DATA-03/04/05 merge, dedup, nombres/validación | M | DATA-01 |
| 6 | DATA-06 persistir USD/grupo/equipo | M | ARCH-03 |
| 7 | FEAT-04 panel C-level con USD real | M | DATA-06 |
| 8 | ARCH-01/02/03 docs, versión, migraciones | M | — |
| 9 | ARCH-04 performance frontend | M | — |
| 10 | UX-02/03/04 modales, Hooks, marca | M | — |

**Hito 2 (fin S4):** el coordinador ve y valida sólo su cartera; la ocupación descuenta ausencias; el panel ejecutivo muestra facturación en USD; migraciones aplican desde cero.

## Ola 3 — Diferenciación y pulido (Semanas 5–6)

**Meta:** convertir la herramienta en un producto de gestión maduro para las 3 audiencias.

| # | Historia | Esf. |
|---|---|---|
| 1 | FEAT-05 salud de cartera (RACI) | M |
| 2 | FEAT-06 pestaña Ejecutivo + tendencias | M |
| 3 | FEAT-07 export Excel/PDF | S |
| 4 | FEAT-08 Senda contextual por rol | S |
| 5 | FUNC-03 reversión + audit_logs | M |
| 6 | FUNC-04 alertas reales | M |
| 7 | UX-05/06/07/08 a11y, tablas, color, microcopy | M |
| 8 | ARCH-05/06/07 Zod MCP, batch, tests, código muerto | M |
| 9 | SEC-09/11 JWT cookie, wrangler.toml | S |

**Hito 3 (fin S6):** producto listo para empleados, coordinadores y C-level con exportación, auditoría de correcciones y asistente contextual.

---

## Gestión de riesgos del plan

| Riesgo | Mitigación |
|---|---|
| SEC-01 (cerrar MCP) rompe el frontend que usa `default-user` | Emitir una API key de servicio para el frontend y migrar la llamada en el mismo PR; test de humo del copiloto Senda |
| Cambios de RBAC chocan con la app de usuarios en desarrollo | Definir el contrato de claims/permeisos antes de la Ola 1; feature flag para el gating por rol |
| Reimportar CSV duplica o corrompe datos históricos | DATA-04 (dedup) antes de habilitar reimportación; backup de D1 antes de cada carga masiva |
| Migraciones D1 destructivas | Nunca `DROP`/reset sin backup y confirmación; probar `--local` primero (regla del proyecto) |
| Alcance de FEAT-01 (coordinador) crece | Entregar primero scope de lectura por cartera, luego acciones (aprobar/reasignar) |

## Definición de "Hecho" (por historia)

1. Código en rama `feature/*` o `fix/*`.
2. Test unitario/integración que cubre el criterio de aceptación (regla de testing del proyecto).
3. `npm test` y `npm run build` verdes.
4. Registro en `IMPORTANTE_CAMBIOS.md` + incremento de `VERSION`/`CHANGELOG`.
5. Revisión de Fede → merge y deploy por Antigravity → verificación en vivo.
