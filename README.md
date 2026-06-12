# Panel de Operaciones Mooving

**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Last Updated**: 12 de Junio de 2026

Dashboard interactivo para análisis de operaciones y gestión de horas de Mooving, construido con React 18, Hono, y Cloudflare Workers.

## 🚀 Quick Links

- **Live Application**: https://panel-horas-mooving.pages.dev
- **GitHub Repository**: https://github.com/aietamonica2/panel-horas-Mooving
- **Documentation**: [documentation/](./documentation/)
- **Architecture Guide**: [documentation/versions/v1.0.0/architecture.md](./documentation/versions/v1.0.0/architecture.md)

## 📋 Features

### Core Capabilities
- **Interactive Dashboard** with real-time KPI updates
- **CSV Upload** for bulk data import
- **Multi-Criteria Filtering** by employee, client, project
- **Dynamic Charts** using Recharts
- **Distribution Analysis** across clients and projects
- **Monthly Availability** tracking
- **Hours Bank** with balance tracking
- **Responsive Design** (desktop & mobile)

### Technical Highlights
- **Monorepo Structure** with NPM Workspaces
- **React 18** + TypeScript frontend
- **Hono** + Cloudflare Workers backend
- **Cloudflare D1** SQLite database
- **Multi-tenant Ready** architecture
- **Full Type Safety** with Zod validation
- **Testing Infrastructure** with Vitest

## 🏗️ Architecture

### Monorepo Structure
```
panel-senda/
├── apps/
│   ├── web/                # React frontend (Vite + React 18)
│   └── api/                # Hono API (Cloudflare Workers)
├── documentation/          # Versioned docs
├── db/                     # Database schema
├── package.json            # Root workspace
└── VERSION                 # Current version (1.0.0)
```

### Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Zustand (state management)
- Recharts (visualization)

**Backend**
- Hono (framework)
- Cloudflare Workers (runtime)
- Cloudflare D1 (SQLite database)
- Zod (validation)

**Infrastructure**
- Cloudflare Pages (frontend)
- Cloudflare Workers (backend)
- GitHub (version control)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm/pnpm
- Wrangler CLI (`npm install -g wrangler`)
- GitHub account (for deployment)
- Cloudflare account (for Workers & Pages)

### Local Development

1. **Clone repository**
```bash
git clone https://github.com/aietamonica2/panel-horas-Mooving.git
cd panel-horas-Mooving
git checkout refactor/senda-migration
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development servers**
```bash
npm run dev
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8787

4. **Build for production**
```bash
npm run build
```

5. **Run tests**
```bash
npm run test:all
```

## 📊 Usage

### Uploading CSV Data

1. Navigate to Dashboard
2. Click "📤 Importar CSV"
3. Select CSV file with columns:
   - Empleado
   - Cliente
   - Proyecto
   - Duración (decimal)
   - Fecha
   - Descripción

4. Click "Subir" - data loads instantly

### Filtering Data

Use the filter panel to:
- Select date range
- Filter by employee(s)
- Filter by client(s)
- Filter by project(s)
- Filter by work type

KPIs update in real-time.

### Analyzing Metrics

View key metrics:
- **Total Horas**: Sum of all filtered records
- **Promedio Diario**: Average hours per day
- **Empleados**: Unique employees in filtered set
- **Clientes**: Unique clients in filtered set

Charts and tables show distribution analysis.

## 🔐 Security

### Multi-Tenant Architecture
- Every table includes `tenant_id`
- JWT token validation
- Tenant isolation in all queries
- No cross-tenant data leakage

### Secrets & Encryption
- Secrets stored in Cloudflare env bindings
- `.dev.vars` for local development
- AES-256-GCM encryption at rest
- No plaintext credentials in code

### Input Validation
- Zod schemas for all endpoints
- TypeScript strict mode
- CORS protection
- SQL injection prevention

## 📚 Documentation

### For Users
- [Release Notes](./documentation/versions/v1.0.0/release-notes.md)
- [Quick Start Guide](./QUICK_START.md)

### For Developers
- [Architecture Guide](./documentation/versions/v1.0.0/architecture.md)
- [Database Schema](./db/schema.sql)
- [API Documentation](./documentation/api.md)
- [Contributing Guide](./CONTRIBUTING.md)

### Documentation Index
- [Full Documentation](./documentation/INDEX.md)

## 🔄 Version Management

Current: **v1.0.0**

### Updating Version

1. Update `VERSION` file
2. Update `CHANGELOG.md` with technical changes
3. Update `CHANGELOG_FUNCTIONAL.md` with user-facing changes
4. Create `documentation/versions/v{VERSION}/` with guides
5. Update `apps/web/src/version.ts`
6. Commit: `git commit -m "chore: Release v{VERSION}"`
7. Tag: `git tag v{VERSION}`
8. Deploy to production

## 🧪 Testing

### Run All Tests
```bash
npm run test:all
```

### Test Specific Workspace
```bash
npm run test --workspace=senda-ui
npm run test --workspace=senda-api
```

### Coverage
```bash
npm run test -- --coverage
```

## 🚀 Deployment

### Frontend (Cloudflare Pages)
```bash
npm run build --prefix apps/web
cd apps/web
npx wrangler pages deploy dist --project-name senda --branch main
```

### Backend (Cloudflare Workers)
```bash
npm run deploy --prefix apps/api
```

### Database Migrations
```bash
# Create migration
wrangler d1 migrations create <name> --prefix apps/api

# Test locally
wrangler d1 migrations apply --local --prefix apps/api

# Apply to production
wrangler d1 migrations apply --remote --prefix apps/api
```

## 📝 Changelog

### v1.0.0 (Current)
- ✨ Initial release with Senda architecture
- ✨ React 18 + Hono monorepo
- ✨ Multi-tenant ready
- ✨ Comprehensive documentation
- 🔒 Full security implementation

### v1.1.0 (Planned)
- Export to Excel/PDF
- Email notifications
- Advanced filtering
- Dark mode

### v2.0.0 (Future)
- GraphQL API
- Real-time WebSocket updates
- Mobile app
- Advanced analytics

[Full Changelog →](./CHANGELOG.md)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -m "feat: Add my feature"`
3. Push to branch: `git push origin feature/my-feature`
4. Open Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 🐛 Known Issues

None reported in v1.0.0

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/aietamonica2/panel-horas-Mooving/issues)
- **Email**: operaciones@moovingtech.com
- **Documentation**: [See docs](./documentation/)

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

---

**Built with ❤️ by Mooving Tech**  
**Last Updated**: 12 de Junio de 2026
