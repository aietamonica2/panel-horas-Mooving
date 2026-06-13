> **Versión documentada:** v5.20.13 · **Última revisión:** 2026-05-29

# 09. Senda Bridge SDK: Programación Avanzada de Acciones

> **Capítulo 9 del Manual Técnico.** Este capítulo documenta el SDK interno disponible dentro de las acciones de tipo Script. El Bridge es la herramienta más poderosa de Senda para orquestar flujos complejos, automatización event-driven y workflows stateful.

---

## 1. ¿Qué es el Senda Bridge?

Cuando creás una acción de tipo **Script**, el código JavaScript se ejecuta dentro de un sandbox seguro. Dentro de ese sandbox, tenés acceso automático al objeto `senda` — el **Senda Bridge SDK**. Este SDK expone 8 métodos que permiten interactuar programáticamente con toda la plataforma:

- Ejecutar otras acciones del catálogo (orquestación)
- Hacer llamadas internas al LLM (enriquecimiento con IA)
- Crear nuevas acciones dinámicamente (auto-evolución)
- Agendar ejecuciones futuras o recurrentes (scheduling)
- Almacenar y recuperar estado persistente (workflows stateful)
- Suscribirse a eventos del sistema (automatización event-driven)
- Hacer requests HTTP seguros (integraciones controladas)

> 🔑 **Concepto clave:** El Bridge convierte una acción de tipo Script en un **micro-orquestador** capaz de coordinar múltiples sistemas, datos y lógica de negocio — todo desde un solo bloque de código.

---

## 2. Acceso al Bridge

El objeto `senda` está disponible automáticamente en cualquier acción de tipo Script. No requiere importaciones ni configuración.

```javascript
// Ejemplo mínimo de una acción Script con Bridge
const actions = await senda.getAvailableActions();
return {
  message: `Hay ${actions.length} acciones disponibles en el catálogo.`
};
```

> ⚠️ **El Bridge solo está disponible en acciones de tipo Script.** No está disponible en acciones HTTP, Fórmulas ni Pipelines (aunque los pasos de un Pipeline pueden ser Scripts que sí tengan acceso al Bridge).

---

## 3. Referencia Completa de Métodos

### 3.1 `senda.callAction(actionId, params)`

Ejecuta cualquier acción del catálogo programáticamente. El sistema incluye **detección de ciclos** para prevenir loops infinitos.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `actionId` | `string` | ID de la acción a ejecutar (UUID del catálogo) |
| `params` | `object` | Parámetros a enviar a la acción (como si el LLM los hubiera extraído) |

**Retorna:** El resultado de la acción ejecutada (JSON).

```javascript
// Orquestar un flujo: buscar cliente → generar cotización → enviar email
const cliente = await senda.callAction('buscar-cliente', { 
  nombre: params.empresa 
});

const cotizacion = await senda.callAction('generar-cotizacion', {
  cliente_id: cliente.id,
  productos: params.productos,
  descuento: params.descuento || 0
});

const email = await senda.callAction('enviar-email', {
  destinatario: cliente.email,
  asunto: `Cotización #${cotizacion.numero}`,
  cuerpo: cotizacion.html
});

return {
  message: `✅ Cotización #${cotizacion.numero} enviada a ${cliente.email}`,
  cotizacion_id: cotizacion.id
};
```

> ⚠️ **Detección de ciclos:** El Bridge mantiene un `Set<visitedActionIds>` que se propaga entre llamadas. Si una acción intenta ejecutar otra que ya fue visitada en la cadena, el sistema lanza un error. Esto previene loops como A → B → C → A.
>
> **Profundidad máxima:** 5 niveles de recursión. Si una cadena de `callAction` excede 5 niveles, se corta con error.

---

### 3.2 `senda.getAvailableActions()`

Retorna la lista completa de acciones activas en el catálogo del tenant. Útil para scripts que necesitan adaptarse dinámicamente al catálogo disponible.

**Retorna:** `Array<{ id, name, description, action_type, is_active }>`.

```javascript
// Script que verifica si una acción existe antes de llamarla
const actions = await senda.getAvailableActions();
const jiraAction = actions.find(a => a.name.includes('Jira'));

