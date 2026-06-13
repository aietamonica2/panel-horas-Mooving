# 7. Modo Simple y Modo Enterprise

> **Versión documentada:** v5.20.13 · **Última revisión:** 2026-05-29
> **Estado de la Feature:** 🟢 GA (General Availability) · Protegida bajo flag `ui_mode_switch`

---

## ¿Qué problema resuelve?

Un mismo panel de administración sirve a dos perfiles de clientes muy distintos:

- **PyMEs en primeras etapas:** el administrador es el dueño del negocio o alguien de IT sin experiencia en plataformas de IA. Mostrarle prompts de etiquetado, observadores de eventos o configuración de webhooks desde el primer día genera confusión y abandono.
- **Empresas Enterprise:** IT está involucrado, el implementador es técnico, y ocultar opciones avanzadas es contraproducente — necesita acceder a todo desde el primer clic.

El **Sistema de Modo Dual** resuelve esto con un switch de una sola acción que adapta completamente la interfaz de administración sin cambiar ningún dato subyacente ni afectar a los usuarios finales.

---

## Los dos modos

| Modo | Orientado a | ¿Qué muestra? | Valor por defecto |
|---|---|---|---|
| **Simple** | PyMEs, primeras implementaciones | Solo las funciones esenciales del día a día | ✅ Sí |
| **Enterprise** | Grandes cuentas, IT dedicado | Todas las funciones disponibles | No |

> 💡 **Para el implementador:** durante la configuración inicial, activar el modo Enterprise te da acceso a todos los controles. Podés pasarlo a modo Simple antes de hacer el handover al cliente si el perfil es PyME.

---

## Cómo activar o cambiar el modo

1. Ir al panel de administración → **Mi Organización**
2. Pestaña **Configuración** (o directamente al switch de modo de interfaz)
3. Activar o desactivar el switch **"Modo Enterprise"**

El cambio tiene **efecto inmediato** en toda la interfaz de administración, sin necesidad de recargar la página. El switch reactivo propaga el cambio a todos los componentes del panel en tiempo real.

> ⚠️ **Importante:** el cambio de modo es por tenant, no por usuario. Si el administrador activa modo Enterprise, todos los administradores del mismo tenant verán la interfaz completa.

---

## Qué cambia en cada modo

### Sidebar — Navegación Lateral

En modo Simple, los ítems de navegación de funcionalidades avanzadas desaparecen del menú lateral.

| Ítem | Simple | Enterprise |
|---|---|---|
| Dashboard / Chat | ✅ | ✅ |
| Configuración de Espacios y Agentes | ✅ | ✅ |
| Acciones y Automatizaciones (básico) | ✅ | ✅ |
| Mission Control / Analytics avanzado | ❌ | ✅ |
| RAG Sync (integraciones SharePoint/Drive) | ❌ | ✅ |

### Agent Builder — Solapas de Configuración

Cuando configurás un agente, las solapas analíticas avanzadas no aparecen en modo Simple. El contenido de las solapas visibles siempre se muestra de forma completa y normal — no existe contenido colapsado.

| Solapa | Simple | Enterprise | ¿Qué contiene? |
|---|---|---|---|
| Identidad | ✅ | ✅ | Nombre, system prompt, resumen, tema visual |
| Conocimiento | ✅ | ✅ | Documentos RAG, fuentes de sincronización |
| Acciones | ✅ | ✅ | Catálogo de acciones disponibles para el agente |
| Capacidades | ✅ | ✅ | Vision IA, escáner QR, generador QR, gráficos |
| Notas | ✅ | ✅ | Notas internas del equipo |
| Imágenes | ✅ | ✅ | Archivos de imagen del espacio |
| **Análisis** | ❌ | ✅ | Prompts de efectividad, aprendizaje y etiquetado |
| **Efectividad** | ❌ | ✅ | Scores de conversaciones evaluadas |
| **Participación** | ❌ | ✅ | Métricas de uso y participación |
| **Aprendizaje** | ❌ | ✅ | Insights extraídos de conversaciones |

> ⚠️ **Regla de diseño:** las solapas ocultas **desaparecen del TabBar completamente**. No existe un acordeón ni un "ver más" — simplemente no están. Si el administrador cambia de Enterprise a Simple mientras tiene activa una solapa oculta (ej: "Análisis"), el sistema lo redirige automáticamente a "Identidad".

