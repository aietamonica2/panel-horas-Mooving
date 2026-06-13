# 06. MCP Client y MCP Server

> **Versión documentada:** v5.6.93 · **Última revisión:** 2026-05-28
> **Estado de la Feature:** MCP Client: 🟢 GA | MCP Server Consumer: 🟢 GA | MCP Server Admin: 🟢 GA

El Model Context Protocol (MCP) es el estándar abierto de Anthropic para la interoperabilidad entre agentes de IA y herramientas externas. Senda implementa MCP en sus dos roles posibles: como cliente (consumiendo servidores MCP de terceros) y como servidor (exponiendo sus propios agentes y acciones como herramientas invocables por sistemas externos).


---

## ¿Qué es Model Context Protocol?

MCP define un contrato de comunicación entre un **host** (el sistema que orquesta la IA) y **servers** (los sistemas que exponen herramientas). El protocolo resuelve el problema de la integración punto a punto: en lugar de que cada agente de IA tenga un conector específico para cada herramienta externa, cualquier herramienta que implemente MCP es automáticamente compatible con cualquier cliente MCP.

### Ventajas sobre integraciones propietarias

| Aspecto | Integración REST a medida | MCP |
|---|---|---|
| **Descubrimiento** | Manual — hay que saber qué endpoints existen | Auto-descubrimiento vía `tools/list` |
| **Documentación de parámetros** | En docs externas o Postman | Embebida en el schema de la tool |
| **Compatibilidad entre sistemas** | Específica de cada par (Senda↔Jira) | Universal (cualquier MCP client ↔ cualquier MCP server) |
| **Mantenimiento** | Cuando cambia la API externa, hay que actualizar el conector | El server actualiza su schema; el cliente se adapta |
| **Ecosistema** | Propio | Compatible con Claude Desktop, Cursor, VS Code, Copilot Studio y cualquier cliente MCP |

### Cuándo usar MCP vs. acciones HTTP REST

| Escenario | Recomendación |
|---|---|
| El sistema externo ya expone un servidor MCP | ✅ MCP Client — aprovechá el discovery automático |
| El sistema externo solo tiene una REST API documentada | ✅ Acción HTTP del catálogo |
| Querés que Claude Desktop o Cursor invoquen acciones de Senda | ✅ MCP Server de Senda |
| Querés que un agente de Senda llame a otro agente de Senda | ✅ Multi-agente vía MCP Server |
| Integración simple con un único endpoint de lectura | ✅ Acción HTTP — menor overhead |
| El proveedor ofrece SDK oficial MCP | ✅ MCP Client |

---

## MCP Client — Consumir Servidores MCP Externos

El MCP Client de Senda permite conectar el catálogo de acciones a cualquier servidor MCP de terceros. Una vez registrado el servidor, Senda descubre automáticamente todas las herramientas disponibles y las hace invocables desde los agentes.

### Métodos de autenticación soportados

| Método | Configuración | Cuándo usar |
|---|---|---|
| **Bearer Token** | Header `Authorization: Bearer <token>` | JWTs, tokens de servicio, PATs |
| **API Key en Header** | Header personalizado (ej: `X-API-Key`) | Claves de API simples |
| **API Key en Query String** | `?api_key=<valor>` | APIs legacy que no aceptan headers |
| **OAuth2 Client Credentials** | `client_id` + `client_secret` + `token_url` | Enterprise APIs con OAuth2 machine-to-machine |
| **Sin autenticación** | — | Servidores internos de red privada |

### Auto-descubrimiento: el endpoint `tools/list`

El descubrimiento automático funciona haciendo un `GET /tools/list` (o `POST /mcp/tools/list` según la implementación) al servidor MCP. La respuesta debe seguir el schema estándar MCP:

