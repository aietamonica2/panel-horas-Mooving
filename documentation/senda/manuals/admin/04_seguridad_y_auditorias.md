# 4. Seguridad, Auditorías y Logs

> **Versión documentada:** v5.6.93 · **Última revisión:** 2026-05-28

Este capítulo describe los mecanismos de seguridad operativa de Senda: las tablas de auditoría y cómo leerlas, la configuración de IP allowlist, la gestión de MFA y sesiones, y el protocolo de respuesta ante incidentes. Está dirigido al Security Officer y al IT Admin responsable de la plataforma.

---

## 4.1 Las dos tablas de auditoría

Senda mantiene dos tablas de auditoría independientes con propósitos, actores y retenciones distintas. Es fundamental entender cuándo usar cada una.

### `audit_logs` — Actividad de usuarios

Registra **lo que los usuarios hacen dentro de la plataforma**: conversaciones iniciadas, acciones ejecutadas, documentos accedidos. Su retención es configurable mediante el campo `data_retention_days` de la tabla `tenants`.

**Estructura de la tabla:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT (PK) | Identificador único del evento |
| `tenant_id` | TEXT | Identificador del tenant |
| `actor_id` | TEXT | ID del usuario que generó el evento (FK → `users.id`) |
| `action` | TEXT | Tipo de acción registrada (ej: `chat.started`, `action.executed`) |
| `resource_type` | TEXT | Tipo de recurso afectado (ej: `agent`, `space`, `file`) |
| `resource_id` | TEXT | ID del recurso específico afectado |
| `details_json` | TEXT | Payload JSON con detalles adicionales del evento |
| `created_at` | DATETIME | Timestamp UTC del evento |

**Cuándo consultarla:**
- Investigar qué hizo un usuario específico en un período determinado.
- Verificar si una acción automatizada se ejecutó correctamente.
- Auditar el uso de un espacio o agente concreto.

---

### `admin_audit_log` — Cambios administrativos

Registra **todas las acciones de administración de la plataforma**: cambios de configuración, alta/baja de usuarios, modificaciones de roles, creación de API keys, cambios de políticas. Su retención es **permanente** — no se purga automáticamente bajo ninguna configuración de `data_retention_days`.

**Estructura de la tabla:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT (PK) | Identificador único del registro |
| `tenant_id` | TEXT | Identificador del tenant |
| `actor_id` | TEXT | ID del administrador que ejecutó la acción |
| `actor_email` | TEXT | Email del administrador en el momento del evento (preservado aunque se elimine el usuario) |
| `action` | TEXT | Tipo de cambio administrativo (ej: `user.role_changed`, `api_key.created`) |
| `resource_type` | TEXT | Tipo de recurso modificado |
| `resource_id` | TEXT | ID del recurso modificado |
| `detail` | TEXT | Descripción textual del cambio (incluyendo valores anterior y nuevo cuando aplica) |
| `ip_address` | TEXT | IP desde donde se realizó el cambio |
| `entry_hash` | TEXT | Hash SHA-256 de este registro |
| `prev_hash` | TEXT | Hash del registro inmediatamente anterior |
| `created_at` | DATETIME | Timestamp UTC del cambio |

**Cuándo consultarla:**
- Determinar quién modificó un rol, una política de seguridad o una configuración crítica.
- Verificar la integridad de la cadena de auditoría ante una sospecha de manipulación.
- Proveer evidencia a auditores externos o en procesos legales.

### El encadenamiento criptográfico (`entry_hash` / `prev_hash`)

Cada registro en `admin_audit_log` contiene el hash SHA-256 de su propio contenido (`entry_hash`) y el hash del registro anterior (`prev_hash`). Esto forma una **cadena de bloques de auditoría**: si alguien modifica o elimina un registro intermedio directamente en la base de datos, los hashes dejan de coincidir y la cadena se rompe.

El sistema ejecuta verificaciones de integridad periódicas almacenadas en la tabla `audit_integrity_checks`. Si el campo `status` aparece como `tampered` en lugar de `ok`, la cadena ha sido alterada y debe activarse el protocolo de incidente.

> **Control clave:** Solo los usuarios con rol `r_security_officer` o `r_tenant_owner` pueden consultar `admin_audit_log` desde la UI. Los administradores (`r_admin`) no tienen acceso — este diseño garantiza separación de poderes: quien administra no puede borrar sus propias huellas.

---

