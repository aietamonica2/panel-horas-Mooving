# 01. Acciones: Conceptos y Tipos

> **Versión documentada:** v5.6.92 · **Última revisión:** 2026-05-27

> **Capítulo 1 del Manual Técnico.** Este capítulo cubre los fundamentos: qué es el catálogo, cómo se organiza, y todos los conceptos que necesitás dominar antes de crear tu primera acción.

---

## ¿Qué es el Catálogo de Acciones?

En Senda, los agentes no solo responden preguntas — **ejecutan operaciones sobre sistemas reales**. El mecanismo que hace eso posible se llama **Acción**. El conjunto de todas las acciones disponibles para un tenant se llama **Catálogo de Acciones**.

Pensá en el Catálogo como el **panel de herramientas de un carpintero profesional**: tiene martillos, sierras, destornilladores y taladros. El agente (el carpintero) sabe qué herramienta usar según la tarea. Vos, como Implementador, sos quien llena ese panel de herramientas.

Una Acción puede:
- Crear un ticket en Jira con los datos de la conversación
- Consultar el inventario en SAP y mostrar un gráfico de barras
- Calcular el precio de un préstamo con IVA y descuentos
- Encadenar tres pasos: buscar cliente → generar cotización → enviar por email
- Ejecutarse automáticamente todos los lunes sin que nadie escriba nada

---

## Acceder al Catálogo

Desde el menú lateral de Senda: **Configuración → Acciones**.

La pantalla muestra:
- Una barra de búsqueda para filtrar por nombre
- Filtros por carpeta, tipo y tags
- El botón **✨ Crear con IA** y **+ Nueva Acción**
- El botón **📤 Exportar** y **📥 Importar** para gestión masiva
- Una grilla de tarjetas con todas las acciones del tenant

---

## Organización: Carpetas y Tags

### Carpetas
Las acciones se organizan en carpetas temáticas. Esto es especialmente importante cuando el catálogo crece (tenants avanzados pueden tener 30, 50 o más acciones).

Ejemplos de estructura de carpetas bien organizada:

```
📁 Soporte IT
   ├── Crear Ticket Jira
   ├── Escalar Ticket a Nivel 2
   └── Consultar Estado de Ticket

📁 Finanzas
   ├── Calcular Cotización con IVA
   ├── Consultar Deuda del Cliente
   └── Emitir Nota de Crédito

📁 RRHH
   ├── Registrar Solicitud de Licencia
   └── Consultar Saldo de Vacaciones

📁 Reportes (Generative UI)
   ├── KPIs de Ventas del Mes
   ├── Dashboard de Inventario Crítico
   └── Reporte Ejecutivo Semanal
```

> **Regla de oro:** Nunca pongas más de 8–10 acciones en la misma carpeta. Si tenés más, dividí en subcategorías. Un catálogo desorganizado hace que el agente tenga dificultades para elegir la herramienta correcta.

### Tags
Los tags son etiquetas libres para categorización cruzada. Una acción puede pertenecer a la carpeta "Finanzas" y tener los tags `#facturación`, `#cliente-externo`, `#requiere-aprobación`. Usá tags para:
- Marcar acciones en revisión (`#borrador`)
- Identificar el tipo de output (`#genera-pdf`, `#notificacion-slack`)
- Indicar nivel de riesgo (`#critica`, `#destructiva`)

---

## Importar y Exportar el Catálogo

### ¿Para qué sirve?

El sistema de importación/exportación permite:
1. **Clonar configuraciones entre tenants**: Si configuraste un catálogo perfecto para Cliente A, podés exportarlo y adaptarlo para Cliente B.
2. **Backup del catálogo**: Antes de una refactorización masiva, exportá el estado actual.
3. **Trabajo en equipo offline**: Un implementador configura las acciones en un archivo JSON y otro las importa.
4. **Templates de acción propietarios**: Si tu empresa tiene un conjunto de acciones estándar para todas las implementaciones, mantené un archivo de importación maestro.

### Cómo exportar

Desde la pantalla del catálogo:
1. Click en **📤 Exportar**
2. Elegí si exportás todo el catálogo o solo una carpeta específica
3. Senda genera un archivo JSON con toda la configuración