```json
{
  "tools": [
    {
      "name": "get_stock_level",
      "description": "Returns the current stock level for a given product SKU. Use when the user asks about inventory, available units, or product stock.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sku": {
            "type": "string",
            "description": "The product SKU code (e.g., 'PRD-001-XL')"
          },
          "warehouse_id": {
            "type": "string",
            "description": "Optional warehouse ID. If omitted, returns total across all warehouses.",
            "nullable": true
          }
        },
        "required": ["sku"]
      }
    },
    {
      "name": "create_purchase_order",
      "description": "Creates a new purchase order in the ERP. Use when the user explicitly requests to create a new purchase order with a supplier.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "supplier_id": { "type": "string", "description": "Supplier identifier" },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "sku": { "type": "string" },
                "quantity": { "type": "integer", "minimum": 1 }
              },
              "required": ["sku", "quantity"]
            }
          },
          "delivery_date": { "type": "string", "format": "date" }
        },
        "required": ["supplier_id", "items"]
      }
    }
  ]
}
```

Senda parsea este JSON y crea automáticamente acciones en el catálogo por cada tool descubierta. La `description` de la tool se usa como descripción de la acción — es crítico que esté bien redactada para que el LLM sepa cuándo invocarla.

### Configurar un servidor MCP externo paso a paso

**Paso 1: Ir a Administración → Integraciones → MCP Servers → Agregar servidor**

**Paso 2: Completar la configuración base:**

```yaml
name: "ERP Corporativo — Módulo de Inventario"
url: "https://mcp.erp-empresa.com/v1"
auth:
  type: "bearer"
  token_secret: "ERP_MCP_TOKEN"    # Nombre de la credencial en la Bóveda
auto_discover: true
refresh_interval_hours: 24         # Refrescar el manifest cada 24h
enabled_tools:
  - "get_stock_level"
  - "create_purchase_order"
  - "get_supplier_info"
  # Si omitís esta lista, se importan TODAS las tools disponibles
disabled_tools:
  - "delete_product"               # Excluir herramientas de alto riesgo
```

**Paso 3: Click en "Descubrir herramientas"**

Senda ejecuta el `tools/list` y muestra una tabla de preview:

```ui-mockup
Herramientas descubiertas en mcp.erp-empresa.com:

✅ get_stock_level          — Consulta stock por SKU
✅ create_purchase_order    — Crea orden de compra
✅ get_supplier_info        — Consulta datos de proveedor
⚠️ delete_product          — [EXCLUIDA por configuración]
⚠️ reset_warehouse_data     — [No habilitada — requiere revisión]

[Importar herramientas seleccionadas]
```

**Paso 4: Confirmar importación**

Las tools importadas aparecen en el Catálogo de Acciones bajo la carpeta automática `[MCP] ERP Corporativo`. Pueden asignarse a agentes igual que cualquier acción.

### Mapeo de parámetros de tools MCP

El `inputSchema` de cada tool define los parámetros que el agente debe recolectar. Senda mapea automáticamente los campos del schema JSON como parámetros de la acción:

| Campo en `inputSchema` | Mapeo en Senda |
|---|---|
| `properties.[field].description` | Descripción del parámetro (el LLM la lee) |
| `required: ["field"]` | Parámetro marcado como requerido |
| `type: "string" / "integer" / "boolean"` | Tipo del parámetro |
| `nullable: true` | Parámetro opcional |
| `enum: ["A","B","C"]` | Opciones válidas (se puede mapear a `radio_pills` en Form Node) |

### Probar una invocación de tool MCP

En el Catálogo de Acciones, cualquier acción importada desde un MCP server tiene el botón **🧪 Probar**. Esto abre el panel de test sandbox:

```ui-mockup
┌────────────────────────────────────────────────────────────────┐
│ 🧪 Probar: get_stock_level [via MCP — ERP Corporativo]         │
│                                                                 │
│ Parámetros:                                                     │
│ sku:           [ PRD-001-XL              ]                      │
│ warehouse_id:  [ (opcional)              ]                      │
│                                                                 │
│ [▶️ Invocar tool]                                                │
│                                                                 │
│ RESULTADO (1.4 segundos):                                       │
│ {                                                               │
│   "sku": "PRD-001-XL",                                         │
│   "warehouse": "TODOS",                                        │
│   "available_units": 342,                                      │
│   "reserved_units": 28,                                        │
│   "net_available": 314,                                        │
│   "last_updated": "2026-05-21T08:30:00Z"                       │
│ }                                                               │
└────────────────────────────────────────────────────────────────┘
```

