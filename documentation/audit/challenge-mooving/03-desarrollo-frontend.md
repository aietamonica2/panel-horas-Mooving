# 03. Desarrollo del Frontend (Dashboard)

El Frontend representa el núcleo interactivo del proyecto para los usuarios operativos y de gestión. Ha sido desarrollado con **Vue 3** y estructurado mediante componentes modulares en `apps/web/src/components/`.

## Panel de Horas (Dashboard Principal)

El `Dashboard.tsx` es el componente orquestador que consume los datos desde la API REST subyacente y los distribuye visualmente. Se enfocó en ofrecer una experiencia "Premium" y "Data-Rich" desde el primer vistazo.

### KPIs y Métricas de Alto Nivel
Se implementaron tarjetas de resumen (KPI Cards) para proporcionar métricas instantáneas sobre el mes en curso:
- **Total de Horas Registradas**: Sumatoria consolidada de horas.
- **Tasa de Productividad (Billable vs Non-Billable)**: Porcentaje del esfuerzo facturable vs. esfuerzo interno/soporte.
- **Top Proyecto / Cliente**: El proyecto o cliente que demandó más horas.

### Gráficos e Insights Visuales
- **Distribución por Empleado**: Gráficos de barras horizontales mostrando quiénes cargaron más horas, facilitando detectar sobrecargas (ej. +12h en un día).
- **Esfuerzo por Proyecto (Pie Chart)**: Distribución del peso de los proyectos activos (ej. Camuzzi, Banco Galicia).

## Componente de Filtros (`FilterPanel.tsx`)

Para que el dashboard sea una herramienta de auditoría efectiva, se diseñó un panel de filtros lateral o colapsable con las siguientes capacidades:
- **Filtrado por Rango de Fechas**: Acotar la vista a "Este mes", "Mes pasado" o rangos personalizados.
- **Filtrado por Empleado**: Visualizar específicamente el rendimiento o la sobrecarga de un individuo.
- **Filtrado Múltiple por Proyecto/Cliente**: Aislamiento del consumo de horas de un cliente particular.
*Estos filtros mutan reactivamente los datos del Dashboard y se sincronizan con las llamadas a la API.*

## El Modal Interactivo: `QuickLogModal.tsx`

La carga manual de horas se simplificó drásticamente evitando redirecciones y cargas pesadas. Se creó un Modal (`QuickLogModal.tsx`) que permite a los usuarios (como Mónica) cargar horas sin fricciones.

**Características y Evolución:**
- Flujo en menos de 3 clics: Seleccionar Proyecto, Ingresar Horas, Opcional Detalle, y Cargar.
- **Mejora v1.0.5**: Inicialmente restringido al día en curso, se incorporó un selector nativo `<input type="date">` para permitir la **carga retrospectiva** (ej. cargar horas olvidadas del viernes el día lunes).
- Integración visual utilizando `Tailwind CSS`, con micro-animaciones al abrir (fade/scale) y *glassmorphism* para oscurecer el fondo.

## UI/UX y Estilado General

Siguiendo las *UI / UX & Styling Guidelines*, se erradicaron las alertas nativas del navegador (`alert()`). Todos los mensajes de éxito, validación y error utilizan notificaciones modulares integradas en el entorno (Toast notifications). Tailwind CSS fue mandatorio para establecer una paleta de colores corporativa (neutros, púrpuras/azules para acciones) y bordes redondeados (`rounded-xl` o `rounded-2xl`) propios de interfaces modernas.

---
> [Anterior: Arquitectura del Sistema](./02-arquitectura-sistema.md) | [Volver al Índice](./index.md) | [Siguiente: Integración Senda y MCP](./04-integracion-senda-mcp.md)

*Versión documentada: v1.0.5 · Fecha de generación: 2026-06-13*
