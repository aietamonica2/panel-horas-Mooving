# 01. Introducción y Contexto

## Contexto del Proyecto

El Challenge Mooving tiene como objetivo modernizar, estructurar y potenciar tecnológicamente el control y la carga de horas del equipo operativo. Inicialmente, la gestión de horas presentaba desafíos de integración, dispersión de datos y falta de interfaces modernas que consolidaran la información proveniente de múltiples sistemas (como Clockify y Zendesk).

El desafío requería no solo una solución visual atractiva y funcional (Frontend), sino también una robusta arquitectura subyacente que permitiera la sincronización de datos de manera autónoma utilizando inteligencia artificial.

## Objetivos del Challenge

1. **Dashboard Consolidado (Panel de Horas)**: Desarrollar una interfaz moderna y atractiva para visualizar el estado de carga de horas del equipo, incorporando métricas clave (KPIs), filtros interactivos (por empleado, fecha y proyecto) y gráficos que expongan claramente la distribución del esfuerzo.
2. **Carga Manual Amigable**: Proveer un flujo nativo (`QuickLogModal`) para que los usuarios puedan registrar sus horas retrospectivamente de manera sencilla, sin abandonar la plataforma.
3. **Integración con IA (Senda)**: Demostrar un ecosistema donde una IA (Senda) sea capaz de interactuar con el sistema para extraer información, auditar anomalías e incluso disparar sincronizaciones con sistemas externos.
4. **Arquitectura Escalable y Segura**: Implementar la solución bajo una arquitectura monorepo utilizando tecnologías modernas (Vue 3, Vite, Hono, Cloudflare Workers y D1), respetando estrictamente el aislamiento Multi-Tenant (RBAC y Company ID).

## Alcance General Abordado

Para cumplir con estos objetivos, el proyecto se dividió en dos grandes pilares de desarrollo:

- **Frontend (Web App)**: Un Single Page Application desarrollado en Vue 3 con Tailwind CSS que ofrece una experiencia de usuario (UX) fluida y premium. Cuenta con un diseño que facilita la lectura de datos e integra componentes interactivos como selectores de fechas y paneles de filtros complejos.
- **Backend y Agentes (API & Senda QA)**: Una API serverless construida sobre Cloudflare Workers que no solo expone endpoints REST, sino que también aloja un Servidor MCP (Model Context Protocol). Este servidor actúa como puente para que Senda QA (la IA orquestadora) pueda automatizar la importación de datos y la auditoría de registros de forma desatendida.

---
> [Volver al Índice](./index.md) | [Siguiente: Arquitectura del Sistema](./02-arquitectura-sistema.md)

*Versión documentada: v1.0.5 · Fecha de generación: 2026-06-13*
