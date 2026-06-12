# Guía de Arquitectura - v1.0.0

## Monorepo Structure

```
panel-mooving/
├── apps/
│   ├── web/          # Vue 3 + Vite SPA
│   └── api/          # Hono + Cloudflare Workers
└── documentation/    # Documentación versionada
```

## Frontend (apps/web)

### Stack Tecnológico
- **Framework**: Vue 3
- **Build Tool**: Vite
- **State Management**: Pinia
- **Styling**: TailwindCSS
- **Routing**: Vue Router
- **Testing**: Vitest
- **Type Safety**: TypeScript (strict)

### Estructura de Carpetas
```
src/
├── components/      # Vue components (PascalCase)
├── composables/     # Logic functions (camelCase)
├── stores/          # Pinia stores
├── views/           # Page components
├── router/          # Vue Router config
├── types/           # TypeScript types
├── utils/           # Helper functions
└── __tests__/       # Unit tests
```

### Componentes Principales
- `App.vue` - Root component
- `Dashboard.vue` - Main dashboard

### Stores (Pinia)
- `dataStore.ts` - Global data state

### Composables
- `useDataProcessing.ts` - Data analysis logic

## Backend (apps/api)

### Stack Tecnológico
- **Framework**: Hono
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1
- **Validation**: Zod
- **Testing**: Vitest
- **Type Safety**: TypeScript (strict)

### Estructura de Carpetas
```
src/
├── index.ts         # Main server
├── routes/          # API endpoints
├── types/           # TypeScript types
├── migrations/      # D1 migrations
├── middleware/      # Custom middleware
└── __tests__/       # API tests
```

### Endpoints
- `GET /api/health` - Health check
- `POST /api/data/upload` - CSV upload
- `GET /api/data/validate` - Validation schema

## Convenciones de Código

### Naming
- **Componentes Vue**: `PascalCase.vue` (e.g., `Dashboard.vue`)
- **Composables**: `camelCase.ts` (e.g., `useDataProcessing.ts`)
- **Stores**: `{name}Store.ts` (e.g., `dataStore.ts`)
- **Variables/Functions**: `camelCase` en inglés
- **Constantes**: `UPPER_SNAKE_CASE`

### Size Limits
- **Vue Components**: máx 400 LOC
- **Backend Files**: máx 300 LOC

## Flujo de Datos

```
Usuario (Browser)
    ↓
Vue 3 Frontend
    ↓ [HTTP REST]
Hono Backend
    ↓ [SQL Queries]
Cloudflare D1 Database
```

## Type Safety

Todo el código es TypeScript con `strict: true`. No se permite `any` excepto en casos excepcionales documentados.

---

*Documentación v1.0.0 - 12 de Junio de 2026*
