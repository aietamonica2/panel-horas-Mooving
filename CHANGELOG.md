# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.1] - 2026-07-30

### Fixed
- **Fix ReferenceError en Dashboard (`InactivityAlertBanner`)**:
  - Corregida la importación del componente `InactivityAlertBanner` en `Dashboard.tsx` que causaba una pantalla blanca debido al error no capturado `ReferenceError: InactivityAlertBanner is not defined`.

## [2.2.0] - 2026-07-30

### Added
- **Dark Mode Toggle (Epic 7 - E7-03)**:
  - Botón selector de tema en la barra superior ("Modo Oscuro" / "Modo Claro") con estilos CSS condicionales oscuros.
- **Bolsa de Horas Opcional (Epic 4)**:
  - Rediseño de `ClientContractsSection.tsx` para ser completamente **opcional y desplegable/colapsable**.
  - Filtro "Solo con contrato activo" habilitado por defecto para no saturar cuando la mayoría de los clientes no tienen abonos contratados.
- **Comparativa Side-by-Side de Empleados (Epic 1 - E1-07)**:
  - Componente modal `EmployeeComparisonModal.tsx` para seleccionar 2 empleados y comparar horas totales, % facturable, promedio diario y desglose de clientes top en tiempo real.
- **Drill-Down Ejecutivo C-Level (Epic 3 - E3-06)**:
  - Componente modal `ExecutiveDrilldownModal.tsx` interactivo al hacer click en las tarjetas ejecutivas de Facturabilidad, Carga de Overhead o Concentración de Riesgo.
- **Evolución Histórica de 6 Meses del Empleado (Epic 2 - E2-05)**:
  - Gráfico de barras en "Mi Tiempo" (`MyTime.tsx`) con la evolución histórica personal de horas cargadas durante los últimos 6 meses.

## [2.1.0] - 2026-07-30

### Added
- **Epic 4 — Bolsa de Horas & Contratos de Clientes (`ClientContractsSection.tsx`, `0016_client_contracts.sql`)**:
  - **Migración D1 `0016`**: Creación de la tabla `client_contracts` para gestionar horas contratadas (retainer) por cliente y mes.
  - **Componente `ClientContractsSection.tsx`**: Visualización de horas consumidas vs contratadas con barra de progreso (🟢 <80%, 🟡 80-95%, 🔴 >95%) y modal para fijar bolsa por cliente.
  - **Herramientas MCP**: Añadidas `get_client_contracts` y `set_client_contract` para administración de contratos.
- **Epic 5 — Exportación a Excel (`ExportExcelButton.tsx`)**:
  - Botón de exportación limpia a CSV/Excel con codificación UTF-8 BOM para soporte completo de caracteres en español y filtros aplicados.
- **Epic 1 — Alerta de Inactividad de Carga (`InactivityAlertBanner.tsx`)**:
  - Banner en la parte superior del Dashboard que detecta automáticamente los empleados activos sin registros en el período actual y habilita el envío rápido de recordatorios.
- **Epic 2 — Vista del Empleado Mejorada (`MyTime.tsx`)**:
  - Incorporada tarjeta de **Índice de Facturabilidad Personal (%)** y desglose interactivo de horas por Tipo de Trabajo (Proyectos, Reuniones, Interno, Capacitación).
- **Epic 3 — Tendencia de Facturabilidad Global (`AnalyticsCharts.tsx`)**:
  - Gráfico de barras dual que compara el total de horas vs. horas facturables mes a mes con cálculo de Facturabilidad Global acumulada.
- **Epic 7 — Ordenamiento Dinámico por Columna (`DistributionTable.tsx`)**:
  - Cabeceras interactivas clicables para ordenar de forma ascendente/descendente (🔼 / 🔽) por Nombre, Horas y Cantidad de Registros.

## [2.0.0] - 2026-07-30

