# CHANGELOG FUNCTIONAL

Cambios visibles para administradores y usuarios finales.

## [1.0.4] - 13 de Junio de 2026

### ✨ Novedades
- **Carga de Horas Inteligente con Senda AI**: Se incorporó una pestaña de Carga con Senda AI en el modal de Carga Rápida que permite ingresar tareas mediante lenguaje natural (ej. *"Trabajé 4.5 horas en Camuzzi Portal Web resolviendo incidentes"*). La frase es procesada automáticamente mostrando una previsualización interactiva de los datos para confirmación.
- **Selectores de Carga Manual Amigables**: Se reemplazaron los campos de texto libre de Carga Rápida por selectores predefinidos de empleados, clientes y proyectos (con selección inteligente de proyectos anidada al cliente seleccionado) para eliminar errores tipográficos al registrar horas.
- **Vinculación con Clockify y Zendesk**: Los botones del asistente Senda AI en la interfaz ejecutan procesos reales de extracción e importación sobre la base de datos D1.
- **Auditoría de Horas en Tiempo Real**: El botón de auditar tiempos analiza los registros reales guardados en la base de datos Cloudflare D1 e informa mediante un modal interactivo cualquier anomalía detectada (como excesos de 12 horas diarias por empleado).

## [1.0.3] - 12 de Junio de 2026

### ✨ Novedades
- **Filtros Multi-Selección Premium**: Rediseño de los selectores de Meses, Clientes, Empleados y Proyectos a menús desplegables que permiten seleccionar múltiples casillas a la vez y disponen de buscadores de texto internos.
- **Anidamiento Reactivo (Filtros Inteligentes)**: Los selectores se adaptan dinámicamente entre sí. Si seleccionas un cliente, los filtros de empleados y proyectos se reducirán automáticamente para mostrar solo los que tienen relación con ese cliente, previniendo la selección de filtros vacíos.

## [1.0.2] - 12 de Junio de 2026

### 🐛 Correcciones
- **Selector de Mes Completo**: Se corrigió una limitación en la API que solo devolvía los últimos 100 registros. Al ampliar el límite a 5000, ahora se cargan correctamente todos los meses disponibles (de Enero a Junio) y todos los datos históricos del equipo en el panel principal.

## [1.0.1] - 12 de Junio de 2026

### 🐛 Correcciones
- **Carga de Datos en Vivo**: Se corrigió el problema donde la plataforma mostraba "No hay datos" por defecto. Ahora los datos almacenados en Cloudflare D1 se cargan automáticamente al iniciar la sesión.
- **Persistencia de CSV**: Los archivos CSV subidos a través de la interfaz ahora se guardan de forma permanente en la base de datos remota de Cloudflare en lugar de quedar solo en la memoria del navegador.
- **Registro Manual**: El botón de "Carga Rápida" ahora persiste las horas ingresadas directamente en la base de datos D1 del Workers.
- **Alineación de Clientes y Empresas**: Se solucionó la desincronización en el identificador de la compañía (tenant ID) que impedía recuperar los datos del demo precargados en el D1.

## [1.0.0] - 12 de Junio de 2026

### ✨ Novedades

- **Dashboard Interactivo**: Panel ejecutivo con visualización de datos en tiempo real, gráficos dinámicos y KPIs actualizados automáticamente.
- **Carga de CSV**: Permite subir archivos CSV directamente desde la interfaz para importar datos de tiempo y operaciones.
- **Filtrado Multi-Criterio**: Filtra registros por período, empleado, cliente o proyecto con selección múltiple.
- **Análisis de Distribución**: Visualiza cómo se distribuye el tiempo de cada empleado entre clientes y proyectos.
- **Disponibilidad Mensual**: Panel que muestra horas esperadas vs registradas por empleado cada mes.
- **Bolsa de Horas**: Seguimiento de horas acumuladas y saldo disponible por empleado.
- **Reportes de Carga**: Análisis de ocupación del equipo, identificación de disponibilidad por persona.

### 🐛 Correcciones

- Ninguna en versión inicial (v1.0.0)

### ⚡ Mejoras

- Interfaz responsiva que funciona en desktop y móvil
- Búsqueda y filtros sin necesidad de recargar la página
- Cálculos de métricas en tiempo real sin latencia perceptible
- Datos persistentes en la sesión del navegador (sin servidor necesario)

## Versionamiento Futuro

### v1.1.0 (Próximo)
- [ ] Exportar reportes a Excel
- [ ] Notificaciones por email
- [ ] Predicción de horas basada en histórico
- [ ] Modo oscuro

### v2.0.0 (Futuro)
- [ ] Integración con sistemas de RR.HH.
- [ ] Análisis predictivo de capacidad
- [ ] Dashboards personalizables por rol
- [ ] API para integraciones externas
