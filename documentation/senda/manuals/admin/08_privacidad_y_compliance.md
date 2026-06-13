# 8. Privacidad, Retención de Datos y Compliance

> **Versión documentada:** v5.6.92 · **Última revisión:** 2026-05-27

Este capítulo está dirigido al administrador de IT, al Oficial de Seguridad y al equipo legal que necesita entender cómo Senda almacena, protege y permite gestionar los datos del tenant. El objetivo es proporcionar las respuestas técnicas necesarias para cumplir con auditorías internas, requerimientos regulatorios y consultas de las áreas legales.

---

## Arquitectura de Aislamiento Multi-Tenant

Senda es una plataforma multi-tenant: múltiples empresas comparten la misma infraestructura de software, pero sus datos están completamente aislados entre sí.

### Cómo funciona el aislamiento

Cada registro en cada tabla de la base de datos incluye un campo `tenant_id`. Todas las consultas del sistema incluyen obligatoriamente `WHERE tenant_id = [id_del_tenant_actual]` como condición de filtrado. No existe ninguna ruta de la API que permita acceder a datos de otro tenant.

**En términos prácticos:**

- Un administrador de la empresa A nunca puede ver datos de la empresa B, aunque ambas usen la misma instancia de Senda.
- En el escenario hipotético de que alguien acceda directamente a la base de datos, los datos aparecerían entremezclados con los de otros tenants. El `tenant_id` es el único mecanismo de separación a nivel de datos, por lo que la protección de acceso a la capa de base de datos es crítica a nivel de infraestructura.

### Cifrado de datos sensibles

Las credenciales de terceros (claves de API externas, tokens OAuth de integraciones) almacenadas en la base de datos están cifradas usando **AES-256-GCM** antes de persistirlas. Esto significa que incluso si alguien accediera a la base de datos, las credenciales aparecen como texto cifrado ilegible sin la clave de cifrado correspondiente.

Los datos de conversación (mensajes de chat) no se cifran en la base de datos pero sí están protegidos por el aislamiento de tenant y por los controles de acceso a la capa de infraestructura de Cloudflare.

---

## Dónde Residen los Datos de Senda

Senda usa exclusivamente infraestructura de Cloudflare para almacenar los datos:

| Tipo de dato | Tecnología | Región |
|---|---|---|
| Conversaciones, usuarios, configuración de agentes, logs de auditoría | Cloudflare D1 (base de datos SQLite distribuida) | US/EU (según la región del Worker configurada) |
| Documentos de la base de conocimiento (archivos originales) | Cloudflare R2 (object storage compatible S3) | US/EU |
| Vectores de búsqueda semántica (RAG) | Cloudflare Vectorize | Distributed Edge |
| Imágenes subidas a la base de conocimiento | Cloudflare R2 | US/EU |

> **Para auditorías de residencia de datos:** Los datos del tenant están físicamente almacenados en la infraestructura de Cloudflare, sujeta al acuerdo de procesamiento de datos (DPA) de Cloudflare. Para los clientes que requieren residencia de datos en la UE, consultar con el equipo de Mooving sobre la configuración de región del Worker.

---

## Política de Retención de Datos

### El parámetro `data_retention_days`

Cada tenant tiene configurado un período de retención de datos de conversación. La configuración se encuentra en la tabla `tenants`, campo `data_retention_days`.

| Valor | Significado | Recomendado para |
|---|---|---|
| **30 días** (mínimo) | Los datos de conversación se eliminan al mes | Datos altamente sensibles, sectores con regulaciones de eliminación rápida |
| **365 días** (default) | Retención de 1 año | La mayoría de las organizaciones estándar |
| **1825 días** (5 años, máximo) | Retención extendida | Sectores regulados: legal, salud, servicios financieros |

### Qué datos tienen retención configurable

| Tipo de dato | Afectado por `data_retention_days` | Período de retención |
|---|---|---|
| Historial de mensajes de chat | ✅ Sí | Configurable por tenant |
| Metadata de chats (fecha, espacio, agente) | Parcialmente — puede mantenerse sin contenido | Configurable |
| Logs de ejecución de acciones (`action_logs`) | ✅ Sí | 30 días por defecto, independiente del setting de conversaciones |
| Logs de auditoría administrativa (`admin_audit_log`) | ❌ No — retención indefinida | Permanente (requerimiento de compliance) |
| Logs de uso de API | ❌ No | Permanente |
| Documentos de la base de conocimiento | ❌ No — solo se eliminan manualmente | Hasta que el admin los elimine |

### Cómo configurar el período de retención

