# Manual Deployment Instructions

Paso a paso para desplegar Panel de Operaciones Mooving v1.0.0 en producción.

## Requisitos Previos

✓ Cloudflare account (con Workers & Pages habilitado)
✓ Wrangler CLI (`npm install -g wrangler`)
✓ GitHub token con permisos de repositorio
✓ Node.js 18+
✓ Git

## Fase 1: Configuración de Cloudflare D1 Database

### 1.1 Login en Cloudflare

```bash
wrangler login
```

Esto abrirá navegador para autenticar. Autoriza la aplicación.

### 1.2 Crear Database D1

```bash
cd /tmp/panel-senda-refactor
wrangler d1 create senda-db
```

**OUTPUT ESPERADO:**
```
[✓] Created database 'senda-db' in region wnam

Database ID: 3a24c3aa1d8f806d2e716dbdfa88811f
```

**GUARDA EL DATABASE ID** - lo necesitarás en el siguiente paso.

### 1.3 Actualizar wrangler.toml

Edita `apps/api/wrangler.toml`:

```toml
name = "senda-api"
main = "src/index.ts"
compatibility_date = "2024-01-15"

[[d1_databases]]
binding = "DB"
database_name = "senda-db"
database_id = "3a24c3aa1d8f806d2e716dbdfa88811f"  # ← Pega tu ID aquí

[env.production]
name = "senda-api-prod"
[[env.production.d1_databases]]
binding = "DB"
database_name = "senda-db-prod"
database_id = "YOUR_PROD_DATABASE_ID"  # ← Para producción después
```

### 1.4 Aplicar Migraciones de Base de Datos

```bash
cd apps/api

# Test local primero
wrangler d1 migrations apply --local

# Aplicar a remote
wrangler d1 migrations apply --remote
```

**Verifica que la base de datos está creada:**

```bash
wrangler d1 execute senda-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

Deberías ver 8 tablas: time_records, employees, clients, projects, audit_logs, feature_flags, tenant_feature_overrides.

---

## Fase 2: Configurar Secrets en Cloudflare Workers

### 2.1 Development Secrets

Crea `apps/api/.dev.vars`:

```env
SECRET_KEY=supersecretkey123
ENVIRONMENT=development
```

### 2.2 Production Secrets

```bash
cd apps/api

# Add SECRET_KEY
wrangler secret put SECRET_KEY
# When prompted, enter: supersecretkey123

# Add ENVIRONMENT
wrangler secret put ENVIRONMENT
# When prompted, enter: production
```

---

## Fase 3: Desplegar Backend (Cloudflare Workers)

### 3.1 Instalar Dependencias

```bash
cd /tmp/panel-senda-refactor
npm install
npm install --prefix apps/api
```

### 3.2 Build Backend

```bash
npm run build --prefix apps/api
```

Verifica que no hay errores.

### 3.3 Desplegar a Cloudflare Workers

```bash
npm run deploy --prefix apps/api
```

**EXPECTED OUTPUT:**
```
✓ Deployed to https://senda-api.xxxxx.workers.dev
```

**GUARDA LA URL** - la necesitarás después.

### 3.4 Verificar Backend Funciona

```bash
curl https://senda-api.xxxxx.workers.dev/api/health
```

Deberías ver:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-06-12T14:30:00Z",
    "version": "v1.0.0",
    "environment": "production"
  }
}
```

---

## Fase 4: Desplegar Frontend (Cloudflare Pages)

### 4.1 Instalar Dependencias Frontend

```bash
npm install --prefix apps/web
```

### 4.2 Build Frontend

```bash
npm run build --prefix apps/web
```

Esto crea la carpeta `apps/web/dist/`.

### 4.3 Opción A: Despliegue Manual via Wrangler

```bash
cd apps/web
npx wrangler pages deploy dist --project-name senda --branch main
cd ../..
```

### 4.3 Opción B: Despliegue Automático via GitHub (Recomendado)

1. Ve a https://pages.cloudflare.com/
2. Click "Create a project"
3. Click "Connect to Git"
4. Autoriza Cloudflare
5. Selecciona repositorio: `aietamonica2/panel-horas-Mooving`
6. Configura Build Settings:

```
Framework: None
Build command: npm run build --prefix apps/web
Build output directory: apps/web/dist
```

7. Click "Deploy"

Cloudflare ahora desplegará automáticamente cada vez que hagas push a la rama `main`.

### 4.4 Verificar Frontend Funciona

Ve a: https://panel-horas-mooving.pages.dev

Deberías ver:
- "Panel de Operaciones Mooving"
- KPI cards (Horas, Promedio, Empleados, Clientes)
- Botón "📤 Importar CSV"
- Tabla de datos

---

## Fase 5: Conectar Frontend con Backend

### 5.1 Crear archivo API

