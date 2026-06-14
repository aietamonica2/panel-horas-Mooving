# Documentación Técnica Completa: Challenge Mooving

> **Versión documentada:** v1.0.5 · **Fecha de generación:** 2026-06-13

Este directorio contiene la auditoría y documentación exhaustiva generada como entregable final para el Challenge Técnico de Mooving. Describe en detalle la arquitectura implementada, el desarrollo del dashboard, la configuración del ecosistema MCP y la integración de IA mediante Senda.

## Tabla de Contenidos

1. [Introducción y Contexto](./01-introduccion.md)
2. [Arquitectura del Sistema](./02-arquitectura-sistema.md)
3. [Desarrollo del Frontend (Dashboard)](./03-desarrollo-frontend.md)
4. [Integración Senda AI y Servidor MCP](./04-integracion-senda-mcp.md)
5. [Seguridad y Despliegue](./05-seguridad-y-despliegue.md)
6. [Conclusiones y Trabajo Futuro](./06-conclusiones.md)

---
*Generado automáticamente siguiendo el protocolo de auditoría de Tramia.*
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
# 02. Arquitectura del Sistema

El proyecto "Panel de Horas Mooving" sigue las *Tramia Architecture Guidelines*, implementando un enfoque monorepo organizado mediante NPM Workspaces. Este enfoque garantiza la separación de responsabilidades y facilita el desarrollo y despliegue unificado.

## Monorepo y NPM Workspaces

La estructura del código base está dividida lógicamente en:

- `apps/web/`: Contiene la aplicación web frontend.
- `apps/api/`: Contiene el backend, la API REST y el Servidor MCP.
- `documentation/`: Concentra todo el conocimiento estructural, de auditoría y directivas para IA.

## Componente Frontend (`apps/web/`)

Construido como una Single Page Application (SPA), el frontend se encarga exclusivamente de la capa de presentación y la interacción con el usuario.

- **Framework Core**: Vue 3 (Composition API) impulsado por Vite, ofreciendo tiempos de compilación extremadamente rápidos y un entorno de desarrollo eficiente.
- **Enrutamiento y Estado**: Utiliza `vue-router` para la navegación y `pinia` para el manejo centralizado del estado.
- **Estilos**: Tailwind CSS se emplea como única fuente de diseño, asegurando componentes modulares, estéticas premium y facilidades nativas para modos oscuros y micro-interacciones (glassmorphism, transiciones).

## Componente Backend (`apps/api/`)

El backend opera como un servicio Serverless altamente escalable, diseñado para responder a la SPA y servir a agentes de IA mediante el protocolo MCP.

- **Framework Core**: Hono (framework ultra-ligero y rápido para entornos edge).
- **Entorno de Ejecución**: Cloudflare Workers, garantizando latencias mínimas y escalabilidad global automática.
- **Endpoints**:
  - Rutas REST tradicionales para el consumo de datos desde el dashboard.
  - El endpoint `/api/mcp/u/:user/tools/call`, el cual implementa el Model Context Protocol para que IA externas (Senda) consuman herramientas (tools).

## Persistencia de Datos (Cloudflare D1)

La base de datos subyacente es Cloudflare D1 (SQLite en el Edge). El modelo de datos y el acceso siguen reglas estrictas:

- **Migraciones Formales**: Todo cambio estructural se realiza mediante comandos `wrangler d1 migrations` y se documenta en esquemas SQL (`schema.sql`).
- **Aislamiento Multi-Tenant (CRITICAL)**: Es imperativo el uso de la columna `company_id`. En este challenge, todas las consultas y mutaciones de datos inyectan estrictamente `company_id = 'mooving-default'` en las cláusulas `WHERE`, garantizando la seguridad perimetral de los datos de Mooving frente a hipotéticos futuros clientes (Tenants) del panel.

---
> [Anterior: Introducción](./01-introduccion.md) | [Volver al Índice](./index.md) | [Siguiente: Desarrollo del Frontend](./03-desarrollo-frontend.md)

*Versión documentada: v1.0.5 · Fecha de generación: 2026-06-13*
# 03. Desarrollo del Frontend (Dashboard)