La modificación del `data_retention_days` la realiza el equipo técnico de Mooving sobre la configuración del tenant. Para solicitar el cambio:

1. Determinar el período requerido con el área legal de la organización.
2. Abrir un ticket con el equipo de soporte de Mooving especificando el valor deseado (entre 30 y 1825 días).
3. El cambio aplica de forma prospectiva. Los datos existentes que ya superaron el nuevo período se eliminan en el siguiente ciclo de purga programado.

> **Importante:** La eliminación por vencimiento de retención es **irreversible**. No existe papelera de reciclaje. Antes de reducir el período, confirmar con el área legal que no existen requerimientos de conservación vigentes.

---

## Compliance con GDPR / LGPD

Senda proporciona las capacidades técnicas necesarias para cumplir con las principales regulaciones de protección de datos. El análisis legal de compliance específico para cada organización debe ser realizado por el equipo legal con el soporte del equipo de Mooving.

### Derecho de Acceso (Art. 15 GDPR)

Un usuario puede solicitar ver qué datos tiene Senda sobre él. El administrador puede satisfacer este requerimiento mediante:

**Opción 1 — Export de conversaciones:**

**Ruta:** Administración → Conversaciones → Filtrar por usuario → **Exportar CSV**

El CSV exportado incluye: `chat_id`, espacio, agente, email del usuario, fecha de inicio, cantidad de mensajes y el historial completo en formato JSON.

**Opción 2 — Acceso directo al historial:**

El administrador puede revisar directamente el historial de conversaciones de un usuario específico desde el panel de conversaciones, filtrando por email o nombre.

**Quién puede exportar:** `r_admin`, `r_tenant_owner`, `r_security_officer`.

### Derecho al Olvido / Derecho de Supresión (Art. 17 GDPR)

Un usuario puede solicitar la eliminación de sus datos. El proceso en Senda:

1. **Localizar al usuario:** Administración → Usuarios → buscar por email.
2. **Exportar primero si el área legal lo requiere** (ver Derecho de Acceso).
3. **Desactivar el usuario** (`is_active = FALSE`). Esto revoca el acceso de inmediato.
4. **Solicitar eliminación completa** al equipo de Mooving. La eliminación incluye:
   - Todos los mensajes del usuario de la tabla `messages`.
   - Los chats en los que el usuario fue el único participante.
   - El registro del usuario en la tabla `users`.
5. **Verificar** que el historial de auditoría refleja la acción de eliminación (el log de auditoría registra el evento pero sin datos del usuario eliminado, reemplazando el actor por `[usuario eliminado]`).

> **Nota legal:** Los logs de auditoría administrativa que registraron acciones del usuario (si tenía rol de administrador) no se eliminan, ya que son registros de integridad del sistema. Solo se anonimizan mediante la eliminación del `actor_id` del registro.

### Acuerdos de Procesamiento de Datos (DPA)

Para organizaciones que operan en la Unión Europea (GDPR) o Brasil (LGPD):

- Senda cuenta con un **DPA estándar** disponible bajo requerimiento. Incluye: lista de sub-procesadores, derechos de los titulares y proceso de notificación de brechas.
- Los sub-procesadores clave son: **Cloudflare** (infraestructura), **OpenAI** (modelos de IA bajo acuerdo de no-entrenamiento), **Anthropic** y **Google** (bajo los mismos términos).
- Para solicitar el DPA, derivar la consulta al equipo comercial de Mooving.

---

## Datos de Conversación: Qué Se Almacena y Qué No

### Lo que Senda almacena de cada conversación

Cada mensaje de chat genera un registro en la tabla `messages` con:

- Identificador del chat
- Contenido del mensaje (texto o contenido multimedia si visión está activada)
- Rol (usuario o agente)
- Timestamp
- Referencia al agente que respondió
- Metadata JSON con información de contexto (tokens usados, modelo, etc.)

### Lo que Senda NO almacena

- **Contraseñas de usuarios en texto plano** — siempre hasheadas con bcrypt.
- **Credenciales de sistemas externos en texto plano** — cifradas con AES-256-GCM.
- **La clave completa de las API Keys** — solo el hash unidireccional.
- **Los datos que el agente envió a sistemas externos** — los datos que van al CRM, ERP o Jira quedan bajo las políticas de esos sistemas, no de Senda.

---

## Exportación de Datos

### Qué se puede exportar y en qué formato

