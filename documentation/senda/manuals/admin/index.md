# Introducción al Manual del Administrador de Senda

> **Senda te da el control total sobre usuarios, seguridad, modelos de IA, consumo y compliance de tu plataforma — sin depender del equipo de desarrollo.**

---

## Propósito y Visión General

Este manual es tu guía de **gobierno operativo** para administrar Senda dentro de tu organización. No es un catálogo de pantallas — es un **playbook de administración** que cubre desde la creación del primer usuario hasta la auditoría de compliance más exigente.

Al terminar este manual vas a poder gestionar usuarios y roles con criterio de mínimo privilegio, configurar seguridad y MFA, gobernar modelos de IA y costos, revisar auditorías, y aplicar políticas de privacidad y retención sin romper la operación.

---

## Audiencia Principal

| Perfil | Usa este manual para... |
|--------|------------------------|
| **Administrador de Tenant** | Gestionar usuarios, roles, equipos, seguridad y configuración global |
| **Responsable de IT / Operaciones** | Configurar integraciones, API keys, tokens y service accounts |
| **Oficial de Seguridad** | Auditar accesos, revisar logs, verificar compliance |
| **Owner de Plataforma** | Gobernar modelos de IA, consumo, costos y políticas de retención |
| **Equipo de Handover** | Recibir la plataforma tras la implementación y operarla de forma autónoma |

### Perfiles que NO cubre este manual

| Perfil | Manual correcto |
|--------|----------------|
| Implementador que diseña agentes, prompts y flujos | **Manual Funcional** |
| Integrador técnico, desarrollador de acciones, MCP | **Manual Técnico** |
| Desarrollador de API, SDK, extensiones, widgets | **Manual Developer API** |

---

## Alcance Administrativo

Este manual cubre el **ciclo administrativo completo** de la plataforma:

1. **Cap. 01** — Usuarios, Roles y Permisos: RBAC, crear/editar/desactivar usuarios, políticas de contraseña
2. **Cap. 02** — Equipos y Control de Acceso a Espacios: grupos, ACL, visibilidad, Space Admins
3. **Cap. 03** — Tokens, Service Accounts y API Keys: autenticación M2M, scopes, rotación, revocación
4. **Cap. 04** — Seguridad, Auditorías y Logs: MFA, audit log, incidentes, revisión trimestral
5. **Cap. 05** — Modelos de IA y Funciones IA: AI Gateway multi-proveedor, fallback, temperatura, consumo
6. **Cap. 06** — Analytics y Consumo de la Plataforma: métricas, efectividad, KPIs, exportaciones
7. **Cap. 07** — Modo Simple y Modo Enterprise: activación progresiva de features avanzados
8. **Cap. 08** — Privacidad, Retención de Datos y Compliance: GDPR/LGPD, retención, DPA, derecho al olvido
9. **Cap. 09** — Integración con Microsoft Teams: SSO silencioso, registro en Azure Entra ID, manifest

### Fuera de Alcance

- Diseño de agentes, prompts, espacios y flujos conversacionales → **Manual Funcional**
- Creación de acciones HTTP, Script, Pipeline, Intent Graph → **Manual Técnico**
- Desarrollo de extensiones, SDK y widget embedding → **Manual Developer API**
- Arquitectura de infraestructura y deploys → **Documentación interna de DevOps**

---

## Prerrequisitos

Antes de empezar, necesitás:

- ✅ Acceso al tenant con rol `r_admin` o `r_tenant_owner`
- ✅ Comprensión básica de la estructura organizacional (áreas, equipos, roles)
- ✅ Definición de la política de seguridad de la organización (contraseñas, MFA, retención)
- ✅ Listado de sistemas externos que se integrarán (para configurar API keys y service accounts)
- ✅ Contacto con el equipo legal para definiciones de retención y compliance

> 💡 **No necesitás conocimientos de programación.** Este manual está diseñado para perfiles de administración y operaciones.

---

## Resultado Esperado

Después de leer y aplicar los checklists de este manual, vas a poder:

- ✅ Administrar usuarios, equipos, roles y permisos con criterio de mínimo privilegio
- ✅ Configurar seguridad de acceso, MFA y políticas de contraseña del tenant
- ✅ Gestionar API keys y service accounts para integraciones M2M seguras
- ✅ Entender y gobernar modelos de IA, proveedores, fallback y consumo
- ✅ Revisar auditorías, action logs y señales de uso para detectar riesgos
- ✅ Elegir entre modo Simple y Enterprise según la madurez del cliente
- ✅ Aplicar políticas de privacidad, retención y compliance sin romper la operación
- ✅ Mantener un handover claro entre implementación, operación diaria y mejora continua

