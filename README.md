# Panel de Operaciones Mooving

Aplicación web moderna para análisis interactivo de carga de trabajo, disponibilidad del equipo y distribución de horas por cliente y proyecto.

**[Ver en vivo](https://panel-horas-mooving.pages.dev)**

## 🚀 Características

- 📊 **Dashboard Interactivo** - KPIs en tiempo real (Total Horas, Promedio Diario, Usuarios Activos, Clientes Únicos)
- 🎛️ **Filtros Multi-Select** - Filtra por meses, categorías y usuarios simultáneamente
- 📤 **Carga de CSV** - Carga dinámicamente datos desde archivos CSV
- 💼 **Distribución de Carga** - Análisis detallado por empleado y cliente
- 📅 **Disponibilidad Mensual** - Cálculo automático de horas libres
- ⏰ **Bolsa de Horas** - Desglose de Tareas Internas y Reuniones de Equipo
- 📈 **Gráficos Dinámicos** - Tendencias mensuales, top usuarios, top clientes
- 📱 **Diseño Responsivo** - Funciona perfectamente en mobile y desktop
- 🔒 **Type-Safe** - TypeScript en frontend y backend

## 🏗️ Arquitectura

### Monorepo con NPM Workspaces

```
panel-mooving/
├── apps/
│   ├── web/              # Vue 3 + Vite SPA
│   └── api/              # Hono + Cloudflare Workers
├── documentation/        # Documentación técnica
├── VERSION              # Versionamiento semántico
└── CHANGELOG.md         # Registro de cambios
```

### Tech Stack

**Frontend:**
- Vue 3 (TypeScript)
- Vite
- Pinia (State Management)
- TailwindCSS
- Chart.js
- Vue Router

**Backend:**
- Hono
- Cloudflare Workers
- Cloudflare D1 (SQLite)
- Zod (Validation)
- TypeScript

## 📋 Requisitos

- Node.js 18+
- npm 9+ (con npm Workspaces)
- Cuenta Cloudflare (para despliegue)
- Git

## 🛠️ Instalación y Desarrollo

### 1. Clonar el repositorio

```bash
git clone https://github.com/aietamonica2/panel-horas-Mooving.git
cd panel-horas-Mooving
```

### 2. Instalar dependencias

```bash
npm install
```

Esto instalará todas las dependencias en ambos workspaces (`apps/web` y `apps/api`).

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

Esto inicia:
- Frontend: http://localhost:5173
- Backend: http://localhost:8787

### 4. Construir para producción

```bash
npm run build
```

### 5. Tests

```bash
npm run test          # Ejecutar tests una vez
npm run test:watch   # Ejecutar tests en modo watch
```

## 📊 Formato del CSV

El archivo CSV debe contener las siguientes columnas:

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| Proyecto | String | "Tareas Internas", "SENDA" |
| Cliente | String | "Interno", "Camuzzi" |
| Usuario | String | "monica.aieta" |
| Duración (decimal) | Number | 2.5 |
| Fecha de inicio | Date (DD/MM/YYYY) | 15/06/2026 |
| Grupo | String | "operaciones" |

### Ejemplo de CSV

```csv
Proyecto,Cliente,Usuario,Duración (decimal),Fecha de inicio,Grupo
Tareas Internas,Interno,monica.aieta,2.5,15/06/2026,operaciones
SENDA,Interno,mateo.nardo,4.0,15/06/2026,desarrollo
Camuzzi,Camuzzi,felipe.gutierrez,3.0,16/06/2026,operaciones
```

## 🚀 Despliegue

### Despliegue en Cloudflare Pages

El proyecto está configurado para despliegue automático desde GitHub:

1. **Frontend** se despliega automáticamente a Cloudflare Pages
2. **Backend** se despliega a Cloudflare Workers

#### Requisitos previos

- Repositorio conectado a Cloudflare Pages
- Variables de entorno configuradas en Cloudflare

#### Despliegue Manual

```bash
npm run deploy
```

Esto:
1. Construye ambos apps
2. Despliega el backend a Cloudflare Workers
3. Despliega el frontend a Cloudflare Pages

## 📚 Documentación

- **[Architecture](./documentation/architecture/README.md)** - Arquitectura técnica del proyecto
- **[Database Schema](./documentation/database/schema.sql)** - Esquema de D1
- **[CHANGELOG](./CHANGELOG.md)** - Historial de versiones

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Crea un branch: `git checkout -b feature/tu-feature`
2. Haz commit de tus cambios: `git commit -m "feat: descripción"`
3. Actualiza la versión: Edita `/VERSION` (Semantic Versioning)
4. Actualiza el changelog: Edita `/CHANGELOG.md`
5. Ejecuta tests: `npm run test`
6. Haz push: `git push origin feature/tu-feature`
7. Abre un Pull Request

## 📝 Convenciones de Código

### Naming

- **Componentes Vue**: `PascalCase.vue` (e.g., `Dashboard.vue`)
- **Composables**: `camelCase.ts` (e.g., `useDataProcessing.ts`)
- **Stores**: `{name}Store.ts` (e.g., `dataStore.ts`)
- **Variables**: `camelCase` en inglés
- **Constantes**: `UPPER_SNAKE_CASE`

### Versionamiento

Sigue [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH` (e.g., `1.0.0`)
- Incrementa `PATCH` para bug fixes
- Incrementa `MINOR` para nuevas features
- Incrementa `MAJOR` para cambios breaking

Cada cambio debe:
1. Actualizar `/VERSION`
2. Agregar entrada en `/CHANGELOG.md`

## 🐛 Reporte de Bugs

Si encuentras un bug:

1. Describe el problema claramente
2. Incluye pasos para reproducirlo
3. Comparte tu versión y navegador
4. Abre un issue en GitHub

## 📄 Licencia

MIT License - Ver [LICENSE](./LICENSE) para detalles.

## 👥 Autor

Creado por [Mooving Tech](https://moovingtech.com)

---

**¿Preguntas?** Abre un issue o contacta al equipo de desarrollo.
