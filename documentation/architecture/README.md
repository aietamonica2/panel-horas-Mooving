# Panel de Operaciones Mooving - Architecture Documentation

## Overview

Panel de Operaciones Mooving es una aplicación web moderna para análisis interactivo de carga de trabajo, disponibilidad del equipo y distribución de horas por cliente y proyecto.

## Tech Stack

### Frontend (`apps/web`)
- **Framework**: Vue 3 (TypeScript)
- **Build Tool**: Vite
- **State Management**: Pinia
- **Styling**: TailwindCSS
- **UI Components**: Chart.js
- **Routing**: Vue Router

### Backend (`apps/api`)
- **Framework**: Hono
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Validation**: Zod
- **Language**: TypeScript

### Infrastructure
- **Hosting**: Cloudflare Pages (Frontend) + Cloudflare Workers (Backend)
- **Versioning**: Semantic Versioning
- **Testing**: Vitest
- **Package Management**: npm Workspaces

## Project Structure

```
panel-mooving/
├── apps/
│   ├── web/                    # Vue 3 + Vite frontend
│   │   ├── src/
│   │   │   ├── components/    # Vue components (PascalCase)
│   │   │   ├── composables/   # Composition functions (camelCase)
│   │   │   ├── stores/        # Pinia stores
│   │   │   ├── views/         # Page components
│   │   │   ├── utils/         # Helper functions
│   │   │   └── types/         # TypeScript types
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                    # Hono + Cloudflare Workers
│       ├── src/
│       │   ├── routes/        # API route handlers
│       │   ├── middleware/    # Custom middleware
│       │   ├── utils/         # Helper utilities
│       │   ├── types/         # TypeScript types
│       │   ├── migrations/    # D1 migrations
│       │   └── index.ts       # Main server
│       ├── wrangler.toml
│       └── package.json
│
├── documentation/
│   ├── architecture/          # Architecture docs
│   └── database/              # DB schema & migrations
├── VERSION                     # Semantic version
├── CHANGELOG.md               # Changelog
├── package.json              # Root workspace config
└── tsconfig.json             # TypeScript config
```

## Data Flow

```
User (Browser)
    ↓
Vue 3 Frontend (apps/web)
    ↓ [HTTP REST]
Hono Backend (apps/api)
    ↓ [SQL Queries]
Cloudflare D1 (SQLite)
```

## Key Features

1. **Interactive Dashboard**
   - Real-time KPIs (Total Hours, Daily Average, Active Users, Unique Clients)
   - Multi-select filters (months, categories, users)
   - CSV file upload with dynamic data loading

2. **Data Analysis**
   - Workload distribution by employee
   - Monthly client distribution
   - Monthly availability with free time calculation
   - Bag of Hours (Internal Tasks vs Team Meetings)

3. **Visualization**
   - Dynamic charts using Chart.js
   - Responsive design for mobile & desktop
   - TailwindCSS styling

## Naming Conventions

### Files & Components
- **Vue Components**: `PascalCase.vue` (e.g., `Dashboard.vue`, `DataTable.vue`)
- **Composables**: `camelCase.ts` (e.g., `useDataProcessing.ts`, `useCharts.ts`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`, `parseCSV.ts`)
- **Stores**: `{name}Store.ts` (e.g., `dataStore.ts`, `filterStore.ts`)

### Variables & Functions
- **English only** for API, database columns, and function names
- **CamelCase** for variables and functions
- **UPPER_SNAKE_CASE** for constants

## Database Schema

See `/documentation/database/schema.sql` for the complete D1 schema.

## API Endpoints

### Data
- `POST /api/data/upload` - Upload CSV data
- `GET /api/data/validate` - Get validation schema

### Health
- `GET /api/health` - Service health check

## Versioning

- **Version File**: `/VERSION` (Semantic Versioning)
- **Changelog**: `/CHANGELOG.md` (Technical details)
- **Frontend Version**: `apps/web/src/version.ts` (displayed in UI)

Every code change MUST be accompanied by:
1. Version increment in `/VERSION`
2. Entry in `/CHANGELOG.md`

## Development Workflow

1. **Setup**: `npm install` (installs all workspaces)
2. **Development**: `npm run dev` (runs both frontend & backend)
3. **Testing**: `npm run test` (runs test suite)
4. **Build**: `npm run build` (builds both apps)
5. **Deploy**: `npm run deploy` (deploys to production)

## Deployment

### Prerequisites
- Cloudflare account with Pages & Workers enabled
- GitHub repository connected to Cloudflare
- Wrangler CLI installed (`npm install -g wrangler`)

### Steps
1. Update `/VERSION` and `/CHANGELOG.md`
2. Run `npm run build` to verify compilation
3. Run `npm run test` to verify tests pass
4. Run `npm run deploy` to deploy both frontend and backend

---

For more details, see the other documentation files in `/documentation/`.
