# 09. Guía Definitiva: Instalación y Despliegue en Microsoft Teams

**Contexto**: Esta guía paso a paso está diseñada para que un Administrador de IT pueda instalar Senda desde cero dentro del ecosistema de Microsoft Teams de su corporación.

Al finalizar esta guía, sus empleados podrán acceder a Senda haciendo clic en un ícono dentro de Teams, sin tener que poner contraseñas (SSO Invisible) y sus cuentas se crearán automáticamente (JIT Provisioning).

**Requisitos previos**:
- Cuenta de administrador en el tenant de Microsoft 365 de su organización
- Acceso de administrador a Senda (rol `admin` o `tenant_owner`)
- Plan **Enterprise** en Senda (el SSO requiere este plan)
- Feature flag `teams_sso_tab` habilitado para su tenant

---

## Fase 1: Habilitación en Senda

Antes de configurar Microsoft, prepare su entorno (Tenant) en Senda.

1. **Crear Espacios Públicos**: Dado que los empleados ingresarán por primera vez sin pertenecer a grupos cerrados, vaya a **Senda Studio > Espacios** y asegúrese de tener al menos un espacio configurado como **"Público"** (ej. *Asistente de Recursos Humanos* o *Soporte IT*). Si no hay espacios públicos, los usuarios verán una pantalla vacía.
2. **Activar el Feature Flag**: Solicite al equipo de Soporte de Senda (o a un SuperAdmin) que active el Feature Flag `teams_sso_tab` en su Tenant. Sin esta activación, el SSO de Teams devolverá un error 403.

---

## Fase 2: Registro en Microsoft Entra ID (Azure AD)

Senda necesita permisos para validar silenciosamente la identidad de sus empleados.

