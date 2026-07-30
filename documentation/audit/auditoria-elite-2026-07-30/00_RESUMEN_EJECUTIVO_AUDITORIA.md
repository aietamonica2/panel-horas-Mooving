# Resumen Ejecutivo — Auditoría de Élite del Panel de Operaciones Mooving

**Fecha:** 30 de julio de 2026
**Auditor:** Equipo de élite (Analista Funcional + AppSec + Arquitectura + UX + Datos)
**Versión auditada:** **v2.2.3** (código local real). La auditoría inicial se corrió sobre GitHub `main` = **v1.9.1** y luego se **reconcilió contra v2.2.3** — ver `05_RECONCILIACION_v2.2.3.md`.
**Audiencia objetivo del producto:** empleados · coordinadores · C-level

> ⚠️ **Nota de versión (importante):** tu v2.2.3 vive **solo en la carpeta local** y está **7 commits por delante de GitHub** (que quedó en v1.9.1). Reconcilié todos los hallazgos contra el código real v2.2.3: los P0/P1 de backend/seguridad/datos **siguen todos vigentes**, y el código nuevo (v2.0–2.2.3) agregó hallazgos propios (`NUEVO-*`), incluido un **crash de la vista "Mis Horas" que ya corregí**. Acción de higiene: **pushear v2.2.3 a un remoto** para no depender de una sola máquina.

---

## 1. Veredicto en una línea

El producto tiene una **base funcional sólida para el rol "empleado"** y una intención ejecutiva clara, pero **hoy no es seguro ni está listo para exponerse a las tres audiencias**: el control de acceso es cosmético, los endpoints de IA (MCP) están abiertos sin autenticación, y varios cálculos clave (bolsa de horas, ocupación, facturación) se alimentan de datos mal categorizados. Ninguno de estos problemas es estructural: son corregibles con un plan de 4–6 semanas.

## 2. Semáforo por dimensión

| Dimensión | Estado | Lo más grave |
|---|---|---|
| **Seguridad** | 🔴 Crítico | Bypass de auth en producción, MCP abierto (permite borrar empleados sin login), backdoors de contraseña, secreto `sk_live_` real commiteado |
| **Aislamiento multi-tenant** | 🟡 En mejora | 8 operaciones borraban/editaban por `id` sin `company_id` — **ya corregido y testeado en esta auditoría** |
| **Ajuste funcional (3 roles)** | 🟡 Parcial | El rol "coordinador" no existe; el C-level ve proxies %, no dinero real |
| **Calidad de datos** | 🔴 Crítico | El importador CSV de la web no lee el formato real de Clockify → datos basura; reuniones/capacitaciones siempre en 0 |
| **UX / Accesibilidad** | 🟡 Parcial | "Mis Horas" muestra datos de toda la empresa; `alert()` nativos; marca visual inconsistente |
| **Arquitectura / Código** | 🟡 Parcial | Docs describen Vue (la app es React), versionado incoherente, migraciones D1 rotas |

## 3. Los 6 problemas que hay que resolver primero (P0)

1. **MCP abierto sin autenticación** — cualquiera con la URL puede ejecutar `delete_employee`, `write_time_records`, sincronizaciones. *(no toca login)*
2. **Bypass de autenticación en producción** — el Worker corre con `ENVIRONMENT="development"`, que otorga rol admin sin token. *(config, no login)*
3. **Aislamiento multi-tenant en herramientas MCP** — ✅ **RESUELTO en esta auditoría** (commit `fix/multi-tenant-isolation-p0`, 8 queries + 2 tests).
4. **Control de acceso por rol es client-side** — se edita en el navegador (`localStorage`) para desbloquear vistas confidenciales.
5. **Importador CSV roto** — subir el `detalle.csv` real desde la UI corrompe los datos.
6. **Secretos reales en el repositorio** — `sk_live_...` y credenciales de admin en scripts versionados → **rotar ya**.

> **Nota sobre login:** por indicación del equipo, el flujo de login y hashing de contraseñas **no se modifica** en este ciclo (se está centralizando en una app aparte de gestión de usuarios). Los hallazgos de login quedan documentados en el backlog (SEC-04/SEC-05) para coordinarse con ese desarrollo.

## 4. Qué ya se ejecutó en esta auditoría (sobre tu código real v2.2.3)

- ✅ **Fix P0 de aislamiento multi-tenant (MT-01)**: `company_id` añadido a las 8 operaciones `update/delete` de clientes, proyectos, empleados y categorías en el servidor MCP.
- ✅ **Fix P0 del crash de "Mis Horas" (NUEVO-1)**: `MyTime.tsx` usaba una variable `myRecords` sin declarar → crasheaba la vista por defecto del empleado (y `vite build` no type-checkea, por eso llegó a producción). Corregido: ahora las vistas personales filtran por el usuario logueado.
- ✅ **2 tests de regresión** de aislamiento multi-tenant.
- ✅ **Suite completa verde**: 35/35 tests. **Build de producción** OK.
- ✅ Entregado en la rama `fix/multi-tenant-isolation-p0-v223` y como parche `FIX_v2.2.3_isolation_and_mytime.patch` (aplicable con `git apply`). **No toca el login.**

## 5. La gran oportunidad de negocio

Para cumplir el goal de "app usada por empleados, coordinadores y C-level" faltan **dos piezas de alto valor** que hoy no existen:

- **Rol Coordinador real** con alcance por equipo/cartera (usando la matriz RACI que ya está documentada) + **bandeja de aprobación de horas**. Esto convierte la herramienta de "tracker" a "sistema de gestión".
- **Datos monetarios reales** (tarifa e importe USD ya vienen en el CSV pero se descartan). Persistirlos convierte el panel C-level de proxies porcentuales a **facturación y rentabilidad reales**.

## 6. Recomendación

Ejecutar el backlog en 3 olas (detalle en `02_BACKLOG_PRIORIZADO.md` y `03_PLAN_DE_EJECUCION.md`):

1. **Ola 1 — Seguridad y confianza (Semana 1–2):** cerrar MCP, quitar bypass, RBAC real de 3 roles, rotar secretos, arreglar importador CSV.
2. **Ola 2 — Cierre del ciclo del dato (Semana 3–4):** aprobación de horas, USD real, disponibilidad neta de ausencias, consolidación Interno→Mooving.
3. **Ola 3 — Diferenciación (Semana 5–6):** cartera RACI del coordinador, auditoría de correcciones, Senda contextual por rol, vista ejecutiva dedicada.

**No** conviene construir las features del roadmap previo (rentabilidad, comparativas, forecast) hasta cerrar Ola 1 y 2, porque se apoyarían en datos incompletos y sin segmentación por rol.

---

*Documentos relacionados: `01_AUDITORIA_CONSOLIDADA.md` (hallazgos completos con evidencia) · `02_BACKLOG_PRIORIZADO.md` · `03_PLAN_DE_EJECUCION.md` · `04_PLAN_DE_PRUEBAS_INTEGRAL_v2.md`.*
