# Introducción al Manual Funcional de Senda

> **Senda no es un chatbot. Es la plataforma donde tu empresa diseña, ejecuta y evoluciona procesos de negocio inteligentes con agentes de IA — sin escribir código.**

---

## Propósito y Visión General

Este manual es tu guía operativa para implementar soluciones con Senda. No es un catálogo de funcionalidades — es un **playbook de trabajo** que te lleva desde la comprensión del producto hasta la puesta en marcha de agentes reales que resuelven problemas de negocio.

Senda pertenece a una categoría nueva: **plataforma de orquestación de agentes de IA empresarial**. A diferencia de un chatbot o un asistente genérico como ChatGPT, Senda combina 19 capacidades que permiten:

- **Diseñar flujos inteligentes** completos — desde un botón de inicio hasta la ejecución sobre sistemas reales — dibujándolos visualmente o describiéndolos en lenguaje natural
- **Operar sobre sistemas empresariales** — crear tickets en Jira, actualizar registros en SAP, enviar emails con PDFs adjuntos, generar reportes con gráficos interactivos
- **Trabajar de forma autónoma** — con schedules programados, observers que reaccionan a eventos y agentes que persiguen objetivos de negocio sin que nadie escriba
- **Aprender continuamente** — con 6 capas de inteligencia que verifican la calidad del conocimiento, extraen insights de cada conversación, detectan brechas automáticamente y anticipan tendencias

Al terminar este manual vas a poder diseñar espacios, construir flujos inteligentes con Pipeline Canvas e Intent Graph, preparar bases de conocimiento de calidad con RAG Prep, configurar acciones automatizadas, usar Senda Studio para generar configuraciones desde lenguaje natural, instalar Skill Packs desde el Marketplace, y entregar una solución lista para producción.

---

## Audiencia Principal

| Perfil | Usa este manual para... |
|--------|------------------------|
| **Implementador Funcional** | Diseñar agentes, prompts, flujos inteligentes, acciones y procesos completos |
| **Consultor de Negocio** | Evaluar casos de uso, definir alcance, demostrar flujos y calcular ROI |
| **Product Owner / Líder de Capacitación** | Entender el producto como plataforma de procesos y generar material de adopción |
| **Customer Success** | Optimizar implementaciones, activar las 6 capas de inteligencia y medir resultados |
| **Analista de Mejora Continua** | Auditar calidad con RAG Prep, revisar Intent Discovery y proponer mejoras |

### Perfiles que NO cubre este manual

| Perfil | Manual correcto |
|--------|----------------|
| Administrador de seguridad, roles, MFA, auditoría, feature flags | **Manual de Administrador** |
| Integrador backend, desarrollador de acciones avanzadas, MCP, Bridge SDK | **Manual Técnico** |
| Desarrollador de API, SDK, extensiones, widgets embebidos | **Manual Developer API** |

---

## Alcance Funcional

Este manual cubre el **ciclo funcional completo** de una implementación:

1. **Cap. 01** — ¿Qué es Senda? 5 categorías de capacidades, 7 capas de arquitectura, flujos inteligentes de negocio, 7 engranajes de mejora continua
2. **Cap. 02** — Las 19 Capacidades de Senda, la Cadena de Pensamiento anti-alucinación de 8 pasos y las 6 Capas de Inteligencia
3. **Cap. 03** — Configurar Espacios, Agentes, Intent Graph v2, Space Tools, MCP Admin y 4 capacidades avanzadas (Goal-Based, Chatless, Predictive, Adaptive)
4. **Cap. 04** — Dominar los Prompts: filosofía, 5 capas, plantilla premium, patrones avanzados
5. **Cap. 05** — La Base de Conocimiento: sanitización, RAG Prep Engine (calificación A-F), búsqueda híbrida, Bóveda Visual, consolidación automática
6. **Cap. 06** — Acciones y Automatizaciones: HTTP, fórmulas, Senda Studio, Marketplace de Skills, Intent Discovery
7. **Cap. 07** — Probar y Validar Agentes: chips de debug, protocolo de 4 fases, testing automatizado con MCP
8. **Cap. 08** — Casos de Uso y Recetas: 10 casos detallados por industria con flujos completos
9. **Cap. 09** — Playbook de Implementación: 5 fases del proyecto, herramientas por fase
10. **Cap. 10** — Change Management: adopción, resistencia, métricas, herramientas por fase (Studio, Chatless, Canvas, Marketplace)
11. **Cap. 11** — ROI y Business Case: 3 frameworks, costos evitados, ingresos protegidos por IA proactiva
12. **Cap. 12** — Trampas y Sorpresas: 15 anti-patterns con soluciones y kit de supervivencia