### Automatizaciones

| Funcionalidad | Simple | Enterprise |
|---|---|---|
| Ver lista de webhooks activos | ✅ | ✅ |
| Crear nueva fuente de webhook | ❌ | ✅ |
| Ver lista de observers | ✅ | ✅ |
| Editar o probar un observer | ❌ | ✅ |

**La lógica de simplificación en Automatizaciones:** un PyME puede necesitar *ver* que tiene automatizaciones activas, pero raramente necesita *crear* un nuevo webhook o *editar* la lógica de un observer en su operación diaria. Esas acciones quedan para el implementador en modo Enterprise.

---

## Caso de uso: Handover a cliente PyME

Escenario típico: terminaste la configuración de un cliente PyME — espacios, agentes, acciones configuradas, automatizaciones creadas. Ahora entregás el panel al administrador del cliente.

**Pasos recomendados antes del handover:**

1. En **Mi Organización → Configuración**, cambiar a **modo Simple**
2. Navegar por el panel como si fueras el cliente — verificar que solo ven lo que necesitan
3. Si algo que debería estar visible no está, revisar si el ítem del Sidebar está marcado correctamente o si la solapa tiene `simpleHidden: true`
4. Documentar qué funciones permanecen "escondidas" para cuando el cliente esté listo para avanzar

**Cuándo volver a activar Enterprise:**
- El cliente quiere configurar sus propios prompts analíticos
- El cliente quiere crear nuevas automatizaciones avanzadas
- Hay un técnico de IT que tomará el control del panel

---

## Caso de uso: Implementación Enterprise desde el día 1

Para clientes con IT dedicado o implementadores con perfil técnico:

1. Al crear el tenant, activar **modo Enterprise** desde SuperAdmin
2. El administrador del cliente tiene acceso completo desde el primer login
3. No hay restricciones de visibilidad

> 💡 El switch de modo es visible para usuarios con rol `r_admin` o superior desde el panel de Administración.

---

## Gating de Rutas en Modo Simple (Route Gating)

Para garantizar la consistencia de la experiencia y que el usuario no pueda saltarse los controles visuales escribiendo URLs directamente en el navegador, Senda UI implementa un **Guardia de Rutas (Route Guard)** en el enrutador de React (`react-router-dom`).

### Funcionamiento del Gating

Si el modo de la interfaz está configurado en **Simple**:
1.  **Interceptación**: El guardián intercepta la navegación hacia rutas avanzadas restringidas, tales como:
    *   `/executive` (Resumen ejecutivo)
    *   `/config/action-logs` (Auditoría de acciones)
    *   `/config/integrations` (Integraciones avanzadas)
    *   `/config/audit` (Auditoría administrativa)
    *   `/config/security` (Políticas de seguridad)
    *   `/config/webhooks` (Webhooks salientes)
    *   `/config/keys` (API Keys)
    *   `/config/rag-sync` (Sincronizadores cloud de SharePoint/Drive)
    *   `/config/data` (Gestión de datos)
    *   `/config/mcp-servers` (Servidores MCP)
    *   `/ai-admin` (AI Gateway)
2.  **Redirección automática**: En lugar de montar el componente restringido, el enrutador redirige al usuario hacia la vista principal autorizada: **`/spaces`**.
3.  **Notificación**: Se despliega una alerta tipo toast indicando que la funcionalidad requiere activar el **Modo Enterprise** desde la sección de configuración de la organización.

Esto asegura que un cliente en modo simple se mantenga dentro de los límites visuales seguros sin encontrarse con flujos complejos inesperados.

---

## Lo que el modo NO afecta

Es importante aclarar qué **no cambia** con el modo:

| Aspecto | ¿Lo afecta el modo? |
|---|---|
| Los datos de agentes, acciones, automatizaciones | ❌ No. Todo sigue existiendo. |
| Los permisos de acceso de los usuarios finales | ❌ No. Los usuarios del chat no ven diferencia. |
| La seguridad del backend | ❌ No. El servidor valida permisos por JWT en cada request. |
| Las configuraciones ya hechas | ❌ No. Cambiar a Simple no borra ni desactiva nada. |
| El rendimiento del sistema | ❌ No. Es un filtro visual puro. |