El archivo exportado incluye: nombre, descripción, tipo de ejecución, parámetros, threshold, configuración de confirmación humana, directiva, tags, carpeta, y el tipo de Generative UI (si aplica). **No incluye credenciales** por seguridad.

### Cómo importar

1. Click en **📥 Importar**
2. Subí el archivo JSON exportado
3. Senda muestra una vista previa de las acciones a importar
4. Elegís si sobreescribir acciones existentes o importar solo las nuevas
5. Confirmás la importación

> **Importante sobre las credenciales:** Al importar un catálogo de otro tenant, las referencias a credenciales (`{{TENANT_CREDS.jira_token}}`) se mantienen en el texto, pero deberás registrar esas credenciales en la Bóveda del nuevo tenant para que las acciones funcionen.

---

## La Bóveda de Credenciales

Cuando una acción necesita conectarse a un sistema externo (Jira, SAP, Slack, WhatsApp), necesita una contraseña o token de acceso. La **Bóveda de Credenciales** es el sistema seguro donde Senda guarda esas "llaves".

**Regla crítica: Nunca escribas una contraseña directamente en la configuración de una acción.** Si lo hacés, cualquiera que vea la acción puede ver la contraseña. Usá siempre la Bóveda.

### Tipos de credenciales

| Tipo | ¿De quién es? | ¿Cuándo usarlo? | Sintaxis en la acción |
|---|---|---|---|
| **Empresa (Tenant)** | Del tenant. Todos los usuarios comparten la misma clave. | APIs corporativas (Jira, SAP, Slack institucional) | `{{TENANT_CREDS.nombre_clave}}` |
| **Usuario** | De cada usuario individualmente. Cada uno guarda su propia clave. | OAuth personal (Google Calendar, Outlook, Drive) | `{{USER_CREDS.nombre_clave}}` |

### Cómo registrar una credencial

En el menú de Senda: **Configuración → Integraciones → Credenciales**:
1. Click en **+ Nueva Credencial**
2. Asignar un nombre clave (ej: `jira_api_token`)
3. Pegar el valor secreto
4. Elegir tipo (Empresa o Usuario)
5. Guardar

Desde ese momento, en cualquier Header de una acción podés escribir:
```
Authorization: Bearer {{TENANT_CREDS.jira_api_token}}
```
Y Senda reemplazará automáticamente `{{TENANT_CREDS.jira_api_token}}` con el token real en el momento de ejecutar la acción.

---

## Anatomía Completa de una Acción

Antes de configurar cualquier motor, es fundamental entender todos los campos de una acción y su función:

### Sección: Identidad

