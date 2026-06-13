# 3. Tokens, Service Accounts y API Keys

> **Versión documentada:** v5.6.93 · **Última revisión:** 2026-05-28
> **Estado de la Feature:** 🟢 GA (General Availability)

Las API Keys y las Service Accounts son los mecanismos de autenticación que permiten a sistemas externos interactuar con Senda de forma programática, sin la intervención de un usuario humano. Este capítulo describe cómo crearlos, gestionarlos y revocarlos de forma segura.

---

## Conceptos Fundamentales

### API Key vs. JWT Token vs. OAuth2

Senda soporta tres mecanismos de autenticación con propósitos diferentes. Usar el incorrecto introduce riesgos innecesarios o fricciones operacionales.

| Mecanismo | Cuándo usar | Vida útil | Quién lo usa |
|---|---|---|---|
| **API Key** | Integración servidor-a-servidor, automatizaciones, webhooks | Larga (meses/años, con rotación manual) | Sistemas externos, scripts, pipelines CI/CD |
| **JWT Token** | Sesión de un usuario humano en el frontend | Corta (horas, renovación automática) | Navegador del usuario final |
| **OAuth2** | Integraciones con sistemas de terceros que requieren acceso delegado (Google Drive, Outlook) | Variable (se renueva automáticamente vía refresh token) | Integraciones de plataformas externas como parte de las acciones de Senda |

**Regla general:** Si es un humano quien inicia sesión, usa JWT (login normal). Si es un sistema automático que llama a Senda, usa API Key. Si es una integración OAuth de un proveedor externo, ese flujo lo gestiona Senda internamente.

### Service Accounts

Un **Service Account** es un usuario de tipo sistema en Senda: tiene un registro en la tabla `users` con `is_service_account = TRUE` y **sin contraseña**. No puede iniciar sesión mediante el formulario de login. Solo puede autenticarse mediante una API Key asociada.

**Para qué sirve:**

- Representar un sistema externo (un CRM, un ERP, una aplicación custom) como actor identificable en los logs de auditoría.
- Limitar el scope de acceso del sistema externo mediante los scopes de la API Key.
- Tener trazabilidad clara: los logs muestran `sistema-crm@serviceaccount` en lugar de credenciales genéricas.

---

## Estructura de una API Key

La tabla `api_keys` almacena los metadatos de cada clave. La clave en sí nunca se almacena en texto plano: se guarda el hash (`key_hash`) y un prefijo visible (`key_prefix`) para identificación sin exposición.

| Campo | Descripción |
|---|---|
| `name` | Nombre descriptivo de la clave (ej. `CRM Integration - Producción`) |
| `scopes` | JSON array con los permisos de la clave |
| `rate_limit_rpm` | Máximo de llamadas por minuto (default: 60) |
| `space_id` | Opcionalmente, restringe la clave a un único espacio |
| `user_id` | Service Account asociado a la clave |
| `is_active` | Estado activo/inactivo |
| `last_used_at` | Timestamp del último uso (para detectar claves huérfanas) |
| `key_prefix` | Prefijo visible (ej. `snda_prod_a3b2...`) para identificación |

### Scopes Disponibles

| Scope | Permisos que otorga |
|---|---|
| `chat` | Iniciar conversaciones y enviar mensajes en el espacio asignado |
| `read` | Leer historial de chats, métricas de uso y configuración de agentes (solo lectura) |
| `write` | Modificar configuración de agentes, cargar documentos a la base de conocimiento |
| `admin` | Configuración completa de espacios, agentes, acciones y conocimiento vía MCP Server. Requiere rol `r_admin` o `r_superadmin` del usuario asociado. Incluye 5 sub-scopes granulares: `spaces:write`, `agents:write`, `actions:write`, `knowledge:write`, `config:write`. |

> **Principio de mínimo privilegio:** Siempre asignar el scope más restrictivo que permita cumplir el caso de uso. Una integración que solo consume el chat de Senda solo necesita el scope `chat`.

---

## Crear una API Key

**Ruta:** Administración → API Keys → **Nueva API Key**

### Paso a paso

1. **Nombre descriptivo:** Usar un nombre que identifique el sistema y el ambiente. Ejemplo: `ERP-SAP Integration [Producción]`. El nombre aparece en logs y auditoría.

2. **Seleccionar o crear el Service Account:**
   - Si la integración es de un sistema nuevo, crear primero el Service Account (ver sección siguiente).
   - Si es una clave personal de un administrador para desarrollo, puede asociarse a un usuario real.

3. **Asignar scopes:** Seleccionar solo los scopes necesarios. Marcar `chat` para integraciones de chat, `read` para dashboards de analytics externos, etc.

4. **Configurar el rate limit:** El default de 60 rpm es adecuado para la mayoría de los casos. Para integraciones de alto volumen, ajustar según los SLA acordados.

5. **Restringir a un espacio (recomendado):** Si la integración solo debe acceder a un espacio específico, seleccionarlo en el campo `space_id`. Esto es una capa adicional de aislamiento.

6. **Guardar.** El sistema muestra la API Key completa **una única vez**. Copiarla y guardarla en el gestor de secretos de la organización (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, etc.) antes de cerrar la pantalla.

