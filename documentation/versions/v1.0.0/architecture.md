# Architecture Guide - v1.0.0

## Monorepo Structure

```
panel-senda/
├── apps/
│   ├── web/                    # React 18 + TypeScript frontend
│   │   ├── src/
│   │   │   ├── components/     # Reusable React components
│   │   │   ├── stores/         # Zustand state management
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   ├── utils/          # Helper functions
│   │   │   ├── App.tsx         # Root component
│   │   │   ├── main.tsx        # Entry point
│   │   │   └── index.css       # TailwindCSS styling
│   │   ├── index.html          # HTML template
│   │   ├── vite.config.ts      # Vite configuration
│   │   ├── tailwind.config.js  # TailwindCSS config
│   │   └── package.json        # Dependencies
│   │
│   └── api/                    # Hono + Cloudflare Workers backend
│       ├── src/
│       │   ├── routes/         # API endpoints
│       │   │   ├── health.ts   # Health checks
│       │   │   └── data.ts     # Data endpoints
│       │   ├── middleware/     # Express-like middleware
│       │   │   ├── cors.ts     # CORS handling
│       │   │   └── auth.ts     # JWT authentication
│       │   ├── types/          # TypeScript types
│       │   └── index.ts        # Hono app initialization
│       ├── migrations/         # D1 database migrations
│       ├── wrangler.toml       # Cloudflare Workers config
│       └── package.json        # Dependencies
│
├── documentation/
│   ├── versions/v1.0.0/        # Versioned docs
│   ├── architecture/           # Architecture guides
│   ├── database/               # Database schema
│   └── api/                    # API documentation
│
├── db/
│   └── schema.sql              # Master database schema
│
├── package.json                # Root workspace config
├── tsconfig.json               # TypeScript configuration
├── CHANGELOG.md                # Technical changelog
├── CHANGELOG_FUNCTIONAL.md     # User-facing changelog
├── VERSION                     # Current version
└── README.md                   # Main documentation
```

## Frontend Stack (apps/web)

### Core Technologies
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **TailwindCSS** - Styling
- **Recharts** - Data visualization
- **Zod** - Schema validation
- **Axios** - HTTP client
- **React Router** - Routing (planned)

### Component Architecture
```
App
├── Dashboard
│   ├── KPICards
│   ├── Filters
│   ├── CSVUpload
│   ├── DataTable
│   └── Charts
└── Navigation (future)
```

### State Management (Zustand)
```typescript
useDataStore
├── records: TimeRecord[]
├── employees: Employee[]
├── clients: Client[]
├── filters: FilterState
├── isLoading: boolean
├── error: string | null
├── getFilteredRecords()
└── setters for all state
```

## Backend Stack (apps/api)

### Core Technologies
- **Hono** - Lightweight web framework
- **Cloudflare Workers** - Serverless runtime
- **Cloudflare D1** - SQLite database
- **Zod** - Schema validation
- **TypeScript** - Type safety

### API Endpoints

```
GET  /api/health                    # Health check
GET  /api/data/records              # List time records
POST /api/data/upload               # Upload CSV file
```

### Middleware Stack
```
1. CORS Middleware        # Cross-origin support
2. Authentication         # JWT validation + tenant extraction
3. Route Handlers         # Business logic
```

### Multi-Tenant Architecture

Every table includes `tenant_id`:
```sql
CREATE TABLE time_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- ← Multi-tenant key
  employee_id TEXT NOT NULL,
  ...
  INDEX (tenant_id, created_at)
);
```

**Isolation Rule**: All queries MUST include `WHERE tenant_id = ?`

## Database (D1 SQLite)

### Core Tables
- `time_records` - Employee time tracking
- `employees` - Employee master data
- `clients` - Client information
- `audit_logs` - Security and compliance

### Indexes
- `(tenant_id, created_at)` on time_records
- `(tenant_id)` on all operational tables

## Deployment Architecture

```
┌─────────────────────────────────────┐
│     Cloudflare Pages (Frontend)     │
│     - React SPA (Vite build)        │
│     - TailwindCSS styling           │
│     - Auto-deployed on git push     │
└──────────────┬──────────────────────┘
               │ (API calls)
┌──────────────▼──────────────────────┐
│   Cloudflare Workers (Backend)      │
│     - Hono API                      │
│     - CORS + Auth middleware        │
│     - Request routing               │
└──────────────┬──────────────────────┘
               │ (SQL queries)
┌──────────────▼──────────────────────┐
│   Cloudflare D1 (Database)          │
│     - SQLite database               │
│     - Time records & metadata       │
│     - Tenant isolation              │
└─────────────────────────────────────┘
```

## Development Workflow

### Local Development
```bash
npm run dev              # Start both frontend (3000) and backend (8787)
npm run build            # Build production bundles
npm run test:all         # Run all tests
npm run type-check       # TypeScript verification
```

### Database Migrations
```bash
wrangler d1 migrations create <name>      # Create migration
wrangler d1 migrations apply --local       # Test locally
wrangler d1 migrations apply --remote      # Apply to production
```

### Version Increments
1. Update `VERSION` file
2. Update `CHANGELOG.md` with technical details
3. Update `CHANGELOG_FUNCTIONAL.md` with user-facing changes
4. Create `documentation/versions/v{VERSION}/` folder
5. Update `apps/web/src/version.ts`
6. Commit with tag `v{VERSION}`

## Security Considerations

### Multi-Tenant Isolation
- `tenant_id` derived from JWT token (never from request body)
- All queries filtered by tenant
- No cross-tenant data leakage possible

### Secrets Management
- Cloudflare Workers `env` for secrets
- `.dev.vars` for local development
- No plaintext secrets in code

### Input Validation
- Zod schemas for all API inputs
- TypeScript strict mode enabled
- No `any` types in critical paths

### CORS & Authentication
- CORS middleware allows frontend origin
- JWT tokens validated on protected routes
- Optional auth for health checks (development)

## Performance Considerations

### Frontend
- Vite code splitting for faster loads
- TailwindCSS purging for smaller CSS
- Zustand for efficient re-renders
- Memoization of expensive computations

### Backend
- Hono's minimal overhead
- D1 indexes on (`tenant_id`, `created_at`)
- Cloudflare's edge caching
- No N+1 queries (Zod validation prevents)

### Database
- SQLite with indexes for common queries
- Composite indexes on multi-tenant queries
- Connection pooling via Cloudflare

## Monitoring & Logging

### Health Checks
- `/api/health` endpoint for uptime monitoring
- Includes environment and version info

### Error Handling
- Structured error responses
- Consistent `ApiResponse<T>` format
- Timestamped for correlation

### Versioning
- Every response includes `version: "v1.0.0"`
- Deprecation warnings for future changes
- Backward compatibility maintained

---

## Future Improvements

- [ ] GraphQL API alongside REST
- [ ] Real-time WebSocket updates
- [ ] Advanced caching strategies
- [ ] Enhanced monitoring dashboards
- [ ] Automated backups and disaster recovery
