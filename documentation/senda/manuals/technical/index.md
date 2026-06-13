# Introducción al Manual Técnico de Senda

> **Senda te permite construir integraciones, automatizaciones y flujos avanzados que conectan agentes de IA con los sistemas reales de tu organización.**

---

## Propósito y Visión General

Este manual es tu guía de **construcción técnica** para implementar integraciones sobre Senda. No es un catálogo de endpoints — es un **playbook de integración** que te lleva desde la comprensión de los motores de acción hasta el debugging avanzado de incidentes en producción.

Al terminar este manual vas a poder diseñar acciones HTTP seguras, construir pipelines multi-paso, crear flujos conversacionales con Intent Graph, programar scripts con el Bridge SDK, configurar MCP e integraciones OAuth2, y diagnosticar cualquier problema en la cadena de ejecución.

---

## Audiencia Principal

| Perfil | Usa este manual para... |
|--------|------------------------|
| **Implementador Técnico** | Construir acciones, pipelines, fórmulas e integraciones completas |
| **Integrador de Sistemas** | Conectar APIs externas con autenticación, payloads y manejo de errores |
| **Arquitecto de Solución** | Diseñar la estrategia de integración entre Senda y la infraestructura del cliente |
| **QA Técnico** | Definir pruebas, regresiones y criterios de aceptación por integración |
| **Responsable de Observabilidad** | Usar Debug Mode, action logs y Chain Debugger para resolver incidentes |

### Perfiles que NO cubre este manual

| Perfil | Manual correcto |
|--------|----------------|
| Implementador funcional que diseña agentes, prompts y flujos | **Manual Funcional** |
| Administrador de usuarios, roles, seguridad, compliance | **Manual de Administrador** |
| Desarrollador de API pública, SDK npm, Chrome Extension | **Manual Developer API** |

---

## Alcance Técnico

Este manual cubre el **ciclo técnico completo** de una integración:

1. **Cap. 00** — Glosario Técnico: 40+ términos con definiciones precisas y contexto de uso
2. **Cap. 01** — Acciones: Conceptos y Tipos: catálogo, motores, ciclo de vida, threshold, directivas
3. **Cap. 02** — Acciones HTTP y Formularios: endpoints, headers, credenciales, Body template, Form Nodes
4. **Cap. 03** — Fórmulas, Pipelines y Generative UI: motor de fórmulas, encadenamiento, widgets visuales
5. **Cap. 04** — Intent Graph y Flujos Conversacionales: nodos, condiciones, formularios, escape hatches
6. **Cap. 05** — Mission Control y Automatizaciones: schedules, observers, event-driven, Chain Debugger
7. **Cap. 06** — MCP Client y MCP Server: auto-discovery, invocación, protocol, widgets de terceros
8. **Cap. 07** — Integraciones OAuth2 y Webhooks: flujos OAuth, tokens, webhooks entrantes/salientes
9. **Cap. 08** — Debugging Técnico: diagnóstico por capa, tabla de errores HTTP, tools de referencia
10. **Cap. 09** — Senda Bridge SDK: 8 métodos del sandbox, patrones avanzados, seguridad

### Fuera de Alcance

- Diseño de agentes, prompts, espacios y casos de uso funcionales → **Manual Funcional**
- Gestión de usuarios, roles, tokens, MFA, auditoría → **Manual de Administrador**
- Contratos públicos de API REST, SDK npm, widget embedding → **Manual Developer API**
- Arquitectura de infraestructura, deploys y ambientes → **Documentación interna de DevOps**

---

## Prerrequisitos

Antes de empezar, necesitás:

- ✅ Acceso a un tenant de Senda (producción o QA) con rol de implementador o admin
- ✅ Familiaridad con conceptos de APIs REST (HTTP methods, headers, JSON, status codes)
- ✅ Acceso a la documentación de las APIs externas que vas a integrar
- ✅ Credenciales de prueba para los sistemas externos (tokens, API keys)
- ✅ Un espacio con al menos un agente configurado para probar las acciones

> 💡 **Nivel técnico esperado:** No necesitás ser desarrollador full-stack, pero sí entender JSON, headers HTTP y flujos de autenticación básicos.

---

## Resultado Esperado

Después de leer y aplicar los checklists de este manual, vas a poder:

- ✅ Diseñar y mantener acciones seguras, testeables y fáciles de auditar
- ✅ Conectar APIs externas con path params, headers, credenciales y payloads correctos
- ✅ Usar directivas de acción y respuesta sin contaminar el system prompt
- ✅ Crear pipelines multi-paso, fórmulas y widgets visuales con Generative UI
- ✅ Construir flujos conversacionales guiados con Intent Graph v2
- ✅ Programar scripts avanzados con el Senda Bridge SDK (8 métodos)
- ✅ Configurar OAuth2, webhooks, MCP y sincronizaciones RAG
- ✅ Diagnosticar y resolver incidentes con Debug Mode, Chain Debugger y action logs

