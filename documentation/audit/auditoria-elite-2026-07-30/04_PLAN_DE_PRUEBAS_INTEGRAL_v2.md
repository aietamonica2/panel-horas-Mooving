# Plan de Pruebas Integral v2 — Panel de Operaciones Mooving

**Fecha:** 30 de julio de 2026 · **Reemplaza/complementa:** `PLAN_DE_PRUEBA_INTEGRAL.md` (v1)
**Novedad v2:** incorpora los hallazgos de la auditoría de élite, casos de seguridad/multi-tenant/datos que faltaban, y el estado real de la suite automatizada.

---

## 0. Estado actual de la automatización (verificado hoy)

- **Framework:** Vitest (regla del proyecto). Ejecutar con `npm test -- --run`.
- **Resultado hoy:** **32/32 tests verdes** (30 base + 2 nuevos de aislamiento multi-tenant).
- **Build de producción:** `npm run build` OK (⚠️ bundle único de 828 KB — ver ARCH-04).
- **Cobertura real (auditada):** los tests **no son phantom** (importan e invocaban código de producción), pero antes de esta auditoría **ningún test cubría los P0**. `tests/data.test.ts` tiene una sola aserción. Prioridad de v2: subir cobertura en escritura, seguridad y aislamiento.

### Archivos de test existentes
`apps/api/src/tests/{mcp,data,email_reminders,email_reminders_cron,bulk_load,senda_actions}.test.ts` · `apps/api/src/routes/auth.test.ts` · `apps/api/src/__tests__/routes/health.test.ts` · `apps/web/src/stores/dataStore.test.ts` · **[NUEVO]** `apps/api/src/tests/mcp_tenant_isolation.test.ts`.

---

## 1. Estrategia de pruebas

Cinco niveles, alineados con las dimensiones auditadas:

1. **Unitarias** — lógica pura (parsing CSV, cálculo de ocupación, mapeo `work_type`, validación de políticas).
2. **Integración de API** — rutas Hono con D1 mockeada por patrón SQL (regla del proyecto: mocks con `query.includes(...)`).
3. **Seguridad / RBAC / multi-tenant** — casos adversariales (sin token, token forjado, cross-tenant, MCP sin key).
4. **UI / componentes** — render, estados vacíos, accesibilidad, Reglas de Hooks.
5. **E2E de humo** — flujos por rol contra la app desplegada.

**Regla anti-phantom (del proyecto):** todo test importa de `src/`, sin aserciones tautológicas, sin versiones/conteos hardcodeados (usar `toMatch(/^\d+\.\d+\.\d+$/)`, `toBeGreaterThanOrEqual`).

---

## 2. Casos de prueba por hallazgo P0/P1

### 2.1 Aislamiento multi-tenant (MT-01) — ✅ IMPLEMENTADO
| ID | Caso | Esperado | Estado |
|---|---|---|---|
| MT-T1 | `delete_employee({id: 'de-otro-tenant'})` con auth de tenant-A | Query incluye `AND company_id=?` ligado a `tenant-A` | ✅ pasa |
| MT-T2 | Los 8 mutadores (client/project/employee/category × update/delete) | Todos filtran por `company_id` | ✅ pasa |
| MT-T3 | *(pendiente Ola 1)* Borrado real cross-tenant en D1 de integración | 0 filas afectadas en tenant-B | 🔜 |

### 2.2 Autenticación y MCP (SEC-01/02) — 🔜 Ola 1
| ID | Caso | Esperado |
|---|---|---|
| SEC-T1 | `GET /api/data/records` sin `Authorization` en prod | 401 (hoy: 200 con datos — **debe fallar hasta el fix**) |
| SEC-T2 | `POST /api/mcp/u/x/tools/call` sin API key | 401 |
| SEC-T3 | MCP con API key válida pero sin permiso para `delete_employee` | 403 (default-deny) |
| SEC-T4 | MCP con permiso → ejecuta y responde `success` | 200 |
| SEC-T5 | Token JWT con `role` de empleado intenta POST record de otro `employee_id` | 403 |

### 2.3 RBAC de escritura (SEC-07) — 🔜 Ola 1
| ID | Caso | Esperado |
|---|---|---|
| RBAC-T1 | Empleado crea record a su propio nombre | 200 |
| RBAC-T2 | Empleado crea record a nombre de otro | 403 |
| RBAC-T3 | Admin crea record a nombre de cualquiera | 200 |
| RBAC-T4 | Empleado hace `DELETE /records/:id` de otro | 403 |

