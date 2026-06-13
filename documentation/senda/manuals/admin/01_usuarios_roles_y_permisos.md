# 1. Usuarios, Roles y Permisos

> **Versión documentada:** v5.6.92 · **Última revisión:** 2026-05-27

Este capítulo cubre la gestión operativa de identidades en Senda: cómo crear, modificar, desactivar y auditar usuarios; cómo funcionan los roles y qué puede hacer cada uno; y cómo configurar las políticas de contraseña del tenant. Cada sección incluye los pasos exactos a ejecutar en la interfaz de administración.

---

## 1.1 El modelo de roles de Senda

Senda implementa un modelo de control de acceso basado en roles (RBAC) con cinco roles predefinidos de sistema. Los roles no son acumulables: cada usuario tiene exactamente un rol asignado en el campo `role_id` de la tabla `users`.

| Rol | Código interno | Alcance | Acceso a conversaciones | Acceso a logs de auditoría |
|-----|---------------|---------|------------------------|---------------------------|
| **Propietario del Tenant** | `r_tenant_owner` | Global — todo el tenant | ✅ Completo | ✅ Completo |
| **Administrador** | `r_admin` | Global — todo el tenant | ✅ Completo | ❌ Sin acceso |
| **Oficial de Seguridad** | `r_security_officer` | Solo lectura de auditoría | ❌ Sin acceso | ✅ Completo |
| **Usuario** | `r_user` | Solo los espacios habilitados | Solo los propios | ❌ Sin acceso |
| **SuperAdmin** | `r_superadmin` | Infraestructura de plataforma | N/A | N/A |

> **Nota sobre `r_superadmin`:** Este rol es exclusivo del equipo operativo de Mooving. Ningún usuario de cliente debe recibir este rol. Si aparece asignado a un usuario de su tenant, escale inmediatamente a soporte de Mooving.

### Diferencia crítica: `r_admin` vs. Administrador de Espacio (`space_admins`)

Estas dos figuras coexisten pero tienen alcances completamente distintos:

| Dimensión | `r_admin` (rol global) | Administrador de Espacio |
|-----------|----------------------|--------------------------|
| **Alcance** | Todo el tenant | Un espacio concreto |
| **Cómo se asigna** | Campo `role_id` del usuario | Registro en tabla `space_admins` |
| **Qué puede hacer** | Crear usuarios, editar agentes, acceder a cualquier espacio, gestionar integraciones | Gestionar la configuración y los accesos del espacio asignado únicamente |
| **Acceso a auditoría** | No | No |
| **Caso de uso típico** | Administrador global de IT | Líder de área que gestiona su propio espacio |

Un usuario con rol `r_user` puede ser Administrador de Espacio de uno o varios espacios sin tener privilegios globales. Esto permite delegar la gestión operativa de un espacio sin otorgar acceso de administrador a toda la plataforma.

---

## 1.2 Crear un usuario nuevo

### Requisitos previos
- Su cuenta debe tener rol `r_admin` o `r_tenant_owner`.
- El email del nuevo usuario no debe existir previamente en el sistema (campo `email` es `UNIQUE` en la tabla `users`).

### Procedimiento

1. En el menú lateral, ir a **Administración → Usuarios**.
2. Hacer click en **Nuevo usuario** (botón superior derecho).
3. Completar los campos obligatorios:

   | Campo | Descripción | Obligatorio |
   |-------|-------------|-------------|
   | **Email** | Dirección de correo corporativa. Será el identificador de login. | ✅ |
   | **Nombre completo** | Nombre que aparecerá en la interfaz y en los logs de auditoría. | ✅ |
   | **Rol inicial** | Seleccionar de la lista desplegable. Ver tabla de roles en §1.1. | ✅ |
   | **Puesto** | Cargo o posición en la organización. Aparece en el perfil del usuario. | Opcional |

4. Hacer click en **Crear usuario**.
5. El sistema genera automáticamente una **invitación por email** al correo ingresado. El email contiene un enlace de activación con vigencia de **72 horas**.
6. El usuario debe hacer click en el enlace, definir su contraseña (según la política configurada en §1.7) y activar su cuenta.