### Manejo de errores y timeouts en MCP Client

Si el servidor MCP responde con un error o no responde dentro del timeout configurado, Senda maneja el fallo de manera estándar:

| Situación | Comportamiento de Senda |
|---|---|
| HTTP 4xx del servidor MCP | Error de la acción con el mensaje de error del servidor |
| HTTP 5xx del servidor MCP | Retry automático (hasta 2 reintentos con backoff de 2s) |
| Timeout (default: 30s) | Error `MCP_TIMEOUT` — configurable por servidor |
| Server caído (connection refused) | Error `MCP_UNREACHABLE` — se registra en Mission Control |
| Schema de respuesta inesperado | Error `MCP_RESPONSE_PARSE_ERROR` |

Para acciones críticas, configurar el `on_error` de la acción MCP para que derive a un nodo de manejo de error o notifique al equipo.

### Caching del manifest de tools

Senda cachea el resultado del `tools/list` para evitar latencia adicional en cada invocación. El cache se invalida según:

1. **`refresh_interval_hours`** configurado en el servidor (default: 24h)
2. **Refuerzo manual**: botón "🔄 Refrescar manifest" en la configuración del servidor MCP
3. **Auto-invalidación**: si una invocación falla con `MCP_TOOL_NOT_FOUND`, Senda refresca el manifest automáticamente y reintenta

---

## MCP Server — Exponer Senda como Herramienta MCP

Senda funciona como servidor MCP, exponiendo sus agentes y acciones para que sistemas externos (Claude Desktop, Cursor, orquestadores propios, otros agentes Senda) los invoquen como herramientas. El servidor opera en **dos modos** según el scope de la API Key utilizada.

### Dos modos de operación

| Modo | Scope de API Key | Qué expone | Estado | Para quién |
|---|---|---|---|---|
| **Consumer** | `chat`, `read` | Chat con agentes, ejecución de acciones, listado de recursos | 🟢 GA | Sistemas que consumen agentes de Senda |
| **Admin** | `admin` | 16 herramientas de configuración + 6 recursos administrativos | 🟢 GA | Analistas funcionales que configuran Senda vía IA |
| **Debug** | Cualquiera | 4 herramientas de telemetría y diagnóstico de performance | 🟢 GA | Analistas investigando latencias o TTFB |

El modo Consumer permite que herramientas externas **usen** los agentes de Senda. El modo Admin permite que herramientas externas **configuren** Senda completo. El modo Debug permite auditar el rendimiento.

### Protocolo y endpoint

El MCP Server usa JSON-RPC 2.0 sobre HTTP (Streamable HTTP transport). El endpoint único es:

```
POST https://senda.telar.ai/mcp/{tenantId}
Authorization: Bearer <api_key>
Content-Type: application/json
```

Métodos JSON-RPC soportados:

| Método | Descripción |
|---|---|
| `initialize` | Handshake inicial — retorna nombre, versión y capabilities del servidor |
| `tools/list` | Descubrimiento — lista todas las tools disponibles según el scope de la key |
| `tools/call` | Invocación — ejecuta una tool con los parámetros provistos |
| `resources/list` | Lista recursos estáticos disponibles |
| `resources/templates/list` | Lista templates de recursos con URI parametrizadas |
| `resources/read` | Lee el contenido de un recurso específico |

---

## MCP Server — Modo Consumer (chat, read)

El modo Consumer expone las siguientes herramientas a cualquier API Key con scope `chat` o `read`:

| Tool | Descripción | Scope requerido |
|---|---|---|
| `senda_chat` | Enviar un mensaje al agente del espacio y recibir la respuesta | `chat` |
| `senda_execute_action` | Ejecutar una acción del catálogo directamente, sin flujo conversacional | `chat` |
| `senda_list_actions` | Listar las acciones disponibles en el espacio del agente | `read` |
| `senda_list_agents` | Listar los agentes disponibles con su nombre y resumen | `read` |

### Recursos Consumer