## 4.2 Cómo acceder al log de auditoría

### Procedimiento

1. Ir a **Administración → Auditoría** (visible solo para `r_security_officer` y `r_tenant_owner`).
2. Seleccionar el tipo de log a consultar:
   - **Actividad de usuarios** → consulta `audit_logs`
   - **Cambios administrativos** → consulta `admin_audit_log`

### Filtros disponibles

| Filtro | Descripción |
|--------|-------------|
| **Usuario / Actor** | Filtrar por email o ID de usuario. Útil para investigaciones de cuentas específicas. |
| **Tipo de evento** | Filtrar por categoría de acción (inicio de sesión, ejecución de acción, cambio de rol, etc.). |
| **Rango de fechas** | Seleccionar fecha de inicio y fin. Los filtros de fecha operan en UTC. |
| **Recurso** | Filtrar por ID de espacio, agente o acción específica. |
| **Chat ID** | Permite pegar un ID de conversación para ver los registros y consumos aislados de esa sesión. |
| **Dirección IP** | Solo disponible en `admin_audit_log`. Permite identificar accesos desde IPs inusuales. |

### Exportar logs

1. Aplicar los filtros deseados.
2. Hacer click en **Exportar** → seleccionar formato **CSV** o **JSON**.
3. Para exportaciones grandes (más de 10.000 registros), el sistema genera el archivo en background y envía un link de descarga al email del administrador.

> **Importante para compliance:** Exportar y conservar los logs de `admin_audit_log` externamente de forma periódica (mensual o trimestral) aunque la retención interna sea permanente. Ante una brecha que comprometa la base de datos, las copias externas son la única evidencia forense disponible.

---

## 4.3 IP Allowlist

La IP Allowlist restringe el acceso a la plataforma a únicamente las direcciones IP o rangos CIDR autorizados. Cuando está activa con al menos una entrada habilitada, **cualquier intento de login desde una IP no incluida en la lista es rechazado**, independientemente de las credenciales presentadas.

