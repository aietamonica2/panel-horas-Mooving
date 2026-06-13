# 05. Mission Control: Automatización Autónoma

> **Versión documentada:** v5.20.13 · **Última revisión:** 2026-05-29

> **Capítulo 5 del Manual Técnico.** Mission Control es donde Senda deja de ser reactivo y se vuelve proactivo. Aquí configurás todo lo que la IA hace sola: tareas programadas, vigilancia de eventos, webhooks externos, templates pre-configurados y el dashboard de ROI que justifica la inversión ante el directorio.

---

## La Gran Diferencia: Reactivo vs. Proactivo

Hasta aquí, aprendiste a configurar acciones que el usuario dispara escribiendo en el chat. Mission Control agrega una dimensión completamente nueva: **acciones que Senda ejecuta solo**, sin que ningún usuario escriba nada.

| Modo | ¿Cuándo actúa? | ¿Quién lo dispara? | Valor de negocio |
|---|---|---|---|
| **Reactivo** (Caps 01, 02 y 03) | Cuando el usuario escribe | El usuario | Ahorra tiempo al usuario |
| **Programado** (Schedule) | A una hora o frecuencia definida | El reloj del sistema | Elimina tareas manuales repetitivas |
| **Por Evento** (Observer) | Cuando algo ocurre en el sistema | Un evento interno o externo | Detección y respuesta en tiempo real |

---

## El Hub: ¿Dónde Está Mission Control?

Desde el menú lateral de Senda: **Inteligencia & Datos → Mission Control**.

La pantalla tiene dos zonas:

**Zona superior — KPIs en tiempo real:**
```ui-mockup
📅 Programadas activas: 5    👁️ Observadores activos: 3
⚡ Ejecuciones hoy: 89       ✅ Tasa de éxito: 94%

💰 Valor generado este mes:  USD 4.350
   Acumulado total:           USD 24.350
   Proyección anual:          USD 52.200
```

**Zona inferior — 4 tabs:**
| Tab | Función |
|---|---|
| **📅 Programadas** | Gestionar acciones que corren en horarios definidos |
| **👁️ Observadores** | Gestionar vigilantes que reaccionan a eventos |
| **🕐 Historial** | Registro completo de todas las ejecuciones |
| **📚 Templates** | Catálogo de 20+ automatizaciones listas para instalar |

---

## Acciones Programadas (Schedules)

### ¿Qué es un Schedule?

Un Schedule es una acción del catálogo que Senda ejecuta automáticamente según un horario. El sistema utiliza el estándar **cron** internamente, pero el Wizard te abstrae completamente de esa complejidad técnica.

### Casos de Uso Típicos

- 📊 Reporte semanal de KPIs enviado automáticamente a gerencia cada lunes a las 9am
- 📦 Verificación diaria de stock crítico y alerta si hay productos bajo mínimo
- 🧹 Limpieza nocturna de logs y sesiones temporales
- 🔑 Renovación automática de tokens de autenticación de APIs externas antes de que venzan
- 📧 Resumen de conversaciones del día enviado al equipo de analistas cada viernes a las 17hs
- 📅 Recordatorio mensual de renovaciones de contratos con 30 días de anticipación

### Crear un Schedule — El Wizard de 3 Pasos

**Paso 1: Elegir la Acción**
```
¿Qué acción del catálogo quiero ejecutar automáticamente?
→ Seleccionar desde el listado del catálogo
→ Ej: "Generar y Enviar Reporte de Ventas Semanal"
```

**Paso 2: Configurar el Horario**

El Wizard ofrece cuatro modos:

| Modo | Opciones disponibles |
|---|---|
| **Diario** | Hora del día. Ej: "Todos los días a las 08:00" |
| **Semanal** | Día(s) de la semana + hora. Ej: "Lunes y Viernes a las 09:00" |
| **Mensual** | Día del mes + hora. Ej: "El día 1 de cada mes a las 07:00" |
| **Personalizado** | Para expresiones avanzadas (el Wizard las valida) |

```
Frecuencia: Semanal
Días: ✅ Lunes
Hora: 09:00
Zona horaria: America/Buenos_Aires  [importante: verificar con el cliente]
```

**Paso 3: Confirmar y Activar**
```
Nombre: "Reporte Semanal — KPIs de Ventas"
Parámetros de la acción: { "periodo": "ultima_semana", "formato": "ejecutivo" }
Estado: ○ Activar ahora  ● Guardar como borrador
```

### El Test Sandbox (Botón 🧪 Probar)

Esta es la herramienta más valiosa para schedules. En lugar de activar la automatización y esperar hasta el próximo lunes para ver si funciona, podés ejecutarla ahora mismo:

