# Guía de Administración

La perspectiva de Administrador es exclusiva para perfiles gerenciales o de RRHH (Ej: `monica.aieta@moovingtech.com`). Permite auditar la integridad de los datos cargados por la nómina.

## Dashboard Central
Al ingresar como Administrador, se habilita una pestaña extra en el panel lateral: **Dashboard Admin**.

Esta vista procesa grandes volúmenes de datos (`time_records`) en tiempo real y ofrece 4 paneles analíticos principales:
1. **Métricas Clave**: KPI consolidados de la semana actual (Total Horas, Promedios).
2. **Distribución por Proyecto**: Gráficos de barras interactivos (basados en `Recharts`) que muestran qué proyectos consumen el grueso del esfuerzo del equipo.
3. **Distribución por Tipo de Trabajo**: Gráfico de torta o dona mostrando la división de tareas operativas vs reuniones o soporte.
4. **Horas por Empleado**: Ranking de carga horaria para detectar sobre-esfuerzos o cuellos de botella en la asignación.

## Auditoría y Troubleshooting
Si se detecta una anomalía en las horas imputadas (por ejemplo, alguien no llega al mínimo semanal, o un bot de Senda cargó en un cliente incorrecto):
- Se debe validar el registro directamente con el empleado.
- Eventualmente, cualquier ajuste puede ser corregido directamente instruyendo a Senda AI: *"Senda, la carga de Federico para YPF de ayer no era de 5 horas sino de 3 horas"*.
- Las actualizaciones sobre las bases maestras se ejecutarán automáticamente si los permisos son correctos.

## Asignación de Roles
El rol de un usuario se define por su registro principal. En versiones actuales, la validación se realiza mediante lectura segura a nivel sesión y `userRole === 'admin'`.