### Added
- **Epic 0 — Gestión Dinámica de Capacidad por Empleado (`0015_add_daily_hours_expected.sql`, `AdminPanel.tsx`, `AvailabilityMetrics.tsx`, `EmployeeWorkloadBreakdown.tsx`, `MyTime.tsx`)**:
  - **Migración D1 `0015`**: Añadida la columna `daily_hours_expected` a la tabla `employees` (con valor por defecto 8h/día, soportando rangos de 0 a 8h).
  - **Configuración de Carga en Administración (`AdminPanel.tsx`)**: Controles deslizantes (range sliders 0–8h) y columna explícita para ajustar la capacidad esperada individual por empleado.
  - **Semáforo de Cumplimiento 🟢🟡🔴 (`EmployeeWorkloadBreakdown.tsx`)**: Clasificación automática del rendimiento de carga: 🟢 Óptimo (≥90%), 🟡 Moderado (70–89%), 🔴 Bajo/Riesgo (<70%).
  - **Cálculo de Desviación Δ y Forecast**: Muestra horas esperadas del período, registradas y desviación para cada trabajador.
  - **Meta Dinámica Individual (`MyTime.tsx`)**: Cálculo exacto de la meta mensual personal multiplicando las horas diarias esperadas por los días hábiles (Lunes a Viernes) del mes en curso.

### Refactored
- **Componente Único `WorkTypeTable.tsx` (B9-FIX)** — Creación del componente genérico para renderizar desgloses por tipo de trabajo y eliminación de código duplicado.

## [1.9.6] - 2026-07-30

### Fixed
- **B3-FIX & B4-FIX: Métricas Ejecutivas C-Level con Datos Reales (`Dashboard.tsx`)** — Reemplazados los cálculos estáticos y heurísticas simples por evaluaciones reactivas reales basadas en el campo de facturabilidad `is_billable` de la base de datos y ordenamiento inmutable del cliente de mayor concentración.

## [1.9.5] - 2026-07-30

### Fixed
- **B1-FIX: Promedio Diario (`Dashboard.tsx`)** — Corregida la fórmula del Promedio Diario que dividía por el total de registros en lugar de los días laborales/únicos reales registrados (`uniqueDatesCount`).
- **B2-FIX: Filtro de Meses por Año (`FilterPanel.tsx`)** — Cambiado el agrupamiento de meses de `substring(5,7)` (mes de 2 dígitos) a `YYYY-MM` con formateo legible (ej. "Mayo 2026"), evitando la colisión de meses entre distintos años.
- **B6-FIX: Sanitizado de User ID (`MyTime.tsx`)** — Corregido `replace('.', '_')` a `replaceAll('.', '_')` para evitar discrepancias cuando el nombre de usuario tiene múltiples puntos.
- **B7-FIX: Inclusión de Capacitación en Overhead (`BagOfHoursTable.tsx`)** — Añadido el tipo `training` al filtro de registros de overhead junto a `internal` y `meeting`.

## [1.9.4] - 2026-07-30

### Fixed
- **Pantalla en blanco en producción (`Dashboard.tsx`)** — Error crítico de `ReferenceError: selectedCategories is not defined` que crasheaba el árbol de componentes de React al renderizar en producción. La variable `selectedCategories` se usaba en 5 lugares del componente pero su `useState` nunca había sido declarado. Corregido añadiendo `const [selectedCategories, setSelectedCategories] = useState<string[]>(['project', 'internal', 'meeting', 'training', 'other'])`.
- **Redondeo de decimales en acumulador de datos (`MyTime.tsx`)** — Corregido el valor flotante `193.66666666666666h` que persistía en la leyenda del gráfico de distribución por cliente, aplicando `Math.round(value * 100) / 100` directamente sobre el resultado del `reduce()`.

## [1.9.3] - 2026-07-30

### Fixed
- **Formateo Estricto de Decimales en la Vista Individual y Gráficos (`MyTime.tsx`, `AnalyticsCharts.tsx`, `BagOfHoursTable.tsx`, `EmployeeAvailability.tsx`)**:
  - Corrección del desborde decimal en el desglose de distribución por cliente de la vista individual (`MyTime.tsx`), convirtiendo acumulados tipo `193.66666666666666h` a un limpio `193.67h`.
  - Aplicación de formateo `.toFixed(2)` en tooltips y leyendas de todos los gráficos Recharts (`AnalyticsCharts.tsx`), bolsas de horas (`BagOfHoursTable.tsx`), y disponibilidad de empleados.

## [1.9.2] - 2026-07-30

### Added
- **Mapeo de Agentes e Identidades de Zendesk por Email y Alias (`sync_zendesk_tickets`)**:
  - Obtención dinámica del correo y nombre del agente resolutivo de Zendesk (`assignee.email`).
  - Matcheo directo por mail corporativo (`@moovingtech.com` / `@moovingtech.cloud`) contra la base de datos de empleados.
  - Creación de tabla `employee_aliases` y migración D1 `0014_employee_aliases.sql` para vinculación de cuentas.