| URI | Descripción |
|---|---|
| `senda://catalog` | Catálogo de acciones del espacio con nombre, descripción y parámetros |
| `senda://agents` | Lista de agentes con nombre, resumen y estado |

### Ejemplo: Invocar el chat desde Claude Desktop

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "senda_chat",
    "arguments": {
      "message": "¿Cuál es la política de vacaciones para empleados con menos de un año?",
      "session_id": "sess_abc123"
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "Según la política vigente, los empleados con menos de un año de antigüedad tienen derecho a 14 días corridos de vacaciones..."
    }]
  }
}
```

---

## MCP Server — Modo Admin (admin)

El modo Admin transforma a Senda en un servidor MCP completo de **configuración**, permitiendo que agentes de IA externos (Claude Desktop, Cursor, Google Antigravity, etc.) configuren espacios, agentes, acciones, documentos y herramientas de espacio sin usar el panel web.

### Arquitectura de seguridad: Dual Gate

Toda operación Admin debe pasar dos validaciones independientes:

```mermaid
flowchart LR
    A["Request con API Key"] --> B{"¿Scope admin?"}
    B -->|No| X["❌ Tools admin no visibles"]
    B -->|Sí| C{"¿Rol r_admin o r_superadmin?"}
    C -->|No| Y["❌ Error: permisos insuficientes"]
    C -->|Sí| E["✅ Ejecutar operación"]
    E --> F["📝 Registrar en audit_logs"]
```

| Capa | Verificación | Qué bloquea |
|---|---|---|
| **Scope** | La API Key tiene el scope `admin` | Keys de tipo `chat` o `read` ni siquiera ven las tools admin en `tools/list` |
| **Rol** | El usuario asociado a la key tiene `r_admin` o `r_superadmin` | Usuarios con `r_user` o `r_viewer` no pueden ejecutar tools admin |

### Las 16 Herramientas Admin

#### Dominio: Espacios (4 tools)

| Tool | Descripción | Parámetros requeridos | Parámetros opcionales |
|---|---|---|---|
| `senda_admin_list_spaces` | Lista todos los espacios del tenant con cantidad de agentes, estado y configuración | — | `include_inactive` |
| `senda_admin_create_space` | Crea un espacio nuevo | `code` (slug alfanumérico), `title` | `subtitle`, `welcome_title`, `welcome_text`, `theme`, `visibility`, `default_access` |
| `senda_admin_update_space` | Modifica la configuración de un espacio existente | `space_id` | `learning_prompt`, `visibility`, `status`, `parent_id` |
| `senda_admin_duplicate_space` | Clona un espacio completo (agentes, acciones, config) como copia independiente | `space_id` | — |

**Ejemplo — Crear un espacio:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "senda_admin_create_space",
    "arguments": {
      "code": "soporte-tecnico",
      "title": "Soporte Técnico",
      "subtitle": "Mesa de ayuda para clientes",
      "theme": "blue",
      "visibility": "internal"
    }
  }
}
```

#### Dominio: Agentes (4 tools)

| Tool | Descripción | Parámetros requeridos | Parámetros opcionales |
|---|---|---|---|
| `senda_admin_list_agents` | Lista agentes con configuración completa y acciones asignadas | — | `space_id` |
| `senda_admin_create_agent` | Crea un agente nuevo con los 31 campos de configuración | `space_id`, `name`, `system_prompt`, `agent_summary` | `is_primary`, `test_mode`, `vision_enabled`, `charts_enabled`, `hallucination_strategy`, `rag_citations_enabled`, y 20+ campos más |
| `senda_admin_update_agent` | Modifica campos del agente (merge parcial — solo se sobreescriben los campos enviados) | `agent_id` | Todos los campos de configuración del agente |
| `senda_admin_generate_agent` | Genera una configuración completa de agente usando IA a partir de una descripción en lenguaje natural | `description` | — |