```ui-mockup
┌─────────────────────────────────────────────────────────────┐
│ 🧪 Probar: Reporte Semanal — KPIs de Ventas                 │
│                                                             │
│ Parámetros que recibirá la acción:                          │
│ { "periodo": "ultima_semana", "formato": "ejecutivo" }      │
│ [Editar parámetros si querés probar con otros valores]      │
│                                                             │
│ [▶️ Ejecutar ahora]                                          │
│                                                             │
│ RESULTADO (3.2 segundos):                                   │
│ ✅ Éxito                                                     │
│ Respuesta: "Reporte generado y enviado a gerencia@empresa.com│
│             (5 destinatarios). Ver adjunto: kpis_may26.pdf" │
└─────────────────────────────────────────────────────────────┘
```

**Flujo de validación recomendado:**
1. Crear el schedule en estado borrador
2. Usar 🧪 Probar para validar que funciona correctamente
3. Revisar el resultado (¿llegó el email? ¿el reporte tiene los datos correctos?)
4. Si todo está bien → activar el schedule

### Gestionar Schedules Activos

En la grilla de la tab Programadas, cada fila muestra:
- Nombre y acción ejecutada
- Horario configurado
- Próxima ejecución (timestamp exacto)
- Última ejecución: estado (✅ Éxito / ❌ Error) + timestamp
- Badge de valor ROI configurado
- Botones: **🧪 Probar** · **⏸ Pausar / ▶️ Activar** · **✏️ Editar** · **🗑️ Eliminar**

---

## Observadores de Eventos (Observers)

### ¿Qué es un Observer?

Un Observer es una lógica de vigilancia que espera que algo ocurra y reacciona automáticamente. La sintaxis conceptual es siempre:

```
SI [ocurre este evento] Y [se cumple esta condición] → EJECUTAR [esta acción]
```

Los observers son más poderosos que los schedules porque no dependen de un reloj — reaccionan **en tiempo real** ante eventos del sistema.

### Los 4 Eventos Internos Disponibles

| Evento | Se dispara cuando... | Datos disponibles |
|---|---|---|
| `on_action_executed` | Cualquier acción del catálogo se ejecuta **con éxito** | Nombre de la acción, resultado, agente que ejecutó |
| `on_action_failed` | Cualquier acción falla | Nombre de la acción, error, cantidad de fallos consecutivos |
| `on_new_chat` | Un usuario inicia una nueva conversación | Nombre del usuario, espacio donde inició |
| `on_new_user` | Se registra un nuevo usuario en el tenant | Nombre, email, fecha de alta |

### Las Condiciones: De Simple a Compleja

**Sin condición** — el observer se dispara siempre que ocurra el evento:
```
Evento: on_new_user
Sin condición → Enviar email de bienvenida a TODOS los usuarios nuevos
```

**Condición simple** — un solo criterio:
```
Evento: on_action_failed
Condición: result.consecutive_failures >= 3
→ Solo alerta si la misma acción falló 3 o más veces seguidas
```

**Condición compuesta con AND** — todos los criterios deben cumplirse:
```json
{
  "AND": [
    { "field": "result.consecutive_failures", "op": "gte", "value": 3 },
    { "field": "action_name", "op": "contains", "value": "pago" }
  ]
}
→ Solo alerta si la acción de PAGOS falló 3+ veces
```

**Condición compuesta con OR** — al menos uno debe cumplirse:
```json
{
  "OR": [
    { "field": "result.consecutive_failures", "op": "gte", "value": 5 },
    { "field": "result.error_code", "op": "eq", "value": "CRITICAL_FAILURE" }
  ]
}
→ Alerta si falló 5+ veces O si el error es clasificado como crítico
```

**Condición anidada AND/OR:**
```json
{
  "AND": [
    { "field": "action_name", "op": "contains", "value": "factura" },
    {
      "OR": [
        { "field": "result.monto", "op": "gte", "value": 100000 },
        { "field": "result.tipo_cliente", "op": "eq", "value": "enterprise" }
      ]
    }
  ]
}
→ Solo reaccionar si es una acción de facturación Y (el monto >= $100k O el cliente es enterprise)
```

**Operadores disponibles:**
| Operador | Significado | Ejemplo |
|---|---|---|
| `eq` | Igual a | `status == "error"` |
| `neq` | Distinto de | `tipo != "interno"` |
| `gt` | Mayor que | `monto > 50000` |
| `gte` | Mayor o igual | `fallos >= 3` |
| `lt` | Menor que | `stock < 10` |
| `lte` | Menor o igual | `dias_restantes <= 30` |
| `contains` | Contiene el texto | `nombre contiene "SAP"` |
| `not_contains` | No contiene | `tag no contiene "test"` |
| `in` | Está en la lista | `estado in ["pendiente","atrasado"]` |