- **Sección de "🔗 Vinculación de Empleados" en Panel de Administración (`AdminPanel.tsx`)**:
  - Interfaz gráfica para listar identidades no reconocidas de Zendesk o Clockify y vincularlas manualmente a un Empleado oficial del sistema en 1 solo clic.
  - Herramientas MCP registradas: `get_unlinked_external_users` y `link_external_user`.
- **Filtro por Rango de Fechas e Inputs ISO (`FilterPanel.tsx` & `Dashboard.tsx`)**:
  - Selectores `Fecha Desde` y `Fecha Hasta` en el panel de filtros anidados reactivos.
  - Botones de selección rápida (*"Este Mes"*, *"Últimos 7 Días"*, *"Últimos 30 Días"*, *"Limpiar Fechas"*).

### Fixed
- **Formateo Estricto de Decimales en Tablero Visual**:
  - Eliminación de cadenas con flotantes interminables (como `256.41666666666663h`) mediante formateo estricto `.toFixed(2)` en todas las tarjetas de carga de empleados (`EmployeeWorkloadBreakdown.tsx`), matrices por cliente (`ClientMonthlyDistribution.tsx`), métricas de disponibilidad y tablas de distribución.

## [1.9.1] - 2026-07-28

### Added
- **Paginación en Tabla Principal de Registros (`Dashboard.tsx`)**:
  - Controles de navegación de página (15 registros por página, indicador de total de filas, botones Anterior/Siguiente).
- **Mapeo Inteligente de `work_type` en Importador CSV**:
  - Soporte para términos en español y variaciones (`Reunión` → `meeting`, `Capacitación` → `training`, `Interna` → `internal`).

### Fixed
- **Maquetado de Botones Senda AI Copilot**:
  - Encapsulado de botones de acción directa en un contenedor `flex flex-wrap gap-3` para evitar desbordes y colisiones visuales en pantallas medianas.
- **Optimización de Performance al Filtrar**:
  - Consolidación de 5 disparadores `useEffect` en un solo dispatcher para eliminar re-renders en cascada en Zustand.

## [1.9.0] - 2026-07-28

### Added
- **Envío Automático de Emails por Cron (día 28 de cada mes)**:
  - Nuevo cron handler `email_reminders.ts` que se ejecuta automáticamente el día 28 de cada mes a las 12:00 UTC (09:00 ARG).
  - Sincronización previa de Clockify antes del envío para garantizar que las horas reportadas en los mails estén actualizadas.
  - Configuración en `wrangler.toml` con segundo trigger cron: `"0 12 28 * *"`.
  - Routing inteligente en `index.ts` que distingue entre el cron semanal (bulk load) y el mensual (email reminders) basado en el timestamp del trigger.
- **Mejoras al MCP Tool `send_email_reminders`**:
  - Nuevo parámetro `sync_clockify_first` (default `true`) que sincroniza automáticamente Clockify antes de enviar recordatorios.
  - Logging detallado por cada mail enviado o fallido vía SendGrid.
  - Response enriquecido con `failed_emails` y `clockify_sync` para trazabilidad completa.
- **Configuración de SendGrid API Key** en `.dev.vars` y tipado en `CloudflareEnv`.
- **Verificación de Single Sender** con `monica.aieta@moovingtech.com`.

### Technical
- Cloudflare Workers cron triggers: `["0 8 * * 2", "0 12 28 * *"]`
- API version bumped a v1.9.0 en endpoint root, 404, y error handler.

## [1.8.2] - 2026-07-30

### Changed
- **Estandarización de Motor de Email Nativo Cloudflare Workers**:
  - Configurado como motor de envío primario predeterminado a **Cloudflare MailChannels**.
  - Configurada dirección de remitente predeterminada: `Mónica Aieta - Mooving Tech <no-reply@mooving.ai>`.
  - Eliminada dependencia de proveedores de terceros (SendGrid/Resend) para simplificar la infraestructura y evitar errores de verificación de dominio.

## [1.8.1] - 2026-07-27

### Added
- **Integración Nativa con SendGrid API (v3)**:
  - Soporte para el envío automático directo de mails a través de la API REST de SendGrid (`POST https://api.sendgrid.com/v3/mail/send`).
  - Formateo automático de destinatarios, copias (`CC`) y cuerpo plano del correo para cada recordatorio de horas.
  - Configuración segura de secretos y credenciales en Cloudflare Workers context (`c.env.SENDGRID_API_KEY`).

