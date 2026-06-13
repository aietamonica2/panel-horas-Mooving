# 2. Equipos y Control de Acceso a Espacios

> **Versión documentada:** v5.6.92 · **Última revisión:** 2026-05-27

Senda implementa un modelo de Identity and Access Management (IAM) empresarial que combina roles globales, grupos de usuarios (equipos) y listas de control de acceso (ACL) por espacio. Este capítulo explica cómo configurar y mantener esa arquitectura de manera segura y auditable.

---

## El Modelo de Roles del Sistema

Senda define cinco roles globales de nivel tenant. Son niveles progresivos de autoridad, no categorías paralelas. Cada usuario tiene exactamente un rol global.

| Rol | Código | Alcance | Descripción operacional |
|---|---|---|---|
| **Dueño del Tenant** | `r_tenant_owner` | Todo el tenant | Autoridad máxima. Equivale al propietario del sistema. Puede hacer cualquier cosa, incluyendo transferir la propiedad. |
| **Administrador** | `r_admin` | Todo el tenant | Crea y edita espacios, agentes, usuarios, equipos y acciones. No accede al log de auditoría. |
| **Oficial de Seguridad** | `r_security_officer` | Solo auditoría | Puede leer el historial completo de acciones administrativas. No puede modificar ninguna configuración. |
| **Usuario** | `r_user` | Solo espacios asignados | Accede únicamente a los espacios para los que tiene permiso explícito o que son de acceso libre. |
| **SuperAdmin** | `r_superadmin` | Infraestructura | Exclusivo del equipo Mooving. Los clientes nunca ven ni asignan este rol. |

### Principio de Separación de Poderes

El diseño separa deliberadamente las capacidades de modificar y de auditar:

- El **Administrador** puede cambiar cualquier configuración, pero no puede ver el log de auditoría de sus propias acciones.
- El **Oficial de Seguridad** puede ver qué hizo cualquier administrador y cuándo, pero no puede cambiar nada.

Ninguna persona sola tiene poder total sin supervisión. Esta separación es un requisito de compliance en sectores regulados.

---

## Equipos (User Groups): Gestión Escalable de Acceso

Los **equipos** (`user_groups`) son agrupaciones lógicas de usuarios que representan áreas, departamentos o funciones dentro de la organización. Son el mecanismo central para gestionar acceso a escala: en lugar de asignar permisos usuario por usuario, se asigna el equipo a un espacio y todos sus miembros heredan el acceso automáticamente.

### Estructura de Datos de un Equipo

Cada equipo en Senda tiene los siguientes atributos:

| Campo | Descripción | Ejemplo |
|---|---|---|
| **Nombre** | Identificador único por tenant | `Logística Buenos Aires` |
| **Descripción** | Contexto del equipo | `Equipo de coordinación de depósitos y distribución` |
| **Color** | Etiqueta visual en el dashboard | `#f59e0b` (ámbar) |
| **ID Externo** | Para sincronización con SCIM/Azure AD | `grp-12345-entra` |
| **Equipo Padre** | Permite jerarquías de subequipos | `Logística` → `Logística BsAs` |

### Roles Internos de un Equipo

Los miembros de un equipo tienen un rol interno que determina qué pueden gestionar dentro del equipo:

| Rol interno | Código | Capacidades |
|---|---|---|
| **Miembro** | `member` | Accede a los espacios del equipo. Sin capacidad de gestión del equipo. |
| **Admin de equipo** | `admin` | Puede agregar y remover miembros. |
| **Dueño de equipo** | `owner` | Puede hacer todo lo del admin y también disolver el equipo. |

> **Descentralización práctica:** El líder del área de RRHH puede ser `owner` de su equipo y gestionar quién entra y sale sin necesitar permisos globales de Administrador. Esto reduce la carga operacional del equipo de IT.

### Cómo Crear un Equipo

**Ruta:** Administración → Usuarios → Equipos → **Nuevo Equipo**

1. Completar nombre único dentro del tenant (el sistema valida duplicados).
2. Agregar una descripción que identifique claramente el área.
3. Seleccionar un color distintivo para reconocimiento visual rápido.
4. Si aplica, seleccionar un **equipo padre** para crear una jerarquía departamental.
5. Guardar. El equipo queda creado sin miembros.

**Agregar miembros:**

1. Abrir el equipo → pestaña **Miembros** → **Agregar miembro**.
2. Buscar por nombre o email.
3. Asignar el rol interno: `member`, `admin` u `owner`.
4. Confirmar. El acceso a los espacios del equipo se aplica de inmediato.

### Jerarquía de Equipos y Herencia

Los equipos soportan una jerarquía padre-hijo mediante el campo `parent_id`. Esto permite estructuras organizacionales complejas:

```
Ventas (equipo raíz)
├── Ventas Norte (subequipo)
│   ├── Ventas Norte CABA
│   └── Ventas Norte GBA
└── Ventas Sur (subequipo)
```