> **Si el email de invitación no llega:** Verificar en la lista de usuarios que el email sea correcto. Usar la opción **Reenviar invitación** disponible en el menú de tres puntos de la fila del usuario.

### Estado del usuario tras la creación

Un usuario recién creado aparece con estado `Pendiente de activación` hasta que complete el flujo de invitación. El campo `is_active = 1` se establece solo al activar la cuenta.

---

## 1.3 Cambiar el rol de un usuario

### Procedimiento

1. Ir a **Administración → Usuarios**.
2. Localizar el usuario en la lista (usar el buscador por nombre o email).
3. Hacer click en el menú de tres puntos (⋮) de la fila del usuario → **Editar**.
4. En el campo **Rol**, seleccionar el nuevo rol.
5. Hacer click en **Guardar cambios**.

### Tiempo de efecto y sesiones activas

El cambio de rol se aplica **inmediatamente** en la base de datos. Sin embargo, dado que los tokens JWT se validan en cada request con una vida útil corta, el nuevo rol puede tardar **hasta 1 hora** en reflejarse para el usuario si tiene una sesión activa. No es necesario forzar el cierre de sesión para la mayoría de los casos.

**Excepción — degradación de privilegios ante incidente de seguridad:** Si necesita reducir los privilegios de un usuario con urgencia (por ejemplo, de `r_admin` a `r_user`), cambie el rol *y* invalide la sesión activa del usuario de forma inmediata. Ver procedimiento de invalidación de sesión en §1.9.

### Restricciones

- No es posible asignarse a uno mismo el rol `r_tenant_owner`.
- El rol `r_superadmin` no aparece en el selector de la UI de administración.
- Un tenant debe tener siempre al menos un usuario con `r_tenant_owner` activo. El sistema impedirá revocar el único `r_tenant_owner` existente.

---

## 1.4 Dar de baja a un usuario

Senda distingue dos operaciones con impactos muy distintos:

| Operación | Efecto en acceso | Efecto en historial | Reversible |
|-----------|-----------------|---------------------|------------|
| **Desactivar** | El usuario no puede iniciar sesión. Las sesiones activas expiran en el siguiente ciclo. | El historial de conversaciones y los logs de auditoría se **conservan intactos**. | ✅ Sí — reactivando desde la UI |
| **Eliminar** | El usuario no puede iniciar sesión. | El registro del usuario se marca para **purga según `data_retention_days`**. Las conversaciones quedan sin `actor_id` referenciado (huérfanas). | ❌ No |

> **Recomendación operativa:** Utilizar **desactivar** como acción estándar de baja. La eliminación está reservada para cumplimiento de derecho al olvido (GDPR/LGPD). Consulte con el área legal antes de eliminar registros de usuarios.

### Procedimiento — Desactivar usuario

1. Ir a **Administración → Usuarios**.
2. Localizar el usuario → menú ⋮ → **Desactivar usuario**.
3. Confirmar en el diálogo de confirmación.
4. El campo `is_active` pasa a `0` en la tabla `users`. El usuario recibirá `401 Unauthorized` en su próxima acción.

### Procedimiento — Eliminar usuario

1. Ir a **Administración → Usuarios**.
2. Localizar el usuario → menú ⋮ → **Eliminar usuario**.
3. Leer el aviso de consecuencias irreversibles y escribir el email del usuario para confirmar.
4. Hacer click en **Eliminar permanentemente**.

### Impacto en conversaciones activas

Si el usuario tiene una conversación en curso al momento de la desactivación o eliminación:
- La conversación queda abierta en el sistema pero el usuario no puede continuarla.
- El historial de mensajes permanece accesible para administradores.
- No se envían notificaciones al usuario desactivado.

---

## 1.5 Restablecer la contraseña de un usuario

Este procedimiento envía un **reset forzado** desde el panel de administración, sin necesidad de que el usuario lo solicite.

### Procedimiento

1. Ir a **Administración → Usuarios**.
2. Localizar el usuario → menú ⋮ → **Restablecer contraseña**.
3. Seleccionar el método:
   - **Enviar email de restablecimiento:** El sistema envía un enlace al email del usuario con vigencia de 30 minutos.
   - **Forzar cambio en próximo login:** El campo `force_password_change = 1` se activa en la tabla `users`. El usuario podrá ingresar con su contraseña actual, pero será redirigido obligatoriamente a la pantalla de cambio de contraseña antes de poder continuar.