## [1.8.0] - 2026-07-27

### Added
- **Módulo de Borradores y Recordatorios por Mail (`EmailRemindersModal.tsx`)**:
  - Detección automática de empleados dados de alta y estado de carga de horas acumuladas para el mes seleccionado.
  - Generación dinámica de borradores de mails personalizados en español con formato decimal estandarizado (`64,75`, `136,00`, `0,00`).
  - Selección/deselección individual y masiva de destinatarios.
  - Edición flexible de direcciones de correo y de copias (`CC` por defecto: `Eddie Rodriguez Von der Becke <eddie.rodriguez@moovingtech.com>; Julieta Albina <julieta.albina@moovingtech.com>`).
  - Botón de copia completa de informe de borradores al portapapeles y soporte para apertura directa en cliente de correo (`mailto:`).
  - Configuración e integración para automatización y régimen programado a fin de mes.
- **Soporte para Empleados Inactivos / Fuera de la Organización**:
  - Añadido campo `is_active` en la entidad de empleados.
  - Los empleados marcados como "Fuera de la organización" quedan excluidos automáticamente de las auditorías y recordatorios de mail a futuro, con opción de visibilidad mediante filtro toggle.
- **Nuevas Herramientas MCP**:
  - `get_email_reminder_drafts`
  - `send_email_reminders`
  - `configure_email_reminder_schedule`
- **Migración D1 `0013_email_reminder_settings.sql`** aplicada en la base de datos de producción.

## [1.7.1] - 2026-07-01

### Fixed
- **Cálculo de horas incorrecto**: Se reemplazó el uso de `duration_hours` (que descartaba los decimales de hora) por `duration_decimal` en todos los componentes del frontend para que las tablas de distribución, gráficos analíticos y resúmenes de horas reflejen los valores exactos.

## [1.7.0] - 2026-06-18

### Added
- **Nuevo MCP tool `senda_widget_action`**: reenvía un mensaje al API de Senda AI (endpoint `/v1/chat/completions`) y retorna la respuesta textual. Disponible tanto desde el widget como directamente vía MCP. Requiere `SENDA_API_KEY` en las variables de entorno del Worker.
- **Nuevo MCP tool `senda_bulk_load`**: wrapper público de `create_bulk_time_records` con validación de `company_id` obligatorio. Permite cargas masivas desde el widget de Senda, la UI y el cron.
- **Cron de carga masiva semanal**: nuevo archivo `apps/api/src/cron/bulk_load.ts` con un handler `handleBulkLoadCron` que lee programaciones de la tabla `bulk_load_schedules` y ejecuta la carga masiva. Incluye fallback a programación por defecto si la tabla no existe.
- **Trigger programado en Cloudflare Workers**: `wrangler.toml` actualizado con `[triggers] crons = ["0 8 * * 2"]` para ejecutar la carga masiva cada martes a las 08:00 UTC.
- **Migración `0012_bulk_load_schedules_and_new_mcp_tools.sql`**: crea la tabla `bulk_load_schedules` para persistir programaciones por tenant y registra los nuevos tools en `mcp_tool_catalog`.
- **`setup_senda_actions.js` actualizado**: incorpora `senda_widget_action` y `senda_bulk_load` al catálogo de acciones de Senda QA para disponibilidad inmediata desde el widget.
- **`Env` type alias**: nuevo alias exportado desde `src/types/index.ts` usado por el cron handler y el entry-point del Worker.
- **Scheduled export en `src/index.ts`**: el entry-point ahora exporta la función `scheduled()` requerida por Cloudflare Workers para ejecutar el cron.
- **Tests nuevos** (18/18 ✅):
  - `src/tests/senda_actions.test.ts` (7 tests): valida `senda_widget_action` y `senda_bulk_load` con mocks de D1 y fetch.
  - `src/tests/bulk_load.test.ts` (5 tests): valida el cron handler incluyendo filtros de días, fechas inválidas, limite de 31 días y fallback sin tabla.

### Fixed
- **Cron loop date iteration**: reemplazado el loop `for (let d = new Date(...)...d.setUTCDate(...))` con un loop basado en contador índice para evitar off-by-one errors por mutación del objeto Date.
- **`days_of_week` parsing**: el handler ahora acepta tanto arrays nativos como strings JSON para compatibilidad con datos de la DB y objetos en memoria.

