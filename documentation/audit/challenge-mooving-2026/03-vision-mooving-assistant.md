# 3. Visión Estratégica: Mooving Assistant

**Fecha de Generación:** 2026-06-13
**Versión:** 1.0.0

---

## 3.1 Identificación del Problema

Tras realizar un análisis del uso de las herramientas corporativas, descubrimos que uno de los mayores puntos de conflicto en Mooving Operaciones era **la adopción del control de horas**.

Los empleados perciben herramientas como *Clockify* como sistemas burocráticos que interrumpen su flujo de trabajo. Requieren salir de su ecosistema natural, recordar qué hicieron durante la semana, buscar clientes en listas desplegables interminables y cargar valores numéricos. Como resultado:
- Las horas se cargan de forma tardía.
- La precisión de la información baja (estimaciones al azar).
- La gerencia no tiene métricas fiables de rentabilidad de los proyectos.

---

## 3.2 El Cambio de Paradigma propuesto

En lugar de forzar a las personas a usar la herramienta, adaptamos la herramienta a las personas. La visión estratégica de **Mooving Assistant** consiste en transformar el paradigma de la **"Carga Manual Obligatoria"** en un modelo moderno de **"Aprobación de Sugerencias"**.

### El Asistente Senda AI
Gracias a la incorporación del motor Senda, Mooving Assistant procesa el registro de horas en lenguaje natural. El sistema ya no exige llenar formularios rígidos.

*Experiencia Anterior (Fricción):*
1. Abrir App externa.
2. Hacer clic en "Nuevo Registro".
3. Buscar "Camuzzi" en un menú.
4. Seleccionar "Portal Web" en otro menú.
5. Escribir `4.0` en la duración.
6. Guardar.

*Experiencia Mooving Assistant (Cero Fricción):*
1. El empleado abre el chat flotante en la misma pantalla en la que trabaja.
2. Escribe o dicta: *"El lunes estuve 4 horas con el portal de Camuzzi y 2 horas documentando"*.
3. **Fin.**

Senda extrae las entidades subyacentes, busca en la base de datos a qué proyectos y clientes pertenecen esos textos, e impacta directamente la base de datos.

---

## 3.3 El RoadMap a Futuro (Fase 2)

La iteración actual desarrollada (MVP) demuestra la carga conversacional asistida. Sin embargo, la visión completa apunta a **eliminar incluso la necesidad de hablarle al bot**.

En una futura Fase 2, la arquitectura de Mooving se conectará directamente a:
- **Microsoft Outlook y Teams:** Extrayendo automáticamente horas en base a reuniones en calendario y llamadas.
- **Azure DevOps:** Infiriendo actividad a partir de tickets que cambian a estado *Done* y los commits realizados en el código.
- **Sugerencias Predictivas:** Al final del viernes, el Bot simplemente preguntará: *"He notado 20h en Camuzzi y 15h en YPF basadas en tus llamadas y tickets. ¿Aprobar?"*

Con esto, el registro de horas deja de ser un panel de control para convertirse en un verdadero sistema de Workforce Intelligence pasivo.

---

[← Anterior: Integración de APIs Externas](./02-integracion-apis-externas.md) | [Volver al Índice](./index.md) | [Siguiente: MVP Desarrollado →](./04-mvp-desarrollado.md)
