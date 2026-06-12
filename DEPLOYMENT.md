# Deployment Guide - Panel de Operaciones Mooving v1.0.0

Complete guide for deploying to production using Cloudflare Pages, Workers, and D1.

## Prerequisites

- Cloudflare account (with Workers & Pages enabled)
- Wrangler CLI installed (`npm install -g wrangler`)
- GitHub account with repository access
- Node.js 18+

## Step 1: Setup Cloudflare D1 Database

### 1.1 Create D1 Database

```bash
# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create senda-db
```

This will output:
```
[✓] Created database 'senda-db' in region wnam

Database ID: xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
```

### 1.2 Update wrangler.toml

Edit `apps/api/wrangler.toml` and update:

```toml
[[d1_databases]]
binding = "DB"
database_name = "senda-db"
database_id = "YOUR_DATABASE_ID"  # ← Replace with actual ID

[env.production]
name = "senda-api-prod"
[[env.production.d1_databases]]
binding = "DB"
database_name = "senda-db-prod"
database_id = "YOUR_PROD_DATABASE_ID"
```

### 1.3 Apply Database Migrations

```bash
cd apps/api

# Test locally first
wrangler d1 migrations apply --local

# Apply to remote database
wrangler d1 migrations apply --remote
```

Verify schema:
```bash
wrangler d1 execute senda-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## Step 2: Configure Secrets

### 2.1 Development Secrets

Create `apps/api/.dev.vars`:

```env
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
```

### 2.2 Production Secrets

```bash
cd apps/api

# Add secrets one by one
wrangler secret put SECRET_KEY
wrangler secret put ENVIRONMENT  # Set to 'production'
```

When prompted, enter the values.

## Step 3: Deploy Backend (Cloudflare Workers)

### 3.1 Install Dependencies

```bash
npm install
npm install --prefix apps/api
```

### 3.2 Build Backend

```bash
npm run build --prefix apps/api
```

### 3.3 Deploy to Production

```bash
npm run deploy --prefix apps/api
```

Expected output:
```
✓ Uploaded 1 service
✓ Deployed to https://senda-api.xxxxx.workers.dev
```

### 3.4 Verify Backend Deployment

```bash
curl https://senda-api.xxxxx.workers.dev/api/health
```

Should return:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-06-12T...",
    "version": "v1.0.0",
    "environment": "production"
  },
  "timestamp": "2026-06-12T...",
  "version": "v1.0.0"
}
```

## Step 4: Deploy Frontend (Cloudflare Pages)

### 4.1 Install Frontend Dependencies

```bash
npm install --prefix apps/web
```

### 4.2 Build Frontend

```bash
npm run build --prefix apps/web
```

This creates `apps/web/dist/` directory.

### 4.3 Deploy to Cloudflare Pages

Option A: Via Wrangler
```bash
cd apps/web
npx wrangler pages deploy dist --project-name senda --branch main
```

Option B: Via GitHub Integration (Recommended)
1. Go to https://pages.cloudflare.com/
2. Click "Create a project"
3. Select "Connect to Git"
4. Authorize Cloudflare
5. Select repository `aietamonica2/panel-horas-Mooving`
6. Configure build settings:
   - **Framework**: None
   - **Build command**: `npm run build --prefix apps/web`
   - **Build output directory**: `apps/web/dist`
7. Click Deploy

### 4.4 Verify Frontend Deployment

Visit: https://panel-horas-mooving.pages.dev

Should see:
- Dashboard header
- KPI cards
- CSV upload button
- Data table

## Step 5: Configure CORS & API Integration

### 5.1 Update Frontend API Endpoint

