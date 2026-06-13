# Configurar Espacios y Agentes

> **Versión documentada:** v5.20.13 · **Última revisión:** 2026-05-29

> 📖 **Anterior:** [02 — Las Capacidades de Senda y la Cadena de Pensamiento](./09_capacidades_y_cadena_de_pensamiento.md)

---

## La Unidad Base: El Espacio

Un **Espacio** es un departamento virtual dentro del tenant. Tiene su propia identidad visual, mensajes de bienvenida y equipo de agentes especializados. Los usuarios acceden a un espacio — no a «Senda» directamente — y por eso el espacio es lo que perciben como el producto.

### Atributos de un Espacio

| Campo | ¿Qué es? | Impacto |
|---|---|---|
| **Código** | Identificador interno (`soporte-it`) | Se usa en URLs y APIs |
| **Título** | Nombre visible al usuario | Aparece en el encabezado del chat |
| **Subtítulo** | Tagline del espacio | Refuerza la identidad y tono |
| **Mensaje de Bienvenida** | Primer contacto del usuario | Define la primera impresión |
| **Tema Visual** | Paleta de colores | Cambia toda la estética del chat |
| **URL Pública** | Token de acceso sin login | Permite que usuarios externos accedan directamente |

### Temas Visuales Disponibles

| Tema | Mejor para |
|---|---|
| **Índigo — Nebulosa** | Tecnología, soporte corporativo, SaaS |
| **Océano — Azul** | Finanzas, institucional, confianza |
| **Monolito — Gris** | Legal, consultoría, minimalista premium |
| **Esmeralda — Bosque** | Salud, sostenibilidad, RRHH |
| **Amatista — Violeta** | Creatividad, innovación, marketing |

> 💡 **Tip**: Asigná un tema diferente por espacio. Cuando el usuario cambia de espacio, el cambio visual le indica que está en otra área — sin leer ningún texto.

---

## Los Agentes: Especialistas Virtuales

Cada agente dentro de un espacio tiene sus propias instrucciones, documentos, herramientas y métricas de rendimiento. Son completamente independientes entre sí — lo que sabe uno, los otros no lo saben.

### Tipos de Agente

| Tipo | Rol | Cuántos por espacio | ¿Atiende directamente? |
|---|---|---|---|
| **Agente Principal** | El «router». Lee cada mensaje y decide a qué especialista derivar. | Exactamente 1 | Solo en consultas triviales (saludos, preguntas generales) |
| **Sub-Agente** | Un especialista en un tema concreto. Responde solo cuando el Principal lo selecciona. | 1 o más | Sí, cuando el Principal lo elige |

### Atributos de un Agente

| Campo | ¿Qué es? | Crítico? |
|---|---|---|
| **Nombre** | Nombre visible del agente | — |
| **System Prompt** | Instrucciones completas: personalidad, tono, reglas, comportamiento | 🔴 Sí |
| **Resumen de Responsabilidades** | Texto corto que el Principal lee para decidir cuándo derivar | 🔴 Sí — es el cerebro del routing |
| **Es Principal** | Si actúa como router del espacio | 🔴 Sí |
| **Modo Prueba** | Muestra tarjetas de debug en el chat | 🟡 Durante configuración |
| **Prompt de Aprendizaje** | Cómo extraer insights individuales de cada conversación (El Extractor) | 🟡 Para mejora continua |
| **Prompt de Efectividad** | Cómo evaluar la calidad de las respuestas | 🟡 Para métricas |
| **Prompt de Etiquetado** | Cómo categorizar las conversaciones automáticamente | 🟡 Para análisis |

> 💡 **Nota**: Además del Prompt de Aprendizaje de cada Agente, el **Espacio** también tiene su propio Prompt de Aprendizaje (El Compilador) que define cómo redactar el documento maestro consolidado. Los dos trabajan en equipo: el del Agente extrae insights sueltos, el del Espacio los compila en un manual. Ver [Dominar los Prompts — Arquitectura de 2 Niveles](./03_dominar_los_prompts.md).

---

## Diseñar la Arquitectura de un Espacio

### Paso 1: Identificar los Dominios

Preguntate: **«¿Cuáles son las áreas que este espacio cubre?»**

```
Ejemplo — «Soporte de Aplicaciones»:
├── SAP (finanzas, materiales, ventas)
├── Salesforce (CRM)
├── AG (sistema legacy)
└── Consultas generales
```

Cada dominio con documentación propia → merece su propio sub-agente.

### Paso 2: Crear un Sub-Agente por Dominio

```
Espacio: Soporte de Aplicaciones
├── 🧠 Agente Principal (router)          isPrimary = true
├── 🔧 Especialista Salesforce            Docs: Manual Salesforce
├── 📊 Especialista SAP                   Docs: Guía SAP, FAQ errores
└── 📋 Especialista AG                    Docs: Manual AG
```

**La regla de oro**: si un tema tiene su propio manual o genera consultas recurrentes diferenciadas, merece su propio agente.