> 🔒 **Garantía de seguridad:** el ocultamiento de ítems del Sidebar y solapas del TabBar es **exclusivamente visual**. Un administrador no puede obtener acceso a funcionalidades extra saltando la UI — el backend sigue aplicando RBAC en cada endpoint independientemente del modo configurado en la interfaz.

---

## Zona Horaria de la Organización

> 🔖 **BETA** — Esta funcionalidad está disponible como versión beta desde v5.20.7.

Senda permite configurar la **zona horaria del tenant** — es decir, la referencia temporal que se aplica a toda la organización. Esta configuración afecta cómo se muestran las fechas y horas en toda la plataforma: logs de auditoría, historial de automatizaciones, dashboards de ROI, y cualquier referencia temporal en la interfaz.

### ¿Dónde se configura?

**Ruta:** Mi Organización → Configuración → Zona Horaria

Solo los roles `Administrador` (`r_admin`) y `Owner del Tenant` (`r_tenant_owner`) pueden modificar esta configuración.

### ¿Qué se puede configurar?

El selector presenta las zonas horarias estándar [IANA](https://www.iana.org/time-zones) organizadas en 4 grupos:

| Grupo | Zonas disponibles |
|---|---|
| 🌎 **América** | Buenos Aires, São Paulo, Santiago, Bogotá, Lima, México City, New York, Chicago, Denver, Los Angeles, Toronto |
| 🌍 **Europa** | London, Madrid, Paris, Berlin, Rome, Lisbon, Moscow |
| 🌏 **Asia y Pacífico** | Dubai, India, Singapore, Tokyo, Shanghai, Sydney |
| 🌐 **Universal** | UTC |

Al seleccionar una zona, el panel muestra un **reloj en vivo** con la hora actual en esa zona y el **offset UTC** correspondiente (por ejemplo, `UTC-03:00` para Buenos Aires).

### Valor por defecto

Si no se configura explícitamente, el valor predeterminado es **America/Argentina/Buenos_Aires** (`UTC-03:00`).

### ¿Qué componentes se ven afectados?

El cambio de zona horaria tiene un efecto inmediato y transversal en toda la plataforma:

| Área | Efecto |
|---|---|
| **Schedules y Automatizaciones** | Las expresiones cron y los horarios de ejecución se interpretan en la zona configurada. Si un schedule dice "lunes a las 9:00", se ejecuta a las 9:00 de la zona del tenant |
| **Historial de Mission Control** | Todas las marcas de tiempo (ejecuciones, errores, rollbacks) se muestran en la zona del tenant |
| **Logs de Auditoría** | Los registros de quién hizo qué y cuándo se muestran en hora local |
| **Dashboard de ROI** | Métricas y ejecuciones agrupadas según la hora local del tenant |
| **Panel de Analytics** | Gráficos temporales, tendencias y filtros de fecha usan la zona configurada |
| **Chat** | Las marcas de tiempo de mensajes y el contexto temporal que el agente usa para responder |
| **Chatless UI** | Los triggers basados en hora del día ("a las 9 AM mostrar los KPIs") respetan la zona del tenant |
| **Interpretación de lenguaje natural** | Cuando un usuario dice "mañana a las 9", el agente interpreta "9 AM" en la zona del tenant |

> ⚠️ **Importante:** Internamente, Senda almacena todas las fechas en **UTC**. La zona horaria configurada solo afecta la **presentación** y la **interpretación** de horarios. Esto garantiza consistencia en entornos multi-zona.

### Procedimiento de cambio

1. Ir a **Mi Organización → Configuración**
2. En la sección **Zona Horaria**, seleccionar la zona deseada del listado
3. Verificar que el reloj en vivo y el offset UTC coincidan con lo esperado
4. Hacer clic en **Guardar**
5. El cambio es **inmediato** — no requiere reinicio ni re-login

> ⚠️ **Advertencia:** Esta configuración afecta a **todos los miembros de la organización**. Si la organización tiene oficinas en múltiples zonas horarias, se recomienda usar la zona de la oficina principal o la más representativa del equipo operativo.

### Impacto en Schedules existentes

Si cambiás la zona horaria después de haber creado schedules, las expresiones cron existentes se seguirán ejecutando con la **nueva interpretación**. Por ejemplo:

| Situación | Antes (UTC-03:00) | Después (UTC-05:00) |
|---|---|---|
| Schedule: "09:00 todos los días" | Se ejecuta a las 09:00 Buenos Aires (12:00 UTC) | Se ejecuta a las 09:00 Bogotá (14:00 UTC) |

> 💡 **Recomendación:** Revisá los schedules activos después de cambiar la zona horaria para verificar que los horarios sigan siendo correctos para el equipo.

### Checklist de Zona Horaria

- [ ] ¿Configuré la zona horaria correcta para mi organización?
- [ ] ¿Verifiqué que el reloj en vivo muestra la hora esperada?
- [ ] ¿Revisé los schedules existentes después del cambio?
- [ ] ¿Comuniqué el cambio a los administradores y usuarios que gestionan automatizaciones?

---

## Gestión de Feature Flags (Funcionalidades Progresivas)

Senda utiliza un sistema de **Feature Flags** que permite activar o desactivar funcionalidades de forma granular, sin necesidad de desplegar código nuevo. Esto permite un lanzamiento progresivo de funciones (primero en preview, luego para todos).

### El modelo de dos niveles

| Nivel | Dónde | ¿Quién lo controla? | ¿Qué hace? |
|---|---|---|---|
| **Flag global** | Tabla `feature_flags` | SuperAdmin | Define el estado base: `OFF` (apagado), `PREVIEW` (limitado), `ON` (activo para todos) |
| **Override por tenant** | Tabla `tenant_feature_overrides` | Administrador | Permite activar/desactivar una funcionalidad para un tenant específico, independientemente del estado global |

**Regla de resolución:** El override del tenant **siempre gana** sobre el flag global. Si el flag global está en `OFF` pero el tenant tiene un override `ON`, la funcionalidad está activa para ese tenant.

### Los 3 estados de un flag

| Estado | Ícono | Significado |
|---|---|---|
| ❌ **OFF** | Círculo gris | Funcionalidad completamente desactivada |
| 👁️ **PREVIEW** | Círculo ámbar | Funcionalidad disponible solo para tenants con override explícito |
| ✅ **ON** | Círculo verde | Funcionalidad activa para todos los tenants (salvo override OFF) |

### Inventario de Feature Flags

#### Flags de IA y RAG

| Código | Nombre | Estado por defecto | ¿Qué controla? |
|---|---|---|---|
| `ai_copilot` | AI Action Copilot | ✅ ON | Asistente IA para crear acciones |
| `charts_engine` | Charts Engine | ✅ ON | Motor de gráficos en Generative UI |
| `senda_vision` | Senda Vision | ✅ ON | Procesamiento de imágenes |
| `qr_scanner` | QR Scanner | ✅ ON | Lectura de códigos QR |
| `qr_generator` | QR Generator | ✅ ON | Generación de códigos QR |
| `rag_citations` | RAG Source Citations | 👁️ PREVIEW | Citas con fuente en respuestas RAG |
| `rag_sync` | RAG Sync Externo | 👁️ PREVIEW | Sincronización de documentos desde fuentes externas |
| `feature_agent_generator` | Generador de Agentes con IA | 👁️ PREVIEW | Generación automática de agentes |

#### Flags de Automatización

| Código | Nombre | Estado por defecto | ¿Qué controla? |
|---|---|---|---|
| `mission_control` | Mission Control | ✅ ON | Panel de automatizaciones |
| `pipeline_builder` | Pipeline Builder | ✅ ON | Constructor de pipelines |
| `webhook_gateway` | Webhook Gateway | ✅ ON | Recepción de webhooks |
| `roi_dashboard` | ROI Dashboard | ✅ ON | Dashboard de retorno de inversión |

#### Flags de Interfaz

| Código | Nombre | Estado por defecto | ¿Qué controla? |
|---|---|---|---|
| `formula_builder` | Formula Builder | ✅ ON | Constructor de fórmulas |
| `action_wizard` | Action Wizard | ✅ ON | Wizard de creación de acciones |
| `form_nodes` | Intent Graph Form Nodes | ✅ ON | Nodos de formulario en Intent Graph |
| `ui_mode_switch` | Simple/Enterprise Mode | 👁️ PREVIEW | Switch entre modos de interfaz |

#### Flags de Integración

| Código | Nombre | Estado por defecto | ¿Qué controla? |
|---|---|---|---|
| `mcp_server_catalog` | MCP Server Catalog | 👁️ PREVIEW | Catálogo de servidores MCP |
| `senda_mcp_server` | Senda como Servidor MCP | ❌ OFF | Exponer Senda como servidor MCP |

#### Flags de Core

| Código | Nombre | Estado por defecto | ¿Qué controla? |
|---|---|---|---|
| `enterprise_iam_v2` | Enterprise IAM | ✅ ON | Sistema avanzado de permisos |
| `magic_setup` | Magic Setup | 👁️ PREVIEW | Configuración automática guiada |
| `data_transfer` | Data Transfer | 👁️ PREVIEW | Importación/exportación de datos |
| `feature_audit_mode` | Modo de Auditoría | ✅ ON | Trazabilidad avanzada |
| `chat_context_registry` | Chat Context Registry | 👁️ PREVIEW | Registro de contexto conversacional |

### Capacidades avanzadas por agente (dual-gate)

Algunas funcionalidades tienen un **segundo nivel de activación** a nivel de agente individual. Estas requieren:
1. **Flag global activo** (estado ON o override del tenant)
2. **Capacidad activada en el agente** (en la solapa Capacidades del Agent Builder)

| Capacidad | Flag global | Toggle del agente | ¿Qué habilita? |
|---|---|---|---|
| Goal-Based Reasoning | `feature_goal_reasoning` | `goalReasoningEnabled` | Agentes que persiguen objetivos de negocio |
| Chatless UI | `feature_chatless_ui` | Configuración de triggers | Widgets proactivos sin chat |
| Predictive Analytics | `feature_predictive` | Activar en capacidades | Pronósticos y detección de anomalías |
| Adaptive Dashboards | `feature_adaptive_dashboards` | Activar en capacidades | Dashboards generados por lenguaje natural |

> ⚠️ **Importante:** Si el flag global está en OFF, la capacidad por agente no funciona aunque esté activada. El administrador debe habilitar el flag primero.

### Procedimiento para activar una funcionalidad progresiva

1. Verificar el estado actual del flag en el panel de Features (accesible para SuperAdmin)
2. Si está en PREVIEW, crear un override para el tenant específico
3. Comunicar al equipo de implementación que la funcionalidad está disponible
4. Monitorear el uso y estabilidad antes de solicitar activación general

> 💡 **Buena práctica:** Activá funcionalidades BETA primero en un espacio de prueba con usuarios limitados, antes de extender a toda la organización.

### Checklist de Feature Flags

- [ ] ¿Conozco el estado actual de todos los feature flags de mi tenant?
- [ ] ¿Entiendo la diferencia entre flag global y override por tenant?
- [ ] ¿Sé qué capacidades requieren dual-gate (flag + toggle por agente)?
- [ ] ¿Comuniqué al equipo de implementación qué funcionalidades BETA están activas?

---

## Checklist para el implementador

```
ANTES DE ACTIVAR MODO SIMPLE EN CLIENTE:
□ El tenant tiene configurados: espacios, agentes con prompts, base de conocimiento
□ Las automatizaciones importantes están creadas y activas
□ Se verificó que las acciones críticas están vinculadas a los agentes
□ El cliente entendió que en Simple mode algunas solapas no aparecen
□ Documentaste qué funciones quedan ocultas para una futura expansión

CUANDO USAR MODO ENTERPRISE:
□ Implementación en curso (necesitás todos los controles)
□ Cliente con IT dedicado que administrará la plataforma
□ Configuración de prompts analíticos (efectividad, aprendizaje, etiquetado)
□ Creación de nuevas automatizaciones avanzadas (webhooks, observers)
□ Revisión de métricas de participación y efectividad
```

---

> 📖 **Anterior:** [06 — Analytics y Consumo de la Plataforma](./06_analytics_y_consumo.md)
> 📖 **Siguiente:** [08 — Privacidad, Retención de Datos y Compliance](./08_privacidad_y_compliance.md)