El Frontend representa el núcleo interactivo del proyecto para los usuarios operativos y de gestión. Ha sido desarrollado con **Vue 3** y estructurado mediante componentes modulares en `apps/web/src/components/`.

## Panel de Horas (Dashboard Principal)

El `Dashboard.tsx` es el componente orquestador que consume los datos desde la API REST subyacente y los distribuye visualmente. Se enfocó en ofrecer una experiencia "Premium" y "Data-Rich" desde el primer vistazo.

### KPIs y Métricas de Alto Nivel
Se implementaron tarjetas de resumen (KPI Cards) para proporcionar métricas instantáneas sobre el mes en curso:
- **Total de Horas Registradas**: Sumatoria consolidada de horas.
- **Tasa de Productividad (Billable vs Non-Billable)**: Porcentaje del esfuerzo facturable vs. esfuerzo interno/soporte.
- **Top Proyecto / Cliente**: El proyecto o cliente que demandó más horas.

### Gráficos e Insights Visuales
- **Distribución por Empleado**: Gráficos de barras horizontales mostrando quiénes cargaron más horas, facilitando detectar sobrecargas (ej. +12h en un día).
- **Esfuerzo por Proyecto (Pie Chart)**: Distribución del peso de los proyectos activos (ej. Camuzzi, Banco Galicia).

## Componente de Filtros (`FilterPanel.tsx`)

Para que el dashboard sea una herramienta de auditoría efectiva, se diseñó un panel de filtros lateral o colapsable con las siguientes capacidades:
- **Filtrado por Rango de Fechas**: Acotar la vista a "Este mes", "Mes pasado" o rangos personalizados.
- **Filtrado por Empleado**: Visualizar específicamente el rendimiento o la sobrecarga de un individuo.
- **Filtrado Múltiple por Proyecto/Cliente**: Aislamiento del consumo de horas de un cliente particular.
*Estos filtros mutan reactivamente los datos del Dashboard y se sincronizan con las llamadas a la API.*

## El Modal Interactivo: `QuickLogModal.tsx`

La carga manual de horas se simplificó drásticamente evitando redirecciones y cargas pesadas. Se creó un Modal (`QuickLogModal.tsx`) que permite a los usuarios (como Mónica) cargar horas sin fricciones.

**Características y Evolución:**
- Flujo en menos de 3 clics: Seleccionar Proyecto, Ingresar Horas, Opcional Detalle, y Cargar.
- **Mejora v1.0.5**: Inicialmente restringido al día en curso, se incorporó un selector nativo `<input type="date">` para permitir la **carga retrospectiva** (ej. cargar horas olvidadas del viernes el día lunes).
- Integración visual utilizando `Tailwind CSS`, con micro-animaciones al abrir (fade/scale) y *glassmorphism* para oscurecer el fondo.

## UI/UX y Estilado General

Siguiendo las *UI / UX & Styling Guidelines*, se erradicaron las alertas nativas del navegador (`alert()`). Todos los mensajes de éxito, validación y error utilizan notificaciones modulares integradas en el entorno (Toast notifications). Tailwind CSS fue mandatorio para establecer una paleta de colores corporativa (neutros, púrpuras/azules para acciones) y bordes redondeados (`rounded-xl` o `rounded-2xl`) propios de interfaces modernas.

---
> [Anterior: Arquitectura del Sistema](./02-arquitectura-sistema.md) | [Volver al Índice](./index.md) | [Siguiente: Integración Senda y MCP](./04-integracion-senda-mcp.md)

*Versión documentada: v1.0.5 · Fecha de generación: 2026-06-13*
# 04. Integración Senda AI y Servidor MCP

La orquestación de inteligencia artificial y la automatización inteligente son pilares fundamentales de este desafío. De acuerdo a las *Senda AI Integration Guidelines*, toda funcionalidad impulsada por IA debe fluir a través del ecosistema de Senda (`sendaqa.telar.ai`).

## Arquitectura del Servidor MCP (Model Context Protocol)

Se implementó un servidor MCP nativo dentro de `apps/api/src/mcp/server.ts` que sirve como puente bidireccional entre la IA de Senda y la base de datos (Cloudflare D1) de la aplicación.