if (jiraAction) {
  return await senda.callAction(jiraAction.id, params);
} else {
  return { message: '⚠️ No hay integración con Jira configurada.' };
}
```

---

### 3.3 `senda.askAI(prompt)`

Realiza una llamada interna al LLM del tenant **sin round-trip HTTP**. Ideal para enriquecimiento de datos, clasificación, resumen y transformación inteligente dentro de scripts.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `prompt` | `string` | El prompt completo para el LLM |

**Retorna:** `string` — La respuesta del LLM.

```javascript
// Clasificar un ticket por urgencia antes de crearlo
const datos = `Asunto: ${params.asunto}\nDescripción: ${params.descripcion}`;

const clasificacion = await senda.askAI(`
  Clasificá el siguiente ticket de soporte en una de estas categorías:
  - P1 (Crítico): Sistema caído, pérdida de datos, seguridad comprometida
  - P2 (Alto): Funcionalidad principal afectada, workaround disponible
  - P3 (Normal): Bug menor, mejora, consulta
  - P4 (Bajo): Cosmético, sugerencia
  
  Respondé SOLO con el código (P1, P2, P3 o P4) sin explicación.
  
  Ticket:
  ${datos}
`);

const prioridad = clasificacion.trim();

return await senda.callAction('crear-ticket-jira', {
  ...params,
  prioridad: prioridad,
  clasificado_por: 'IA'
});
```

> 💡 **Tip:** `askAI` usa el modelo configurado para el tenant. No requiere API keys ni configuración adicional.

---

### 3.4 `senda.registerAction(config)`

Crea una nueva acción en el catálogo **programáticamente**. Las acciones registradas nacen en estado **INACTIVO** (requieren activación manual por un admin). Las URLs son validadas contra SSRF.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | ✅ | Nombre de la acción |
| `description` | `string` | ✅ | Descripción para el LLM |
| `action_type` | `string` | ✅ | `http`, `script`, `formula` |
| `url` | `string` | Para HTTP | URL del endpoint (validada contra SSRF) |
| `method` | `string` | Para HTTP | GET, POST, PUT, DELETE |
| `script_code` | `string` | Para Script | Código JavaScript |

```javascript
// Auto-discovery: Explorar una API y registrar acciones automáticamente
const spec = await senda.fetch('https://api.micrm.com/openapi.json');
const endpoints = JSON.parse(spec).paths;

const registradas = [];

for (const [path, methods] of Object.entries(endpoints)) {
  for (const [method, config] of Object.entries(methods)) {
    if (['get', 'post'].includes(method)) {
      await senda.registerAction({
        name: `CRM: ${config.summary || path}`,
        description: config.description || `Endpoint ${method.toUpperCase()} ${path}`,
        action_type: 'http',
        url: `https://api.micrm.com${path}`,
        method: method.toUpperCase()
      });
      registradas.push(`${method.toUpperCase()} ${path}`);
    }
  }
}

return { 
  message: `✅ ${registradas.length} acciones registradas desde la API del CRM.`,
  acciones: registradas
};
```

> ⚠️ **Seguridad:** `registerAction` valida URLs contra SSRF — solo permite hostnames registrados en el catálogo del tenant o en la allowlist del sistema. Las acciones nacen INACTIVAS para que un admin las revise antes de activarlas.

---

### 3.5 `senda.schedule(config)`

Agenda una ejecución futura o recurrente de una acción. Escribe en la tabla `scheduled_actions` y el `schedulerEngine` la procesa automáticamente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `action_id` | `string` | ID de la acción a ejecutar |
| `run_at` | `string` | Fecha/hora ISO 8601 (`2026-06-01T09:00:00Z`) |
| `run_in` | `string` | Tiempo relativo: `'30m'`, `'2h'`, `'3d'`, `'1w'` |
| `cron` | `string` | Expresión cron para recurrencia (`'0 9 * * 1'` = lunes 9am) |
| `params` | `object` | Parámetros para la ejecución |

> Usar **uno** de: `run_at`, `run_in` o `cron`.

```javascript
// Crear ticket y agendar un seguimiento automático en 30 minutos
const ticket = await senda.callAction('crear-ticket-jira', {
  asunto: params.asunto,
  prioridad: params.prioridad
});

