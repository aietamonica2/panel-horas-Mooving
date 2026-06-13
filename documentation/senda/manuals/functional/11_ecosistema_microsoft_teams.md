# 11. Senda en tu Ecosistema: Microsoft Teams

**Contexto**: Para lograr la máxima adopción de Senda en grandes corporaciones, la plataforma no debe ser "un sitio web más" que el empleado debe recordar abrir. Al integrar Senda nativamente dentro de Microsoft Teams, se elimina la fricción operativa y se potencia la productividad diaria.

## La Experiencia del Empleado (Single Sign-On)

Cuando Senda está configurada como una Aplicación Nativa (Pestaña Personal) en Microsoft Teams, el flujo de trabajo del usuario se transforma:

1. **Acceso Sin Contraseñas (Invisible SSO)**: El usuario no verá pantallas de *Login* de Senda. Al hacer clic en el ícono de Senda anclado en su barra lateral de Teams, Senda negocia internamente con Microsoft Entra ID su identidad y le otorga acceso automático.
2. **Selector de Espacios Directo**: Tras la validación invisible de 1 segundo, el usuario aterriza directamente en el "Hub de Espacios Públicos". No cae en un chat genérico, sino que puede elegir visualmente si necesita hablar con el Agente de RRHH, el Asistente de Finanzas o la Mesa de Ayuda de IT.
3. **No hay creación manual de cuentas**: Si un empleado entra a Senda por primera vez a través de Teams, Senda crea su cuenta automáticamente de fondo (*Just-In-Time Provisioning*). Esto elimina la necesidad de que los administradores tengan que invitar a los empleados uno a uno o gestionar contraseñas locales.

## Mejores Prácticas de Implementación Funcional

- **Crear Espacios Públicos**: Dado que el empleado recién creado no pertenecerá a grupos departamentales cerrados (hasta que el Administrador lo asigne o se use SCIM), es vital que existan agentes en "Espacios Públicos" para darle la bienvenida y resolver consultas transversales a toda la empresa.
- **Evitar Doble Interfaz**: Fomentar el uso exclusivo de la pestaña de Teams para los empleados finales, reservando el acceso a `https://app.senda.com` vía navegador únicamente para los Creadores de Agentes (Managers) y Administradores de IT, quienes requieren la pantalla completa para construir lógicas de IA.

## Checklist de Adopción

- [ ] ¿Los empleados encuentran el ícono de Senda anclado en su barra lateral de Teams?
- [ ] ¿Al ingresar, son recibidos sin tener que poner un usuario/contraseña?
- [ ] ¿Existen al menos 2 Espacios Públicos útiles (ej. Soporte IT, Onboarding) configurados para que los usuarios vean opciones apenas ingresan?

> ⚠️ **Nota Administrativa**: Para que esta experiencia esté disponible, el equipo de Infraestructura debe haber configurado la aplicación en el Microsoft Teams Admin Center. Si eres un administrador técnico, consulta el **Manual del Administrador (Capítulo 9)** para instrucciones técnicas.