### Paso 3: El Resumen de Responsabilidades — Lo más importante

Este campo es **el sistema nervioso del routing**. Es lo único que el Agente Principal lee para decidir a quién derivar. Un resumen vacío o genérico rompe todo el sistema.

#### ❌ Resúmenes que no funcionan

| Resumen | Por qué falla |
|---|---|
| «Ingresá las responsabilidades del agente» | El router no puede derivar a algo sin descripción |
| «Ayuda con cosas de la empresa» | Todos los agentes ayudan con «cosas». No diferencia. |
| «Soporte» | ¿Soporte de qué? ¿Impresoras? ¿SAP? ¿Facturación? |

#### ✅ Resúmenes que funcionan

| Agente | Resumen bien escrito |
|---|---|
| Especialista SAP | «Especialista en el sistema SAP. Resuelve consultas sobre módulos FI/CO (finanzas), MM (materiales), SD (ventas), transacciones y errores de SAP. No maneja otros sistemas.» |
| Especialista Salesforce | «Especialista en el CRM Salesforce. Cubre gestión de clientes, pipeline de ventas, configuración de campos, reportes y mensajes de error de la plataforma. Solo para Salesforce.» |
| Agente de Facturación | «Especialista en consultas de facturación: facturas, notas de crédito, estados de cuenta, pagos, y descuentos. No gestiona pedidos ni logística.» |

> ⚠️ **Regla inquebrantable**: Si el router elige siempre al Principal o al agente incorrecto, el 90% de las veces el problema está en los resúmenes. Es lo primero que revisás.

### Paso 4: El System Prompt del Agente Principal

El Principal no necesita saber mucho — su trabajo es derivar bien, no resolver casos complejos:

```
Sos el asistente principal de [NOMBRE EMPRESA].
Tu rol es:
1. Saludar de manera cálida y profesional
2. Responder preguntas generales de la empresa
3. Si la consulta es específica, indicar que la derivás al especialista correcto

No respondas consultas técnicas — las especialistas lo harán mejor.
Si el mensaje es muy ambiguo, pedí una aclaración breve antes de derivar.
```

### Paso 5: El System Prompt de los Sub-Agentes

Los sub-agentes necesitan prompts más completos porque son los que realmente resuelven:

```
SECCIÓN 1: Rol y objetivo
  Sos [nombre], especialista en [área]. Tu objetivo es [resultado concreto].

SECCIÓN 2: Protocolo de atención
  Cómo recibir la consulta, qué preguntas hacer, cómo buscar en documentación.

SECCIÓN 3: Reglas críticas
  Qué podés y qué NO podés hacer (nunca inventar, cuándo escalar, cómo manejar frustraciones).

SECCIÓN 4: Tono y estilo
  Cómo hablar con el usuario (tuteo vs. formalidad, extensión de respuestas, uso de emojis).

SECCIÓN 5: Escalamiento
  Cuándo y cómo transferir a un humano o generar un ticket.
```

---

## El Intent Graph: De Chat a Aplicación

Cuando el agente detecta que el usuario quiere **hacer algo** (no solo preguntar), puede responder con el **Intent Graph**: un conjunto de botones de acción visuales directamente en el chat.

```ui-mockup
┌─────────────────────────────────────────────────────┐
│ 📋 Buscar solución en documentación                 │
│ 🎫 Crear ticket de soporte                          │
│ 👤 Escalar a técnico disponible                     │
└─────────────────────────────────────────────────────┘
```

### ¿Cuándo usar Intent Graph vs. conversación libre?

| Situación | Mejor opción | Por qué |
|-----------|-------------|---------|
| El usuario necesita elegir entre opciones claras | **Intent Graph** | Reduce ambigüedad y acelera la resolución |
| El proceso tiene pasos fijos (crear ticket, solicitar vacaciones) | **Intent Graph con Form Nodes** | Recolecta datos en 1 turno en vez de 4-6 |
| La consulta es abierta y exploratoria | **Conversación libre** | El agente necesita investigar antes de actuar |
| Hay un flujo multi-paso con decisiones intermedias | **Intent Graph v2 (chained)** | Wizards completos sin roundtrips al LLM |

### Tres tipos de nodo

1. **Action Node** — Un botón que ejecuta una acción del catálogo al hacer clic. Soporta 5 variantes visuales (primary, success, warning, danger, neutral).
2. **Form Node** — Un formulario completo dentro del chat con **9 tipos de campo**: text, textarea, number, select, radio_pills, checkbox, user_picker, date, date_time. Un formulario en el chat → 1 turno en lugar de 4-6 preguntas consecutivas.
3. **Prompt Node** — Inyecta texto en el chat como si el usuario lo hubiera escrito. Útil para redirigir la conversación.

```ui-mockup
🎫 Crear ticket de soporte → Form Node:
┌─────────────────────────────────────────────────────┐
│ Prioridad:  [P1 - Crítico] [P2 - Normal] [P3 - Bajo]│
│ Asignar a:  [Buscar usuario...                  ▼]  │
│ Descripción:[                                    ]  │
│ ☐ Notificar al usuario por email                    │
│                              [Crear ticket →]       │
└─────────────────────────────────────────────────────┘
```

