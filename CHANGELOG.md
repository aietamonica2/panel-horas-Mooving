# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