> **Importante:** La jerarquía es solo organizacional. La herencia de acceso a espacios NO se propaga automáticamente de padre a hijo. Cada equipo en la jerarquía debe tener su propia entrada en la ACL de los espacios a los que deba acceder.

---

## Los Tres Modos de Visibilidad de un Espacio

Cada espacio tiene una configuración de visibilidad que define su comportamiento por defecto. Este campo se configura en **Configuración del Espacio → pestaña Acceso**.

| Modo | Símbolo | Quién accede | Cuándo usar |
|---|---|---|---|
| **Interno** | 🔗 | Solo usuarios autenticados del tenant | La mayoría de los espacios operacionales (soporte IT, RRHH general, finanzas) |
| **Privado** | 🔒 | Solo usuarios con entrada explícita en la ACL | Espacios sensibles: Directorio Ejecutivo, Legal, M&A, Compensaciones |
| **Público** | 🌐 | Cualquier persona con el token de URL | Agentes de cara al cliente, kioscos, demos en ferias |

### Acceso por Defecto

Además de la visibilidad, cada espacio tiene un toggle **Acceso por Defecto**:

- **Activado (🟢):** Todos los usuarios del tenant pueden ver y acceder al espacio sin necesitar una entrada en la ACL. Ideal para un portal general corporativo.
- **Desactivado (🔴):** Solo quienes tengan una entrada en la ACL pueden acceder. Recomendado para cualquier espacio que no sea de uso universal.

---

## La Lista de Control de Acceso (ACL)

Con **Acceso por Defecto** desactivado, la ACL es la única vía de ingreso al espacio. Soporta tres tipos de entradas:

| Tipo | Cuándo usar | Escala |
|---|---|---|
| 👤 **Usuario individual** | Acceso temporal o a consultores externos | 1 persona por entrada |
| 🏷️ **Por Rol global** | Dar acceso a todos los `r_admin` o todos los `r_user` | Afecta a todos los usuarios con ese rol |
| 👥 **Por Equipo** | La forma estándar y escalable | Todos los miembros del equipo heredan acceso |

Cada entrada tiene además un **nivel de acceso**:

| Nivel | Código | Qué puede hacer |
|---|---|---|
| **Lectura** | `read` | Chatear con los agentes del espacio |
| **Admin de espacio** | `admin` | Chatear + gestionar la configuración del espacio (agentes, prompts, acciones) |

El campo `inherit` en la tabla `space_access` indica si la entrada se hereda en sub-espacios hijos (valor por defecto: `1` = hereda).

---

## Space Admins: Delegación sin Acceso Global

La tabla `space_admins` permite designar a un usuario como **administrador de un espacio específico** sin otorgarle el rol global `r_admin`. Es la herramienta correcta para delegar la gestión de un espacio a su responsable funcional.

### Diferencias Clave

| Capacidad | `r_admin` global | Space Admin |
|---|---|---|
| Ver todos los espacios del tenant | ✅ | ❌ Solo el/los espacios asignados |
| Editar agentes del espacio | ✅ | ✅ |
| Gestionar ACL del espacio | ✅ | ✅ |
| Crear usuarios nuevos | ✅ | ❌ |
| Ver log de auditoría | ❌ | ❌ |
| Crear nuevos espacios | ✅ | ❌ |

### Cómo Designar un Space Admin

**Ruta:** Configuración del Espacio → pestaña Acceso → **Administradores del Espacio** → **Agregar**

1. Buscar al usuario por nombre o email.
2. Confirmar. El usuario queda registrado en `space_admins` con referencia al espacio.
3. El registro incluye quién otorgó el acceso (`granted_by`) y la fecha, para trazabilidad.

---

## La Lógica de Evaluación de Acceso (Cascada)

Cuando un usuario intenta acceder a un espacio, el sistema evalúa las siguientes condiciones **en orden**, deteniéndose en la primera que se cumple:

```
1. ¿El usuario tiene rol r_admin o r_tenant_owner?
   SÍ → Acceso garantizado.

2. ¿El espacio tiene "Acceso por Defecto" activo?
   SÍ → Acceso garantizado para todos los usuarios del tenant.

3. ¿El espacio es "Público"?
   SÍ → Acceso garantizado (sin autenticación, via token URL).

4. ¿El usuario tiene entrada en la ACL del espacio?
   → Por usuario individual
   → Por su rol global
   → Por pertenecer a un equipo que tiene acceso
   SÍ → Acceso garantizado.

5. Ninguna condición se cumple → Acceso denegado.
   El espacio no aparece en el Dashboard. Para el usuario, no existe.
```

> **Principio de invisibilidad:** Un espacio denegado no devuelve error 403 en el listado del dashboard. Directamente no aparece. El usuario no puede saber que existe un espacio al que no tiene acceso.

---

## Procedimientos Administrativos Comunes

### Procedimiento 1: Onboarding de una nueva área (ej. Equipo de Compras)

