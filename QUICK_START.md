# 🚀 Quick Start Guide

Panel de Operaciones Mooving - Guía rápida de inicio

## 1️⃣ Clonar y Instalar

```bash
git clone https://github.com/aietamonica2/panel-horas-Mooving.git
cd panel-horas-Mooving
npm install
```

## 2️⃣ Ejecutar en Desarrollo

```bash
npm run dev
```

Abre en tu navegador:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8787

## 3️⃣ Cargar Datos

1. En el dashboard, busca el botón "📤 Cargar CSV"
2. Selecciona un archivo CSV con el formato correcto
3. El panel se actualiza automáticamente con los datos

### Formato del CSV

```csv
Proyecto,Cliente,Usuario,Duración (decimal),Fecha de inicio,Grupo
Tareas Internas,Interno,monica.aieta,2.5,15/06/2026,operaciones
SENDA,Interno,mateo.nardo,4.0,15/06/2026,desarrollo
```

## 4️⃣ Usar los Filtros

- **Meses**: Multi-select (Ctrl/Cmd + Click)
- **Categorías**: Multi-select (Ctrl/Cmd + Click)
- **Usuario**: Single select
- Clickea "Aplicar Filtros" para actualizar

## 5️⃣ Ver Métricas

El dashboard muestra en tiempo real:
- 📊 Total Horas
- ⏱️ Promedio Diario
- 👥 Usuarios Activos
- 🏢 Clientes Únicos

## 🧪 Tests

```bash
npm run test              # Ejecutar tests
npm run test:watch       # Watch mode
```

## 🏗️ Build para Producción

```bash
npm run build            # Build frontend & backend
npm run deploy           # Deploy a Cloudflare
```

## 📚 Documentación

- **[Architecture](./documentation/architecture/README.md)** - Arquitectura completa
- **[README](./README.md)** - Guía de desarrollo detallada
- **[REFACTOR_SUMMARY](./REFACTOR_SUMMARY.md)** - Detalles de la refactorización

## 🔗 Recursos

- **GitHub**: https://github.com/aietamonica2/panel-horas-Mooving
- **Panel Live**: https://panel-horas-mooving.pages.dev
- **Cloudflare Docs**: https://developers.cloudflare.com/

## ❓ Troubleshooting

### Puerto 5173 o 8787 ya en uso
```bash
# Cambiar puertos en vite.config.ts o wrangler.toml
```

### Errores de TypeScript
```bash
npm run build          # Verifica compilation errors
```

### Tests fallando
```bash
npm run test:watch    # Debug en tiempo real
```

---

**¡Listo!** Ahora puedes desarrollar y desplegar el Panel de Operaciones Mooving. 🎉