**Ejemplo — Generar un agente con IA:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "senda_admin_generate_agent",
    "arguments": {
      "description": "Un agente de soporte técnico nivel 1 para una empresa de software. Debe ser amable, pedir capturas de pantalla cuando el problema es visual, y escalar a Jira si no puede resolver el problema en 3 intercambios."
    }
  }
}
```

La tool retorna la configuración generada (nombre, resumen, system prompt, notas internas) sin crearla — el analista debe revisar y luego usar `senda_admin_create_agent` para confirmar.


#### Dominio: Acciones (4 tools)

| Tool | Descripción | Parámetros requeridos | Parámetros opcionales |
|---|---|---|---|
| `senda_admin_list_actions` | Lista el catálogo de acciones con filtros. Las API keys se enmascaran como `********` | — | `folder`, `is_active` |
| `senda_admin_create_action` | Crea una acción HTTP/MCP/Script con encriptación automática de API key | `name`, `description` | `endpoint_url`, `http_method`, `api_key`, `parameters`, `directive`, `action_type`, `script_code`, `response_directive`, y 10+ campos más |
| `senda_admin_update_action` | Modifica una acción existente con rotación segura de API key | `action_id` | Todos los campos de la acción |
| `senda_admin_assign_action_to_agent` | Asigna una acción a un agente con configuración de umbral y confirmación | `agent_id`, `action_id` | `threshold` (0-100, default 80), `require_confirmation`, `fast_track` |

**Sobre la rotación de API keys en acciones:**
- Si se envía `api_key: "********"`, se mantiene la key existente sin modificación.
- Si se envía una nueva key, se encripta automáticamente con AES-GCM antes de almacenar.
- Si se envía `null`, se borra la key de la acción.

#### Dominio: Conocimiento RAG (2 tools)

| Tool | Descripción | Parámetros requeridos | Parámetros opcionales |
|---|---|---|---|
| `senda_admin_list_knowledge` | Lista los documentos de la bóveda RAG de un agente con nombre, estado, tamaño y resumen | `agent_id` | — |
| `senda_admin_ingest_document` | Sube un documento de texto al pipeline RAG de un agente | `agent_id`, `filename`, `content` | `trigger_vectorization` |

El documento se almacena con estado `pending`. La vectorización se ejecuta de forma asíncrona mediante el pipeline programado de RAG Sync, no en línea con la llamada MCP.

#### Dominio: Configuración (2 tools)

| Tool | Descripción | Parámetros requeridos | Parámetros opcionales |
|---|---|---|---|
| `senda_admin_configure_space_tools` | Configura la barra de acciones rápidas y el dock de intents de un espacio (máx. 10 herramientas) | `space_id`, `tools[]` | — |
| `senda_admin_configure_space_access` | Otorga acceso a un espacio por usuario, rol o grupo | `space_id`, `grants[]` | — |

Cada tool del array `tools[]` puede ser de tipo `action` (botón que ejecuta una acción del catálogo) o `intent` (chip que inyecta una pregunta predefinida en el chat). Las de tipo action soportan 4 estilos de botón: `default`, `primary`, `danger`, `ghost`.


### Los 6 Recursos Admin

Los recursos son endpoints de solo lectura que proveen contexto al agente externo:

| URI | Descripción |
|---|---|
| `senda://spaces` | Listado completo de espacios con toda su configuración |
| `senda://spaces/{space_id}/agents` | Agentes de un espacio con los 31 campos de configuración |
| `senda://spaces/{space_id}/tools` | Herramientas del espacio (action bar + intents dock) |
| `senda://templates/agents` | Templates de agentes del sistema para usar como base |
| `senda://templates/actions` | Templates de acciones del sistema |
| `senda://agent/{agent_id}/config` | Configuración completa de un agente + acciones asignadas + archivos RAG |

Los recursos usan `resources/templates/list` para los que tienen parámetros (como `{space_id}`) y `resources/list` para los estáticos.

### Audit Trail

Toda operación Admin se registra automáticamente en la tabla `audit_logs`:

| Campo | Valor |
|---|---|
| `action` | `mcp_admin:create`, `mcp_admin:update`, `mcp_admin:assign`, `mcp_admin:configure`, `mcp_admin:duplicate` |
| `entity_type` | `space`, `agent`, `action`, `knowledge`, `space_tool`, `space_access` |
| `entity_id` | ID de la entidad afectada |
| `actor_id` | ID de la API Key que realizó la operación |
| `source` | `mcp_admin` |
| `details_json` | Contexto adicional de la operación |

