# CHANGELOG FUNCTIONAL

Cambios visibles para administradores y usuarios finales.

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