// Agendar verificación de estado en 30 minutos
await senda.schedule({
  action_id: 'verificar-estado-ticket',
  run_in: '30m',
  params: { ticket_id: ticket.id }
});

// Agendar reporte diario de tickets abiertos (lunes a viernes 9am)
await senda.schedule({
  action_id: 'reporte-tickets-abiertos',
  cron: '0 9 * * 1-5',
  params: { equipo: params.equipo }
});

return {
  message: `✅ Ticket ${ticket.id} creado. Se verificará en 30 minutos y se enviará reporte diario a las 9am.`
};
```

---

### 3.6 `senda.state.get/set/delete/list(key)`

Almacenamiento persistente de clave-valor por tenant usando Cloudflare KV. Ideal para workflows que necesitan mantener estado entre ejecuciones.

| Método | Firma | Descripción |
|--------|-------|-------------|
| `get` | `senda.state.get(key)` | Obtener valor por clave |
| `set` | `senda.state.set(key, value, ttl?)` | Guardar valor (TTL opcional en segundos, default 24h) |
| `delete` | `senda.state.delete(key)` | Eliminar clave |
| `list` | `senda.state.list(prefix?)` | Listar claves (filtro opcional por prefijo) |

```javascript
// Workflow stateful: Carrito de compras conversacional
const carritoKey = `cart:${context.user_id}`;

// Obtener carrito existente o crear uno nuevo
let carrito = await senda.state.get(carritoKey);
carrito = carrito ? JSON.parse(carrito) : { items: [], total: 0 };

// Agregar item
carrito.items.push({
  producto: params.producto,
  cantidad: params.cantidad,
  precio: params.precio
});
carrito.total = carrito.items.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);

// Guardar con TTL de 2 horas
await senda.state.set(carritoKey, JSON.stringify(carrito), 7200);

return {
  message: `🛒 ${params.producto} agregado. Total: $${carrito.total.toFixed(2)} (${carrito.items.length} items)`,
  __intent_graph: true,
  nodes: [
    { type: 'action_node', label: '🛒 Ver Carrito', action_id: 'ver-carrito' },
    { type: 'action_node', label: '✅ Finalizar Compra', action_id: 'checkout', variant: 'success' },
    { type: 'action_node', label: '🗑️ Vaciar Carrito', action_id: 'vaciar-carrito', variant: 'danger', confirm: { message: '¿Seguro que querés vaciar el carrito?' } }
  ]
};
```

> 💡 **Tip:** Usá prefijos en las claves para organizar el estado: `cart:`, `onboarding:`, `approval:`, `rate:`.

---

### 3.7 `senda.observe(eventType, actionId)` + `senda.listObservers()`

Registra un observer que escucha eventos del sistema y ejecuta una acción cuando ocurren. Permite crear automatización event-driven desde scripts.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `eventType` | `string` | Tipo de evento: `on_*` (sistema), `ext:*:*` (externo/webhook), `custom:*` (usuario) |
| `actionId` | `string` | ID de la acción a ejecutar cuando ocurra el evento |

```javascript
// Auto-registrar monitoreo de una integración recién creada
const integration = await senda.callAction('configurar-webhook-crm', {
  url: params.webhook_url,
  eventos: ['lead.created', 'deal.closed']
});

// Registrar observers para cada evento del webhook
await senda.observe('ext:crm:lead.created', 'procesar-nuevo-lead');
await senda.observe('ext:crm:deal.closed', 'celebrar-cierre-deal');

// Verificar que se registraron
const observers = await senda.listObservers();

return {
  message: `✅ Webhook configurado con ${observers.length} observers activos.`,
  observers: observers.map(o => `${o.event_type} → ${o.action_name}`)
};
```

---

### 3.8 `senda.emitEvent(eventType, payload)`

Emite un evento personalizado dentro del sistema. Principalmente utilizado para gatillar **Notificaciones Push** interactivas desde scripts.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `eventType` | `string` | Debe comenzar obligatoriamente con el prefijo `custom:` (ej: `custom:alerta_stock`) |
| `payload` | `object` | Opcional. Atributos para configurar la notificación push (`title`, `message`, `icon`, `url`) |

```javascript
// Gatillar una alerta de bajo inventario
await senda.emitEvent('custom:alerta_stock', {
  title: 'Alerta de Inventario',
  message: `El producto ${params.producto} está por agotarse. Quedan ${params.stock} unidades.`,
  url: '/dashboard/inventario',
  icon: '/icons/alert.png'
});