---

## Cómo Usar Este Manual

| Objetivo | Cómo usarlo |
|----------|-------------|
| **Tenant nuevo** | Leé los capítulos en orden (01 → 09). Cada uno construye sobre el anterior. |
| **Operación diaria** | Usá los caps. 04 (Seguridad), 05 (Modelos) y 06 (Analytics) como checklist mensual. |
| **Onboarding de nuevo admin** | Empezá por caps. 01-03 para entender usuarios, accesos y tokens. |
| **Auditoría de seguridad** | Los checklists al final de cada capítulo sirven como criterios de aceptación. |
| **Handover post-implementación** | Revisá caps. 07 (Modo Simple/Enterprise) y 08 (Compliance) como guía de entrega. |

---

## Convenciones Usadas

| Convención | Significado |
|------------|-------------|
| `código` | Nombre técnico real de un campo, tabla o configuración de Senda |
| > 💡 **Tip** | Consejo práctico o recomendación de experiencia |
| > ⚠️ **Importante** | Advertencia que puede causar problemas si se ignora |
| > 🎯 **Regla** | Regla operativa crítica — no opcional |
| > 🔑 **Clave** | Concepto fundamental para entender el capítulo |
| ❌ / ✅ | Anti-patrón vs patrón correcto |
| ☐ Checklist | Criterio de aceptación verificable al final de cada capítulo |

---

## Información de Versión

| Campo | Valor |
|-------|-------|
| Versión de Senda documentada | **v5.23.2** |
| Última actualización del manual | 2026-06-03 |
| Idioma | Español (Argentina) |
| Formato | Markdown (compatible con HTML, PDF y RAG) |

---

## Uso como Fuente RAG / LLM

Este manual está diseñado para ser consumido tanto por humanos como por agentes de IA:

- **Estructura jerárquica predecible** (H1 → H2 → H3) para facilitar el chunking
- **Secciones auto-contenidas** — cada sección es comprensible en aislamiento
- **Terminología consistente** — un concepto = un término, siempre
- **Tablas y listas** en lugar de prosa larga — optimiza la extracción de datos
- **Checklists verificables** — permiten a un LLM evaluar completitud

Al ingerir en RAG: conservar la estructura de títulos, tablas y listas. No incluir exportaciones con datos reales de usuarios, tokens, dominios privados ni capturas con información sensible.

---

## Canales de Soporte

| Canal | Para qué |
|-------|----------|
| **Documentación online** | `senda.telar.ai/docs/admin/` — versión siempre actualizada |
| **Manual Funcional** | Para dudas de diseño de agentes, prompts y flujos |
| **Manual Técnico** | Para dudas de integración, APIs y acciones avanzadas |
| **Equipo de implementación** | Contactar al equipo asignado a tu proyecto |

---

## Tabla de Contenidos

| # | Capítulo | Tema |
|---|----------|------|
| 01 | [Usuarios, Roles y Permisos](./01_usuarios_roles_y_permisos.md) | RBAC, crear/editar/desactivar usuarios, políticas de contraseña |
| 02 | [Equipos y Control de Acceso a Espacios](./02_equipos_y_acceso_espacios.md) | Grupos, ACL, visibilidad, Space Admins, cascada de acceso |
| 03 | [Tokens, Service Accounts y API Keys](./03_tokens_y_service_accounts.md) | Autenticación M2M, scopes, rotación, revocación de emergencia |
| 04 | [Seguridad, Auditorías y Logs](./04_seguridad_y_auditorias.md) | MFA, audit log, respuesta a incidentes, revisión trimestral |
| 05 | [Modelos de IA y Funciones IA](./05_modelos_y_funciones_ia.md) | AI Gateway multi-proveedor, fallback, temperatura, KPIs de consumo |
| 06 | [Analytics y Consumo de la Plataforma](./06_analytics_y_consumo.md) | Métricas, efectividad, aprendizajes, exportaciones, ROI |
| 07 | [Modo Simple y Modo Enterprise](./07_modo_simple_y_enterprise.md) | Modos de interfaz, criterios de migración, funcionalidades por modo |
| 08 | [Privacidad, Retención de Datos y Compliance](./08_privacidad_y_compliance.md) | GDPR/LGPD, retención, DPA, derecho al olvido, auditoría externa |
| 09 | [Integración con Microsoft Teams](./09_integracion_microsoft_teams.md) | SSO silencioso, Azure Entra ID, manifest, distribución en Teams |