El registro usa `waitUntil()` (fire-and-forget) para no agregar latencia a la respuesta. Si el write de audit falla, se registra en `console.warn` pero no bloquea la operación.

---

## MCP Server — Modo Debug (Telemetría)

El servidor MCP también expone un conjunto de herramientas de diagnóstico para auditar el rendimiento de agentes. Por políticas de privacidad estricta (Principio P0), **ninguna de estas herramientas puede acceder a historiales de producción**. Solo devuelven datos de chats que fueron marcados expresamente con `test_mode = 1` durante el enrutamiento.

### Las 4 Herramientas Debug

Estas herramientas no requieren un scope específico en la API Key, pero el sistema validará que la entidad destino (`agent_id` o `space_id`) tenga el Modo Prueba encendido en su configuración, y que los chats consultados estén sellados.

| Tool | Descripción | Parámetros requeridos | Validaciones de Seguridad |
|---|---|---|---|
| `get_mcp_playbook` | Retorna el manual táctico para diagnosticar cuellos de botella en Senda. | — | Ninguna |
| `get_conversation_trace` | Extrae métricas de latencia de una entidad. | `conversation_id`, o `agent_id`, o `space_id` | Si se provee `conversation_id`, se valida `test_mode=1` en tabla chats. Si se provee agente/espacio, se valida `test_mode` en la entidad. |
| `analyze_agent_performance` | Devuelve promedios (TTFB, Parse Rate, Tool Duration). | `agent_id` o `space_id` | Valida que el agente o el espacio tenga el modo prueba encendido. |
| `simulate_tool_call` | Verifica si el payload que un LLM generaría es válido para el esquema Zod sin ejecutar la acción real. | `agent_id`, `input` | Valida `test_mode` en el agente indicado. |

---

## Integración con Claude Desktop, Cursor y Google Antigravity

### Claude Desktop — Modo Consumer

Agregar Senda como servidor MCP en `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "senda-soporte": {
      "url": "https://senda.telar.ai/mcp/TENANT_ID",
      "headers": {
        "Authorization": "Bearer snda_prod_xxxxxxxxxxxx"
      }
    }
  }
}
```

Con esta configuración, Claude Desktop puede chatear con los agentes de Senda y ejecutar acciones del catálogo como herramientas nativas.

### Claude Desktop — Modo Admin

Para que Claude Desktop pueda **configurar** Senda, usar una API Key con scope `admin`:

```json
{
  "mcpServers": {
    "senda-admin": {
      "url": "https://senda.telar.ai/mcp/TENANT_ID",
      "headers": {
        "Authorization": "Bearer snda_prod_ADMIN_KEY_xxxx"
      }
    }
  }
}
```

Ahora Claude puede crear espacios, configurar agentes, subir documentos RAG y más con instrucciones en lenguaje natural.

### Cursor

En `.cursor/mcp.json` del repositorio o en la configuración global:

```json
{
  "mcpServers": {
    "senda": {
      "url": "https://senda.telar.ai/mcp/TENANT_ID",
      "headers": {
        "Authorization": "Bearer snda_prod_xxxxxxxxxxxx"
      }
    }
  }
}
```

### Google Antigravity / Gemini CLI

En `~/.gemini/settings.json` o en el `AGENTS.md` del proyecto, configurar el MCP server. El agente descubre las tools automáticamente via `tools/list`.

---

## Multi-Agente MCP: Un Agente Senda Llama a Otro

El caso más avanzado de uso del MCP Server es el enrutamiento multi-agente: un **agente orquestador** de Senda puede descubrir e invocar las herramientas de otros **agentes especialistas** de Senda a través de MCP.

### Arquitectura