Edit `apps/web/src/api.ts` (create if doesn't exist):

```typescript
const API_BASE = process.env.VITE_API_URL || 'https://senda-api.xxxxx.workers.dev'
export const api = {
  health: () => fetch(`${API_BASE}/api/health`),
  listRecords: () => fetch(`${API_BASE}/api/data/records`),
  uploadCSV: (payload) => fetch(`${API_BASE}/api/data/upload`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  })
}
```

Update `apps/web/.env.production`:
```env
VITE_API_URL=https://senda-api.xxxxx.workers.dev
```

### 5.2 Rebuild and Deploy Frontend

```bash
npm run build --prefix apps/web
cd apps/web
npx wrangler pages deploy dist --project-name senda --branch main
```

## Step 6: Verify Complete Deployment

### 6.1 Health Check

```bash
# Frontend
curl https://panel-horas-mooving.pages.dev/

# Backend
curl https://senda-api.xxxxx.workers.dev/api/health

# Database
wrangler d1 execute senda-db --remote --command "SELECT COUNT(*) FROM time_records;"
```

### 6.2 Test CSV Upload

1. Visit https://panel-horas-mooving.pages.dev
2. Click "📤 Importar CSV"
3. Select a CSV file with columns: Empleado, Cliente, Proyecto, Duración, Fecha
4. Click "Subir"
5. Verify data appears in table

### 6.3 Check Documentation

Visit https://panel-horas-mooving.pages.dev and verify documentation is accessible via button.

## Step 7: Custom Domain (Optional)

### 7.1 Add Custom Domain to Pages

1. Go to https://dash.cloudflare.com/
2. Select your domain
3. Pages → panel-horas-mooving → Settings → Custom domains
4. Add your domain (e.g., operaciones.moovingtech.com)
5. Follow DNS setup instructions

### 7.2 Update API CORS

Edit `apps/api/src/middleware/cors.ts`:

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

## Monitoring & Troubleshooting

### Check Worker Logs

```bash
wrangler tail --format pretty
```

### Check Pages Deployment Logs

1. Go to https://dash.cloudflare.com/
2. Pages → panel-horas-mooving
3. View deployment logs

### Common Issues

**1. CORS errors in browser**
- Verify CORS middleware is configured
- Check API endpoint in frontend env vars
- Ensure origins are whitelisted

**2. Database connection errors**
- Verify database_id in wrangler.toml
- Check database binding name matches "DB"
- Ensure migrations were applied remotely

**3. Missing data after upload**
- Check browser console for errors
- Verify API endpoint is responding
- Check database with: `wrangler d1 execute senda-db --remote --command "SELECT * FROM time_records;"`

## Rollback Procedure

### Rollback Frontend

1. Go to https://dash.cloudflare.com/
2. Pages → panel-horas-mooving → Deployments
3. Click "Rollback" on previous deployment

### Rollback Backend

```bash
# List recent deployments
wrangler deployments list

# Activate previous deployment
wrangler deployments rollback
```

### Rollback Database

Database migrations cannot be rolled back automatically. To revert:

```bash
# Create new migration to undo changes
wrangler d1 migrations create "revert_migration_name"

# Edit the migration file to undo changes
# Then apply:
wrangler d1 migrations apply --remote
```

## Update Process for Future Versions

### Release v1.1.0

1. Update VERSION file: 1.0.0 → 1.1.0
2. Update CHANGELOG.md and CHANGELOG_FUNCTIONAL.md
3. Update apps/web/src/version.ts
4. Commit: `git commit -m "chore: Release v1.1.0"`
5. Tag: `git tag v1.1.0`
6. Push: `git push origin main && git push origin v1.1.0`
7. Redeploy using steps above

## Maintenance

### Weekly
- [ ] Check deployment health logs
- [ ] Verify API endpoints are responding
- [ ] Monitor error rates

### Monthly
- [ ] Review and backup database
- [ ] Update dependencies: `npm update`
- [ ] Check for security patches

### Quarterly
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Capacity planning

## Support

- **Documentation**: [/documentation/](../documentation/)
- **Issues**: [GitHub Issues](https://github.com/aietamonica2/panel-horas-Mooving/issues)
- **Email**: operaciones@moovingtech.com

---

**Last Updated**: 12 de Junio de 2026
**Version**: 1.0.0