### Intent Graph v2: Flujos encadenados (sin LLM)

La versión 2 del Intent Graph habilita **grafos anidados recursivos**. Cuando una acción ejecutada desde un nodo devuelve una respuesta con un nuevo Intent Graph, este se renderiza inline debajo del anterior — creando un wizard multi-paso completo **sin necesidad de que el LLM intervenga en cada paso**.

```
Paso 1: Intent Graph → Usuario elige "Solicitar Vacaciones"
   └── Form Node recolecta fechas y tipo
       └── Acción ejecuta → Respuesta incluye nuevo Intent Graph
           └── Paso 2: "¿Deseas notificar a tu líder?" [Sí] [No]
               └── Paso 3: Confirmación final con resumen
```

> 🚀 **Potencial:** Un Intent Graph encadenado puede reemplazar un formulario web completo. El usuario nunca sale del chat y el flujo se resuelve en segundos.

---

## Herramientas del Espacio (Space Tools) — El Centro de Trabajo Conversacional



### El Paradigma: De Chat a Aplicación

Space Tools es una de las funcionalidades más diferenciadoras de Senda. Combinadas con el Intent Graph y las Acciones, transforman un espacio de chat en un **centro de trabajo interactivo** — donde el usuario no necesita saber qué escribir, sino que encuentra botones y accesos rápidos para resolver sus tareas más frecuentes.

> 🔑 **Concepto clave — El Triángulo de Poder:**
>
> Senda tiene tres pilares de interacción que, combinados, convierten un chatbot en una plataforma de aplicaciones conversacionales:
>
> 1. **Space Tools** = Puntos de entrada persistentes (botones siempre visibles en el chat)
> 2. **Intent Graph** = Flujos guiados (wizards, formularios, decisiones paso a paso)
> 3. **Acciones** = Ejecución real sobre sistemas (Jira, SAP, CRM, APIs)
>
> Cada pilar es poderoso por separado. Juntos, permiten construir **aplicaciones completas dentro de una conversación** — sin que el usuario salga del chat, sin que necesite aprender otra herramienta.

### ¿Qué son los Space Tools?

Hay dos tipos de herramientas:

| Tipo | Apariencia | ¿Qué hace al hacer clic? |
|------|-----------|-|
| **⚡ Acción** | Botón/pill sobre el chat | Ejecuta una integración directamente (crear ticket, enviar email, consultar estado) sin pasar por la IA |
| **💡 Sugerencia (Intent)** | Chip translúcido sobre el teclado | Inyecta un mensaje predefinido en el chat y el agente lo procesa normalmente |

### ¿Dónde aparecen?

```ui-mockup
┌─────────────────────────────────────────────────────┐
│ 💬 Mensajes del chat                                │
│ ...                                                 │
│ ⚡ [🎫 Crear Ticket] [📧 Enviar Email] [💬 WhatsApp] │  ← Barra de Acciones
│ 💡 [Mis tickets] [Reporte del día] [Escalar]        │  ← Dock de Sugerencias
│ ╔═══════════════════════════════════════════╗        │
│ ║  Escribí un mensaje...                   ║        │  ← Input del chat
│ ╚═══════════════════════════════════════════╝        │
└─────────────────────────────────────────────────────┘
```

### Action Tools: 3 modos de interacción

Los botones de acción tienen tres formas de ejecutarse:

| Modo | Comportamiento | Ideal para |
|------|---------------|-----------|
| **`direct`** | Ejecuta la acción inmediatamente al hacer clic (con confirmación opcional) | Consultas rápidas, toggles, reportes instantáneos |
| **`prompt`** | Inyecta un texto predefinido en el input del chat | Preguntas frecuentes que el usuario quiere personalizar antes de enviar |
| **`form`** | Abre un formulario modal para recolectar parámetros antes de ejecutar | Creación de registros, solicitudes con datos específicos |

### Intent Tools: 4 categorías de sugerencia

Las sugerencias se organizan en categorías con colores diferenciados:

| Categoría | Color | Uso típico |
|-----------|-------|-----------|
| **`general`** | Zinc/gris | Preguntas abiertas, exploración |
| **`quick_query`** | Índigo | Consultas rápidas de datos específicos |
| **`workflow`** | Esmeralda | Procesos de negocio multi-paso |
| **`data_request`** | Ámbar | Solicitudes de reportes, dashboards, exportaciones |

> 💡 **Tip**: Usá **acciones** para tareas repetitivas y mecánicas donde no necesitás que el agente "piense". Usá **sugerencias** para consultas donde la respuesta del agente aporta interpretación, contexto o análisis.

### Cómo configurarlas

1. Entrá a **Configuración → Espacios**
2. Editá el espacio deseado
3. Desplazate hasta la sección **🛠️ Space Tools**
4. Hacé clic en **"+ Agregar Tool"**
5. Elegí el tipo (Acción o Sugerencia) y completá los campos
6. Guardá los cambios