1. **Crear el equipo:** Administración → Usuarios → Equipos → Nuevo Equipo → nombre `Compras`, color, descripción.
2. **Crear o identificar el espacio de Compras.** Si no existe, crearlo primero.
3. **Configurar el espacio:** Visibilidad `Privado`, Acceso por Defecto `desactivado`.
4. **Agregar el equipo a la ACL:** Espacio → Acceso → Agregar entrada → Tipo: Equipo → seleccionar `Compras` → Nivel: `read`.
5. **Agregar miembros al equipo:** Equipo Compras → Miembros → Agregar → seleccionar usuarios.
6. **Designar un responsable:** Asignar rol `owner` dentro del equipo al líder del área. Opcionalmente designarlo Space Admin.

**Resultado:** Todos los miembros de Compras tienen acceso al espacio. El líder gestiona su propio equipo de manera autónoma.

### Procedimiento 2: Baja de un empleado

1. Ir a Administración → Usuarios → buscar al empleado.
2. **Desactivar el usuario** (`is_active = 0`). La sesión se invalida en el próximo request (máximo 1 hora si hay sesión activa).
3. No es necesario eliminar manualmente las entradas de ACL individuales: al desactivar el usuario, las evaluaciones de acceso lo excluyen automáticamente.
4. Si el usuario era `owner` de algún equipo, asignar nuevo owner antes de desactivarlo.

> **Nunca borres un usuario.** Desactívalo. Borrar elimina el historial de auditoría asociado al actor.

### Procedimiento 3: Acceso temporal para un consultor externo

1. Crear el usuario con rol `r_user`.
2. Agregar al usuario **directamente en la ACL del espacio específico** (no al equipo).
3. Documentar la fecha de vencimiento acordada en la descripción de la entrada o en el sistema de tickets.
4. En la fecha acordada: eliminar la entrada de la ACL (no al usuario). El usuario pierde acceso pero el registro histórico se conserva.

> **Regla:** Nunca des acceso por equipo a consultores externos. La entrada individual en la ACL mantiene trazabilidad y facilita la remoción sin afectar al equipo.

### Procedimiento 4: Configurar un espacio público (para clientes externos)

1. Espacio → Configuración → pestaña Acceso.
2. Visibilidad → seleccionar **Público**.
3. El sistema genera automáticamente un `url_token` único para el espacio.
4. El link público tiene la forma: `https://senda.tuempresa.ai/chat/[url_token]`
5. Compartir el link con los destinatarios externos.
6. Para revocar el acceso público: cambiar visibilidad a `Interno` o `Privado`. El token queda invalidado.

---

## Auditoría de Acceso: Quién Tiene Acceso a Qué

### Ver la ACL de un espacio

**Ruta:** Configuración del Espacio → pestaña Acceso → sección Lista de Acceso

La tabla muestra todas las entradas activas con: tipo (usuario/rol/equipo), nivel de acceso, quién lo otorgó y la fecha.

### Ver todos los espacios a los que accede un usuario

**Ruta:** Administración → Usuarios → [usuario] → pestaña Accesos

Esta vista consolida todos los espacios a los que el usuario tiene acceso, indicando si es por entrada directa, por rol o por equipo.

### Ver el log de auditoría de cambios de acceso

**Solo disponible para `r_security_officer` y `r_tenant_owner`.**

**Ruta:** Administración → Auditoría → filtrar por tipo de acción: `space_access_granted` / `space_access_revoked`

El log registra: quién hizo el cambio, qué cambió, en qué espacio, y desde qué IP.

---

## Checklist de Configuración de Acceso

Antes de habilitar Senda a los usuarios finales, verificar:

```
ROLES GLOBALES:
□ El r_tenant_owner está asignado al responsable máximo (1-2 personas)
□ r_admin asignado solo al equipo de IT/Operaciones (máximo 3 personas)
□ Existe al menos 1 r_security_officer designado
□ No hay usuarios sin rol asignado

EQUIPOS:
□ Los equipos están creados antes de configurar los espacios
□ Cada equipo tiene al menos 1 owner o admin interno
□ Los consultores externos tienen acceso individual (no por equipo)

ESPACIOS:
□ Todos los espacios tienen visibilidad explícita configurada
□ Los espacios sensibles (RRHH, Finanzas, Legal) tienen default_access=FALSE
□ Los espacios públicos tienen su url_token activo y distribuido correctamente
□ Existe al menos 1 espacio con default_access=TRUE para uso general

SPACE ADMINS:
□ Los responsables funcionales de cada área están designados como Space Admins
□ Ningún Space Admin tiene r_admin global sin necesidad operacional justificada
```

---

> 📖 **Anterior:** [1 — Usuarios, Roles y Permisos](01_usuarios_roles_y_permisos.md)
> 📖 **Siguiente:** [3 — Tokens, Service Accounts y API Keys](03_tokens_y_service_accounts.md)