**Tabla en base de datos:** `tenant_ip_allowlist`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ip_cidr` | TEXT | IP o rango en notación CIDR (ej: `192.168.1.0/24` o `203.0.113.45/32`) |
| `description` | TEXT | Etiqueta descriptiva (ej: "Oficina central Buenos Aires", "VPN corporativa") |
| `is_active` | BOOLEAN | Si la entrada está habilitada (`1`) o deshabilitada temporalmente (`0`) |
| `created_by` | TEXT (FK) | ID del administrador que creó la entrada |
| `created_at` | DATETIME | Fecha de creación |

### Procedimiento — Agregar una entrada a la IP Allowlist

1. Ir a **Administración → Configuración → Seguridad → IP Allowlist**.
2. Hacer click en **Agregar dirección IP**.
3. Completar los campos:
   - **IP / Rango CIDR:** Ingresar la IP exacta (con sufijo `/32`) o el rango (ej: `10.0.0.0/8`).
   - **Descripción:** Identificar la ubicación o sistema correspondiente.
4. Asegurarse de que **su propia IP actual** esté incluida antes de activar la restricción.
5. Hacer click en **Agregar**.

### Procedimiento — Habilitar / Deshabilitar una entrada

- Para deshabilitar temporalmente sin eliminar: toggle en la columna **Activa** → la entrada pasa a `is_active = 0`. Los accesos desde esa IP dejan de ser permitidos de inmediato.
- Para reactivar: toggle nuevamente → la entrada vuelve a `is_active = 1`.

### Efecto inmediato

Los cambios en la IP Allowlist toman efecto en el siguiente request de autenticación. Las sesiones activas ya establecidas no se interrumpen, pero no pueden renovarse desde IPs fuera de la lista.

> ⚠️ **Precaución crítica:** Si activa la IP Allowlist sin incluir la IP desde la que está administrando, quedará bloqueado de la plataforma. Si esto ocurre, contacte a soporte de Mooving con prueba de identidad para la recuperación de acceso.

---

## 4.4 Configuración de MFA (Autenticación de Dos Factores)

Senda implementa MFA mediante el estándar **TOTP** (Time-based One-Time Password, RFC 6238), compatible con Google Authenticator, Authy, Microsoft Authenticator y cualquier app compatible.

### Estado de MFA por usuario

Los campos relevantes en la tabla `users` son:

| Campo | Descripción |
|-------|-------------|
| `mfa_enabled` | BOOLEAN — indica si MFA está activo para este usuario |
| `totp_secret` | Secreto TOTP cifrado con AES-256-GCM |
| `mfa_backup_codes` | 8 códigos de respaldo de uso único, cifrados en reposo |
| `mfa_enrolled_at` | Timestamp de activación de MFA |

### Política de MFA por rol (recomendada)

| Rol | Recomendación |
|-----|---------------|
| `r_tenant_owner` | **Obligatorio.** Sin excepción. |
| `r_admin` | **Obligatorio.** |
| `r_security_officer` | **Obligatorio.** |
| `r_user` | Recomendado. Obligatorio en sectores regulados (salud, finanzas, legal). |

### Procedimiento — Forzar MFA para todos los usuarios del tenant

1. Ir a **Administración → Configuración → Seguridad**.
2. En la sección **Autenticación de dos factores**, activar el toggle **Requerir MFA para todos los usuarios**.
3. Los usuarios sin MFA activo son redirigidos al wizard de configuración en su próximo login.

### Procedimiento — Cuando un usuario pierde su segundo factor

Si un usuario pierde acceso a su app de autenticación Y no tiene sus códigos de respaldo:

1. Ir a **Administración → Usuarios** → localizar al usuario.
2. Menú ⋮ → **Restablecer MFA**.
3. Confirmar la acción. El sistema elimina el `totp_secret` y pone `mfa_enabled = 0`.
4. El usuario puede iniciar sesión solo con contraseña y, en su próximo login, debe volver a enrolar MFA desde cero.

> **Trazabilidad:** Cada restablecimiento de MFA genera un registro en `admin_audit_log` con la acción `user.mfa_reset` y la IP del administrador que lo realizó.

---

## 4.5 Gestión de sesiones

### Ver sesiones activas de un usuario

1. **Administración → Usuarios** → seleccionar usuario → **Ver sesiones activas**.
2. Cada sesión muestra: IP de origen, dispositivo/navegador, fecha de inicio y tiempo de expiración.

### Invalidar una sesión específica

1. En la lista de sesiones activas del usuario, hacer click en **Invalidar** en la fila de la sesión.
2. El token de esa sesión queda revocado. El usuario recibirá un error 401 en su próxima acción y será redirigido al login.

### Invalidar todas las sesiones de un usuario

Acción de contención ante compromiso confirmado:

1. **Administración → Usuarios** → menú ⋮ del usuario → **Cerrar todas las sesiones**.
2. Todas las sesiones activas son invalidadas simultáneamente.
3. El evento queda registrado en `admin_audit_log` con la acción `user.sessions_revoked`.

---

## 4.6 Timeout de sesión

El tiempo de vida de las sesiones se controla con el campo `session_timeout_hours` en la tabla `tenants`.

**Default:** 24 horas. Tras ese período sin actividad, el token expira y el usuario debe volver a autenticarse.

### Procedimiento para modificar el timeout

1. Ir a **Administración → Configuración → Seguridad**.
2. En el campo **Tiempo de sesión (horas)**, ingresar el valor deseado.
3. Hacer click en **Guardar**. El cambio aplica a las sesiones nuevas. Las sesiones existentes respetan el timeout con el que fueron creadas.

### Guía de valores por sector

| Sector | Timeout recomendado | Justificación |
|--------|--------------------|----|
| Corporativo estándar | 24 horas | Balance entre seguridad y comodidad operativa. |
| Retail / Atención al cliente | 8–12 horas | Dispositivos de uso compartido en turnos de trabajo. |
| Financiero / Legal / Salud | 4–8 horas | Requisitos de compliance y minimización de exposición. |
| Kioscos de acceso público | 1–2 horas | Rotación de múltiples usuarios en el mismo equipo. |

> Valores muy cortos (< 4 horas) aumentan la fricción de uso. Calibrar según el riesgo real del sector y los requerimientos regulatorios.

---

## 4.7 Protocolo de respuesta ante incidentes de seguridad

Este protocolo cubre desde el momento de detección de un incidente (acceso no autorizado, cuenta comprometida, comportamiento anómalo) hasta la recuperación y notificación regulatoria.

### Paso 1 — Contención (0–15 minutos)

El objetivo es limitar el daño antes de hacer cualquier análisis.

**Acciones en orden de prioridad:**

1. **Bloquear la cuenta afectada** (§1.6 del cap. 1): `Administración → Usuarios → Bloquear usuario`. Esto invalida las sesiones activas de inmediato.
2. **Invalidar todas las sesiones** del usuario (§4.5): `Cerrar todas las sesiones`.
3. **Si la cuenta comprometida tiene rol `r_admin`:** Revocar las API keys creadas por ese usuario. `Administración → API Keys` → filtrar por creador → revocar.
4. **Activar IP Allowlist de emergencia** (§4.3): Si el acceso no autorizado viene desde IPs externas, activar la allowlist con solo las IPs de la red corporativa conocida.
5. **Notificar internamente** al responsable de IT y al área legal en paralelo.

### Paso 2 — Análisis (15 minutos – 2 horas)

El objetivo es determinar el alcance: qué datos fueron accedidos, qué acciones se ejecutaron, desde cuándo ocurre.

**Qué revisar en `audit_logs`:**
- Filtrar por `actor_id` del usuario comprometido, rango de fechas de sospecha.
- Identificar: qué espacios accedió, qué agentes usó, qué acciones ejecutó (`action_logs`).
- Exportar como JSON para preservación forense.

**Qué revisar en `admin_audit_log`:**
- Filtrar por `actor_id` o `actor_email` del usuario comprometido.
- Buscar: cambios de roles (`user.role_changed`), creación de API keys (`api_key.created`), cambios de configuración.
- Verificar la columna `ip_address` para identificar IPs de origen.
- **Ejecutar verificación de integridad** (`audit_integrity_checks`): en Administración → Auditoría → Verificar integridad. Si el resultado es `tampered`, la evidencia de la base puede estar comprometida — conservar las exportaciones locales.

**Preguntas a responder durante el análisis:**
- ¿Desde qué IP / dispositivo se realizó el acceso no autorizado?
- ¿Cuánto tiempo tuvo acceso activo el atacante?
- ¿Qué datos personales o confidenciales pudo haber visto?
- ¿Se crearon usuarios, API keys u otras cuentas de acceso nuevas?
- ¿Se modificaron prompts, acciones o configuraciones de agentes?

### Paso 3 — Notificación regulatoria (dentro de 72 horas)

Si el análisis confirma que se accedió o exfiltró **información personal identificable** (nombres, emails, datos de empleados, etc.):

- **GDPR (Unión Europea):** Notificación obligatoria a la autoridad de control en un máximo de **72 horas** desde la confirmación del incidente.
- **LGPD (Brasil):** Notificación a la ANPD en un plazo **razonable**, generalmente interpretado como 72 horas para incidentes de alto riesgo.
- **Otras jurisdicciones:** Consultar con el área legal según regulación aplicable.

Contactar al equipo de Mooving para obtener:
- El Data Processing Agreement (DPA) firmado.
- Los logs técnicos de infraestructura (accesos a Cloudflare Workers, D1) no disponibles en la UI.
- Soporte en la redacción del reporte regulatorio.

### Paso 4 — Recuperación y post-mortem

Una vez contenido el incidente:

1. **Desbloquear o recrear las cuentas** afectadas con nuevas credenciales.
2. **Forzar cambio de contraseña** a los usuarios del mismo grupo de acceso que el comprometido.
3. **Revisar y revocar** todas las API keys creadas durante el período de compromiso.
4. **Verificar la configuración** de agentes y prompts: buscar cambios no autorizados en `admin_audit_log`.
5. **Documentar el post-mortem** con: timeline del incidente, causa raíz, acciones tomadas, mejoras implementadas.
6. **Revisar la política de acceso**: ¿El principio de mínimo privilegio estaba bien aplicado? ¿El usuario comprometido tenía más accesos de los necesarios?

---

## 4.8 Checklist de revisión de seguridad trimestral

Ejecutar este checklist cada tres meses como práctica de higiene de seguridad. Documentar los resultados y conservar el registro.

### Gestión de identidades y accesos

```
□ Exportar lista de usuarios (§1.10 cap. 1) y verificar que solo personal activo
  tenga cuentas habilitadas (is_active = 1).