**Límites**: Máximo 10 herramientas por espacio. Cada herramienta puede tener un estilo visual diferente (Default, Primary, Danger, Ghost) y opcionalmente requerir confirmación antes de ejecutarse.

> ⚠️ **Importante**: Las acciones directas solo necesitan estar en el Catálogo de Acciones. Las sugerencias que activan acciones del agente necesitan que esas acciones estén vinculadas al agente del espacio.

### Ejemplos de Implementación por Industria

#### 🎫 Mesa de Ayuda IT

```
Espacio: "Soporte IT"
──────────────────────────
⚡ Acciones:
  🎫 Nuevo Ticket (form)     → Formulario: título, prioridad, descripción
  🔍 Estado Ticket (prompt)  → Inyecta: "¿Cuál es el estado de mi último ticket?"
  📊 Dashboard (direct)      → Ejecuta acción que genera gráficos de estado
  🚨 Emergencia (direct)     → Escala a humano inmediatamente

💡 Sugerencias:
  "Mis tickets abiertos" (quick_query)
  "Reportar un problema con SAP" (workflow)
  "Guía de autogestión de contraseñas" (general)
```

**¿Qué pasa cuando el usuario hace clic en "Nuevo Ticket"?**
1. Se abre el formulario (modo `form`) → el usuario llena título, prioridad y descripción
2. La acción crea el ticket en Jira via HTTP
3. Opcionalmente, un Intent Graph encadenado pregunta: "¿Querés que te notifique cuando cambie el estado?" → [Sí] [No]

#### 🏢 Onboarding de Empleados

```
Espacio: "Bienvenida RRHH"
──────────────────────────
💡 Sugerencias (todo intents):
  🏢 Mi Primer Día (workflow)      → Inicia wizard de onboarding paso a paso
  📋 Formularios Pendientes (data_request) → "¿Qué formularios tengo pendientes?"
  🎓 Mis Capacitaciones (quick_query)      → "¿Qué cursos debo completar?"
  📄 Políticas de la Empresa (general)     → "Resumime la política de home office"
```

**¿Qué pasa cuando el usuario elige "Mi Primer Día"?**
1. El intent inyecta el prompt → el LLM genera un Intent Graph v2
2. Graph Paso 1: Form Node recolecta datos personales
3. Respuesta incluye nuevo Intent Graph (chained) → Paso 2: preferencias de equipo
4. Paso 3: Action Node genera credenciales y envía email de bienvenida

#### 💰 Ventas B2B

```
Espacio: "Ventas B2B"
──────────────────────────
⚡ Acciones:
  💰 Nueva Oportunidad (form)  → Formulario: empresa, monto, etapa, contacto
  📈 Pipeline (direct)         → Dashboard visual con el estado de todas las oportunidades

💡 Sugerencias:
  📝 Armar Propuesta (workflow)      → "Necesito armar una propuesta para [empresa]"
  🤝 Agendar Demo (quick_query)      → "Quiero agendar una demo para la semana que viene"
  📊 Forecast del Mes (data_request) → "¿Cuál es el forecast de ventas de este mes?"
```

#### 🔐 Compliance y Auditoría

```
Espacio: "Compliance Officer"
──────────────────────────
⚡ Acciones:
  🔍 Auditar Accesos (direct) → Genera reporte automático de accesos del mes
  🚨 Reportar Incidente (form) → Formulario de reporte de incidente de seguridad

💡 Sugerencias:
  📊 KPIs de Seguridad (data_request)   → Dashboard con métricas de seguridad
  📋 Checklist SOC2 (workflow)           → Intent Graph interactivo con 12 controles
  🔒 Estado de MFA (quick_query)         → "¿Cuántos usuarios tienen MFA activo?"
```

### Guía de Diseño de Space Tools

| Criterio | Recomendación |
|----------|---------------|
| **Cantidad** | 3-7 tools es lo ideal. Más de 8 genera sobrecarga visual. |
| **Nombres** | Cortos (2-4 palabras), orientados a la acción ("Nuevo Ticket", no "Crear un nuevo ticket de soporte") |
| **Íconos** | Usá emojis descriptivos. El ícono es lo primero que el usuario ve. |
| **Estilos** | Usá `primary` para la acción más frecuente, `danger` para acciones destructivas, `ghost` para acciones secundarias |
| **Confirmación** | Activá `confirm_before` para acciones que crean, modifican o eliminan datos |
| **Orden** | Las acciones más usadas primero (campo `position`). Analizá métricas de uso para optimizar. |

---

## Configuración Remota con Asistentes de IA (MCP)

Todo lo que este capítulo describe — crear espacios, configurar agentes, subir documentos, vincular acciones y armar Space Tools — también puede hacerse **sin entrar al panel de Senda**, dándole instrucciones a un asistente de IA como Claude Desktop, Cursor o Google Antigravity.