## [1.6.1] - 2026-06-17

### Fixed
- Normalized employee_name output in parse_natural_language_hours to lowercase with dots.

## [1.6.0] - 2026-06-17

### Added
- Nueva herramienta MCP (`create_bulk_time_records`) en el backend para permitir cargas masivas y recurrentes de horas. El agente de Senda AI ahora puede procesar solicitudes como "carga todos los martes 8hs" o "carga diariamente hasta fin de mes". Se incluye un límite máximo de 31 días por motivos de seguridad.

## [1.5.1] - 2026-06-17

### Fixed
- Mejora en la función `parse_natural_language_hours` de la API para que extraiga los nombres de clientes y proyectos consultando dinámicamente la base de datos (Cloudflare D1) en lugar de una lista estática, solucionando el problema al cargar horas para clientes como "Decathlon".

## [1.5.0] - 2026-06-16

### Added
- Vista interactiva de Administración en el Frontend (`AdminPanel.tsx`) para la gestión (CRUD) de Empleados, Clientes, Proyectos y Categorías de manera visual.
- Integración nativa del Panel de Administración con las herramientas MCP del backend, unificando la lógica gráfica con las capacidades del LLM de Senda AI.

### Removed
- Eliminación y limpieza de proyecto obsoleto `panel-horas-web` en Cloudflare Pages, consolidando todo el sistema bajo `panel-horas-mooving`.

## [1.4.3] - 2026-06-16

### Fixed
- Error de referencia en la vista "Mis Horas" (MyTime.tsx) corrigiendo llamadas incompatibles `api.getRecords` y `api.addRecord` por `api.listRecords` y `api.createRecord`.

## [1.4.2] - 2026-06-16

### Changed
- Unificación de los registros de tiempo y proyectos del cliente 'Interno' bajo el cliente principal 'Mooving'.

### Added
- Migración D1 `0009_merge_interno_client.sql` para fusionar el cliente 'interno' en 'mooving' y registrar el cliente de pruebas 'desa'.
- Carga automática del Glosario de Proyectos y Clientes v1.5 en el almacenamiento de conocimiento RAG para todos los agentes de Senda QA.

## [1.4.1] - 2026-06-14

### Added
- Mostrar la versión actual en la página de Login (Login.tsx) obteniéndola directamente del archivo VERSION.

## [1.4.0] - 2026-06-14

### Added
- Panel Analítico Personal en "Mis Horas" (MyTime.tsx) con gráficas interactiva usando Recharts.
- Herramienta MCP `get_employee_insights` para que Senda IA actúe como coach de productividad.
- Filtro de seguridad (aislamiento de datos) en el endpoint `GET /api/data/records` para usuarios no administradores.
- Cumplimiento de brand guideline: "Preguntar a Senda".

## [1.3.0] - 2026-06-13

### Added
- Creación de entidades relacionales (Clientes, Proyectos, Categorías, Empleados).
- Migración de datos históricos de registros de tiempo a las nuevas tablas.
- Adición de 16 nuevas herramientas MCP para gestionar (CRUD) entidades por Senda AI.

## [1.2.0] - 2026-06-13

### Added
- Autenticación real mediante Json Web Tokens (JWT).
- Base de datos de permisos y roles (RBAC) con soporte para Administradores y Empleados.
- Rebranding completo de la herramienta "TimeCopilot" a "Mooving Assistant".
- Menú de perfil y cierre de sesión en la interfaz principal.

## [1.1.1] - 2026-06-13

### Added
- Columna "Acciones" y modal de edición/eliminación en el Dashboard para roles de Administrador.
- Soporte para métodos HTTP PUT y DELETE en la API del frontend (`api.ts`).

## [1.1.0] - 2026-06-13

### Added
- Integración productiva con la API real de Zendesk Support para la sincronización de tickets resueltos.
- MVP de TimeCopilot (Carga Inteligente de Horas) con Senda AI Widget.
- Control de roles en Frontend (Dashboard gerencial vs "Mis Horas" para empleados).
- Documentación completa del proyecto (Arquitectura, MVP, y APIs) generada para el Challenge.

## [1.0.5] - 2026-06-13

### Added
- Campo selector de fecha en `QuickLogModal` para permitir cargar horas de días anteriores (no solo del día actual).
- Documentación oficial de Senda incorporada al repositorio bajo `documentation/senda/`.