□ Verificar que ningún usuario inactivo (dado de baja en RRHH) tenga acceso.
□ Confirmar que el número de usuarios con r_admin es el mínimo necesario.
□ Verificar que todos los usuarios con r_admin y r_tenant_owner tienen MFA activo.
□ Revisar usuarios con mfa_enabled = 0 y aplicar política según sector.
□ Verificar que password_expiry_days esté configurado según la política vigente.
```

### API Keys y cuentas de servicio

```
□ Ir a Administración → API Keys → listar todas las keys activas.
□ Identificar keys no utilizadas en los últimos 30 días (campo last_used_at).
□ Revocar API keys no utilizadas o cuyo propietario ya no está en la organización.
□ Verificar que ninguna API key tiene alcance mayor al necesario.
□ Revisar keys con scope `admin`: ¿son estrictamente necesarias?
  Las claves admin permiten configurar espacios, agentes y acciones vía MCP.
  Si la configuración remota ya no está en uso, revocar.
```

### Sesiones y acceso

```
□ Revisar si hay sesiones activas de usuarios inactivos o dados de baja.
□ Verificar que session_timeout_hours esté configurado según el sector.
□ Revisar la IP Allowlist: ¿están todas las entradas vigentes? ¿hay IPs obsoletas?
```

### Auditoría e integridad

```
□ Ir a Administración → Auditoría → Verificar integridad del admin_audit_log.
  Confirmar que el resultado es "ok" (no "tampered" ni "partial").
