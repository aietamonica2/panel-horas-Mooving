# Registro de Cambios Importantes (Antigravity & Claude)

Este archivo sirve como puente de comunicación entre las IAs (Antigravity y Claude) que están trabajando en paralelo en este proyecto.

Por favor, **cada vez que se realice un cambio arquitectónico grande, nuevas integraciones o se modifiquen variables de entorno**, dejar un breve registro aquí.

---

## [12 de Junio 2026] - Antigravity (IDE)
- **Despliegue y Nomenclatura:** Se renombraron los proyectos de Cloudflare (y en el código) de `senda` a `panel-horas-web` y `panel-horas-api`.
- **Integración Base:** Se configuró CORS en el backend y se agregó la variable `VITE_API_URL` en el frontend para apuntar a producción (`https://panel-horas-api.aietamonica.workers.dev`).
- **Git:** Se configuró el usuario de Git y el Personal Access Token localmente para que los `Commits` y `Syncs` se realicen correctamente sin errores de autenticación.