## [1.0.4] - 2026-06-13

### Added
- Integrated frontend with actual MCP backend tools (`sync_clockify_hours`, `sync_zendesk_tickets`, `audit_timesheet`).
- Added NLP tool `parse_natural_language_hours` to parser text inputs using Senda AI.
- Redesigned `QuickLogModal.tsx` with clean nested manual dropdowns and a dedicated Senda AI NLP tab for quick imports.

## [1.0.3] - 2026-06-12

### Added
- Multi-select dropdown filters for Months, Clients, Employees, and Projects using a custom `MultiSelectDropdown` component.
- Implemented nested/reactive filtering logic (cascading selection options calculated based on other active filters).
- Added comprehensive unit testing suite in `dataStore.test.ts` to validate multi-select filtering logic.

## [1.0.2] - 2026-06-12

### Fixed
- Increased default API record limit from 100 to 5000 to retrieve the full timeline of records (Jan-Jun) and resolve month filtering inconsistencies.

## [1.0.1] - 2026-06-12

### Fixed
- Fixed schema initialization in Cloudflare D1 database.
- Hooked up frontend API call (`api.listRecords()`) to load database records on mount.
- Fixed tenant isolation company ID mismatch between auth middleware (`mooving-default`) and seed data.
- Fixed CSV upload handler to send parsed records directly to Cloudflare D1 via backend API.
- Fixed Quick Manual Log to persist data on D1 through backend endpoint.
- Corrected unit test suite environment runtime configuration.

## [1.0.0] - 2026-06-12

### Added
- Initial monorepo structure with Senda Architecture standards
- React + TypeScript frontend (apps/web)
- Hono + Cloudflare Workers API backend (apps/api)
- Cloudflare D1 database integration
- Dashboard with CSV upload capability
- KPI calculations and data analysis
- Multi-tenant ready architecture
- Comprehensive documentation system with version tracking
- Test infrastructure (Vitest)
- Feature flags system
- Security: encryption at rest (AES-256-GCM), tenant isolation, JWT validation

### Technical
- Migrated from Vue 3 to React 18
- NPM Workspaces monorepo structure
- TypeScript strict mode enabled
- Zod schema validation for all APIs
- TailwindCSS for styling
- Pinia → Zustand for state management
- Role-based access control (RBAC)

### Documentation
- Versioned documentation in `/documentation/versions/v{VERSION}/`
- Architecture guide with monorepo structure details
- Release notes with comprehensive feature list
- Database schema documentation
- Future release templates (v1.1.0, v2.0.0)

### Security
- Multi-tenant isolation with `tenant_id` in all tables
- Secrets encrypted at rest using AES-256-GCM
- CORS protection and input validation
- JWT token-based authentication
- SQL injection prevention
- No plaintext secret storage

## Guidelines for Future Versions

### When releasing a new version:

1. **Update VERSION file**: Increment version number (MAJOR.MINOR.PATCH)
2. **Update CHANGELOG.md**: Add new [VERSION] section with features, fixes, and technical details
3. **Create documentation folder**: `documentation/versions/v{VERSION}/` with:
   - `README.md` - index and quick navigation
   - `architecture.md` - technical architecture for this version
   - `release-notes.md` - comprehensive release notes for stakeholders
4. **Update CHANGELOG_FUNCTIONAL.md**: Add entries in plain Spanish with user-facing changes
5. **Update novedades.html**: Reflect new entries from CHANGELOG_FUNCTIONAL.md
6. **Update frontend version**: Modify `apps/web/src/version.ts` with APP_VERSION and RELEASE_DATE
7. **Commit and tag**: `git commit -m "chore: Release v{VERSION}"` then `git tag v{VERSION}`
8. **Deploy**: Follow pre-deploy checklist and deploy to production

### Version Classification

- **v1.0.0 → v1.1.0**: Minor features, bug fixes, performance improvements
- **v1.x.x → v2.0.0**: Major architectural changes, breaking API changes, new paradigms

---

## Backlog for Future Releases

### v1.1.0 (Planned)
- [ ] Advanced filtering and export capabilities
- [ ] Email notifications for key metrics
- [ ] Performance dashboard improvements
- [ ] Additional KPI types

### v2.0.0 (Future)
- [ ] Native mobile app
- [ ] Advanced analytics engine
- [ ] Custom report builder
- [ ] API webhooks