| Datos | Formato | Quién puede | Ruta |
|---|---|---|---|
| Historial de conversaciones | CSV (con JSON embebido) | `r_admin`, `r_tenant_owner`, `r_security_officer` | Administración → Conversaciones → Exportar |
| Métricas de uso de la plataforma | CSV multi-sección | `r_admin`, `r_tenant_owner` | Administración → Analytics → Exportar |
| Logs de auditoría administrativa | CSV | `r_security_officer`, `r_tenant_owner` | Administración → Auditoría → Exportar |
| Logs de ejecución de acciones | CSV | `r_admin`, `r_tenant_owner` | Mission Control → Historial → Exportar |

**Límites de exportación:**

- Historial de conversaciones: máximo 50.000 filas por exportación. Para históricos masivos, filtrar por rango de fechas más acotado.
- Los exports de conversaciones contienen datos de usuarios. Tratar con los mismos protocolos de seguridad que cualquier export de datos de empleados.

---

## El Registro de Auditoría

> 📖 Para documentación completa de las tablas de auditoría (`audit_logs` y `admin_audit_log`), encadenamiento criptográfico, verificación de integridad, filtros disponibles y exportación, ver **[Cap. 04 — Seguridad, Auditorías y Logs](./04_seguridad_y_auditorias.md)**, secciones §4.1 a §4.2.

**Resumen ejecutivo para compliance:**

| Aspecto | Valor |
|---------|-------|
| Retención de `admin_audit_log` | **Permanente** — no sujeta a `data_retention_days` |
| Integridad | Encadenamiento SHA-256 (`entry_hash` / `prev_hash`) — a prueba de manipulación |
| Acceso | Solo `r_security_officer` y `r_tenant_owner` |
| Exportación | CSV y JSON disponibles desde la UI |

---

## Sesiones, MFA y Políticas de Acceso

> 📖 Para procedimientos detallados de configuración de MFA, timeout de sesión, IP Allowlist e invalidación de sesiones, ver **[Cap. 04 — Seguridad, Auditorías y Logs](./04_seguridad_y_auditorias.md)**, secciones §4.3 a §4.6.

**Resumen de configuración:**

| Parámetro | Dónde se configura | Default |
|-----------|-------------------|---------|
| `session_timeout_hours` | Administración → Configuración → Seguridad | 24h |
| MFA obligatorio | Administración → Configuración → Seguridad | Desactivado |
| IP Allowlist | Administración → Configuración → Seguridad | Vacía |
| `password_expiry_days` | Administración → Configuración → Seguridad | 0 (sin expiración) |

### Políticas de contraseña

| Parámetro | Default | Recomendado (regulados) |
|-----------|---------|------------------------|
| `password_min_length` | 8 | 12 |
| `password_require_uppercase` | No | Sí |
| `password_require_numbers` | No | Sí |
| `password_require_special` | No | Sí |
| `password_expiry_days` | 0 | 90 días |

---

## Respuesta a Incidentes de Seguridad

> 📖 Para el protocolo completo de 4 pasos (Contención → Análisis → Notificación → Recuperación), con acciones detalladas y preguntas de análisis forense, ver **[Cap. 04 — Seguridad, Auditorías y Logs](./04_seguridad_y_auditorias.md)**, sección §4.7.

**Pasos críticos de compliance ante una brecha:**

1. **Contención (0–15 min):** Bloquear cuenta → Invalidar sesiones → Revocar API keys si aplica
2. **Análisis (15 min – 2h):** Revisar `admin_audit_log` → Identificar alcance → Exportar evidencia
3. **Notificación (≤ 72h):** GDPR/LGPD requieren notificación a la autoridad de control
4. **Recuperación:** Rotar credenciales → Forzar cambio de contraseña → Documentar post-mortem

---

## Preparación para SOC 2

SOC 2 Type II es una de las certificaciones más solicitadas por los clientes enterprise. Senda proporciona las capacidades técnicas necesarias para cumplir con los Trust Service Criteria relevantes.

### Mapeo de Controles Senda ↔ SOC 2

| Criterio SOC 2 | Control en Senda | Referencia |
|----------------|-----------------|------------|
| **CC6.1** — Acceso lógico y físico | RBAC con 5 roles, MFA TOTP, IP Allowlist, session timeout | Cap. 04, §4.3-4.6 |
| **CC6.2** — Autenticación de usuarios | bcrypt para contraseñas, AES-GCM para credenciales, MFA obligatorio | Cap. 04, §4.4 |
| **CC6.3** — Principio de mínimo privilegio | Roles granulares, ACL por espacio, separación security_officer/admin | Cap. 01, §1.1-1.3 |
| **CC7.1** — Monitoreo de eventos | `admin_audit_log` con encadenamiento SHA-256, verificación de integridad | Cap. 04, §4.1 |
| **CC7.2** — Respuesta a incidentes | Protocolo de 4 pasos documentado, contención en 15 min | Cap. 04, §4.7 |
| **CC8.1** — Gestión de cambios | Versionado en CHANGELOG, feature flags, deploy progresivo | Políticas internas |
| **A1.2** — Disponibilidad de datos | Cloudflare D1 distribuida, fallback multi-LLM, KV replication | Infraestructura |
| **PI1.1** — Integridad del procesamiento | Cycle detection en Bridge, SSRF protection, sandbox con timeout | Manual Técnico, Cap. 09 |