### El Dry Run: Probar sin Ejecutar

El botón **🧪 Probar** en un observer abre el panel de Dry Run — la herramienta más útil para debuggear condiciones:

```ui-mockup
┌─────────────────────────────────────────────────────────────┐
│ 🧪 Dry Run: Alerta cuando acción de pagos falla             │
│                                                             │
│ Payload simulado (editable — escribí un caso de prueba):    │
│ {                                                           │
│   "action_name": "Procesar Pago Mensual",                   │
│   "result": {                                               │
│     "consecutive_failures": 4,                              │
│     "error_code": "TIMEOUT",                                │
│     "last_error": "Connection timeout after 30s"            │
│   }                                                         │
│ }                               [Cargar ejemplo del sistema] │
│                                                             │
│ [▶️ Evaluar condición (Dry Run)]                             │
│                                                             │
│ RESULTADO:                                                  │
│ ✅ result.consecutive_failures (4) >= 3 → CUMPLE            │
│ ✅ action_name contiene "pago" → CUMPLE                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 🟢 El observer DISPARARÍA la acción "Notificar Slack"       │
│ ⚠️ MODO DRY RUN — La acción real NO fue ejecutada           │
└─────────────────────────────────────────────────────────────┘
```

El Dry Run evalúa cada condición individualmente y te dice exactamente si el observer hubiera disparado o no. Elimina completamente el ciclo "configuro → espero días al evento real → descubro que la condición estaba mal → vuelvo a empezar".

---

## Webhooks Externos: Recibir Eventos del Mundo