□ Exportar admin_audit_log del trimestre anterior en formato JSON y archivar
  en repositorio externo (no en Senda).
□ Revisar eventos inusuales en admin_audit_log: múltiples cambios de rol,
  creación masiva de API keys, cambios en horarios atípicos.
□ Verificar que no haya usuarios con r_superadmin en el tenant.
```

### Configuración de espacios y accesos

```
□ Revisar espacios con visibility = 'public': ¿el token sigue siendo necesario?
□ Verificar que los espacios sensibles (RRHH, Finanzas, Legal) tienen
  default_access = FALSE.
□ Revisar la tabla space_admins: ¿todos los administradores de espacio siguen
  siendo los correctos?
```

---

## 4.9 Tabla de eventos registrados por tabla de auditoría

### Eventos en `audit_logs` (actividad de usuarios)

| Categoría | Eventos registrados |
|-----------|-------------------|
| **Sesión** | Login exitoso, login fallido, logout, sesión expirada |
| **Chat** | Inicio de conversación, mensaje enviado |
| **Acciones** | Acción ejecutada (con status: success/error), acción confirmada por usuario, acción revertida |
| **Archivos** | Documento accedido desde base de conocimiento |
| **Espacios** | Acceso a espacio, acceso denegado (403) |

### Eventos en `admin_audit_log` (cambios administrativos)

| Categoría | Eventos registrados |
|-----------|-------------------|
| **Usuarios** | `user.created`, `user.deactivated`, `user.deleted`, `user.role_changed`, `user.blocked`, `user.unblocked` |
| **Contraseñas y MFA** | `user.password_reset`, `user.force_password_change`, `user.mfa_reset`, `user.mfa_enrolled` |
| **Sesiones** | `user.sessions_revoked`, `user.session_invalidated` |
| **API Keys** | `api_key.created`, `api_key.revoked`, `api_key.scope_changed` |
| **Configuración** | `tenant.policy_changed`, `tenant.ip_allowlist_changed`, `tenant.session_timeout_changed` |
| **Espacios** | `space.created`, `space.access_granted`, `space.access_revoked`, `space.visibility_changed` |
| **Agentes** | `agent.created`, `agent.prompt_changed`, `agent.deleted` |
| **Equipos** | `group.created`, `group.member_added`, `group.member_removed` |
| **MCP Admin** | `mcp_admin:create`, `mcp_admin:update`, `mcp_admin:assign`, `mcp_admin:configure`, `mcp_admin:duplicate` — Operaciones de configuración remota vía agentes de IA externos. Registra entidad afectada (`space`, `agent`, `action`, `knowledge`, `space_tool`, `space_access`) y actor (API Key). Source: `mcp_admin`. |
| **Integridad** | `audit.integrity_check` (resultado: `ok`, `tampered`, `partial`) |

---

> 📖 **Anterior:** [3 — Tokens y Service Accounts](03_tokens_y_service_accounts.md)
> 📖 **Siguiente:** [5 — Modelos y Funciones IA](05_modelos_y_funciones_ia.md)
> 📖 **Relacionado:** [1 — Usuarios, Roles y Permisos](01_usuarios_roles_y_permisos.md) · [8 — Privacidad y Compliance](08_privacidad_y_compliance.md)