Senda expone un **servidor MCP** (Model Context Protocol) que permite a herramientas externas de IA descubrir y ejecutar operaciones en la plataforma. Hay dos modos:

| Modo | ¿Para qué sirve? | Scope de la clave |
|---|---|---|
| **Consumer** | Chatear con agentes de Senda y ejecutar acciones desde herramientas externas | `chat` o `read` |
| **Admin** | Configurar Senda completo: crear espacios, agentes, acciones, subir documentos, armar barras de herramientas | `admin` |

### El concepto clave

Un analista funcional puede **descargar estos manuales**, alimentar un agente de IA (como Claude Code o Google Antigravity) con ellos, y luego darle instrucciones para configurar Senda remotamente. El agente lee los manuales, entiende cómo funciona Senda, y usa el servidor MCP Admin para ejecutar las configuraciones.

> 🚀 **Esto significa que un implementador puede configurar un espacio completo — con agentes, acciones, documentos y herramientas — en minutos, usando lenguaje natural.**

---

### Paso 1: Crear una API Key en Senda

Antes de conectar cualquier herramienta de IA, necesitás una clave de API.

1. Entrá a **Administración → API Keys → Nueva API Key**
2. Completá los campos:

```ui-mockup
┌─────────────────────────────────────────────────────┐
│ 🔑 Nueva API Key                                     │
│                                                       │
│ Nombre:      [ MCP Admin - Claude Desktop          ]  │
│                                                       │
│ Service Account:  [ mcp-admin@serviceaccount  ▼    ]  │
│                                                       │
│ Scopes:                                               │
│   ☐ chat   ☐ read   ☐ write   ☑ admin               │
│                                                       │
│ Rate Limit:  [ 30 ] rpm                               │
│                                                       │
│ Espacio:     [ Sin restricción (todos)         ▼   ]  │
│                                                       │
│                              [Crear API Key →]        │
└─────────────────────────────────────────────────────┘
```

3. **Elegí el scope** según lo que necesitás:
   - **Solo chatear con agentes desde la herramienta de IA**: marcá `chat`
   - **Configurar espacios, agentes, acciones, etc.**: marcá `admin`

4. Hacé click en **Crear API Key**. La clave aparece **una única vez** — copiala inmediatamente.

```ui-mockup
┌─────────────────────────────────────────────────────┐
│ ✅ API Key creada exitosamente                        │
│                                                       │
│ Tu clave:                                             │
│ ┌───────────────────────────────────────────────────┐ │
│ │ snda_prod_a3b2f8c9d4e1x7y8z9w0...                │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ⚠️ Copiala ahora. No podrás volver a verla.           │
│                              [Copiar] [Cerrar]        │
└─────────────────────────────────────────────────────┘
```

> ⚠️ **Importante:** Guardá la clave en un lugar seguro. Si la perdés, tenés que revocarla y crear una nueva.

---

### Paso 2: Obtener el Tenant ID

El Tenant ID es el identificador de tu organización en Senda. Lo necesitás para configurar la conexión.

1. Entrá a **Administración → Configuración → General**
2. Copiá el valor del campo **Tenant ID** (un código alfanumérico como `tn_abc123def456`)

---

### Paso 3: Configurar la herramienta de IA

#### Opción A: Claude Desktop

1. Abrí Claude Desktop
2. Andá a **Settings → Developer → MCP Servers → Add Server**
3. Completá la configuración:

```json
{
  "mcpServers": {
    "senda": {
      "url": "https://senda.telar.ai/mcp/TU_TENANT_ID",
      "headers": {
        "Authorization": "Bearer snda_prod_TU_CLAVE_AQUI"
      }
    }
  }
}
```

4. Reemplazá `TU_TENANT_ID` y `TU_CLAVE_AQUI` con los valores reales
5. Reiniciá Claude Desktop

**Verificación:** Escribí en Claude "¿Qué herramientas de Senda tenés disponibles?". Claude debería listar las herramientas según el scope de tu clave.

#### Opción B: Cursor (VS Code)

1. Creá el archivo `.cursor/mcp.json` en la raíz de tu proyecto:

```json
{
  "mcpServers": {
    "senda": {
      "url": "https://senda.telar.ai/mcp/TU_TENANT_ID",
      "headers": {
        "Authorization": "Bearer snda_prod_TU_CLAVE_AQUI"
      }
    }
  }
}
```

2. Reiniciá Cursor. El servidor MCP aparece en la barra lateral.

#### Opción C: Google Antigravity / Gemini CLI

1. Agregá la configuración MCP en `~/.gemini/settings.json` o en el `AGENTS.md` del proyecto
2. El agente descubre las herramientas automáticamente

---

### Paso 4: Usar el MCP Consumer (chatear con agentes)

Si tu clave tiene scope `chat`, podés **conversar con los agentes de Senda desde la herramienta de IA**:

**Ejemplo con Claude Desktop:**
> **Vos:** "Preguntale al agente de Soporte cuál es la política de devoluciones para productos electrónicos"
>
> **Claude:** *Invoca la herramienta `senda_chat` y te muestra la respuesta del agente de Senda directamente en Claude.*