### Evidencias que Senda puede aportar al auditor

- ✅ Exportación de `admin_audit_log` con hashes de integridad (CSV/JSON)
- ✅ Resultado de verificación de integridad (`audit_integrity_checks`)
- ✅ Lista de usuarios con roles y estado de MFA
- ✅ Historial de cambios de configuración con IP y timestamp
- ✅ DPA de sub-procesadores (Cloudflare, OpenAI, Anthropic, Google)

---

## Derecho de Portabilidad de Datos (Art. 20 GDPR)

Además del Derecho de Acceso (Art. 15), GDPR exige que los datos sean entregados en un formato **estructurado, de uso común y lectura mecánica**.

### Cómo cumplir con Art. 20 en Senda

| Dato | Formato de exportación | Cómo obtenerlo |
|------|----------------------|----------------|
| Conversaciones del usuario | CSV con JSON embebido | Administración → Conversaciones → Filtrar por usuario → Exportar |
| Perfil del usuario | JSON (bajo solicitud a Mooving) | Ticket de soporte |
| Acciones ejecutadas por el usuario | CSV | Mission Control → Historial → Filtrar por usuario |

> ⚠️ **El plazo legal para responder es de 1 mes** desde la solicitud (Art. 12.3 GDPR). Documentar el proceso internamente y designar un responsable.

---

## Gestión de Consentimiento

### ¿Qué datos recopila Senda del usuario final?

| Dato | Base legal típica | Almacenamiento |
|------|-------------------|---------------|
| Mensajes de chat | Interés legítimo / Consentimiento | `messages` con `data_retention_days` |
| Email e identidad | Contrato de servicio | `users` con cifrado de credenciales |
| Datos de sesión (IP, dispositivo) | Interés legítimo | `audit_logs` con retención configurable |
| Documentos subidos al chat | Consentimiento explícito | R2 (object storage) |

### Recomendaciones para compliance

1. **Mensaje de bienvenida del espacio:** Incluir aviso de procesamiento de datos en el primer mensaje que ve el usuario (configurable en Espacios → Mensaje de Bienvenida)
2. **Política de privacidad:** Enlazar a la política de privacidad de la organización en la interfaz del chat
3. **Retención declarada:** Documentar y comunicar a los usuarios el período de retención configurado
4. **Consentimiento para analíticas:** Si se usan los prompts de aprendizaje/efectividad/etiquetado sobre conversaciones, documentar en la política de privacidad que las conversaciones se analizan con IA para mejora del servicio

---

## Checklist de Compliance para Administradores

```
RETENCIÓN DE DATOS:
□ data_retention_days está configurado según los requisitos legales del sector
□ El área legal aprobó el período de retención actual
□ Se realizó una prueba de eliminación automática en el ambiente QA

ACCESO Y AUTENTICACIÓN:
□ MFA habilitado para todos los roles r_admin, r_tenant_owner, r_security_officer
□ Las políticas de contraseña están configuradas según el estándar del sector
□ session_timeout_hours configurado según la política de acceso de la organización
□ No hay cuentas de usuario activas de ex-empleados

AUDITORÍA:
□ El Oficial de Seguridad verificó que el log de auditoría está activo
□ Se ejecutó una verificación de integridad del audit log en los últimos 30 días
□ El período de retención de logs está alineado con los requisitos legales

API KEYS Y SERVICE ACCOUNTS:
□ Todas las API Keys tienen nombres descriptivos y están documentadas
□ No hay API Keys sin usar desde hace más de 90 días
□ Las claves de producción rotan cada 90-180 días según el calendario acordado
□ Ninguna clave tiene scope admin sin justificación documentada

GDPR / LGPD (si aplica):
□ El DPA con Mooving está firmado y actualizado
□ El proceso de respuesta a solicitudes de derecho al olvido está documentado
□ El plan de respuesta a brechas de datos está documentado y probado
```

---

> 📖 **Anterior:** [7 — Modo Simple y Modo Enterprise](07_modo_simple_y_enterprise.md)
> 📖 **Siguiente:** [Índice del Manual](./index.md)