### 2.4 Ingesta de datos (DATA-01/02/03/04/05) — 🔜 Ola 1/2
| ID | Caso | Dato de prueba | Esperado |
|---|---|---|---|
| DATA-T1 | Parsear fila con campo entrecomillado con coma | `"Camuzzi, team soporte"` | 18 columnas, sin desalinear |
| DATA-T2 | Fila con duración inválida | `Duración=abc` | Fila **rechazada y reportada**, no `1.0h` fabricado |
| DATA-T3 | Fila sin fecha | `Fecha inicio` vacío | Fila rechazada, no `hoy()` |
| DATA-T4 | `work_type` de descripción "Daily proyectos Camuzzi" | — | `meeting` (no `internal`) |
| DATA-T5 | `work_type` de "Capacitación Bauti" | — | `training` |
| DATA-T6 | Re-importar `detalle.csv` sobre base con merge aplicado | — | No aparece cliente `interno`; totales Mooving consolidados |
| DATA-T7 | Cargar `detalle.csv` + `detalle (2).csv` | 77 filas junio comunes | Sin doble conteo (dedup por clave natural) |
| DATA-T8 | Nombre `monica.aieta` vs glosario "Monica Aieta" | — | Match correcto (normalización) |
| DATA-T9 | `is_billable` tras `/upload` de fila "Facturable=Sí" | — | `is_billable=1` (hoy: 0) |

### 2.5 Políticas del Manual (FUNC-01) — 🔜 Ola 2
| ID | Caso | Esperado |
|---|---|---|
| POL-T1 | Reunión de 3h en un día | Advertencia/rechazo (límite 2h/día) |
| POL-T2 | Interno de 5h en un día | Advertencia (límite 4h/día) |
| POL-T3 | Registro de 25h/día | Rechazo (>24h) |
| POL-T4 | Fecha futura | Rechazo |
| POL-T5 | Descripción de 4 caracteres | Rechazo (min 10) |

### 2.6 UX y componentes (UX-01/02/03) — 🔜 Ola 1/2
| ID | Caso | Esperado |
|---|---|---|
| UX-T1 | `MyTime` con datos de varios empleados | Sólo se muestran los del usuario autenticado; meta calculada sobre los suyos |
| UX-T2 | Abrir/cerrar `EditRecordModal` repetidamente | Sin error "Rendered fewer hooks than expected" |
| UX-T3 | Eliminar registro | Modal estilizado (no `confirm()` nativo) que nombra el ítem |
| UX-T4 | Estado con datos pero filtro sin resultados | Mensaje "Sin resultados para estos filtros" + limpiar |

---

## 3. Suite de humo E2E por rol (Hito de cada ola)

Ejecutar contra la app desplegada tras cada deploy. (Automatizable con Playwright — Chromium ya disponible en el entorno.)

**Empleado**
1. Login → ve sólo su navegación (sin Dashboard Admin ni AdminPanel).
2. Carga una hora con QuickLog → aparece en "Mis Horas".
3. Su "Horas este mes" refleja sólo sus registros.
4. No puede alcanzar vistas confidenciales editando `localStorage`.

**Coordinador** *(desde Ola 2)*
1. Ve sólo su cartera/equipo (scope RACI).
2. Bandeja de aprobación: aprueba/rechaza una hora con comentario.
3. Ocupación de su equipo descuenta ausencias.

**C-level**
1. Accede a la pestaña Ejecutivo (gateada por rol).
2. Facturación en USD por cliente coincide con el dato fuente.
3. Exporta a Excel/PDF con los filtros aplicados.

---

## 4. Datos de prueba y entornos

- **Fixtures:** subconjunto de `detalle.csv` (10–20 filas) cubriendo: campo con coma entrecomillada, fila sin fecha, duración inválida, reunión, capacitación, cliente Interno, duplicado exacto, nombre en ambos formatos.
- **D1 local:** `wrangler d1 migrations apply --local` debe correr **desde cero** (valida ARCH-03). Nunca resetear la D1 de dev sin backup + confirmación (regla del proyecto).
- **Multi-tenant:** sembrar 2 tenants (`tenant-A`, `tenant-B`) para los casos de aislamiento de integración.

## 5. Criterios de salida (release)

- 100% de los casos P0/P1 de las secciones 2.1–2.6 en verde.
- `npm test -- --run` y `npm run build` verdes en CI.
- Suite de humo por rol completa sin bloqueantes.
- Sin secretos en el árbol ni en el historial (verificación `gitleaks`/grep de `sk_live_`, `ghp_`, tokens).
- Migraciones aplican desde cero en una D1 limpia.

## 6. Cómo correr hoy

```bash
npm install
npm test -- --run                 # 32/32 verde
npx vitest run apps/api/src/tests/mcp_tenant_isolation.test.ts   # los 2 nuevos
npm run build                     # build de producción
cd apps/api && npx tsc --noEmit   # ⚠️ reporta errores de tipado preexistentes (ARCH-05)
```
