# 02. Acciones HTTP y Formularios Dinámicos

> **Versión documentada:** v5.6.92 · **Última revisión:** 2026-05-27

> **Capítulo 2 del Manual Técnico.** Este capítulo cubre el motor más común del catálogo: la conexión con APIs externas. También cubre los Form Nodes, la técnica que reemplaza las conversaciones lentas por formularios de un solo turno.

---

## El Motor API HTTP: Conectar Senda con el Mundo

El 80% de las acciones empresariales se implementan con el motor **API HTTP**. Con este motor, Senda envía una solicitud a una URL externa y procesa la respuesta.

Para usar este motor no necesitás ser programador. Necesitás entender 4 conceptos simples:

| Concepto | Analogía | Ejemplo en Senda |
|---|---|---|
| **URL (Endpoint)** | La dirección postal donde enviás la carta | `https://empresa.atlassian.net/rest/api/3/issue` |
| **Método** | El tipo de operación | GET (pedir), POST (crear), PUT (modificar), DELETE (eliminar) |
| **Headers** | El sobre con el remitente y el sello de autenticación | `Authorization: Bearer {{TENANT_CREDS.jira_token}}` |
| **Body (Payload)** | El contenido de la carta, con los datos | `{"fields": {"summary": "{{titulo}}", "priority": "{{prioridad}}"}}` |

---

## Configurar una Acción HTTP: Paso a Paso

### Paso 1: Elegir el Método HTTP

| Método | ¿Qué hace? | ¿Cuándo usarlo? |
|---|---|---|
| **GET** | Pide datos al sistema externo | Consultar inventario, ver el estado de un ticket, obtener KPIs |
| **POST** | Crea algo nuevo en el sistema externo | Crear un ticket, registrar un cliente, enviar un email |
| **PUT** | Modifica algo existente | Actualizar la prioridad de un ticket, cambiar datos de un cliente |
| **PATCH** | Modifica parcialmente | Actualizar solo un campo de un registro |
| **DELETE** | Elimina algo | Cancelar una orden, borrar un registro (usar con Confirmación Humana obligatoria) |

### Paso 2: La URL del Endpoint

La URL es la dirección exacta del sistema externo. Tu equipo técnico o el proveedor del sistema (Jira, SAP, Salesforce) te proveerá estas URLs.

Ejemplos reales:
```
Jira — Crear ticket:
POST https://tuempresa.atlassian.net/rest/api/3/issue

Slack — Enviar mensaje a canal:
POST https://hooks.slack.com/services/T00000000/B00000000/XXXX

SAP OData — Consultar pedidos:
GET https://sap.empresa.com/sap/opu/odata/sap/SD_SO_SRV/SalesOrderSet?$top=10

API REST propia de la empresa:
GET https://api.tuempresa.com/v1/clientes/{{cliente_id}}/facturas
```

> **Tip:** Las URL pueden contener **variables de parámetro** con la sintaxis `{{nombre_param}}`. En el ejemplo de SAP, `{{cliente_id}}` será reemplazado automáticamente por el valor que el agente extrajo de la conversación.

> **Importante desde v5.6.87:** cuando una variable aparece en el path de la URL, por ejemplo `/clientes/{{cliente_id}}/facturas`, Senda la resuelve en el path y no la duplica como query param. Esto evita llamadas como `/clientes/123/facturas?cliente_id=123` y mantiene compatibilidad con APIs REST estrictas.

### Paso 3: Los Headers de Autenticación

Los Headers son metadatos que acompañan la solicitud. El más importante es el de autenticación. Existen tres patrones principales:

**Patrón 1: Bearer Token (el más común)**
```json
{
  "Authorization": "Bearer {{TENANT_CREDS.jira_api_token}}",
  "Content-Type": "application/json"
}
```
Usado por: Jira, GitHub, Salesforce, la mayoría de APIs modernas.

**Patrón 2: API Key en Header**
```json
{
  "X-API-Key": "{{TENANT_CREDS.mi_sistema_api_key}}",
  "Content-Type": "application/json"
}
```
Usado por: Muchos SaaS internos, APIs personalizadas de la empresa.

**Patrón 3: Autenticación Básica (Basic Auth)**
```json
{
  "Authorization": "Basic {{TENANT_CREDS.erp_basic_auth}}",
  "Content-Type": "application/json"
}
```
La credencial almacenada en la Bóveda debe ser el usuario:contraseña codificado en Base64. Tu equipo técnico puede generar ese string.

> **Regla de oro:** Siempre usá `{{TENANT_CREDS.nombre}}` o `{{USER_CREDS.nombre}}`. Nunca pegues el token real en el campo de headers.