| Campo | Función | Ejemplo |
|---|---|---|
| **Nombre** | Nombre técnico de la acción. El agente lo menciona en sus logs. | `Crear Ticket Soporte Jira` |
| **Descripción** | **El campo más importante.** El [LLM](00_glosario.md#glosario-llm) que opera el agente lee esto para decidir cuándo usar la acción. Debe ser clara, específica y mencionar los verbos que el usuario diría. | `Crea un ticket de soporte técnico en Jira cuando el usuario reporta un problema que no se puede resolver en el chat. No usar si solo hace preguntas.` |
| **Carpeta** | A qué categoría pertenece | `Soporte IT` |
| **Tags** | Etiquetas libres | `#jira`, `#crear`, `#requiere-confirmacion` |
| **Activa** | Si la acción está disponible para los agentes del tenant | Sí / No |

### Sección: Motor

Aquí elegís el tipo de ejecución: `API HTTP`, `Fórmula`, `Pipeline`, `Script`, `MCP`. Cada tipo tiene su propia sub-sección de configuración (ver capítulos 02 y 03).

### Sección: Parámetros

Define qué información necesita recolectar el agente antes de ejecutar la acción. Para cada parámetro:

| Sub-campo | Función |
|---|---|
| **Nombre** | Identificador interno (ej: `priority`, `description`) |
| **Descripción** | Explicación para el agente de qué dato recolectar |
| **Requerido** | Si el agente no puede ejecutar sin este dato |
| **Tipo** | `string`, `number`, `boolean`, `date` |

### Sección: Comportamiento

| Campo | Función | Cuándo configurar |
|---|---|---|
| **Threshold (Umbral)** | Certeza mínima (0–100) del [LLM](00_glosario.md#glosario-llm) para activar la acción. Debajo de este umbral, el agente solo conversa. | Siempre. Valor recomendado: 70 para lectura, 80 estándar, 90+ para acciones destructivas. |
| **Confirmación Humana** | Si el agente debe mostrar un resumen y pedir "¿Procedo?" antes de ejecutar. | Siempre que la acción cree, modifique o elimine datos externos. |
| **Directiva** | Instrucciones específicas para el agente sobre cómo usar esta acción. Se inyectan en su contexto de razonamiento. | Cuando necesitás comportamiento específico: usar Form Nodes, secuencia de pasos previa, excepciones. |
| **Directiva de Respuesta** | Instrucciones para transformar el resultado técnico de la acción en una respuesta útil para el usuario. Se aplica después de ejecutar la acción. | Cuando la API devuelve payloads largos, nombres técnicos, datos parciales o mensajes que deben traducirse a lenguaje de negocio. |

### Sección: Avanzado

| Campo | Función |
|---|---|
| **Acción Inversa** | Qué acción del catálogo ejecutar para revertir esta. Habilita el botón "↩ Revertir" en Mission Control. |
| **Ventana de Reversión** | Cuántas horas después de ejecutar está disponible el rollback (default: 24h). |
| **Render Type** | Tipo de widget de Generative UI para renderizar el resultado visualmente. |

---

## El Umbral (Threshold) en Profundidad

Esta es la palanca de control más importante y más malentendida del catálogo. El Threshold determina cuándo el agente actúa vs. cuándo solo conversa.

```
EJEMPLO PRÁCTICO:
Acción: "Crear Ticket Jira" (Threshold: 80)

Usuario: "Quiero crear un ticket"           → Certeza: 95 → ✅ Ejecuta (muestra form)
Usuario: "Tengo un problema con SAP"        → Certeza: 75 → ❌ Solo conversa, investiga más
Usuario: "¿Cómo creo un ticket?"            → Certeza: 40 → ❌ Explica el proceso, no ejecuta
Usuario: "Mi SAP no funciona, necesito ayuda" → Certeza: 82 → ✅ Ejecuta (threshold superado)
```

**Guía de calibración:**

| Tipo de Acción | Threshold Recomendado | Razonamiento |
|---|---|---|
| Consultas de solo lectura (GET datos, ver inventario) | 65–70 | Bajo riesgo, es mejor ejecutar ante la duda |
| Acciones estándar (crear ticket, enviar notificación) | 78–82 | Balance entre utilidad y seguridad |
| Modificar datos existentes (actualizar cliente en CRM) | 85–90 | Alto riesgo, mejor ser conservador |
| Acciones destructivas (eliminar, emitir pago, cancelar orden) | 92–95 | Máxima seguridad, solo ante pedido explícito |

> **Error clásico #1:** Poner threshold de 60 en todas las acciones "para que funcione mejor". Resultado: el agente ejecuta acciones críticas ante la menor insinuación del usuario.

> **Error clásico #2:** Poner threshold de 95 en acciones de consulta. Resultado: el agente nunca ejecuta dashboards ni reportes porque el usuario raramente es 100% explícito.

---

## La Confirmación Humana (Human-in-the-Loop)

Cuando está activa, antes de ejecutar la acción el agente muestra al usuario un resumen de los parámetros recolectados y pide confirmación:

```
[SIN Confirmación Humana]
Usuario: "Crear un ticket urgente sobre el fallo del SAP"
Agente: "✅ Ticket INC-2847 creado y asignado al equipo de SAP."

[CON Confirmación Humana]
Usuario: "Crear un ticket urgente sobre el fallo del SAP"
Agente: "Voy a crear el siguiente ticket:
         • Asunto: Fallo en módulo SAP FI/CO
         • Prioridad: Urgente (P1)
         • Asignado: Equipo de SAP
         • Descripción: [descripción recolectada de la conversación]
         ¿Confirmo la creación?"
Usuario: "Sí"
Agente: "✅ Ticket INC-2847 creado."
```

**Regla simple:** Si la acción hace algo irreversible o costoso, activá la confirmación. Si solo lee datos, no es necesaria.

---

## La Directiva: El Cerebro de la Acción

La directiva es un bloque de texto que se inyecta directamente en el razonamiento del [LLM](00_glosario.md#glosario-llm) cuando decide usar esta acción. Es tu oportunidad de darle instrucciones muy específicas que no entran en el System Prompt general del agente.

### Ejemplos de directivas efectivas

**Para una acción de creación con Form Node:**
```
Cuando el usuario quiera crear un ticket de soporte, usa el form_node 
'crear_ticket_soporte' para recopilar prioridad, asignado y descripción 
en un solo formulario. Nunca preguntes los campos uno a uno en la conversación. 
Si el usuario no menciona la prioridad, sugiere P2 como valor por defecto.
```

**Para una acción de consulta de datos:**
```
Antes de ejecutar esta acción, verifica que el usuario haya especificado 
un período de tiempo (este mes, esta semana, etc.). Si no lo especificó, 
pregunta "¿Para qué período de tiempo?" antes de ejecutar.
```

**Para una acción crítica con validaciones previas:**
```
Esta acción emite un pago en el sistema financiero. Antes de ejecutar:
1. Confirma el monto con el usuario ("¿El monto a pagar es $X?")
2. Confirma el beneficiario ("¿Estoy pagando a [Proveedor Y]?")
3. Solo ejecuta si el usuario confirma ambos datos explícitamente.
Nunca asumas datos financieros — siempre verificalos antes.
```

---

## Acciones en la Barra de Espacio (Space Tools)

Las acciones del catálogo pueden exponerse como **botones de ejecución directa** o **chips de sugerencia conversacional** dentro de un espacio, transformando el chat en un centro de trabajo interactivo sin que el usuario necesite escribir.

### Modelo de Datos Completo

La tabla `space_tools` almacena las herramientas configuradas por espacio (migración `0079`):

| Campo | Tipo | Default | Función |
|-------|------|---------|---------|
| `id` | TEXT PK | `st_` + hex(8) | Identificador único auto-generado |
| `tenant_id` | TEXT NOT NULL | — | Aislamiento multi-tenant obligatorio |
| `space_id` | TEXT NOT NULL | — | FK → `agent_groups(id)` ON DELETE CASCADE |
| `tool_type` | TEXT | `'action'` | `'action'` = botón de ejecución · `'intent'` = chip de sugerencia |
| `display_label` | TEXT NOT NULL | — | Texto visible del botón/chip (ej: "🎫 Nuevo Ticket") |
| `icon` | TEXT | NULL | Emoji o nombre de ícono opcional |
| `button_style` | TEXT | `'default'` | `'default'` · `'primary'` · `'danger'` · `'ghost'` |
| `position` | INTEGER | `0` | Orden de aparición (0 = primero) |
| `action_id` | TEXT | NULL | FK → `action_catalog(id)` ON DELETE SET NULL. Solo si `tool_type = 'action'` |
| `interaction` | TEXT | `'direct'` | `'direct'` = ejecuta sin LLM · `'form'` = muestra Form Node · `'prompt'` = inyecta texto |
| `intent_prompt` | TEXT | NULL | Solo si `tool_type = 'intent'`. Texto enviado como mensaje |
| `intent_category` | TEXT | `'general'` | Categoría semántica del intent (ver tabla abajo) |
| `prompt_text` | TEXT | NULL | Texto de prompt para modo `interaction = 'prompt'` |
| `confirm_before` | INTEGER | `0` | Si `1`, muestra modal de confirmación antes de ejecutar |
| `confirm_text` | TEXT | NULL | Texto personalizado del modal de confirmación |
| `context_conditions` | TEXT | NULL | JSON con reglas de visibilidad condicional (ver abajo) |
| `is_active` | INTEGER | `1` | `1` = visible · `0` = oculto |
| `created_at` / `updated_at` | DATETIME | CURRENT_TIMESTAMP | Timestamps de auditoría |

**Índices:**
- `idx_space_tools_lookup` → `(tenant_id, space_id, tool_type, is_active)` — para listar tools activos
- `idx_space_tools_position` → `(space_id, position)` — para ordenar la barra

### Categorías de Intent

| `intent_category` | Semántica | Uso típico | Color sugerido |
|---|---|---|---|
| `general` | Consulta abierta al agente | "💡 ¿Qué puedo hacer?" | Neutral |
| `quick_query` | Pregunta de respuesta inmediata | "📊 KPIs del mes" | Info/azul |
| `workflow` | Flujo guiado multi-paso (Intent Graph v2) | "🏢 Mi primer día" | Primario/violeta |
| `data_request` | Recopilación de datos con formulario | "📋 Formulario de alta" | Warning/naranja |

### Flujo de Ejecución

**Acción directa** (bypasea el LLM):
```
Click → POST /api/groups/:id/tools/:toolId/execute → executeAction(action_id) → resultado
```

**Acción con formulario** (Form Node antes de ejecutar):
```
Click → GET form fields → usuario completa → POST execute con params → resultado
```

**Sugerencia** (pasa por el LLM):
```
Click → sendMessage(intent_prompt) → pipeline normal (router → agente → RAG → acciones)
```

### API Endpoints

| Endpoint | Método | Auth | Función |
|----------|--------|------|---------|
| `/api/groups/:id/tools` | GET | Cualquier usuario | Lista herramientas activas (con datos del catálogo vía JOIN) |
| `/api/groups/:id/tools` | POST | Admin | Upsert batch (máx. 10 por espacio, valida `action_ids`) |
| `/api/groups/:id/tools/:toolId` | DELETE | Admin | Elimina una herramienta |
| `/api/groups/:id/tools/:toolId/execute` | POST | Cualquier usuario | Ejecuta acción directa (con rate limiting) |

### Context Conditions (Futuro)

El campo `context_conditions` almacena un JSON con reglas de visibilidad condicional. Actualmente se persiste pero **no se evalúa** en runtime. El schema esperado es:

```json
{
  "rules": [
    { "field": "user.role", "op": "in", "value": ["r_admin", "r_tenant_owner"] },
    { "field": "time.hour", "op": "gte", "value": 9 },
    { "field": "time.hour", "op": "lte", "value": 18 }
  ],
  "logic": "AND"
}
```

Cuando se active, permitirá mostrar tools solo a ciertos roles, en ciertos horarios o según variables de estado.



### Guía de Diseño de Space Tools

| Criterio | Recomendación |
|----------|--------------|
| **Cantidad máxima** | 10 por espacio (limit en backend). Ideal: 5-7 |
| **Naming** | Verbo + sustantivo: "Crear Ticket", "Ver KPIs", no solo "Ticket" |
| **Iconos** | Emoji consistente por dominio: 🎫 soporte, 📊 reportes, ⚡ acciones rápidas |
| **Orden** | Los más usados primero (position = 0). Acciones peligrosas al final |
| **Confirmación** | `confirm_before = 1` para acciones que crean, modifican o eliminan datos |
| **Estilo** | `primary` para la acción principal del espacio, `danger` para eliminación |

> ⚠️ **Diferencia clave con agent_actions**: Las acciones vinculadas a agentes (`agent_actions`) son usadas por el LLM durante el pipeline conversacional. Las Space Tools de tipo `action` + `direct` ejecutan la acción **sin involucrar al LLM**. Si una sugerencia (intent) necesita que el agente ejecute una acción, esa acción sí debe estar vinculada al agente via `agent_actions`.

---

## Checklist: Antes de Publicar una Acción

Antes de activar cualquier acción en el catálogo y vincularla a un agente, completá este checklist:

- [ ] **Nombre claro**: Refleja exactamente qué hace la acción
- [ ] **Descripción semántica**: Describe cuándo usar Y cuándo NO usar la acción. El LLM la lee.
- [ ] **Carpeta correcta**: Está organizada dentro de una carpeta temática
- [ ] **Threshold calibrado**: Ajustado al nivel de riesgo de la operación
- [ ] **Confirmación humana**: Activa si la acción crea, modifica o elimina datos
- [ ] **Directiva definida**: Instrucciones específicas de comportamiento (Form Node, validaciones)
- [ ] **Credenciales en la Bóveda**: No hay contraseñas hardcodeadas en headers
- [ ] **Acción inversa configurada**: Para acciones de alto impacto (habilita rollback)
- [ ] **Probada**: Ejecutada al menos una vez exitosamente antes de asignarla a un agente en producción

---

> 📖 **Anterior:** [00 — Glosario Técnico](./00_glosario.md)
> 📖 **Siguiente:** [02 — Acciones HTTP y Formularios](./02_acciones_http_y_formularios.md)