**Endpoints y Herramientas Registradas:**
El servidor MCP expone las siguientes herramientas (Tools) registradas en el `mcp_tool_catalog`:

1. **`sync_clockify_hours` (Write Tool)**: Simula/conecta la inserción masiva de horas provenientes de la plataforma externa Clockify. En la prueba realizada, el endpoint insertó exitosamente 3 registros (22h totales).
2. **`sync_zendesk_tickets` (Write Tool)**: Inserta registros de horas asociadas a tickets de soporte resueltos en Zendesk (2 tickets procesados en pruebas, sumando 11.5h).
3. **`audit_timesheet` (Read Tool)**: Ejecuta una rutina de validación cruzada en la base de datos para detectar anomalías operativas. En pruebas reales logró identificar excesos de carga (ej. Mónica Aieta con +12h en días de abril).

Todas estas herramientas fueron verificadas operando sobre el entorno productivo apuntando al tenant `mooving-default`.

## Configuración del Ecosistema Senda QA

La configuración en Senda QA fue realizada de manera completamente autónoma mediante agentes de interfaz (*Browser Subagents*) enfrentando desafíos como la gestión inteligente de cuotas y bloqueos temporales (`429 RESOURCE_EXHAUSTED`). El resultado final es un espacio plenamente operativo:

### 1. Espacio y RAG (Knowledge Base)
- Se creó el espacio exclusivo **"Operaciones Mooving"**.
- Se ingirió documentación de contexto (RAG) incluyendo el *Manual de Políticas de Carga de Horas* y el *Glosario de Proyectos*, lo que permite a la IA tener "conciencia de dominio" al responder sobre clientes específicos y normativas de horas extras.

### 2. Estructura de Agentes
- **`router_operaciones_mooving`**: Agente principal (Router) que atiende el chat y delega.
- **`analista_gerencial_mooving`**: Sub-agente experto en métricas de rentabilidad.
- **`qa_datos_mooving`**: Sub-agente especialista en validación de imputaciones de tiempo.

### 3. Acciones HTTP y Space Tools
Se crearon e integraron 3 Acciones HTTP que actúan de clientes POST contra el servidor MCP:
- Se activó la modalidad **Fast-Track (Ejecución Directa)** para que comandos verbales del usuario (ej. *"Sincronizar Clockify"*) disparen las acciones HTTP instantáneamente sin intervención manual adicional.
- Se configuraron 3 botones de acceso rápido (**Space Tools**) en el panel lateral del espacio:
  - 🔄 Sync Clockify
  - 🎫 Sync Zendesk
  - 🔍 Auditar Horas

---
> [Anterior: Desarrollo Frontend](./03-desarrollo-frontend.md) | [Volver al Índice](./index.md) | [Siguiente: Seguridad y Despliegue](./05-seguridad-y-despliegue.md)

*Versión documentada: v1.0.5 · Fecha de generación: 2026-06-13*
# 05. Seguridad y Despliegue

La seguridad de datos y la escalabilidad del sistema están enmarcadas por estrictas normativas (Security Guidelines) propias de la arquitectura y la gobernanza de IA de Senda.

## Aislamiento Multi-Tenant

Al tratarse de una plataforma B2B concebida para servir a múltiples organizaciones bajo una misma infraestructura, se estableció el patrón de diseño Multi-Tenant:
- Toda entidad dentro de Cloudflare D1 incluye el campo mandatorio `company_id`.
- Es **imposible** ejecutar una mutación de datos (`INSERT`, `UPDATE`, `DELETE`) o lectura (`SELECT`) a través del backend sin inyectar en la cláusula WHERE el `company_id` asociado a la sesión o token del invocador.
- Para este proyecto, se operó exclusivamente sobre el entorno y tenant `mooving-default`.

## Seguridad del Servidor MCP