1. Ingrese al [Centro de administración de Microsoft Entra](https://entra.microsoft.com/) con privilegios de administrador.
2. Vaya a **Identity > Applications > App registrations** y haga clic en **New registration**.
   - **Nombre**: `Senda AI Workspace` (o el nombre que prefiera).
   - **Supported account types**: Seleccione *Accounts in this organizational directory only (Single tenant)*.
   - Haga clic en **Register**.
3. En la pantalla general de su nueva App, copie y guarde estos dos valores:

| Valor | Dónde encontrarlo |
|-------|-------------------|
| **Application (client) ID** | Overview → Application (client) ID |
| **Directory (tenant) ID** | Overview → Directory (tenant) ID |

4. En el menú izquierdo, vaya a **Expose an API**:
   - Junto a *Application ID URI*, haga clic en **Set**. Configure el valor como: `api://{SU-DOMINIO-SENDA}/{SU-CLIENT-ID}` (ejemplo: `api://senda.telar.ai/1fec8e78-bce4-...`) y guarde.
   - Haga clic en **Add a scope**. Llénelo de la siguiente manera:
     - **Scope name**: `access_as_user`
     - **Who can consent**: `Admins and users`
     - **Admin consent display name**: `Acceso SSO a Senda`
     - **Admin consent description**: `Permite a Teams intercambiar tokens con Senda.`
     - **State**: `Enabled`
     - Haga clic en **Add scope**.
5. En la misma pantalla de *Expose an API*, baje hasta la sección **Authorized client applications** y agregue estos dos IDs obligatorios de Microsoft Teams (marque el checkbox de su scope `access_as_user` en ambos):

| Client ID | Plataforma |
|-----------|-----------|
| `1fec8e78-bce4-4aaf-ab1b-5451cc387264` | Teams Desktop / Móvil |
| `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` | Teams Web |

---

## Fase 3: Configuración de Credenciales en Senda

Ahora que Microsoft confía en Senda, debemos configurar los identificadores de Azure en su organización.

1. Ingrese a la plataforma de Senda como Administrador.
2. Vaya a **Configuración > Directorio > pestaña Integraciones**.
3. Busque la sección **"Configuración de Azure AD para Teams"** (tarjeta azul).
4. Complete los campos:

| Campo | Valor | Obligatorio |
|-------|-------|-------------|
| **Application (Client) ID** | El Application ID copiado en la Fase 2 | Sí |
| **Directory (Tenant) ID** | El Directory ID copiado en la Fase 2 | Opcional* |

5. Haga clic en **"💾 Guardar Config"**.
6. Confirme que aparece el mensaje: *"Configuración de Teams guardada correctamente."*

> \* El Directory (Tenant) ID es opcional. Si se configura, Senda rechazará tokens que no provengan de su organización de Azure AD específica, lo cual añade una capa de seguridad adicional. Si se omite, Senda aceptará tokens de cualquier organización de Azure AD.

**Nota importante**: Estos datos se guardan por organización. Cada tenant de Senda puede tener su propia configuración de Azure AD independiente, permitiendo que organizaciones distintas coexistan en la misma plataforma.

---

## Fase 4: Generación del Paquete de Instalación

Con las credenciales configuradas, generemos el archivo instalable.

1. En la misma página de **Integraciones**, desplácese hacia abajo hasta el panel **"Generador de Microsoft Teams App (Manifest)"** (tarjeta violeta).
2. Verifique que los campos estén correctos:
   - **Azure App ID**: debería estar auto-completado con el valor guardado en la Fase 3.
   - **Tenant Slug**: se auto-detecta del código de su organización. Verifique que sea correcto.
   - **Dominio detectado**: asegúrese de que muestre el dominio correcto de su ambiente.
3. Haga clic en **"📦 Descargar Paquete (.zip)"**.
4. El navegador descargará un archivo llamado `SendaTeamsApp_{su-empresa}.zip`.

**¿Qué contiene el archivo .zip?**

| Archivo | Descripción |
|---------|-------------|
| `manifest.json` | Configuración completa de la app para Teams |
| `color.png` | Ícono a color de Senda (192×192 px) |
| `outline.png` | Ícono outline de Senda (32×32 px) |

---

## Fase 5: Despliegue a los Empleados

El último paso es subir el archivo `.zip` para que aparezca en el Teams de sus empleados.

### Opción A: Prueba Rápida (Sideloading)

Esta opción permite probar la instalación antes de distribuirla a toda la organización.

1. Abra Microsoft Teams (desktop o web).
2. Haga clic en **"Apps"** (barra lateral izquierda).
3. Haga clic en **"Manage your apps"** (abajo).
4. Haga clic en **"Upload an app" > "Upload a custom app"**.
5. Seleccione el archivo `.zip` y haga clic en **"Add"**.
6. Senda aparecerá como una pestaña personal en su barra lateral.

> **Nota**: El Sideloading requiere que la política de su organización permita la carga de aplicaciones personalizadas.

### Opción B: Distribución Organizacional (Producción)

1. Ingrese al [Microsoft Teams Admin Center](https://admin.teams.microsoft.com/).
2. Vaya a **Teams apps > Manage apps**.
3. Haga clic en **Upload new app** y seleccione el archivo `.zip`.
4. La app aparecerá en el catálogo como **"Senda"**.
5. *(Recomendado)*: Vaya a **Teams apps > Setup policies**. Seleccione la política Global y en la sección **Pinned apps**, agregue "Senda". Esto fijará permanentemente el ícono de Senda en la barra lateral izquierda del Teams de todos los empleados.

**¡Misión Cumplida!**
A partir de este momento, cuando un empleado haga clic en el ícono de Senda en su Microsoft Teams, ingresará directamente a la plataforma de IA sin tener que escribir ninguna contraseña.

---

## Verificación y Troubleshooting

### Checklist de Validación

| # | Verificación | Resultado Esperado |
|---|---|---|
| 1 | La pestaña "Senda" aparece en Teams | El ícono se muestra en la barra lateral |
| 2 | El SSO silencioso funciona | Al abrir la pestaña, NO pide usuario/contraseña |
| 3 | El usuario aparece en Senda | En Configuración > Usuarios, se creó automáticamente |
| 4 | Los espacios son visibles | El usuario ve al menos un espacio público |

### Errores Frecuentes

| Mensaje de Error | Causa | Solución |
|---|---|---|
| "Faltan credenciales o tenant" | El slug está vacío o incorrecto | Verifique el URL Slug en Configuración > General |
| "Single Sign-On requiere plan Enterprise" | El plan del tenant no es Enterprise | Contacte a Soporte para actualizar su plan |
| "La integración con Microsoft Teams no está habilitada" | El feature flag está desactivado | Solicite la activación de `teams_sso_tab` |
| "No se encontró un Application ID de Teams configurado" | No se completó la Fase 3 | Vaya a Integraciones y guarde la configuración de Azure AD |
| "Audience mismatch" | El App ID en Senda no coincide con el del manifest | Verifique que sea el mismo UUID en ambos lados |
| Pantalla en blanco dentro de Teams | CORS o dominio no autorizado | Verifique que el dominio esté en `validDomains` del manifest |

---

### Notas de Seguridad

- **Validación Criptográfica**: Senda valida cada token de Azure AD verificando la firma digital RSA contra las claves públicas de Microsoft (JWKS). No se acepta ningún token sin verificación criptográfica.
- **Restricción de Iframes (CSP)**: La arquitectura de Senda solo permite que la plataforma sea incrustada (`frame-ancestors`) si detecta que el sitio contenedor es oficialmente `*.teams.microsoft.com` o `*.skype.com`. Es imposible que un atacante incruste Senda en otro sitio web falso.
- **Aislamiento Multi-Tenant**: Cada organización configura sus propias credenciales de Azure AD. Un token emitido para la organización A no puede autenticarse en la organización B dentro de Senda.
- **Cache de Claves Públicas**: Las claves JWKS de Microsoft se almacenan en cache durante 24 horas. Si necesita forzar una actualización, contacte a Soporte Técnico.