> ⚠️ **Crítico:** Senda nunca vuelve a mostrar la clave completa después de la creación. Solo guarda el hash. Si se pierde, hay que revocarla y crear una nueva.

### Formato de la Clave

Las claves tienen el formato: `snda_[ambiente]_[prefijo_aleatorio]`

```
snda_prod_a3b2f8c9d4e1...   ← Producción
snda_qa_b7d1e0f2a8c3...     ← QA / Staging
```

El prefijo `snda_prod_` o `snda_qa_` permite identificar visualmente a qué ambiente pertenece cada clave sin necesidad de revelar el valor completo.

---

## Crear un Service Account (M2M)

Las cuentas de servicio Machine-to-Machine (M2M) son ideales para integraciones desasistidas. En la consola de administración, se identifican visualmente con una insignia o etiqueta con el emoji de un robot (**🤖**) junto a su nombre.

**Ruta:** Administración → Usuarios → **Nuevo Usuario** → marcar **"Es cuenta de servicio"**

1. **Email:** Usar una convención como `[sistema]@serviceaccount.[empresa].com`. El email no necesita ser una casilla real; es solo un identificador.
2. **Nombre:** Nombre descriptivo del sistema. Ejemplo: `ERP SAP - Módulo FI`.
3. **Rol global:** Asignar `r_user` salvo que la integración requiera capacidades de administración globales.
4. **Es cuenta de servicio:** Activar este flag (`is_service_account = TRUE`). El usuario quedará sin contraseña y sin acceso al login tradicional.
5. **Configuración de API Key, Espacio y Scopes**: 
   - Tras crear la cuenta, asóciale una API Key.
   - Es obligatorio confinar la cuenta a un **Espacio de Trabajo específico** (`space_id`) y asignarle los **Scopes mínimos** (e.g. `chat` o `read`) para evitar accesos cruzados no autorizados.

**Verificar en la lista de usuarios:** Las cuentas de servicio M2M aparecen marcadas con el badge **🤖 Service Account** y la columna "Último acceso" registrará el timestamp de su uso a través de la API en lugar del login interactivo.

---

## Rotación de API Keys

La rotación periódica de claves limita el tiempo de exposición en caso de filtración. Proceso recomendado para rotación sin downtime:

### Rotación con período de solapamiento (zero-downtime)

1. **Crear la nueva clave** con el mismo nombre + sufijo `[v2]`. No desactivar la clave anterior aún.
2. **Actualizar el sistema externo** con la nueva clave (reemplazar en el gestor de secretos y redesplegar el sistema).
3. **Verificar** que el sistema externo funciona correctamente con la nueva clave (monitorear `last_used_at` en ambas claves).
4. **Revocar la clave anterior** una vez confirmado el funcionamiento.

### Calendario de rotación recomendado

| Tipo de integración | Frecuencia de rotación |
|---|---|
| Integraciones de producción de alto valor | Cada 90 días |
| Integraciones estándar | Cada 180 días (6 meses) |
| Claves de desarrollo/testing | Cada 365 días o al cambiar de equipo |
| Clave potencialmente comprometida | Inmediatamente (ver sección de revocación) |

---

## Revocación de una Clave Comprometida

Si se sospecha que una API Key fue expuesta (en un repositorio Git, en logs, en un error de configuración), actuar de inmediato:

### Procedimiento de revocación de emergencia

1. **Administración → API Keys** → localizar la clave comprometida por nombre o prefijo.
2. Hacer click en **Desactivar** (`is_active = FALSE`). Efecto inmediato: cualquier request con esa clave recibe HTTP 401 instantáneamente. No hay período de gracia.
3. **Revisar los logs de uso** (sección siguiente) para determinar si hubo accesos no autorizados.
4. **Documentar el incidente** en el sistema de tickets. Si hay sospecha de uso malicioso, notificar al Oficial de Seguridad.
5. Crear una nueva clave y actualizar los sistemas dependientes.

> El campo `key_hash` que Senda almacena internamente no puede ser revertido a la clave original, incluso si alguien accede a la base de datos. Las claves están almacenadas como hashes unidireccionales.

---

## Logs de Uso por API Key

Senda registra cada llamada a la API en la tabla `api_usage_logs` con los siguientes datos: endpoint invocado, método HTTP, código de respuesta, latencia en milisegundos y timestamp.

### Ver logs de uso

**Ruta:** Administración → API Keys → [clave] → **Ver Uso**

Los logs permiten:

- **Detectar claves huérfanas:** Si `last_used_at` es anterior a 90 días, considerar desactivar la clave.
- **Auditar acceso post-incidente:** Filtrar por rango de fechas para determinar qué endpoints fueron llamados durante una ventana de tiempo sospechosa.
- **Monitorear rate limits:** Si una integración frecuentemente recibe HTTP 429, revisar el rate limit configurado o la eficiencia del sistema externo.