```mermaid
graph TD
    A["Agente Orquestador<br>(Espacio: Centro de Comando)"] -->|MCP Client| B["Agente Especialista RRHH<br>tools: senda_chat"]
    A -->|MCP Client| C["Agente Especialista IT<br>tools: senda_chat, senda_execute_action"]
    A -->|MCP Client| D["Agente Especialista Finanzas<br>tools: senda_chat"]
```

**Configuración del orquestador:**

Registrar cada agente especialista como un MCP Server externo en el Catálogo de Acciones → MCP Servers. El orquestador recibe la solicitud del usuario, determina qué especialista debe manejarla, y delega vía MCP. El usuario percibe una única conversación fluida.

---

## Ejemplo Completo: Configurar un Espacio desde Claude Desktop

### Escenario

Un analista funcional le pide a Claude Desktop que configure un espacio de Soporte Técnico completo en Senda.

### Transcript del flujo

**Analista → Claude:**
> "Necesito crear un espacio de Soporte Técnico en Senda con un agente que sepa de garantías y devoluciones. El agente debe pedir capturas de pantalla cuando el problema es visual. También necesito un botón de 'Crear ticket en Jira' en la barra del chat."

**Claude ejecuta automáticamente:**

1. `senda_admin_create_space` → Crea espacio "soporte-tecnico"
2. `senda_admin_generate_agent` → Genera config de agente con IA
3. `senda_admin_create_agent` → Crea el agente con vision habilitada
4. `senda_admin_create_action` → Crea acción HTTP para Jira
5. `senda_admin_assign_action_to_agent` → Asigna la acción al agente
6. `senda_admin_configure_space_tools` → Configura el botón en la barra

**Claude → Analista:**
> "Listo. Creé el espacio 'Soporte Técnico' con el agente 'Asistente de Garantías' configurado con visión activada para recibir capturas. También creé la acción de Jira y la asigné al agente con un botón 'Crear ticket' en la barra del chat. ¿Querés que suba documentos de políticas de garantía como conocimiento del agente?"

---

## Consideraciones de Seguridad

### Qué expone y qué protege Senda en MCP Server

| Elemento | Consumer | Admin | Notas |
|---|---|---|---|
| Datos de otros tenants | ❌ Nunca | ❌ Nunca | `tenant_id` se deriva de la API Key, nunca del request |
| Historial de conversaciones | ❌ No | ❌ No | Solo el resultado de la invocación actual |
| Credenciales de la Bóveda | ❌ Nunca | ❌ Nunca | API keys de acciones se enmascaran como `********` |
| Configuración de espacios/agentes | ❌ No | ✅ Sí (con scope admin) | Solo lectura y escritura del tenant autenticado |
| Datos de la Knowledge Base | Parcial | ✅ Sí (metadatos) | Consumer: solo lo que el agente incluye en la respuesta. Admin: lista archivos y permite ingestión |

### Principios de seguridad aplicados

1. **Tenant isolation estricto**: toda query D1 incluye `tenant_id` en el `WHERE`. No hay operaciones cross-tenant posibles.
2. **Scope mínimo**: keys Consumer no ven tools Admin. Keys Admin sin rol adecuado no pueden ejecutar.
3. **Segmentación por scope**: las herramientas admin solo son visibles para API Keys con scope `admin`.
4. **Audit completo**: toda operación Admin se registra con actor, acción, entidad y timestamp.
5. **Encriptación de secrets**: las API keys de acciones se encriptan con AES-GCM antes de almacenar.

### Revisión de seguridad antes de habilitar MCP Admin

- [ ] La API Key admin está almacenada en un gestor de secretos (no hardcodeada)
- [ ] El Service Account asociado tiene rol `r_admin` (no `r_superadmin` salvo que sea necesario)
- [ ] La clave tiene fecha de expiración configurada
- [ ] Se configuró rate limiting apropiado (30 rpm recomendado para admin)
- [ ] Los logs de `audit_logs` con source `mcp_admin` se revisan semanalmente
- [ ] No se comparte la clave admin con usuarios que solo necesitan scope `chat`

---

> 📖 **Anterior:** [05 — Mission Control](./05_mission_control.md)
> 📖 **Siguiente:** [07 — Integraciones y Webhooks](./07_integraciones_y_webhooks.md)

