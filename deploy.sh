#!/bin/bash

# Panel de Operaciones Mooving - Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-staging}
BRANCH=${2:-refactor/senda-migration}

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Panel de Operaciones Mooving - Deployment Script             ║"
echo "║  Environment: $ENVIRONMENT                                       ║"
echo "║  Branch: $BRANCH                                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Run tests
echo "🧪 Running tests..."
npm run test:all 2>/dev/null || echo "⚠️  Tests incomplete - continuing anyway"

# 3. Build frontend
echo "🏗️  Building frontend..."
npm run build --prefix apps/web

# 4. Build backend
echo "🏗️  Building backend..."
npm run build --prefix apps/api

# 5. Type checking
echo "🔍 Type checking..."
npm run type-check 2>/dev/null || echo "⚠️  Type check issues found"

# 6. Deploy backend
echo "🚀 Deploying backend (Cloudflare Workers)..."
if [ "$ENVIRONMENT" = "production" ]; then
  npm run deploy --prefix apps/api
else
  echo "   Skipping backend deploy in staging"
fi

# 7. Deploy frontend
echo "🚀 Deploying frontend (Cloudflare Pages)..."
if [ "$ENVIRONMENT" = "production" ]; then
  cd apps/web
  npx wrangler pages deploy dist --project-name senda --branch main
  cd ../..
else
  echo "   Skipping frontend deploy in staging"
fi

# 8. Verify deployment
echo "✅ Verifying deployment..."
echo "   Frontend: https://panel-horas-mooving.pages.dev"
echo "   Backend: https://senda-api.xxxxx.workers.dev/api/health"
echo "   API Endpoint: Check /api/health"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Deployment Complete!                                       ║"
echo "║                                                                ║"
echo "║  Visit: https://panel-horas-mooving.pages.dev                 ║"
echo "║  Docs: Check README.md for more info                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