4. Confirmar la acción.

> **Cuándo usar cada método:** Use "Enviar email" cuando el usuario tiene acceso a su correo y es un reset rutinario. Use "Forzar cambio en próximo login" cuando sospeche que la contraseña actual pudo haber sido comprometida pero necesita que el usuario continúe trabajando hasta que pueda cambiarla.

---

## 1.6 Bloquear y desbloquear un usuario

El bloqueo inmediato está diseñado para contener incidentes de seguridad: impide el acceso instantáneamente sin esperar a que el token JWT expire.

### Procedimiento — Bloquear (acción de emergencia)

1. Ir a **Administración → Usuarios**.
2. Localizar el usuario → menú ⋮ → **Bloquear usuario**.
3. El sistema establece `is_active = 0` y adicionalmente invalida todas las sesiones activas de ese usuario. La sesión actual del usuario falla en el siguiente request.

### Procedimiento — Desbloquear usuario

1. Ir a **Administración → Usuarios**.
2. Localizar el usuario bloqueado (aparece con indicador rojo) → menú ⋮ → **Desbloquear usuario**.
3. El campo `is_active` vuelve a `1`. El usuario puede iniciar sesión nuevamente con sus credenciales habituales.

> **Diferencia entre Desactivar y Bloquear:** Ambos establecen `is_active = 0`, pero **Bloquear** invalida además las sesiones activas de forma inmediata. Usar **Bloquear** ante sospecha de compromiso; usar **Desactivar** para bajas planificadas.

---

## 1.7 Configuración de políticas de contraseña

Las políticas de contraseña se configuran a nivel de tenant y afectan a todos los usuarios. Se encuentran en **Administración → Configuración → Seguridad → Políticas de contraseña**.

Los cinco parámetros almacenados en la tabla `tenants` son:

| Parámetro en DB | Campo en UI | Tipo | Default | Descripción |
|----------------|-------------|------|---------|-------------|
| `password_min_length` | Longitud mínima | Entero (1-128) | `8` | Número mínimo de caracteres que debe tener la contraseña. |
| `password_require_uppercase` | Requiere mayúsculas | Booleano | `false` | Si está activo, la contraseña debe incluir al menos una letra mayúscula. |
| `password_require_numbers` | Requiere números | Booleano | `false` | Si está activo, la contraseña debe incluir al menos un dígito (0-9). |
| `password_require_special` | Requiere caracteres especiales | Booleano | `false` | Si está activo, la contraseña debe incluir al menos un carácter especial (`!@#$%^&*`). |
| `password_expiry_days` | Expiración (días) | Entero | `0` (sin expiración) | Si es mayor que `0`, las contraseñas expiran tras ese número de días y se fuerza un cambio. |

### Procedimiento para modificar la política

1. Ir a **Administración → Configuración → Seguridad**.
2. En la sección **Política de contraseñas**, ajustar los valores deseados.
3. Hacer click en **Guardar política**.
4. Los cambios se aplican a **nuevas contraseñas creadas o modificadas a partir de ese momento**. Las contraseñas existentes no se invalidan automáticamente, salvo que active `password_expiry_days` con un valor menor al tiempo transcurrido desde el último cambio de cada usuario.

### Recomendaciones por perfil de seguridad

| Perfil | `min_length` | Mayúsculas | Números | Especiales | Expiración |
|--------|-------------|-----------|---------|-----------|------------|
| Corporativo estándar | 10 | ✅ | ✅ | ❌ | 90 días |
| Sector financiero / salud | 12 | ✅ | ✅ | ✅ | 60 días |
| Acceso público / kioscos | 8 | ❌ | ✅ | ❌ | Sin expiración |

---

## 1.8 Escenarios comunes de administración de usuarios