Además de los 4 eventos internos, Senda puede recibir eventos de sistemas externos a través de [Webhooks](00_glosario.md#glosario-webhook).

### ¿Cuándo Usar Webhooks Externos?

- Tu CRM (Salesforce, HubSpot) acaba de crear una oportunidad nueva → Senda envía un mensaje de bienvenida al cliente
- Tu tienda online (Shopify, WooCommerce) recibió un pedido → Senda registra el pedido y notifica al almacén
- Tu sistema de RRHH activó un nuevo empleado → Senda crea el usuario en Senda y envía el onboarding
- Tu sistema de monitoreo detectó un servidor caído → Senda crea un ticket de incidente automáticamente

### Cómo Configurar un Webhook Externo

**Paso 1: Registrar la Fuente en Senda**

En Mission Control → tab **Webhooks (si está disponible)** o desde la configuración del Observer:

```ui-mockup
Nombre:           "Shopify — Pedidos Nuevos"
Provider:         shopify
Prefijo de evento: ext:shopify
Signing Secret:   [pegar la clave que Shopify te proporciona]  ← opcional pero recomendado
```

Senda genera una **URL de ingesta única**:
```
https://senda.tu-dominio.com/api/webhooks/inbound/wh_xyz789abc123
```

**Paso 2: Configurar el Sistema Externo**

Pegá esa URL en la configuración de Webhooks de Shopify (o del sistema que uses), apuntando al evento que querés escuchar (ej: "orders/created").

**Paso 3: Crear el Observer**

```ui-mockup
Evento: ext:shopify:orders/created    ← el evento que llegará
Condición: payload.order.total_price > 100000    ← solo si el pedido supera $100k
Acción: "Notificar al gerente de cuentas"
```

### Seguridad de Webhooks

La URL de ingesta es pública por diseño (debe poder recibir llamadas desde internet). La seguridad se garantiza mediante:

- **Firma HMAC**: Si el sistema externo firma sus payloads (Shopify, GitHub, Stripe lo hacen automáticamente), Senda verifica la firma automáticamente. Si la firma no coincide, el webhook es rechazado.
- **Signing Secret cifrado**: El secreto HMAC se almacena en la base de datos usando [cifrado AES-GCM](00_glosario.md#glosario-cifrado).

> **Para el implementador:** Pedile al equipo técnico del sistema externo que confirme si su webhook incluye HMAC. Si lo incluye, registrá el signing secret en Senda. Si no lo incluye, la URL sola es suficiente, aunque menos segura.

---

## La Biblioteca de Templates

La tab **📚 Templates** contiene **20+ automatizaciones pre-configuradas** listas para instalar en segundos. Están organizadas por categoría de negocio:

### Categorías Disponibles

**⚙️ Operaciones**
- Monitor de salud de APIs (verifica cada hora que las APIs críticas responden)
- Backup diario de configuraciones
- Limpieza nocturna de logs y sesiones
- Alerta de expiración de certificados SSL (30 días antes)

**📊 Ventas y Comercial**
- Reporte semanal del pipeline de ventas
- Alerta cuando una oportunidad lleva más de 14 días sin actividad
- Notificación de nuevo lead al responsable de ventas

**⚖️ Legal & Compliance**
- Recordatorio de vencimiento de contratos (30 y 7 días antes)
- Alerta de breach de SLA con escala automática
- Reporte mensual de auditoría

**👥 RRHH y Onboarding**
- Bienvenida automática a nuevos usuarios con email personalizado
- Recordatorio de evaluaciones de desempeño
- Alerta de vencimiento de documentos del empleado

**💻 IT y Sistemas**
- Alerta crítica cuando una acción falla 3+ veces consecutivas
- Notificación de usuario nuevo con asignación automática de permisos
- Monitor de tiempo de respuesta de APIs

### Cómo Instalar un Template

```ui-mockup
1. Buscar el template en la lista (por nombre o categoría)

2. Click en "Ver detalles" para leer la descripción completa

3. Click en "Instalar"

4. Completar los campos personalizados:
   → URL del webhook de Slack: https://hooks.slack.com/services/T...
   → Número de fallos consecutivos que disparan la alerta: 3
   → Email de destino para las notificaciones: ops@empresa.com

5. Click en "Instalar automatización"
   → Senda crea el schedule u observer con esos valores
   → La automatización queda en estado "activo" inmediatamente
```

---

## El Historial de Ejecuciones

La tab **🕐 Historial** es el registro completo de todo lo que Mission Control ejecutó.

### ¿Para Qué Sirve?

- Verificar que los schedules ejecutaron correctamente
- Depurar por qué un observer no se disparó (o se disparó de más)
- Ver el detalle del error cuando una ejecución falla
- Ejecutar un rollback cuando algo salió mal

### Filtros Disponibles

```ui-mockup
Estado:    [Todos ▼] [✅ Éxito] [❌ Error] [⚠️ Advertencia]
Tipo:      [Todos ▼] [Schedule] [Observer]
Período:   [Últimas 24h ▼] [Esta semana] [Este mes] [Personalizado]
Acción:    [Buscar por nombre de acción...]
```

### Vista de una Ejecución

```ui-mockup
✅ Éxito | Reporte Semanal KPIs | Schedule | 2026-05-12 09:00:03
   Tiempo de ejecución: 4.2 segundos
   Respuesta: "Reporte enviado a 5 destinatarios. Adjunto: kpis_semana19.pdf"
   💰 Valor: $150
   [Ver detalles] [↩ Revertir]
   
❌ Error | Notificar Canal Slack | Observer | 2026-05-11 14:32:17
   Tiempo de ejecución: 0.8 segundos
   Error: "HTTP 400 — Invalid webhook URL. El webhook de Slack fue revocado."
   [Ver detalles] [🔄 Reintentar]
```

---

## Rollback: Revertir lo que Salió Mal

Cuando una ejecución automatizada produce resultados incorrectos, el botón **↩ Revertir** en el Historial te permite ejecutar la acción inversa configurada.

### Cuándo Usarlo

- Un observer envió automáticamente un email masivo con datos incorrectos
- Un schedule creó registros en el sistema con valores erróneos
- Una notificación automática fue enviada al destinatario incorrecto

### Cómo Funciona

```ui-mockup
1. En el Historial, encontrás la ejecución problemática
   → El botón ↩ Revertir solo aparece si:
     a) La acción tiene configurada una Acción Inversa en el catálogo
     b) La ejecución fue exitosa (solo se puede revertir lo que funcionó)
     c) Estás dentro de la ventana de tiempo de rollback (default: 24h)

2. Click en ↩ Revertir

3. Senda muestra los datos de la ejecución que se va a revertir
   y pide confirmación

4. Ejecuta la acción inversa con los mismos parámetros

5. La fila original queda marcada: "↩ Revertido — 12/05/26 14:45"

6. Aparece una entrada nueva en el historial con el log de la reversión
```

> **Importante:** La reversión llama al endpoint de la acción inversa. Si el sistema externo no soporta esa operación (ej: un email ya enviado no puede "des-enviarse" sin una API de cancelación), el rollback fallará. Verificá qué sistemas soportan reversión real antes de configurar la Acción Inversa.

---

## El Dashboard de ROI: El Argumento Irrefutable

El panel **💰 Valor Generado** convierte la automatización en un argumento de negocio concreto. Cada automatización puede tener configurado un valor económico por ejecución, y Senda acumula, proyecta y exporta esos números.

### Por Qué Es Crítico Configurarlo

El ROI Dashboard es tu principal herramienta para:
- **Renovaciones de contrato**: "En los últimos 6 meses, Senda generó $142.000 de valor documentado"
- **Justificación de la inversión**: El CFO necesita un número, no una descripción de features
- **Priorización de trabajo**: Saber qué automatizaciones generan más valor para priorizarlas
- **Demostraciones a nuevos clientes**: Mostrar el panel con valores reales de otro cliente (anonimizados)

### Configurar el Valor de una Automatización

En cada fila de la tab Programadas o Observadores, hay un badge **💰 Sin valor** o **💰 $XX**. Al hacer click:

```ui-mockup
┌─────────────────────────────────────────────────────────────┐
│ 💰 Valor estimado por ejecución                             │
│                                                             │
│ Tipo de valor:                                              │
│ ○ ⏱️ Tiempo recuperado    (horas de trabajo manual evitadas) │
│ ○ 💸 Costo evitado        (multas, errores, reprocesos)     │
│ ● 📈 Ingreso protegido    (revenue en riesgo detectado)     │
│                                                             │
│ USD por ejecución: [ 150.00 ]                               │
│                                                             │
│ Etiqueta descriptiva (para el informe del CFO):             │
│ [Detectar fallo de integración crítico antes de que afecte  │
│  a clientes. Evita hasta $2k en multas de SLA por evento.]  │
│                                                             │
│                      [Guardar]           [Cancelar]         │
└─────────────────────────────────────────────────────────────┘
```

### Cómo Calcular el Valor por Ejecución

**Tipo: Tiempo recuperado**
```
¿Cuántas horas de trabajo manual reemplaza esta automatización?
× Costo horario del perfil que lo hacía

Ejemplo: Reporte KPIs semanal
  3 horas de trabajo de un analista ($30/h) = $90/ejecución
```

**Tipo: Costo evitado**
```
¿Qué costo evita esta automatización si funciona correctamente?

Ejemplo: Observer de fallos de integración crítica
  Un fallo detectado tarde genera multas de SLA de ~$200
  → $200/ejecución del observer
```

**Tipo: Ingreso protegido**
```
¿Qué ingreso potencial protege o recupera esta automatización?

Ejemplo: Alerta de oportunidad en riesgo (14 días sin actividad)
  Tasa de recuperación del equipo de ventas: 30%
  Valor promedio de la oportunidad: $5.000
  → $1.500/ejecución (30% × $5k)
```

### Las 3 Métricas del Panel y el Informe de Exportación

```ui-mockup
VALOR GENERADO - SENDA
Empresa: TechCorp SA | Mayo 2026

─────────────────────────────────
Este mes:        USD  4.350
Acumulado:       USD 24.350
Proyección anual: USD 52.200
─────────────────────────────────

TOP 5 AUTOMATIZACIONES:
1. Monitor SLA (12 disparos × $150) ........... $1.800
   Evita multas por breach de SLA
2. Control Inventario (18 disparos × $30) ....... $540
   Previene quiebres de stock
3. Reporte KPIs Semanal (4 disparos × $90) ...... $360
   3h de trabajo manual de analista
4. Bienvenida Usuarios (7 disparos × $90) ........ $630
   2h de RRHH por empleado nuevo
5. Alerta Pagos Críticos (1 disparo × $500) ...... $500
   Detección en tiempo real de fallos en módulo de pagos
─────────────────────────────────
[Exportar como texto]
```

---

## Patrones de Automatización Recomendados

### Patrón A: El Vigilante Silencioso
```
Observer: on_action_failed + consecutive_failures >= 3
→ Notificar Slack #guardia-nocturna
→ Crear ticket de incidente P1 en Jira
ROI: $200/disparo (detectar antes de que impacte a usuarios)
```
Ideal para: SRE, operaciones IT, sistemas de pagos críticos.

### Patrón B: El Pulso Ejecutivo
```
Schedule: Lunes 09:00, Viernes 17:00
→ Generar reporte de KPIs del período
→ Enviar por email a lista de distribución gerencial
ROI: $90/ejecución (3h de trabajo de preparación manual)
```
Ideal para: Gerencias, customer success, finanzas.

### Patrón C: La Bienvenida Perfecta
```
Observer: on_new_user (sin condición)
→ Enviar email de bienvenida personalizado
→ Asignar usuario al grupo de onboarding en el sistema
→ Notificar a su manager por Slack
ROI: $90/usuario (2h de RRHH evitadas)
```
Ideal para: Empresas con incorporación frecuente de empleados.

### Patrón D: El Guardián de SLA
```
Observer: on_action_executed
Condición: result.sla_status == "breached" AND result.cliente_tier == "enterprise"
→ Escalar automáticamente al gerente de cuenta
→ Crear tarea urgente en CRM
→ Enviar disculpa proactiva al cliente
ROI: $500/disparo (evita churn de cliente enterprise)
```
Ideal para: Empresas de servicios con clientes premium.

### Patrón E: El Ciclo de Calidad
```
Schedule: Primer lunes de cada mes, 08:00
→ Ejecutar consolidación de aprendizajes del mes anterior
→ Enviar resumen de insights a los analistas
→ Exportar reporte de ROI para el director
ROI: $200/mes (cierre del ciclo de mejora continua)
```
Ideal para: Tenants maduros que quieren mantener y mejorar la calidad de sus agentes.

---

## Checklist de Mission Control

### Para Schedules
- [ ] La acción del catálogo está configurada y probada con el botón 🧪 en el catálogo
- [ ] La zona horaria configurada coincide con la del cliente (no asumir UTC)
- [ ] Se usó el **Test Sandbox** para confirmar que funciona antes de activar
- [ ] El valor ROI está configurado en el badge 💰

### Para Observers
- [ ] El evento elegido es el correcto para el comportamiento esperado
- [ ] La condición fue validada con el **Dry Run** antes de activar
- [ ] Se verificó que no se dispara demasiado (condición no demasiado amplia)
- [ ] El valor ROI está configurado

### Para Webhooks
- [ ] La URL de ingesta fue configurada en el sistema externo
- [ ] Si el sistema externo soporta HMAC, el signing secret está registrado en Senda
- [ ] Se hizo una prueba enviando un webhook real y verificando que el observer reaccionó

### Para Rollback
- [ ] Las acciones de alto impacto tienen `Acción Inversa` configurada en el catálogo
- [ ] El equipo del cliente sabe que existe el botón ↩ en el Historial
- [ ] La ventana de reversión es apropiada para el proceso (default 24h)

### Para ROI
- [ ] Al menos las top 5 automatizaciones tienen valor configurado
- [ ] El tipo de valor (tiempo/costo/ingreso) es coherente con el proceso
- [ ] La etiqueta descriptiva es legible para el CFO del cliente sin contexto técnico

---

## Goal Reasoning Engine: Agentes Que Persiguen Objetivos (BETA)

> 🔖 **BETA** — Disponible desde v5.17.0. Milestone MS-3.

El **Goal Reasoning Engine** permite que un agente evalúe cada interacción contra una lista de objetivos de negocio y ejecute cadenas de acciones automáticamente cuando detecta alineación. A diferencia de las acciones estándar (que requieren un match explícito), el Goal Engine razona sobre la intención subyacente del usuario.

### Activación: El Modelo Dual-Gate

Requiere ambas condiciones:
1. **Gate 1 — Flag global:** `feature_goal_reasoning` debe estar en ON
2. **Gate 2 — Config del agente:** `goalReasoningEnabled = true` Y al menos 1 objetivo configurado (`goalObjectives.length > 0`)

### Schema del Objetivo

```ts
interface GoalObjective {
  title: string;       // Título corto del objetivo
  description: string; // Descripción detallada
  priority: 'high' | 'medium' | 'low';
}
```

Máximo: 10 objetivos por agente. Se configuran en el **GoalObjectivesEditor** dentro del Agent Builder.

### Pipeline de Ejecución (2 Fases)

#### Fase 1: `evaluateGoalAlignment()`

Evalúa si el mensaje del usuario se alinea con algún objetivo:

- **Input:** Objetivos del agente + mensaje del usuario + últimos 5 mensajes de historial
- **Modelo:** Usa la función IA `action_extractor` con `response_format: json_object`
- **Output:** `{ shouldExecuteGoal, matchedGoal, confidence (0-1), plan: [{ step, action_name, params_hint, description }] }`
- **Umbral:** Solo procede a Fase 2 si `shouldExecuteGoal === true && confidence >= 0.6`

#### Fase 2: `executeGoalPlan()`

Ejecuta el plan de acciones paso a paso:

1. Para cada paso del plan, busca la mejor acción disponible con `findBestActionMatch()`
2. Si encuentra match → registra como `success` (actualmente simulado)
3. Si no encuentra match → registra como `skipped`
4. Construye la cadena de razonamiento completa (`reasoning_chain`)
5. Persiste el resultado como `GoalTrace`

### `findBestActionMatch()`: Búsqueda en 3 Niveles

| Nivel | Método | Ejemplo |
|---|---|---|
| 1️⃣ **Exacto** | Nombre completo normalizado | `"consultar_stock"` = `"consultar_stock"` |
| 2️⃣ **Substring** | Uno contiene al otro | `"consultar_stock_sap"` contiene `"stock"` |
| 3️⃣ **Word overlap** | Palabras en común | `"consultar_inventario"` ∩ `"consultar_stock"` = 1 palabra |

Si ningún nivel produce match, el paso se registra como `skipped`.

### Persistencia: Tabla `agent_goal_traces`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | TEXT | ID único (`gt_{timestamp36}_{random}`) |
| `tenant_id` | TEXT | Aislamiento multi-tenant |
| `agent_id` | TEXT | Agente que razonó |
| `conversation_id` | TEXT | Conversación donde ocurrió |
| `goal_matched` | TEXT | Descripción del objetivo alineado |
| `reasoning_chain` | TEXT (JSON) | Array de `{ step, action, input, output, status }` |
| `actions_executed` | TEXT (JSON) | Nombres de acciones ejecutadas |
| `outcome` | TEXT | `success` \| `partial` \| `failed` |
| `created_at` | DATETIME | Timestamp |

**Outcome:** `success` = todos los pasos exitosos; `partial` = al menos uno exitoso; `failed` = ninguno exitoso.

### Integración con el Chat (Phase 1.7)

Cuando el Goal Engine completa su evaluación, inyecta un bloque `[RAZONAMIENTO POR OBJETIVOS]` en el prompt final del chat con: objetivo coincidente, confianza %, plan ejecutado y resultado.

### API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/goal-traces/:agentId` | Últimas 20 trazas del agente (para GoalTraceViewer) |

### Archivos clave

| Archivo | LOC | Responsabilidad |
|---|---|---|
| `goalReasoner.ts` | 349 | Motor de evaluación y ejecución de planes |
| `GoalObjectivesEditor.tsx` | ~200 | UI de configuración de objetivos |
| `GoalTraceViewer.tsx` | ~250 | Panel de auditoría de trazas |
| `goalTraces.ts` | ~40 | Ruta API de consulta de trazas |

---

## Chatless Engine: Interfaz Sin Chat (BETA)

> 🔖 **BETA** — Disponible desde v5.18.0. Milestone MS-6.

El **Chatless Engine** permite que Senda muestre widgets proactivos cuando un usuario abre un espacio — sin necesidad de escribir nada en el chat. El motor evalúa una lista de triggers configurados y genera una interfaz personalizada usando IA.

### Activación

- **Feature flag:** `feature_chatless_ui` debe estar en ON
- **Configuración:** El agente debe tener triggers de tipo `ChatlessTrigger` configurados

### Pipeline de Ejecución (2 Etapas)

#### Etapa 1: `evaluateContext()` — Evaluar Triggers

Los triggers se ordenan por prioridad (`high` → `medium` → `low`) y se evalúan en secuencia. El primer trigger que matchea gana.

#### Los 5 Tipos de Trigger (implementación)

| Tipo | Condición | Lógica de evaluación | Dato que retorna |
|---|---|---|---|
| `time_of_day` | `morning`/`afternoon`/`evening`/`night` | `matchesTimeOfDay()`: convierte a hora local del tenant vía `toLocaleString(tz)`. Rangos: morning=[5,12), afternoon=[12,18), evening=[18,22), night=[22,5) con wrap-around | Hora local actual |
| `pending_items` | Umbral numérico (ej: `"5"`) | `SELECT COUNT(*) FROM chats WHERE tenant_id=? AND processed=0`. Activa si count ≥ threshold | Cantidad de items pendientes |
| `kpi_declining` | Nombre de métrica (ej: `"conversations"`) | Compara últimos 7 días vs 7 días anteriores en `v_analytics_conversations`. Activa si recent < previous * 0.8 (≥20% caída) | Porcentaje de caída |
| `new_session` | Cualquiera (ignorado) | Siempre activa. Retorna timestamp actual | Timestamp |
| `scheduled` | Expresión cron (5 campos) | `matchesScheduledCron()`: parsea minuto/hora/día/mes/dow contra hora local del tenant. Soporta números exactos y wildcards (`*`) | Timestamp |

#### Etapa 2: `generateChatlessInterface()` — Generar Widgets

1. Recopila datos KPI: conversaciones (total/pendientes), acciones 7d (total/exitosas/fallidas)
2. Obtiene nombre del agente y sus acciones disponibles (hasta 10)
3. Envía todo al LLM con `CHATLESS_SYSTEM_PROMPT` — genera 4-8 widgets en español con personalización según el trigger
4. Parsea JSON, sanitiza, asigna IDs (`cw_{agentId}_{idx}`)
5. En caso de error, retorna una interfaz fallback con un solo widget `summary_text`

### Los 5 Tipos de Widget (`ChatlessWidget`)

| Tipo | Visual | Ejemplo |
|---|---|---|
| `kpi_highlight` | Número grande con etiqueta y tendencia | "Ventas ayer: $45.200 (↑ 12%)" |
| `quick_action` | Botón que ejecuta una acción del catálogo | "Aprobar 3 pedidos pendientes" |
| `alert_card` | Tarjeta con ícono de alerta y descripción | "⚠️ 5 tickets sin resolver hace >48h" |
| `mini_chart` | Gráfico pequeño con serie de datos | Tendencia de ventas últimos 7 días |
| `summary_text` | Párrafo de texto con resumen | "Buenos días. Hoy tenés 3 tareas pendientes..." |

### API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/chatless/evaluate` | Evaluar triggers y generar interfaz. Input: `{ agentId }` |
| `POST` | `/api/chatless/action` | Ejecutar quick action. Input: `{ agentId, actionId, params }`. Logs con `chatless_{agentId}` |

Ambos endpoints están protegidos por el flag `feature_chatless_ui`.

### Consideraciones de Timezone

Los triggers `time_of_day` y `scheduled` dependen de la **zona horaria del tenant** (configurada en Administración → Zona Horaria). El motor convierte la hora UTC a hora local del tenant antes de evaluar. Si la zona horaria no está configurada, se usa `America/Argentina/Buenos_Aires` como fallback.

### Archivos clave

| Archivo | LOC | Responsabilidad |
|---|---|---|
| `chatlessEngine.ts` | ~350 | Motor de evaluación de triggers y generación de widgets |
| `routes/chatless.ts` | ~80 | Rutas API (evaluate + action) |
| Componente UI | (en features/) | Panel de widgets chatless en el espacio |

---


## Scheduling Conversacional: Programar desde el Chat — v4.7.0+

Además de crear schedules desde el panel de Mission Control, Senda puede detectar una intención temporal en el chat y proponer una automatización **directamente en la conversación**, sin que el usuario tenga que salir a ningún wizard.

### Cómo funciona

```ui-mockup
Usuario: "Podés enviarme el reporte de ventas todos los lunes a las 9am?"

[Senda detecta intención de scheduling]

Senda: "Entendido. Voy a programar el enviar el Reporte de Ventas
        todos los lunes a las 09:00 hs.
```
```ui-mockup
        ┌─────────────────────────────────────────────────────────────────┐
        │ 📅 Programar: Reporte de Ventas Semanal                    │
        │ Acción: Generar y enviar reporte                          │
        │ Frecuencia: Todos los lunes a las 09:00 hs               │
        └─────────────────────────────────────────────────────────────────┘
```
```ui-mockup
        [Confirmar agendamiento]          [Cancelar]"

Usuario: "Dale, confirmá"

Senda: "✅ ¡Perfecto! El Reporte de Ventas queda programado
        para todos los lunes a las 09:00 hs. Lo podés
        gestionar desde Mission Control."
```

### Keywords que activan la detección

Senda detecta automáticamente frases que indican intención de scheduling:

- Recurrencia: "todos los lunes", "cada semana", "todos los días", "cada mes"
- Programación futura: "programar para", "agendar", "automatizar"
- Frecuencia: "periódicamente", "de forma automática", "sin tener que pedirlo"

### Condición para que funcione

El scheduling conversacional solo se activa cuando el agente tiene al menos una acción vinculada en su configuración. El sistema no puede proponer automatizar algo que no tiene una acción concreta que ejecutar.

### Lo que se crea en Mission Control

Cuando el usuario confirma, Senda crea automáticamente el schedule en Mission Control con los parámetros detectados de la conversación. El implementador puede verlo, editarlo o eliminarlo desde el panel de Programadas.

> **Nota para el implementador:** Esta funcionalidad es especialmente útil para usuarios que nunca van a explorar Mission Control por su cuenta. Con una pregunta en el chat, pueden programar su primer reporte automático sin saber que Mission Control existe.

---

> 📖 **Anterior:** [04 — Intent Graph y Flujos Conversacionales](./04_intent_graph.md)  
> 📖 **Siguiente:** [06 — MCP Client y MCP Server](./06_mcp_client_y_server.md)