Herramientas disponibles en modo Consumer:

| Herramienta | ¿Qué hace? |
|---|---|
| `senda_chat` | Envía un mensaje al agente y recibe la respuesta |
| `senda_execute_action` | Ejecuta una acción del catálogo directamente |
| `senda_list_actions` | Lista las acciones disponibles |
| `senda_list_agents` | Lista los agentes disponibles |

---

### Paso 5: Usar el MCP Admin (configurar Senda)

Si tu clave tiene scope `admin`, podés **configurar Senda completo desde la herramienta de IA**. El asistente puede ejecutar las mismas operaciones que harías manualmente desde el panel:

| Tarea | Ejemplo de instrucción al asistente |
|---|---|
| Crear un espacio | *"Creá un espacio llamado 'Soporte Técnico' con tema azul"* |
| Crear un agente | *"Agregá un agente que responda preguntas de garantías, con tono amable y profesional"* |
| Generar un agente con IA | *"Generá la configuración de un agente de nivel 1 para una empresa de software, que pida capturas cuando el problema es visual"* |
| Subir documentos | *"Cargá este manual de políticas como conocimiento del agente de RRHH"* |
| Crear una acción | *"Creá una acción que consulte el estado de un ticket en Jira vía API"* |
| Vincular acción a agente | *"Asigná la acción de Jira al agente de Soporte con confirmación antes de ejecutar"* |
| Configurar Space Tools | *"Agregá un botón de 'Ver mis tickets' en la barra del chat del espacio de Soporte"* |
| Duplicar un espacio | *"Cloná el espacio de Soporte para hacer una versión de prueba"* |

#### ¿Qué NO puede hacer el asistente?

| Límite | Razón |
|---|---|
| Ver conversaciones de usuarios finales | Protección de privacidad — los chats son del usuario |
| Crear o modificar usuarios, roles o permisos | Eso lo gestiona el Admin de IT (ver 📙 Manual Admin) |
| Cambiar configuración de modelos de IA | Requiere acceso al panel de administración avanzada |

---

### La Estrategia del Implementador: Manuales + IA + MCP

La combinación más poderosa para un implementador es usar estos mismos manuales como fuente de conocimiento para un agente de IA:

**El flujo recomendado:**

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ 1. Descargar │     │ 2. Alimentar un  │     │ 3. Dar           │
│ los manuales │ ──→ │ agente (Claude,  │ ──→ │ instrucciones    │
│ de Senda     │     │ Antigravity)     │     │ de configuración │
└─────────────┘     └──────────────────┘     └─────────────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │ 4. El agente usa │
                                            │ el MCP Admin     │
                                            │ para configurar  │
                                            │ Senda            │
                                            └─────────────────┘