El endpoint MCP expuesto para Senda (`/api/mcp/u/:user/tools/call`) se protegió mediante mecanismos de validación:
- **Autenticación Bearer**: Las Acciones HTTP de Senda QA operan portando un token de autorización configurado en los Headers (`Bearer mooving2025`). El backend valida este token en su capa de middleware, rechazando de manera fulminante solicitudes sin credenciales (`401 Unauthorized`).
- **Validación de Payload**: El Body de las peticiones es escrutado. Cada Tool llamada (ej. `audit_timesheet`) exige que su parámetro estructurado (ej. `{ "company_id": "..." }`) esté presente y sea un identificador válido.
- **RBAC Governance**: En producción, cada IA opera con un `mcp_user_id` estricto y aislado, validando contra la tabla `mcp_user_permissions` para garantizar que no ejecute una Tool para la que no tiene privilegios explícitos (`access_type` 'read' vs 'write').

## Política CORS y Edge Deployment

El frontend SPA (Vite) y el backend API (Hono) se despliegan en dominios distintos dentro de Cloudflare.
- **CORS Handling**: Se implementó una política de CORS rigurosa en Hono para admitir tráfico desde dominios permitidos (los entornos locales de Vite y los subdominios de Cloudflare Pages).
- **Despliegue Serverless**: La aplicación Backend utiliza la infraestructura **Cloudflare Workers**. Esta elección elimina la necesidad de gestionar contenedores o Kubernetes, garantizando latencias mínimas globales mediante la ejecución de la lógica (y la validación de tokens Senda) directamente en el edge.

---
> [Anterior: Integración Senda y MCP](./04-integracion-senda-mcp.md) | [Volver al Índice](./index.md) | [Siguiente: Conclusiones](./06-conclusiones.md)

*Versión documentada: v1.0.5 · Fecha de generación: 2026-06-13*
# 06. Conclusiones y Trabajo Futuro

La resolución del Challenge Mooving ha culminado con una solución integral que abarca desde la presentación visual y analítica de datos en el frontend, hasta la integración de automatización inteligente vía inteligencia artificial (Senda).

## Resultados Obtenidos

1. **Dashboard Completo**: Se entregó una aplicación Frontend responsiva, "Data-Rich" y alineada a estéticas premium (Tailwind CSS, glassmorphism), posibilitando una auditoría en tiempo real de las horas cargadas, productividad y peso por cliente.
2. **Carga Manual Sin Fricciones**: El componente `QuickLogModal` centraliza la carga retrospectiva de manera amigable, disminuyendo barreras operativas.
3. **Ecosistema Senda QA Operativo**: Configuración de espacio ("Operaciones Mooving") con subagentes especializados y RAG (Reglas de carga y Proyectos).
4. **Sincronización Autónoma (MCP)**: Desarrollo y validación del Servidor MCP, permitiendo a la IA ejecutar importaciones desatendidas (`Clockify`, `Zendesk`) y correr tareas de limpieza/auditoría profunda en D1 (`audit_timesheet`).

## Siguientes Pasos (Trabajo Futuro)

Para llevar esta arquitectura robusta a un escenario completamente productivo a escala comercial, se recomienda:

1. **Reemplazo de Token Hardcodeado (Authentication)**: Transicionar el token de desarrollo del backend MCP (`mooving2025`) hacia un sistema de autenticación de identidades dinámico (ej. Auth0 o JWT).
2. **Webhooks vs Polling**: Modificar la arquitectura de sincronización para que Clockify o Zendesk disparen Webhooks directamente al backend Serverless, reduciendo aún más la necesidad de invocaciones vía MCP para sincronizaciones en tiempo real.
3. **Generative UI Senda**: Explotar la capacidad del Servidor MCP para retornar gráficos y tarjetas (Render Types) en la interfaz de Senda, para que el `analista_gerencial_mooving` ofrezca diagramas embebidos en el chat en respuesta a consultas de facturación.
4. **Integración B2B Completa**: Ampliar la tabla `role_permissions` y enlazar firmemente las pantallas del Dashboard a la gobernanza de accesos establecida en `router/index.ts`.

---
> [Anterior: Seguridad y Despliegue](./05-seguridad-y-despliegue.md) | [Volver al Índice](./index.md)

*Versión documentada: v1.0.5 · Fecha de generación: 2026-06-13*