| Escenario | Procedimiento resumido |
|-----------|----------------------|
| **Empleado nuevo incorporado** | Crear usuario (§1.2) → asignar rol `r_user` → agregar al equipo correspondiente (ver cap. 2) → el email de invitación llega automáticamente. |
| **Empleado que cambia de área** | Editar usuario → si corresponde, cambiar rol. Actualizar membresías de equipo. No es necesario recrear el usuario. |
| **Baja de empleado** | Desactivar usuario (§1.4). Reasignar sus accesos de espacio si era Administrador de Espacio. Conservar historial. |
| **Sospecha de cuenta comprometida** | Bloquear inmediatamente (§1.6) → invalidar sesiones → restablecer contraseña (§1.5) → revisar audit log (ver cap. 4). |
| **Consultor externo temporal** | Crear usuario `r_user` → agregar directamente a la ACL del espacio específico (no al equipo) → desactivar al vencer el contrato. |
| **Delegación de gestión de área** | Crear usuario `r_user` → designar como Administrador de Espacio del espacio del área en **Configuración del Espacio → Administradores**. |
| **Reset de contraseña olvidada** | Usuario usa "Olvidé mi contraseña" en el login, o el admin usa "Enviar email de restablecimiento" (§1.5). |
| **Activar MFA para un usuario** | El usuario lo activa desde su perfil, o el admin fuerza MFA en la política de seguridad (ver cap. 4 §4.4). |

---

## 1.9 Ver sesiones activas

La vista de sesiones activas permite identificar quién está conectado al sistema en un momento dado.

### Procedimiento

1. Ir a **Administración → Usuarios**.
2. Hacer click en el usuario cuyas sesiones quiere revisar → **Ver sesiones activas**.
3. La lista muestra para cada sesión: fecha/hora de inicio, dirección IP de origen, agente de usuario (navegador/dispositivo) y estado.

Para invalidar una sesión específica: hacer click en **Invalidar** en la fila correspondiente.
Para invalidar todas las sesiones de un usuario a la vez: usar **Cerrar todas las sesiones** (disponible también desde el menú ⋮ del usuario en la lista principal).

> **Cuándo revisar sesiones:** Ante sospecha de acceso no autorizado, al dar de baja un usuario que podría tener sesiones activas en dispositivos compartidos, o como parte de la revisión trimestral de seguridad (ver cap. 4 §4.8).

---

## 1.10 Exportar la lista de usuarios para compliance

La exportación genera un archivo con todos los usuarios del tenant, incluyendo estado, rol, fecha de creación y fecha del último login.

### Procedimiento

1. Ir a **Administración → Usuarios**.
2. Hacer click en **Exportar** (ícono de descarga, esquina superior derecha).
3. Seleccionar formato: **CSV** o **JSON**.
4. El archivo se descarga con el nombre `usuarios_[tenant]_[fecha].csv/json`.

### Campos incluidos en la exportación

| Campo | Descripción |
|-------|-------------|
| `id` | Identificador único del usuario |
| `email` | Dirección de correo |
| `nombre` | Nombre completo |
| `puesto` | Cargo |
| `role_id` | Rol asignado |
| `is_active` | Estado activo/inactivo |
| `mfa_enabled` | Si tiene MFA habilitado |
| `created_at` | Fecha de creación |
| `password_changed_at` | Fecha del último cambio de contraseña |

Esta exportación es útil para:
- Auditorías periódicas de acceso (verificar que solo personal activo tenga acceso).
- Revisión de cumplimiento con políticas de MFA por rol.
- Verificación de contraseñas próximas a expirar cuando `password_expiry_days > 0`.
- Reporte a oficiales de seguridad o auditores externos.

---

## Checklist del Capítulo

- [ ] ¿Todos los usuarios activos tienen el rol correcto asignado (no hay `r_admin` innecesarios)?
- [ ] ¿Los Administradores de Espacio están configurados solo donde corresponde?
- [ ] ¿Existe al menos un `r_tenant_owner` activo?
- [ ] ¿La política de contraseñas cumple con los requisitos de seguridad de la organización?
- [ ] ¿Los usuarios desactivados no tienen sesiones activas residuales?
- [ ] ¿Se exportó la lista de usuarios para la última auditoría trimestral?
- [ ] ¿Los consultores externos temporales tienen fecha de desactivación planificada?

---

> 📖 **Siguiente:** [2 — Equipos y Acceso a Espacios](02_equipos_y_acceso_espacios.md)
> 📖 **Relacionado:** [4 — Seguridad, Auditorías y Logs](04_seguridad_y_auditorias.md)