### Fuera de Alcance

- Configuración de infraestructura, ambientes y deploys → **Manual de Administrador**
- Creación de acciones Script con el Bridge SDK, MCP Server/Client → **Manual Técnico**
- Gestión de usuarios, roles, tokens, MFA, auditoría, feature flags → **Manual de Administrador**
- Desarrollo de extensiones, widgets embebidos, Chrome Extension → **Manual Developer API**

---

## Lo Que Vas a Aprender: Senda Como Plataforma de Procesos

Este manual está construido alrededor de una idea central: **Senda no es una herramienta de chat — es una plataforma donde se construyen soluciones empresariales completas.**

Las funcionalidades de Senda son bloques de construcción que se combinan para crear **flujos inteligentes de negocio**:

```
Punto de entrada          →  Space Tool, Chatless trigger, Observer, Schedule
Recolección de datos      →  Intent Graph, Action Cards, formularios
Lógica de decisión        →  Pipeline Canvas, condiciones, aprobaciones humanas
Ejecución sobre sistemas  →  Acciones HTTP, Pipelines, Scripts, Bridge SDK
Visualización             →  18 widgets de Generative UI, Adaptive Dashboards
Seguimiento autónomo      →  Goal Agents, Observers, Predictive Analytics
```

**Ejemplo concreto** — un flujo de aprobación de compras construido en Senda:

```
Space Tool "Nueva compra" → Intent Graph (formulario: monto, proveedor, área)
    → Pipeline Canvas:
        → Si monto < $5.000 → aprobación automática
        → Si monto > $50.000 → cadena de 3 aprobadores con Chatless UI
    → Acción HTTP crea orden en SAP
    → GenUI muestra timeline del proceso
```

Este tipo de solución es lo que vas a aprender a construir.

---

## Prerrequisitos

Antes de empezar, necesitás:

- ✅ Acceso a un tenant de Senda (producción o QA) con rol de implementador o admin
- ✅ Al menos un espacio creado (o permisos para crear uno)
- ✅ Comprensión básica del proceso de negocio que querés automatizar
- ✅ Los documentos fuente que alimentarán la base de conocimiento del agente
- ✅ Contacto con el equipo técnico para integraciones que requieran APIs externas

> 💡 **No necesitás conocimientos de programación.** Este manual está diseñado para perfiles funcionales y de negocio. Incluso las acciones, los pipelines y los flujos se configuran visualmente o con lenguaje natural (Senda Studio).

---

## Resultado Esperado

Después de leer y aplicar los checklists de este manual, vas a poder:

- ✅ Diseñar un proyecto de implementación con objetivos, alcance, riesgos y criterios de aceptación
- ✅ Crear espacios con agentes especializados coherentes con los procesos reales de la organización
- ✅ Escribir prompts premium, versionables, no conflictivos y fáciles de auditar
- ✅ Preparar documentos limpios para RAG, analizarlos con el RAG Prep Engine (calificación A-F) y validar que el agente los utiliza correctamente
- ✅ Construir **flujos inteligentes completos** combinando Pipeline Canvas, Intent Graph, Space Tools, Chatless UI y Goal Agents
- ✅ Usar **Senda Studio** para generar agentes y acciones desde lenguaje natural
- ✅ Instalar **Skill Packs** desde el Marketplace para acelerar implementaciones
- ✅ Configurar los **3 prompts de aprendizaje** (aprendizaje, efectividad, etiquetado) para que cada agente mejore con el tiempo
- ✅ Activar las **6 capas de inteligencia** — desde calidad preventiva hasta anticipación predictiva
- ✅ Armar Space Tools que transformen el chat en un centro de trabajo interactivo
- ✅ Probar la solución con casos reales, testing automatizado con MCP y escenarios de regresión
- ✅ Generar insumos de capacitación, ventas, calidad y mejora continua

---

## Cómo Usar Este Manual

| Objetivo | Cómo usarlo |
|----------|-------------|
| **Implementación nueva** | Leé los capítulos en orden (01 → 12). Cada uno construye sobre el anterior. |
| **Optimización puntual** | Usá la tabla de contenidos para ir al tema y cerrar con el checklist del capítulo. |
| **Capacitación de equipos** | Los capítulos 01, 02, 03 y 10 son ideales para talleres de adopción. |
| **Diseño de flujos** | Los capítulos 01 (Flujos Inteligentes), 03 (Intent Graph + Space Tools) y 06 (Acciones + Studio) son la tríada central. |
| **Activar la inteligencia** | Los capítulos 02 (6 Capas de Inteligencia) y 05 (RAG Prep + Consolidación) son la guía. |
| **Auditoría de calidad** | Los checklists al final de cada capítulo sirven como criterios de aceptación. |
| **Pre-venta / Discovery** | Los capítulos 08 (10 Casos de Uso) y 11 (ROI) son materiales de referencia directos. |