---

## Cómo Usar Este Manual

| Objetivo | Cómo usarlo |
|----------|-------------|
| **Integración nueva** | Empezá por cap. 01 (conceptos), seguí con el motor específico (02-04) y cerrá con cap. 08 (debugging). |
| **Resolver un incidente** | Empezá por cap. 08 (troubleshooting) y volvé al capítulo del componente afectado. |
| **Automatización avanzada** | Leé caps. 05 (Mission Control) y 09 (Bridge SDK) para eventos, schedules y orquestación. |
| **Conectar sistema externo** | Cap. 02 (HTTP) + cap. 07 (OAuth2/Webhooks) + cap. 06 (MCP si aplica). |
| **Auditoría de integración** | Los checklists al final de cada capítulo sirven como criterios de aceptación técnica. |

---

## Convenciones Usadas

| Convención | Significado |
|------------|-------------|
| `código` | Nombre técnico real de un campo, ruta, flag o configuración de Senda |
| > 💡 **Tip** | Consejo práctico o recomendación de experiencia |
| > ⚠️ **Importante** | Advertencia que puede causar problemas si se ignora |
| > 🎯 **Regla** | Regla operativa crítica — no opcional |
| > 🔑 **Clave** | Concepto fundamental para entender el capítulo |
| > 🚀 **Avanzado** | Funcionalidad avanzada o de despliegue progresivo |
| ❌ / ✅ | Anti-patrón vs patrón correcto |
| ☐ Checklist | Criterio de aceptación verificable al final de cada capítulo |
| ```json``` / ```bash``` | Ejemplos de código ejecutables con datos reales (sin credenciales) |

---

## Información de Versión

| Campo | Valor |
|-------|-------|
| Versión de Senda documentada | **v5.20.13** |
| Última actualización del manual | 2026-05-29 |
| Idioma | Español (Argentina) |
| Formato | Markdown (compatible con HTML, PDF y RAG) |

---

## Uso como Fuente RAG / LLM

Este manual está diseñado para ser consumido tanto por humanos como por agentes de IA:

- **Estructura jerárquica predecible** (H1 → H2 → H3) para facilitar el chunking
- **Secciones auto-contenidas** — cada sección es comprensible en aislamiento
- **Ejemplos de payload reales** — permiten a un LLM generar configuraciones por analogía
- **Tablas de decisión** — optimizan la selección de motor, modelo y patrón
- **Checklists verificables** — permiten a un LLM evaluar completitud técnica

Al ingerir en RAG: conservar encabezados, ejemplos de payload y tablas. No subir versiones con índices duplicados, capturas sin texto alternativo o fragmentos de credenciales reales.

---

## Canales de Soporte

| Canal | Para qué |
|-------|----------|
| **Documentación online** | `senda.telar.ai/docs/tecnico/` — versión siempre actualizada |
| **Manual Funcional** | Para dudas de diseño de agentes, prompts y casos de uso |
| **Manual de Administrador** | Para dudas de seguridad, roles y configuración de plataforma |
| **Manual Developer API** | Para contratos de API pública, SDK y extensiones |
| **Equipo de implementación** | Contactar al equipo asignado a tu proyecto |

---

## Tabla de Contenidos

| # | Capítulo | Tema |
|---|----------|------|
| 00 | [Glosario Técnico](./00_glosario.md) | 40+ términos con definiciones y contexto de uso |
| 01 | [Acciones: Conceptos y Tipos](./01_acciones_conceptos_y_tipos.md) | Catálogo, motores, ciclo de vida, threshold, directivas |
| 02 | [Acciones HTTP y Formularios](./02_acciones_http_y_formularios.md) | Endpoints, headers, credenciales, Body template, Form Nodes |
| 03 | [Fórmulas, Pipelines y Generative UI](./03_formulas_pipelines_y_ui.md) | Motor de fórmulas, encadenamiento, widgets visuales |
| 04 | [Intent Graph y Flujos Conversacionales](./04_intent_graph.md) | Nodos, condiciones, formularios, escape hatches, simulador |
| 05 | [Mission Control y Automatizaciones](./05_mission_control.md) | Schedules, observers, event-driven, Chain Debugger |
| 06 | [MCP Client y MCP Server](./06_mcp_client_y_server.md) | Auto-discovery, invocación, protocol, widgets de terceros |
| 07 | [Integraciones OAuth2 y Webhooks](./07_integraciones_y_webhooks.md) | Flujos OAuth, tokens, webhooks entrantes/salientes |
| 08 | [Debugging Técnico](./08_troubleshooting.md) | Diagnóstico por capa, errores HTTP, tools de referencia |
| 09 | [Senda Bridge SDK](./09_senda_bridge_sdk.md) | 8 métodos del sandbox, patrones avanzados, seguridad |