### Paso 4: El Body Template (Plantilla del Cuerpo)

El Body es el cuerpo de la solicitud que enviamos al sistema externo. Se escribe en formato [JSON](00_glosario.md#glosario-json) con variables que Senda reemplaza dinámicamente.

**Ejemplo: Crear un ticket en Jira**

El sistema Jira espera recibir este [payload](00_glosario.md#glosario-payload):
```json
{
  "fields": {
    "project": { "key": "SUP" },
    "summary": "{{resumen_del_problema}}",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [{
        "type": "paragraph",
        "content": [{ "type": "text", "text": "{{descripcion_detallada}}" }]
      }]
    },
    "issuetype": { "name": "{{tipo_ticket}}" },
    "priority": { "name": "{{prioridad}}" },
    "assignee": { "accountId": "{{id_asignado}}" }
  }
}
```

Cuando el agente ejecuta la acción:
- `{{resumen_del_problema}}` → reemplazado por lo que el usuario escribió como asunto
- `{{prioridad}}` → reemplazado por "High", "Medium" o "Low" según el formulario
- `{{id_asignado}}` → reemplazado por el ID del usuario seleccionado

**¿De dónde salen los nombres exactos de los campos del Body?** Los provee la documentación oficial de la [API](00_glosario.md#glosario-api) del sistema externo (Jira, SAP, etc.). Tu equipo técnico o el soporte del proveedor puede ayudarte a construir el template la primera vez.

### Paso 5: Mapear la Respuesta

Cuando el sistema externo responde, Senda puede extraer datos específicos para:
- Mostrárselos al usuario ("Tu ticket INC-2847 fue creado")
- Pasarlos como entrada de la siguiente acción en un Pipeline
- Renderizarlos como Generative UI (gráficos, tablas)

El **Output Mapping** usa notación de punto para navegar el JSON de respuesta:

```
Respuesta de Jira:
{
  "id": "10234",
  "key": "INC-2847",
  "self": "https://empresa.atlassian.net/rest/api/3/issue/10234"
}

Mapeo:
ticket_id  → response.key        → "INC-2847"
ticket_url → response.self       → "https://..."
```

Con esto, el agente puede responder: "✅ Ticket **INC-2847** creado exitosamente."

### Paso 6: Escribir la Directiva de Respuesta

La **Directiva de Respuesta** controla cómo debe explicar el agente el resultado después de ejecutar la acción. Es distinta de la directiva de acción:

| Directiva | Momento | Pregunta que responde |
|---|---|---|
| **Directiva de Acción** | Antes de ejecutar | ¿Cuándo usar la acción y qué datos pedir? |
| **Directiva de Respuesta** | Después de ejecutar | ¿Cómo convertir el resultado técnico en una respuesta clara? |

Ejemplo:

```
Si la respuesta incluye `key`, mencionar el número de ticket al usuario.
Si incluye `self`, no mostrar la URL técnica completa salvo que el usuario la pida.
Si el payload trae campos internos de Jira, resumir solo estado, prioridad y asignado.
Si la acción falla, explicar el error en lenguaje de negocio y sugerir contactar soporte.
```

Usala especialmente cuando el proveedor devuelve JSON extenso, mensajes en inglés, códigos internos o datos que deben convertirse en una confirmación operativa.

---

## Recetas HTTP Listas para Usar

### Receta 1: Crear Ticket en Jira

```
Nombre: Crear Ticket de Soporte
Método: POST
URL: https://{{TENANT_CREDS.jira_domain}}.atlassian.net/rest/api/3/issue
Headers:
  Authorization: Basic {{TENANT_CREDS.jira_basic_auth}}
  Content-Type: application/json
Body:
  {
    "fields": {
      "project": {"key": "{{TENANT_CREDS.jira_project_key}}"},
      "summary": "{{titulo}}",
      "description": {
        "type": "doc", "version": 1,
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": "{{descripcion}}"}]}]
      },
      "issuetype": {"name": "Bug"},
      "priority": {"name": "{{prioridad}}"}
    }
  }
Threshold: 80 | Confirmación: Sí
```

### Receta 2: Enviar Mensaje a Slack

```
Nombre: Notificar Canal de Slack
Método: POST
URL: {{TENANT_CREDS.slack_webhook_url}}
Headers:
  Content-Type: application/json
Body:
  {
    "text": "🚨 *{{titulo_alerta}}*
{{mensaje_detalle}}",
    "username": "Senda Bot"
  }
Threshold: 85 | Confirmación: No
```

### Receta 3: Consultar KPIs para Dashboard

```
Nombre: KPIs de Ventas del Mes
Método: GET
URL: https://api.empresa.com/v1/kpis/ventas?periodo={{periodo}}
Headers:
  X-API-Key: {{TENANT_CREDS.empresa_api_key}}
Threshold: 70 | Confirmación: No
Render Type: KpiCardsWidget
```

### Receta 4: Actualizar Estado en CRM

```
Nombre: Actualizar Estado de Oportunidad
Método: PUT
URL: https://api.crm.com/v1/oportunidades/{{oportunidad_id}}
Headers:
  Authorization: Bearer {{TENANT_CREDS.crm_token}}
  Content-Type: application/json
Body:
  {
    "estado": "{{nuevo_estado}}",
    "notas": "{{notas_adicionales}}",
    "fecha_actualizacion": "{{fecha_hoy}}"
  }
Threshold: 88 | Confirmación: Sí
Acción Inversa: Revertir Estado de Oportunidad
```

---

## Form Nodes: Formularios Dinámicos en el Chat

### El Problema que Resuelven

Sin Form Node, recolectar 3 parámetros requiere 3 turnos de conversación:
```
Turno 1 — Usuario: "Quiero crear un ticket urgente"
Turno 2 — Agente: "¿Cuál es el asunto del ticket?"
Turno 3 — Usuario: "Error en el módulo de facturación"
Turno 4 — Agente: "¿Con qué prioridad?"
Turno 5 — Usuario: "Alta"
Turno 6 — Agente: "¿Hay alguna descripción adicional?"
Turno 7 — Usuario: "El sistema no genera PDFs desde ayer a las 15hs"
Turno 8 — Agente: "¿A quién lo asignamos?"
Turno 9 — Usuario: "A María González"
              ↓
[Ejecuta la acción]
→ 9 turnos para 4 parámetros. El usuario se cansa.
```

Con Form Node:
```ui-mockup
Turno 1 — Usuario: "Quiero crear un ticket urgente"

Turno 2 — Agente muestra formulario en el chat:
┌──────────────────────────────────────────────────────┐
│ 🎫 Crear Ticket de Soporte                           │
│                                                      │
│ Asunto *                                             │
│ [Error en el módulo de facturación_____________]     │
│                                                      │
│ Prioridad *                                          │
│ [P1 Urgente] [P2 Alta] [P3 Media] [P4 Baja]         │
│                                                      │
│ Asignar a *                                          │
│ [Buscar usuario del equipo...          ▼]            │
│                                                      │
│ Descripción                                          │
│ [El sistema no genera PDFs desde ayer__________]     │
│ [________________________________________]           │
│                                                      │
│ ☐ Notificar al cliente por email                     │
│                                                      │
│                      [Cancelar]  [Crear Ticket →]    │
└──────────────────────────────────────────────────────┘

→ 2 turnos. El usuario completa y ejecuta.
```

### Los 9 Tipos de Campo

| Tipo de Campo | Para qué sirve | Ejemplo visual |
|---|---|---|
| `text` | Texto corto (nombre, código, email) | Campo de texto libre de una línea |
| `textarea` | Texto largo (descripción, notas, comentarios) | Área de texto multilínea expandible |
| `number` | Número con validación de rango | Campo numérico con límites min/max |
| `select` | Lista desplegable con opciones predefinidas | Menú desplegable "Seleccionar departamento ▼" |
| `radio_pills` | Opciones visuales como botones clicables | [P1] [P2] [P3] donde solo uno puede estar activo |
| `checkbox` | Casilla de verificación Sí/No | ☐ Notificar al cliente automáticamente |
| `user_picker` | Buscador de usuarios del tenant actual | Buscador autocomplete con avatar de usuario |
| `date` | Selector de fecha en calendario | 📅 Selector visual de fecha |
| `date_time` | Selector de fecha y hora | 📅🕐 Selector de fecha + hora con minutos |

### Cómo Activar los Form Nodes

Los Form Nodes no se "activan" con un botón — se configuran a través de la **Directiva** de la acción. El [LLM](00_glosario.md#glosario-llm) lee la directiva y sabe que cuando el usuario quiere ejecutar esa acción, debe mostrar un formulario.

**Directiva de ejemplo para activar Form Node:**
```
Cuando el usuario quiera crear un ticket de soporte (independientemente de 
cómo lo pida: "crear ticket", "reportar problema", "quiero abrir un caso"), 
utiliza el form_node 'crear_ticket_soporte' para recolectar toda la información 
en un formulario. 

NUNCA hagas preguntas individuales sobre el asunto, prioridad o asignado. 
SIEMPRE muestra el formulario directamente.

Si el usuario ya mencionó la prioridad en su mensaje inicial (ej: "urgente", 
"crítico"), pre-seleccioná P1 en el campo de prioridad del formulario.
```

### Configuración del Form Node en la Acción

En la sección de parámetros de la acción, cada parámetro puede tener asociado un tipo de campo de formulario:

```
Parámetro: titulo
  Tipo de campo: text
  Placeholder: "Ej: Error en módulo de facturación"
  Requerido: Sí
  
Parámetro: prioridad  
  Tipo de campo: radio_pills
  Opciones: ["P1 Urgente", "P2 Alta", "P3 Media", "P4 Baja"]
  Valores: ["P1", "P2", "P3", "P4"]
  Requerido: Sí
  
Parámetro: asignado_id
  Tipo de campo: user_picker
  Placeholder: "Buscar usuario del equipo"
  Requerido: Sí
  
Parámetro: descripcion
  Tipo de campo: textarea
  Placeholder: "Describí el problema con el mayor detalle posible"
  Requerido: No
  
Parámetro: notificar_cliente
  Tipo de campo: checkbox
  Etiqueta: "Notificar al cliente automáticamente por email"
  Valor por defecto: false
```

### Casos de Uso Avanzados con Form Nodes

**Formulario de solicitud de licencia (RRHH):**
```
Tipo de licencia: select (Vacaciones / Médica / Personal / Estudio)
Fecha de inicio: date
Fecha de fin: date
Responsable interino: user_picker
Descripción: textarea
¿Requiere documentación?: checkbox
```

**Formulario de registro de incidente de campo:**
```
Ubicación: text (requerido)
Tipo de incidente: radio_pills (Fuga / Corte / Falla técnica)
Nivel de gravedad: radio_pills (Alta / Media / Baja)
Equipos involucrados: select (multiple)
Descripción: textarea
Hora del incidente: date_time
```

**Formulario de aprobación de presupuesto:**
```
Centro de costo: select (lista de centros del tenant)
Monto solicitado: number (max: 500000)
Moneda: radio_pills (ARS / USD / EUR)
Proveedor: text
Descripción del gasto: textarea
Fecha requerida: date
¿Tiene cotizaciones adjuntas?: checkbox
```

---

## Depurar una Acción HTTP

Cuando una acción no funciona como esperás, seguí este flujo de diagnóstico:

```
1. ¿La acción se está detectando?
   → Activar Modo Prueba en el agente y buscar si el agente
     intenta ejecutar la acción en los logs de debug

2. ¿El threshold está bien calibrado?
   → Si el agente no dispara la acción, bajar el threshold 5 puntos
     y probar de nuevo

3. ¿La URL es correcta?
   → Copiar la URL y pegarla en el navegador (si es GET)
     o usar una herramienta como Postman con tus credenciales

4. ¿Las credenciales están bien configuradas en la Bóveda?
   → Verificar en Configuración → Integraciones → Credenciales
     que el nombre de la clave coincide exactamente con lo que
     pusiste en el header (sensible a mayúsculas/minúsculas)

5. ¿El Body tiene el formato correcto?
   → Pedile al equipo técnico que valide el Body template
     contra la documentación oficial de la API

6. ¿El sistema externo devuelve error?
   → En Mission Control → Historial encontrás el detalle del
     error devuelto por el sistema externo
```

---

## Checklist del Capítulo

- [ ] ¿La URL del endpoint es correcta y los path params se resuelven sin duplicación?
- [ ] ¿Los headers usan `{{TENANT_CREDS.*}}` o `{{USER_CREDS.*}}`? (nunca tokens hardcodeados)
- [ ] ¿El Body template tiene la estructura exacta que espera la API externa?
- [ ] ¿El Output Mapping extrae los campos necesarios para la directiva de respuesta?
- [ ] ¿La directiva de respuesta traduce el resultado técnico a lenguaje del usuario?
- [ ] ¿Los Form Nodes están configurados para recolectar datos en un solo turno?
- [ ] ¿Se probó la acción con el flujo de diagnóstico de 6 pasos?
- [ ] ¿Las acciones POST/PUT/DELETE tienen confirmación humana activa?

---

> 📖 **Anterior:** [01 — Acciones: Conceptos y Tipos](./01_acciones_conceptos_y_tipos.md)  
> 📖 **Siguiente:** [03 — Fórmulas, Pipelines y UI Generativa](./03_formulas_pipelines_y_ui.md)
