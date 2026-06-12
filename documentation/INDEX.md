# 📚 Índice de Documentación - Panel de Operaciones Mooving

## Versiones

### [v1.0.0](./versions/v1.0.0/README.md) - 12 de Junio de 2026 ⭐ ACTUAL
Primera versión oficial con arquitectura empresarial completa.

**Contenido:**
- [Guía de Arquitectura](./versions/v1.0.0/architecture.md)
- [Notas de Lanzamiento](./versions/v1.0.0/release-notes.md)

---

## Documentación Técnica

### [Database Schema](./database/schema.sql)
Schema completo de Cloudflare D1 con tabla de registros de tiempo, auditoría e índices.

### [Architecture](./architecture/README.md)
Descripción detallada de la arquitectura del monorepo, convenciones de código y flujo de datos.

---

## Guías de Desarrollo

### [README Principal](../README.md)
Instrucciones de setup, instalación y desarrollo.

### [Quick Start](../QUICK_START.md)
Guía rápida de 5 pasos para empezar.

### [Refactor Summary](../REFACTOR_SUMMARY.md)
Documentación completa de la refactorización a monorepo.

---

## Estructura de Documentación

```
documentation/
├── INDEX.md                 # Este archivo
├── architecture/
│   └── README.md           # Guía de arquitectura
├── database/
│   └── schema.sql          # Schema de D1
└── versions/
    └── v1.0.0/
        ├── README.md       # Index de la versión
        ├── architecture.md # Detalles de arquitectura
        └── release-notes.md# Notas de lanzamiento
```

---

## Política de Versionamiento

Toda documentación se versionea junto con los releases del software:

- **Cambios Breaking**: Crear nueva carpeta `versions/v{MAJOR}.0.0/`
- **Features Nuevas**: Actualizar docs en versión actual
- **Bug Fixes**: Actualizar docs en versión actual
- **Cada release**: Crear README con enlaces a todos los docs

---

## Acceso a Documentación desde el Panel

Dentro de la aplicación, hay un botón flotante en la esquina inferior derecha (icono 📚) que proporciona:

- Enlace rápido a esta documentación
- Acceso a todas las versiones
- Links a GitHub
- Quick start guides

---

## Próximas Versiones

- [ ] v1.1.0 - Features adicionales y mejoras de performance
- [ ] v2.0.0 - Redesign y cambios arquitectónicos

---

*Última actualización: 12 de Junio de 2026*