Crea `apps/web/src/api.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export const api = {
  health: async () => {
    const res = await fetch(`${API_BASE}/api/health`)
    return res.json()
  },
  
  listRecords: async (limit = 100) => {
    const res = await fetch(`${API_BASE}/api/data/records?limit=${limit}`)
    return res.json()
  },
  
  uploadCSV: async (payload: any) => {
    const res = await fetch(`${API_BASE}/api/data/upload`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })
    return res.json()
  }
}
```

### 5.2 Actualizar .env.production

Crea `apps/web/.env.production`:

```env
VITE_API_URL=https://senda-api.xxxxx.workers.dev
```

Reemplaza `xxxxx` con tu URL real de Workers.

### 5.3 Rebuild Frontend

```bash
npm run build --prefix apps/web
cd apps/web
npx wrangler pages deploy dist --project-name senda --branch main
cd ../..
```

---

## Fase 6: Verificación Completa

### 6.1 Health Checks

```bash
# Frontend
curl https://panel-horas-mooving.pages.dev/

# Backend
curl https://senda-api.xxxxx.workers.dev/api/health

# Database
wrangler d1 execute senda-db --remote --command "SELECT COUNT(*) as tables FROM sqlite_master WHERE type='table';"
```

### 6.2 Test CSV Upload

1. Ve a https://panel-horas-mooving.pages.dev
2. Click "📤 Importar CSV"
3. Crea un archivo CSV test con contenido:

```csv
Empleado,Cliente,Proyecto,Duración,Fecha,Descripción
Juan,Acme,Website,8.5,2026-06-12,Desarrollo frontend
María,Tech Corp,API,7.0,2026-06-12,Implementación endpoints
```

4. Upload el archivo
5. Verifica que aparecen los datos en la tabla

### 6.3 Verificar en Database

```bash
wrangler d1 execute senda-db --remote --command "SELECT employee_name, duration_hours FROM time_records LIMIT 5;"
```

---

## Fase 7: Dominios Personalizados (Opcional)

### 7.1 Agregar Dominio a Pages

Si tienes dominio `operaciones.moovingtech.com`:

1. Ve a https://dash.cloudflare.com/
2. Selecciona tu dominio
3. Pages → panel-horas-mooving → Settings → Custom domains
4. Agrega: `operaciones.moovingtech.com`
5. Sigue instrucciones DNS

### 7.2 Actualizar CORS en Backend

Edita `apps/api/src/middleware/cors.ts`:

```typescript
export const cors = async (c: HonoContext, next: Next) => {
  const origin = c.req.header('Origin')
  const allowedOrigins = [
    'https://panel-horas-mooving.pages.dev',
    'https://operaciones.moovingtech.com'
  ]
  
  if (allowedOrigins.includes(origin || '')) {
    c.header('Access-Control-Allow-Origin', origin!)
  }
  
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }
  
  await next()
}
```

Redeploy backend:

```bash
npm run deploy --prefix apps/api
```

---

## Troubleshooting

### Problema: CORS errors en browser

**Solución:**
1. Verifica que CORS middleware está configurado
2. Comprueba que API_URL está correcto en .env
3. Redeploy backend con: `npm run deploy --prefix apps/api`

### Problema: Database connection error

**Solución:**
1. Verifica database_id en `apps/api/wrangler.toml`
2. Verifica binding es "DB"
3. Revisa: `wrangler d1 execute senda-db --remote --command "SELECT 1;"`

### Problema: "Cannot find module" en build

**Solución:**
1. Limpia node_modules: `rm -rf node_modules`
2. Reinstala: `npm install`
3. Rebuild: `npm run build`

### Problema: Deployment hangs

**Solución:**
1. Press Ctrl+C para cancelar
2. Verifica conexión internet
3. Revisa Wrangler está actualizado: `npm install -g wrangler@latest`
4. Intenta nuevamente

---

## Próximos Pasos

✅ Backend deployed a Cloudflare Workers
✅ Frontend deployed a Cloudflare Pages
✅ Database D1 creada y migraciones aplicadas
✅ Secrets configurados
✅ CORS habilitado

**Ahora:**

1. Monitoear logs: `wrangler tail --format pretty`
2. Configurar alertas en Cloudflare dashboard
3. Hacer backup regular de database
4. Configurar CI/CD via GitHub Actions

---

## Para Actualizaciones Futuras

Cuando hagas nueva release (v1.1.0):

1. Update VERSION file
2. Update CHANGELOG.md
3. Commit: `git commit -m "chore: Release v1.1.0"`
4. Tag: `git tag v1.1.0`
5. Push: `git push origin main --tags`
6. Auto-deploy via GitHub Actions

---

**Completed**: ✅ Manual Deployment Guide
**Date**: 12 de Junio de 2026
**Version**: 1.0.0