return { message: 'Alerta push enviada exitosamente.' };
```

> 💡 **Notificaciones Push:** Cualquier usuario suscrito a notificaciones push en este tenant recibirá esta alerta en tiempo real en su dispositivo si tiene habilitado el evento en sus preferencias.

---

### 3.9 `senda.fetch(url)`

Ejecuta un request HTTP con protección SSRF. Solo permite requests a hostnames registrados en el catálogo de acciones del tenant o en la allowlist del sistema (`senda.telar.ai`, `api.openai.com`, `api.cloudflare.com`).

```javascript
// Consultar API externa y enriquecer con IA
const response = await senda.fetch('https://api.micrm.com/leads?status=new');
const leads = JSON.parse(response);

const resumen = await senda.askAI(`
  Analizá estos ${leads.length} leads nuevos y clasificalos por potencial:
  ${JSON.stringify(leads.map(l => ({ nombre: l.name, empresa: l.company, valor: l.value })))}
  
  Respondé con un JSON array: [{ nombre, potencial: "alto"|"medio"|"bajo", razon }]
`);

return {
  message: `📊 ${leads.length} leads analizados`,
  clasificacion: JSON.parse(resumen)
};
```

> ⚠️ **SSRF Protection:** Si intentás hacer fetch a un hostname no registrado, el sistema lanza un error. Registrá el hostname primero como una acción HTTP en el catálogo (puede estar inactiva).

---

## 4. Seguridad del Sandbox

| Control | Descripción |
|---------|-------------|
| **Timeout** | 10 segundos máximo de ejecución por script |
| **Sin timers** | `setTimeout` y `setInterval` están deshabilitados (`undefined`) |
| **Detección de ciclos** | `visitedActionIds` Set previene loops A → B → C → A |
| **Profundidad máxima** | 5 niveles de recursión en `callAction` |
| **SSRF protection** | `fetch` y `registerAction` solo permiten hostnames del catálogo + allowlist |
| **Sin acceso al filesystem** | No hay `fs`, `require`, ni `import` disponibles |
| **Fallback estático** | Si la ejecución dinámica falla, el sistema intenta parsear `return {...}` como JSON |

---

## 5. Patrones de Diseño

### 5.1 Workflow Multi-Paso con Estado

```javascript
// Proceso de aprobación de gastos en 3 pasos
const key = `approval:${params.solicitud_id}`;
let state = await senda.state.get(key);
state = state ? JSON.parse(state) : { paso: 1, aprobaciones: [] };

switch (state.paso) {
  case 1: // Aprobación del líder directo
    state.aprobaciones.push({ rol: 'lider', aprobado: params.aprobado, fecha: new Date().toISOString() });
    if (params.aprobado) {
      state.paso = 2;
      await senda.state.set(key, JSON.stringify(state), 86400);
      // Notificar al siguiente aprobador
      await senda.callAction('notificar-aprobador', { 
        solicitud_id: params.solicitud_id, 
        aprobador: 'gerente_area' 
      });
      return { message: '✅ Aprobado por líder. Enviado a gerente de área.' };
    } else {
      await senda.state.delete(key);
      return { message: '❌ Solicitud rechazada por el líder directo.' };
    }
    
  case 2: // Aprobación del gerente
    state.aprobaciones.push({ rol: 'gerente', aprobado: params.aprobado, fecha: new Date().toISOString() });
    if (params.aprobado) {
      await senda.state.delete(key);
      await senda.callAction('procesar-pago', { solicitud_id: params.solicitud_id });
      return { message: '✅ Gasto aprobado y enviado a pago.' };
    } else {
      await senda.state.delete(key);
      return { message: '❌ Solicitud rechazada por gerente de área.' };
    }
}
```

### 5.2 Automatización Event-Driven Auto-Configurada

```javascript
// Script que se auto-configura como monitor de SLA
const slaConfig = {
  'ticket.created': { action: 'verificar-sla-ticket', delay: '4h' },
  'ticket.escalated': { action: 'alertar-escalacion', delay: '30m' }
};