---

## Convenciones Usadas

| Convención | Significado |
|------------|-------------|
| `código` | Nombre técnico real de un campo, ruta o configuración de Senda |
| > 💡 **Tip** | Consejo práctico o recomendación de experiencia |
| > ⚠️ **Importante** | Advertencia que puede causar problemas si se ignora |
| > 🎯 **Regla** | Regla operativa crítica — no opcional |
| > 🔑 **Clave** | Concepto fundamental para entender el capítulo |
| > 🚀 **Avanzado** | Funcionalidad avanzada o de despliegue progresivo |
| > 🔖 **BETA** | Funcionalidad disponible progresivamente, protegida por feature flag |
| ❌ / ✅ | Anti-patrón vs patrón correcto |
| ☐ Checklist | Criterio de aceptación verificable al final de cada capítulo |
| ```ui-mockup``` | Representación visual de la interfaz de Senda |

---

## Información de Versión

| Campo | Valor |
|-------|-------|
| Versión de Senda documentada | **v5.20.13** |
| Última actualización del manual | 2026-05-29 |
| Capacidades documentadas | **19** (ver Cap. 02) |
| Casos de uso detallados | **10** (ver Cap. 08) |
| Anti-patterns documentados | **15** (ver Cap. 12) |
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
- **Diagramas Mermaid** — visualizaciones de arquitectura y flujos legibles por IA

Al ingerir en RAG: conservar la estructura de títulos, tablas y listas. No duplicar índices automáticos si la plataforma genera su propio índice temático.

---

## Canales de Soporte

| Canal | Para qué |
|-------|----------|
| **Documentación online** | `senda.telar.ai/docs/funcional/` — versión siempre actualizada |
| **PDF offline** | Descargable desde el botón 📄 PDF en la navegación del manual |
| **Manual Técnico** | Para dudas de integración, APIs, Bridge SDK y acciones avanzadas |
| **Manual de Administrador** | Para dudas de seguridad, roles, feature flags y configuración de plataforma |
| **Equipo de implementación** | Contactar al equipo asignado a tu proyecto |

---

## Tabla de Contenidos

| # | Capítulo | Descripción |
|---|----------|-------------|
| 01 | [¿Qué es Senda?](./01_que_es_senda.md) | 5 categorías, 18 diferenciadores, flujos inteligentes, 7 engranajes |
| 02 | [Las Capacidades y la Cadena de Pensamiento](./09_capacidades_y_cadena_de_pensamiento.md) | 19 capacidades, pipeline anti-alucinación de 8 pasos, 6 capas de inteligencia |
| 03 | [Configurar Espacios y Agentes](./02_configurar_espacios_y_agentes.md) | Espacios, routing, Intent Graph v2, Space Tools, MCP Admin, capacidades avanzadas |
| 04 | [Dominar los Prompts](./03_dominar_los_prompts.md) | Filosofía, 5 capas, plantilla premium, patrones avanzados |
| 05 | [La Base de Conocimiento](./04_base_de_conocimiento.md) | Sanitización, RAG Prep (A-F), búsqueda híbrida, Bóveda Visual, consolidación |
| 06 | [Acciones y Automatizaciones](./06_acciones_y_automatizaciones.md) | HTTP, fórmulas, GenUI, Studio, Marketplace, Intent Discovery |
| 07 | [Probar y Validar Agentes](./07_probar_y_validar_agentes.md) | Modo prueba, chips de debug, protocolo de 4 fases, testing MCP |
| 08 | [Casos de Uso y Recetas](./05_casos_de_uso.md) | 10 casos detallados por industria con flujos completos |
| 09 | [Playbook de Implementación](./06_playbook_implementacion.md) | 5 fases, herramientas por fase, activación progresiva |
| 10 | [Change Management](./07_change_management.md) | Adopción, resistencia, métricas, herramientas por fase |
| 11 | [ROI y Business Case](./08_roi_y_business_case.md) | 3 frameworks, costos evitados, ingresos protegidos |
| 12 | [Trampas y Sorpresas](./10_trampas_y_sorpresas.md) | 15 anti-patterns con soluciones y kit de supervivencia |
| — | [Glosario](./00_glosario.md) | 40+ términos con analogías y definiciones |
