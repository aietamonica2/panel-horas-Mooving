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