for (const [evento, config] of Object.entries(slaConfig)) {
  await senda.observe(`ext:jira:${evento}`, config.action);
}

// Agendar reporte de cumplimiento SLA cada lunes
await senda.schedule({
  action_id: 'reporte-sla-semanal',
  cron: '0 8 * * 1'
});

return { 
  message: `🔔 Monitor de SLA configurado: ${Object.keys(slaConfig).length} eventos monitoreados + reporte semanal.`
};
```

### 5.3 Enriquecimiento de Datos con IA

```javascript
// Pipeline: Fetch datos → Enriquecer con IA → Almacenar → Reportar
const ventas = await senda.fetch('https://api.micrm.com/ventas?mes=actual');
const datos = JSON.parse(ventas);

const analisis = await senda.askAI(`
  Analizá las ventas del mes y generá:
  1. Top 3 productos por revenue
  2. Tendencia vs mes anterior (sube/baja/estable)
  3. 2 recomendaciones accionables
  
  Datos: ${JSON.stringify(datos)}
  Respondé en JSON: { top3: [...], tendencia: "...", recomendaciones: [...] }
`);

// Guardar para consultas futuras
await senda.state.set(`analytics:ventas:${new Date().toISOString().slice(0,7)}`, analisis, 2592000);

return {
  message: '📊 Análisis de ventas generado',
  ...JSON.parse(analisis)
};
```

### 5.4 Pipeline Orquestado con Manejo de Errores

```javascript
// Onboarding completo de empleado con rollback parcial
const resultados = [];