| Señal | Acción |
|---|---|
| `last_used_at` nulo (nunca usada) | Evaluar si la clave se distribuyó correctamente |
| `last_used_at` > 90 días | Desactivar y confirmar con el equipo si el sistema sigue activo |
| Muchas respuestas 401 recientes | Posible rotación en progreso o uso desde sistema incorrecto |
| Picos de uso inusuales | Investigar posible uso no autorizado |

---

## Escenarios de Integración Comunes

### Escenario 1: Sistema externo invoca el chat de Senda

**Caso:** El CRM de la empresa quiere enviar consultas al agente de soporte de Senda y mostrar la respuesta al agente humano del CRM.

**Configuración recomendada:**

- Service Account: `crm-salesforce@serviceaccount.empresa.com` con rol `r_user`.
- API Key: scope `chat`, space_id restringido al espacio de Soporte, rate_limit 120 rpm.
- Autenticación: `Authorization: Bearer snda_prod_xxxx` en el header de cada request.
- Endpoint: `POST /api/v1/chat` con el payload del mensaje.

### Escenario 2: Pipeline de datos actualiza la base de conocimiento

**Caso:** Un pipeline nocturno extrae documentos actualizados del ERP y los sube al agente de Finanzas.

**Configuración recomendada:**

- Service Account: `pipeline-erp@serviceaccount.empresa.com`.
- API Key: scope `write`, space_id restringido al espacio de Finanzas.
- El pipeline llama al endpoint de ingesta de documentos con la API Key.

### Escenario 3: Dashboard externo de analytics consume métricas

**Caso:** El equipo de Business Intelligence tiene su propio dashboard (Metabase, Tableau) y quiere consumir métricas de uso de Senda.

**Configuración recomendada:**

- Service Account: `bi-analytics@serviceaccount.empresa.com`.
- API Key: scope `read` únicamente. Sin scope `chat` ni `write`.
- Rate limit: 10 rpm (suficiente para dashboards que actualizan cada pocos minutos).

### Escenario 4: Webhook de entrada desde sistema externo

**Caso:** Jira envía un webhook cuando un ticket cambia de estado. Senda debe procesar el evento.

**Configuración:** En este caso, Senda actúa como receptor, no como cliente. Los webhooks entrantes se configuran en **Administración → Webhooks → Fuentes** con un `signing_secret` para validar la autenticidad del origen. No se requiere API Key en este flujo.

### Escenario 5: Analista funcional configura Senda vía IA (MCP Admin)

**Caso:** Un analista de negocios quiere configurar espacios, agentes y acciones desde Claude Desktop, Cursor o Google Antigravity sin usar el panel web de Senda.

**Configuración recomendada:**

- Service Account: `mcp-admin@serviceaccount.empresa.com` con rol `r_admin`.
- API Key: scope `admin`, **sin** restricción de `space_id` (necesita acceso cross-space para crear y duplicar espacios).
- Rate limit: 30 rpm (las operaciones admin son infrecuentes pero intensivas).
- Expiración: máximo 180 días (rotación semestral obligatoria).

> ⚠️ **Precaución extrema:** Las claves con scope `admin` pueden crear, modificar y duplicar espacios completos incluyendo agentes, acciones y documentos. Tratar con el mismo nivel de protección que credenciales de base de datos. No compartir con usuarios que solo necesitan consumir el chat.

Consultar el 📘 Manual Técnico, capítulo 6 (MCP Client y Server) para detalles del protocolo y las 16 herramientas disponibles.

---

## Buenas Prácticas de Seguridad

| Práctica | Razón |
|---|---|
| **Nunca hardcodear claves en código fuente** | Las claves en repositorios Git se exponen permanentemente, incluso después de borrarlas del historial |
| **Usar gestores de secretos** | HashiCorp Vault, AWS Secrets Manager o Azure Key Vault para inyectar claves en tiempo de ejecución |
| **Una clave por sistema y ambiente** | Una clave comprometida en QA no afecta producción; la revocación es precisa |
| **Scope mínimo siempre** | Una integración de lectura con scope `admin` es un riesgo innecesario |
| **Auditar claves sin uso cada trimestre** | Las claves huérfanas son vectores de ataque que nadie monitorea |
| **Usar `space_id` cuando sea posible** | Limita el blast radius si la clave se compromete |
| **Documentar en el sistema de tickets** | Registrar para qué sirve cada clave, quién la solicitó y cuándo debe rotar |

---

## Checklist del Capítulo

- [ ] ¿Cada integración tiene su propio Service Account con nombre descriptivo?
- [ ] ¿Todas las API Keys tienen el scope mínimo necesario (`chat`, `read`, `write`)?
- [ ] ¿Las claves de producción están restringidas a un `space_id` específico?
- [ ] ¿Las claves están almacenadas en un gestor de secretos (no en código fuente)?
- [ ] ¿El calendario de rotación está documentado y se cumple?
- [ ] ¿No hay claves con `last_used_at` > 90 días sin justificación?
- [ ] ¿Los rate limits están configurados según el volumen esperado?

---

> 📖 **Anterior:** [2 — Equipos y Control de Acceso a Espacios](02_equipos_y_acceso_espacios.md)
> 📖 **Siguiente:** [4 — Seguridad, Auditorías y Logs](04_seguridad_y_auditorias.md)