```

**Paso a paso de la estrategia:**

1. **Descargá los manuales** de Senda desde `senda.telar.ai/docs/funcional/` y `senda.telar.ai/docs/tecnico/`
2. **Abrí Claude Code, Google Antigravity o Cursor** con el MCP Server de Senda ya configurado
3. **Cargá los manuales como contexto** del agente (arrastrá los archivos o copiá el contenido)
4. **Dále instrucciones de alto nivel**, por ejemplo:

> *"Necesito implementar Senda para el departamento de Soporte de una empresa de 500 empleados. Tienen tres áreas: soporte SAP, soporte de infraestructura IT y consultas generales de RRHH. Cada área tiene su propia documentación. Necesito un espacio por área, con agentes especializados, acciones para crear tickets en Jira, y botones de acción rápida. Configurá todo en Senda."*

5. **El agente lee los manuales**, entiende la arquitectura de Senda (espacios, agentes, routing, acciones, Space Tools) y ejecuta la configuración completa usando las herramientas MCP Admin.

> 🎯 **Resultado:** Lo que normalmente toma horas de configuración manual se resuelve en una conversación. El agente aplica las mejores prácticas documentadas en los manuales automáticamente.

### Caso de uso completo: De instrucción a espacio configurado

**Analista → Claude Desktop:**
> "Necesito crear un espacio de Soporte Técnico en Senda con un agente que sepa de garantías y devoluciones. El agente debe pedir capturas de pantalla cuando el problema es visual. También necesito un botón de 'Crear ticket en Jira' en la barra del chat."

**Claude ejecuta automáticamente 6 operaciones en secuencia:**

1. `senda_admin_create_space` → Crea espacio "soporte-tecnico" con tema azul
2. `senda_admin_generate_agent` → Genera configuración de agente con IA
3. `senda_admin_create_agent` → Crea el agente con visión habilitada
4. `senda_admin_create_action` → Crea acción HTTP para Jira
5. `senda_admin_assign_action_to_agent` → Asigna la acción al agente
6. `senda_admin_configure_space_tools` → Configura el botón en la barra

**Claude → Analista:**
> "Listo. Creé el espacio 'Soporte Técnico' con el agente 'Asistente de Garantías' configurado con visión activada para recibir capturas. También creé la acción de Jira y la asigné al agente con un botón 'Crear ticket' en la barra del chat. ¿Querés que suba documentos de políticas de garantía como conocimiento del agente?"

Todo esto habría tomado 20-30 minutos desde el panel. Con el asistente, se resuelve en una única instrucción.

### Mejores prácticas

| Práctica | Por qué |
|---|---|
| **Revisá siempre lo que generó el asistente** | El asistente crea configuraciones reales. Verificar antes de activar para usuarios finales. |
| **Usá el generador de agentes como primer borrador** | `generate_agent` produce una base sólida, pero el system prompt final siempre requiere ajuste humano. |
| **Documentá las instrucciones que diste** | Si necesitás replicar la configuración en otro tenant o ambiente, tener las instrucciones originales es clave. |
| **No uses la clave admin para chat** | La clave admin es para configuración. Para chatear con agentes, usá una clave con scope `chat`. |
| **Alimentá al agente con los manuales** | Cuanto más contexto tenga el agente sobre Senda, mejores configuraciones va a generar. |



---

## Errores Comunes y Cómo Evitarlos

### Error 1: Un único agente que «sabe de todo»
**Consecuencia**: Contextos mezclados, respuestas imprecisas, documentación irrelevante en cada consulta.  
**Solución**: Un agente por dominio. Separación estricta de conocimiento.

### Error 2: Resúmenes de responsabilidades vacíos o genéricos
**Consecuencia**: El router siempre elige al Principal o a un agente aleatorio.  
**Solución**: Descripciones específicas que diferencian claramente el alcance de cada agente.

### Error 3: No activar Modo Prueba durante la configuración
**Consecuencia**: No podés ver por qué el router eligió un agente determinado.  
**Solución**: Activar Modo Prueba en todos los agentes durante la fase de configuración. Desactivarlo al lanzar a producción.

### Error 4: La misma documentación en todos los agentes
**Consecuencia**: El router no puede diferenciar agentes por conocimiento → elige de forma aleatoria.  
**Solución**: Cada agente tiene SOLO los documentos de su especialidad.

### Error 5: No probar el routing sistemáticamente
**Consecuencia**: El router puede funcionar bien en el 80% de los casos y fallar en los 20% más críticos.  
**Solución**: Ejecutar el Test de Routing del protocolo de validación (al menos 10 frases representativas por agente).

---

## Capacidades Avanzadas por Agente (Inteligencia Avanzada)

> 🔖 **BETA** — Estas capacidades están disponibles progresivamente desde v5.17.0.

Senda permite activar **capacidades avanzadas de IA** individualmente para cada agente. Esto significa que un agente puede tener razonamiento por objetivos mientras otro no, o que un agente muestre widgets proactivos mientras otro se mantenga puramente conversacional.

### El Modelo Dual-Gate: Flag Global + Capacidad por Agente

Las capacidades avanzadas se activan en **dos niveles**:

| Nivel | ¿Quién lo controla? | ¿Qué hace? |
|---|---|---|
| **Gate 1 — Flag Global** | El Administrador del tenant | Habilita la funcionalidad para toda la organización (on/off) |
| **Gate 2 — Capacidad por Agente** | El Implementador | Activa la capacidad en un agente específico |

Ambos gates deben estar activos para que la capacidad funcione. Esto permite que el equipo de IT habilite la funcionalidad a nivel organización, y que cada implementador decida qué agentes la usan.

### Las 4 Capacidades Avanzadas

#### 🎯 Goal-Based Reasoning: Agentes con Objetivos de Negocio

Un agente con Goal-Based Reasoning no solo responde preguntas — **persigue objetivos**. Configurás hasta 10 objetivos de negocio con prioridades (alta, media, baja), y el agente los evalúa en cada interacción para decidir si debe actuar proactivamente.

**Cómo configurarlo:**
1. En la solapa **Capacidades** del agente, activar *"Razonamiento por Objetivos"*
2. Agregar objetivos con título, descripción y prioridad
3. El agente evalúa cada mensaje del usuario contra sus objetivos con un puntaje de confianza (≥0.6 para activar)

**Ejemplo — Agente de Retención de Clientes:**
- Objetivo 1 (Alta): *"Maximizar renovaciones de contratos"*
- Objetivo 2 (Media): *"Detectar señales de churn y escalar a ventas"*

Cuando un cliente menciona insatisfacción, el agente detecta alineación con el Objetivo 2, consulta el historial de interacciones, genera un reporte de riesgo y crea un ticket de retención — todo sin que nadie se lo pida explícitamente.

**Auditoría:** Cada razonamiento queda registrado en el **GoalTraceViewer**, donde podés ver: qué objetivo matchó, con qué confianza, qué plan de acción siguió, y cuál fue el resultado (exitoso, parcial, fallido).

> 💡 **Analogía:** Un vendedor con cuotas mensuales no espera que el cliente pida ayuda — busca activamente oportunidades de venta en cada conversación. El agente con Goal-Based hace lo mismo.

#### 🚀 Chatless UI: El Agente que Actúa Sin Que Le Escribas

Con **Chatless UI** activada, el agente muestra widgets proactivos cuando el usuario abre Senda — sin necesidad de escribir nada. El sistema evalúa 5 tipos de triggers:

| Trigger | ¿Cuándo se activa? | Ejemplo |
|---|---|---|
| 🕒 **Hora del día** | En una franja horaria específica | 9 AM: mostrar KPIs de ayer |
| 👋 **Primer acceso** | Cuando el usuario entra al espacio por primera vez | Mostrar tutorial de bienvenida |
| 📨 **Evento externo** | Cuando un webhook notifica algo | Pedido nuevo: mostrar botón de aprobación |
| ⏰ **Cron programado** | Según una expresión cron | Cada lunes: resumen semanal |
| 📊 **Condición de datos** | Cuando una métrica cruza un umbral | Tickets abiertos > 50: alerta de saturación |

**Cómo configurarlo:**
1. Activar *"Chatless UI"* en la solapa **Capacidades** del agente
2. Los triggers se definen como parte de las acciones asociadas al agente
3. El agente evalúa las condiciones al cargar el espacio y muestra los widgets relevantes

> 🎯 **Por qué importa:** Chatless UI demuestra que Senda no depende del chat. El usuario abre la plataforma y recibe exactamente lo que necesita. Combinado con **Web Push Notifications**, Senda incluso avisa al usuario a nivel sistema operativo para que abra la plataforma cuando hay una novedad crítica.

#### 📊 Predictive Analytics: El Agente que Anticipa

Con esta capacidad, el agente puede **anticipar tendencias, detectar anomalías y generar pronósticos** sobre las métricas de negocio. En lugar de responder *"¿cómo estuvieron las ventas?"* (pasado), responde *"¿cómo van a estar las ventas?"* (futuro).

3 tipos de predicción:
- **Forecasting:** *"Si la tendencia actual continúa, las ventas del próximo mes serán ~$450K"*
- **Detección de anomalías:** *"Las devoluciones de esta semana están un 340% arriba del promedio"*
- **Alertas predictivas:** *"Al ritmo actual, el inventario de producto X se agota en 12 días"*

> 💡 **Analogía:** Es como el tablero de un auto moderno: no solo te dice la velocidad actual, sino que te alerta cuando estás por quedarte sin nafta.

#### 📊 Adaptive Dashboards: Dashboards por Lenguaje Natural

El agente puede **generar dashboards personalizados** a partir de una descripción en lenguaje natural. En lugar de configurar widgets manualmente, el usuario dice *"Quiero un dashboard con ventas por región, top 5 clientes y tickets abiertos"* y Senda lo arma automáticamente.

Los dashboards adaptivos combinan múltiples widgets de Generative UI en una vista coherente, actualizada en tiempo real.

### Resumen de activación

| Capacidad | Flag global requerido | Configuración por agente | Resultado |
|---|---|---|---|
| Goal-Based Reasoning | `feature_goal_reasoning` | Objetivos (máx 10) | Agente persigue metas |
| Chatless UI | `feature_chatless_ui` | Triggers configurados | Widgets proactivos sin chat |
| Web Push Notifications | `push_notifications` | Preferencias de usuario | Alertas al SO en tiempo real |
| Predictive Analytics | `feature_predictive` | Activar en capacidades | Predicciones y anomalías |
| Adaptive Dashboards | `feature_adaptive_dashboards` | Activar en capacidades | Dashboards por NL |

---

## Checklist de Configuración de un Espacio

- [ ] Espacio creado con nombre, tema visual y mensajes de bienvenida personalizados
- [ ] Agente Principal configurado con `isPrimary = true` y system prompt de routing
- [ ] Sub-agentes creados — uno por dominio o área temática
- [ ] Resúmenes de responsabilidades escritos, específicos y diferenciados
- [ ] System prompts completos (rol, protocolo, reglas, tono, escalamiento)
- [ ] Documentos RAG subidos a cada sub-agente (solo los de su especialidad)
- [ ] Acciones vinculadas a los agentes correspondientes (si aplica)
- [ ] Space Tools configuradas (acciones rápidas y sugerencias, si aplica)
- [ ] Modo Prueba activado para todas las validaciones
- [ ] Protocolo de routing ejecutado: al menos 10 frases de prueba por agente
- [ ] Modo Prueba desactivado al lanzar a producción
- [ ] ¿Entiendo el modelo dual-gate (flag global + capacidad por agente)?
- [ ] ¿Sé cuándo activar Goal-Based Reasoning y cómo configurar objetivos?
- [ ] ¿Puedo explicar qué es Chatless UI y sus 5 tipos de triggers?
- [ ] ¿Conozco las 4 capacidades avanzadas disponibles por agente?

---

> 📖 **Siguiente:** [04 — Dominar los Prompts](./03_dominar_los_prompts.md)