try {
  // Paso 1: Crear usuario en directorio
  const usuario = await senda.callAction('crear-usuario-ad', {
    nombre: params.nombre,
    email: params.email,
    departamento: params.departamento
  });
  resultados.push({ paso: 'Crear usuario', status: '✅' });

  // Paso 2: Asignar licencias
  await senda.callAction('asignar-licencias', {
    usuario_id: usuario.id,
    licencias: ['office365', 'slack', 'jira']
  });
  resultados.push({ paso: 'Asignar licencias', status: '✅' });

  // Paso 3: Crear cuentas en sistemas
  await senda.callAction('provisionar-sistemas', {
    usuario_id: usuario.id,
    sistemas: params.sistemas || ['email', 'chat', 'vpn']
  });
  resultados.push({ paso: 'Provisionar sistemas', status: '✅' });

  // Paso 4: Enviar email de bienvenida
  await senda.callAction('enviar-bienvenida', {
    email: params.email,
    nombre: params.nombre,
    credenciales_url: usuario.credenciales_url
  });
  resultados.push({ paso: 'Email bienvenida', status: '✅' });

  return {
    message: `✅ Onboarding completado para ${params.nombre}`,
    pasos: resultados
  };

} catch (error) {
  resultados.push({ paso: error.step || 'Desconocido', status: '❌', error: error.message });
  
  // Agendar revisión manual
  await senda.schedule({
    action_id: 'revisar-onboarding-fallido',
    run_in: '15m',
    params: { nombre: params.nombre, resultados, error: error.message }
  });

  return {
    message: `⚠️ Onboarding parcial para ${params.nombre}. Se agendó revisión manual en 15 minutos.`,
    pasos: resultados
  };
}
```

---

## 6. Errores Comunes y Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `CyclicActionError` | La cadena de `callAction` formó un ciclo (A→B→A) | Rediseñar el flujo para evitar llamadas circulares |
| `MaxDepthExceeded` | Más de 5 niveles de recursión en `callAction` | Aplanar la cadena usando menos niveles de anidamiento |
| `SSRFBlockedError` | `fetch` o `registerAction` intentó acceder a un hostname no autorizado | Registrar el hostname como acción HTTP en el catálogo (puede estar inactiva) |
| `ScriptTimeoutError` | El script excedió los 10 segundos de ejecución | Optimizar operaciones o dividir en múltiples acciones encadenadas |
| `KVQuotaExceeded` | Demasiadas operaciones de `state` en un período corto | Reducir frecuencia de escrituras, usar batch updates |
| `ActionNotFoundError` | `callAction` con un ID que no existe en el catálogo | Verificar el ID con `getAvailableActions()` antes de llamar |
| `JSONParseError` | `askAI` retornó texto no parseable cuando se esperaba JSON | Agregar instrucciones más explícitas al prompt ("Respondé SOLO JSON válido, sin markdown") |

---

## 7. Mejores Prácticas

1. **Siempre usá try/catch** en `callAction` — las acciones externas pueden fallar
2. **Usá TTL en `state.set`** — el estado sin TTL expira en 24h por defecto, pero puede acumularse
3. **No excedas 5 niveles de recursión** — si necesitás más, rediseñá el flujo
4. **Usá `confirm_before`** en acciones destructivas ejecutadas via el Bridge
5. **Logeá transiciones de estado importantes** — facilita el debugging
6. **Validá los retornos de `askAI`** — el LLM puede devolver formatos inesperados
7. **Prefijá claves de `state`** — usa `cart:`, `approval:`, `session:` para organizar
8. **Usá `getAvailableActions()`** para verificar existencia antes de `callAction`

---

## 8. Senda Studio Engine: Arquitectura de Creación con IA (BETA)

> 🔖 **BETA** — Disponible desde v5.11.0. Protegido bajo flag `feature_senda_studio`.

Senda Studio es el motor que permite crear agentes, acciones, pipelines y automatizaciones **desde lenguaje natural**. Esta sección documenta la arquitectura interna para integradores y desarrolladores que necesiten entender o extender el sistema.

### Arquitectura de Componentes

| Componente | Archivo | LOC | Responsabilidad |
|---|---|---|---|
| **UI Principal** | `SendaStudio.tsx` | ~300 | Modal de 3 fases: Input → Preview → Success |
| **Hook de Estado** | `useStudio.ts` | ~150 | Gestión de estado: create/refine/confirm/test |
| **Panel de Preview** | `StudioPreviewPanel.tsx` | ~400 | Renderizado de specs por tipo de intent |
| **Motor de IA** | `studioEngine.ts` | ~350 | Clasificación de intent + generación de specs |
| **Persistencia** | `studioPersistence.ts` | ~250 | Creación de entidades en DB |
| **Rutas API** | `routes/studio.ts` | ~120 | 4 endpoints REST |

### Pipeline de Creación (4 Fases)

#### Fase 1: Clasificación de Intent (`classifyIntent`)

El usuario escribe una descripción en lenguaje natural. El motor clasifica automáticamente en uno de 4 tipos de intent:

| Intent | Ícono | ¿Qué crea? | Ejemplo de prompt |
|---|---|---|---|
| `agent` | 🤖 | Agente con nombre, resumen, System Prompt, capabilities | *"Un agente de soporte que acceda a Jira y responda con la wiki"* |
| `action` | 🔧 | Acciones HTTP/script con endpoint, método, parámetros | *"Una acción que consulte stock en SAP"* |
| `pipeline` | 🔄 | Secuencia de acciones encadenadas | *"Un pipeline que busque cliente, calcule descuento y envíe cotización"* |
| `automation` | ⏰ | Schedule con cron + acción vinculada | *"Un reporte de KPIs todos los lunes a las 9am"* |

El clasificador también ejecuta `detectServiceFromPrompt()` para enriquecer con contexto de integración (Jira, SAP, Slack, etc.) desde la **Integration KB**.

**Output:** `{ intent, service, confidence (0-100), summary }`

#### Fase 2: Generación de Spec (`generateSpec`)

4 system prompts especializados según el intent detectado:

| Intent | Prompt | Output principal |
|---|---|---|
| `agent` | `AGENT_SPEC_PROMPT` | `{ agent: { name, summary, systemPrompt, capabilities[] }, actions[], automations[], warnings[], refinements[] }` |
| `action` | `ACTION_SPEC_PROMPT` | `{ actions: [{ name, description, action_type, method, endpoint, parameters, headers_template, payload_template }] }` |
| `pipeline` | `PIPELINE_SPEC_PROMPT` | Múltiples acciones encadenadas como steps |
| `automation` | `AUTOMATION_SPEC_PROMPT` | Acciones + `automations: [{ name, cron, action_name, params }]` |

Si se detectó un servicio, `lookupIntegration()` y `formatKBForPrompt()` inyectan documentación específica de la API del servicio en el prompt.

#### Fase 3: Refinamiento (`refineSpec`)

El usuario puede iterar sobre la spec generada con instrucciones en lenguaje natural:

1. Recibe la spec actual + instrucción de refinamiento
2. Envía ambos al LLM con `REFINE_SYSTEM_PROMPT`
3. Retorna la spec modificada preservando el `sessionId`

El historial de refinamientos se muestra como una línea de tiempo en el `StudioPreviewPanel`.

#### Fase 4: Persistencia (`confirmSpec`)

Cuando el usuario confirma, `studioPersistence.ts` crea las entidades en la base de datos:

**Agente** (si `spec.agent` existe):
- INSERT en `agents` con: id, tenant_id, group_id, name, system_prompt, agent_summary
- Auto-resuelve grupo por defecto: busca `g_soporte` o `code='soporte'|'studio'`, crea `g_studio_*` si no existe
- Siempre: `is_primary=0`, `test_mode=0`, `is_active=1`

**Acciones** (por cada `spec.actions[]`):
- INSERT en `action_catalog` con todos los campos de configuración
- `tool_name` normalizado via `normalizeToolName()` (NFD, lowercase, alfanumérico + underscores)
- Acciones sin endpoint se crean como inactivas (`is_active=0`)
- Validación de URL via `validateEndpointUrl()`
- Carpeta por defecto: `'Senda Studio'`

**Vínculos Agente-Acción** (si se creó agente + acciones activas):
- INSERT en `agent_actions` con: threshold=85, require_confirmation=1, fast_track=0

Al finalizar, invalida la caché del catálogo via `invalidateCatalogCache()`.

### API Endpoints

Todos requieren autenticación de sesión + `hasTenantAdminPermission` + flag `feature_senda_studio`.

| Método | Ruta | Descripción | Input |
|---|---|---|---|
| `POST` | `/api/studio/create` | Clasificar intent + generar spec | `{ prompt }` |
| `POST` | `/api/studio/refine` | Refinar spec existente con NL | `{ sessionId, instruction, spec }` |
| `POST` | `/api/studio/confirm` | Persistir spec en DB | `{ sessionId, spec }` |
| `POST` | `/api/studio/test` | Probar agente con mensaje simulado | `{ sessionId, message, spec }` |

### Endpoint de Test

El test permite probar la spec **antes de persistirla**:
1. Extrae `systemPrompt` de `spec.agent?.systemPrompt` (o usa fallback genérico)
2. Llama a `executeAI('agent_response', ...)` con max_tokens=1024
3. Retorna la respuesta simulada del agente

### Renderizado en el Preview Panel

El `StudioPreviewPanel` renderiza la spec según el intent detectado:

| Intent | Visualización |
|---|---|
| `agent` | Tarjeta con nombre, resumen, System Prompt expandible, chips de capabilities |
| `action` | Badge de método (GET/POST), endpoint, chips de parámetros |
| `pipeline` | Pasos numerados con flechas conectoras entre tarjetas |
| `automation` | Configuración cron con acción vinculada |

Además muestra: badge de intent (color-coded), session ID, sección de warnings, historial de refinamientos, y botones "Refinar" + "Crear" + "Probar".

---

## 9. Checklist del Desarrollador de Scripts

- [ ] El script maneja errores con try/catch
- [ ] Las llamadas a `callAction` no forman ciclos
- [ ] Los valores de `state` tienen TTL apropiado
- [ ] Las URLs en `fetch` están registradas en el catálogo
- [ ] Los prompts de `askAI` son específicos y piden formato de respuesta
- [ ] Las acciones destructivas usan confirmación
- [ ] El script completa en menos de 10 segundos
- [ ] Se probó el script con datos reales y edge cases
- [ ] Los observers registrados con `observe` tienen acciones activas como target
- [ ] El script no almacena datos sensibles (PII, tokens) en `state`
- [ ] ¿Entiendo las 4 fases del pipeline de creación de Studio (clasificar → generar → refinar → persistir)?
- [ ] ¿Conozco los 4 tipos de intent que Studio puede clasificar?
- [ ] ¿Sé cómo funciona el endpoint de test para probar specs sin persistirlas?

---

> 📖 **Anterior:** [08 — Debugging Técnico](./08_troubleshooting.md)
> 📖 **Siguiente:** [Índice del Manual](./index.md)
