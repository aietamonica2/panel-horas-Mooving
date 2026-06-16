# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
