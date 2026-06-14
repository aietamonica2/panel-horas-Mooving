# 1. Arquitectura y Tecnología

**Fecha de Generación:** 2026-06-13
**Versión:** 1.0.0

---

## 1.1 Diseño General del Sistema

El Panel de Operaciones de Mooving está construido sobre una arquitectura moderna basada en la nube, optimizada para rendimiento, bajo costo de mantenimiento y escalabilidad global (edge computing). El diseño sigue un patrón Monorepo que divide las responsabilidades en dos aplicaciones principales (`apps/web` y `apps/api`).

### Principios Arquitectónicos
1. **Multi-Tenancy Aislado:** La base de datos y la lógica de backend garantizan el aislamiento lógico de los datos mediante el campo `company_id`. Todos los accesos se validan cruzando el contexto de la sesión con este identificador.
2. **Serverless & Edge-First:** Todo el entorno de backend se despliega en el borde (Edge) utilizando la infraestructura global de Cloudflare. Esto asegura latencias mínimas independientemente de la ubicación geográfica del usuario.
3. **Orquestación AI-First:** Las capacidades de IA no son simplemente un añadido cosmético, sino el núcleo de los flujos de trabajo avanzados a través de la integración nativa con la plataforma Senda.

---

## 1.2 Stack Tecnológico

### Capa Frontend (Presentación)
- **Framework:** React 18 / Vite.
- **Estilos:** TailwindCSS (Obligatorio para mantener consistencia visual sin overhead de CSS).
- **Gestión de Estado:** Zustand y Context API para flujos ligeros.
- **Visualización de Datos:** Recharts para la construcción de los dashboards interactivos (Distribución por Empleado, Cliente, etc.).

### Capa Backend (API & Lógica)
- **Entorno de Ejecución:** Cloudflare Workers (TypeScript).
- **Framework Web:** Hono (Micro-framework web ultrarrápido y compatible con el ecosistema Edge).
- **Integración AI:** SDK nativo de Senda y protocolo MCP (Model Context Protocol).

### Capa de Datos (Almacenamiento)
- **Base de Datos:** Cloudflare D1 (Base de datos relacional SQLite distribuida en el borde).
- **Esquema:** Esquema relacional optimizado (`time_records`, `employees`, `clients`, `projects`) con índices compuestos para consultas eficientes por `company_id` y `date`.

---

## 1.3 El Rol de Senda AI y el Protocolo MCP

Un diferenciador clave en la arquitectura de Mooving es que **no** interactuamos directamente con modelos de lenguaje fundacionales (como OpenAI o Anthropic) desde el backend. Todo el procesamiento semántico, inferencias y flujos conversacionales se delegan de manera estricta a **Senda**.

### Model Context Protocol (MCP)
Para que Senda no sea solo un chatbot pasivo, el backend de Mooving expone un servidor MCP. A través de este servidor, la aplicación expone herramientas tipadas que la Inteligencia Artificial puede descubrir e invocar de manera autónoma (sujetas a los permisos del usuario).

Las herramientas expuestas actualmente incluyen:
- `get_time_records`: Recuperar registros históricos.
- `sync_clockify_hours`: Extraer datos de Clockify.
- `sync_zendesk_tickets`: Sincronizar tickets resueltos de soporte.
- `parse_natural_language_hours`: Motor central de Mooving Assistant para interpretar comandos humanos.

El flujo es bidireccional:
1. El usuario interactúa con la interfaz web de React o directamente con el Senda Chat Widget.
2. El request viaja a la nube de Senda.
3. La IA de Senda decide qué acción tomar y llama, vía MCP, a nuestro Cloudflare Worker.
4. El Worker ejecuta de manera segura la lógica de negocio en la base de datos D1 y devuelve los resultados a la IA.

---

[← Volver al Índice](./index.md) | [Siguiente: Integración de APIs Externas →](./02-integracion-apis-externas.md)
