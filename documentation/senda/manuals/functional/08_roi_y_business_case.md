# ROI y Business Case: Justificar la Inversión

> **Versión documentada:** v5.20.13 · **Última revisión:** 2026-05-29

> El análisis de ROI de Senda no es una formalidad al final del proyecto — es la herramienta más poderosa del implementador para conseguir el presupuesto inicial, sostener el proyecto durante la implementación y garantizar la renovación del contrato.

---

## Por Qué el ROI es Responsabilidad del Implementador

La mayoría de los implementadores asume que "el cliente ve el valor y renueva". Ese pensamiento genera churn.

La realidad: el patrocinador del proyecto (quien aprobó el presupuesto) no siempre es quien usa el sistema. El CEO que aprobó la compra rara vez chatea con el agente. Su única fuente de información sobre el valor generado es lo que el implementador le reporta.

**Si el implementador no cuantifica y comunica el ROI, el proyecto queda como "el chatbot de IA que compramos".**

Si lo cuantifica y comunica sistemáticamente, queda como "la inversión que nos ahorró $X y automatizó Y procesos".

---

## El Framework de ROI de Senda

Hay tres tipos de valor que Senda puede generar. Cada implementación tiene su mezcla particular.

### Tipo 1: Tiempo Recuperado

**¿Qué es?** Horas de trabajo manual que el sistema automatizó. Se calcula multiplicando el tiempo ahorrado por el costo hora del perfil que hacía esa tarea.

**Cómo calcularlo:**

```
Tarea manual: Generación del Reporte Semanal de KPIs
Tiempo antes: 3 horas cada lunes (1 analista senior)
Costo hora del analista: $30/h
Valor por ejecución: 3h × $30 = $90

Frecuencia: 4 veces por mes
Valor mensual: $90 × 4 = $360
Valor anual: $360 × 12 = $4.320
```

**Aplicaciones típicas:**
- Reportes automáticos que reemplazaban trabajo manual de analytics
- Creación de tickets de soporte que hacía un operador
- Emails de bienvenida o notificaciones que enviaba RRHH manualmente
- Consultas repetitivas de empleados que atendía un analista funcional

#### ROI de las Herramientas de Creación (v5.11+)

| Herramienta | Sin Senda | Con Senda | Ahorro por uso |
|---|---|---|---|
| **Senda Studio** | Configurar agente manualmente: 2-4 horas | Describir y crear: 15-30 min | 75-85% tiempo |
| **Pipeline Canvas** | Diseñar flujo en código: 1-2 días | Arrastrar nodos visualmente: 1-2 horas | 80% tiempo |
| **RAG Prep Engine** | Diagnosticar docs con respuestas pobres: 3-5 horas | Analizar antes de cargar: 5 min | 95% tiempo |
| **Marketplace** | Configurar desde cero: 1 día | Instalar Skill Pack: 10 min | 90% tiempo |

> 💰 **Ejemplo de cálculo:** Si un implementador cobra $80/hora y configura 10 agentes por mes, Studio ahorra ~30 horas/mes = **$2.400/mes en tiempo de implementación**.

### Tipo 2: Costo Evitado

**¿Qué es?** Dinero que la empresa habría perdido sin la automatización: multas por SLA, errores costosos, tiempo de inactividad, reprocesos.

**Cómo calcularlo:**

```
Problema: Fallos de integración detectados tarde generan multas de SLA
Costo promedio de una multa SLA: $2.000
Frecuencia histórica de fallos: 1 por mes
Probabilidad de detección temprana con Observer: 95%
Fallos prevenidos al mes: 0.95

Valor por ejecución del Observer: $2.000 × 0.95 = $1.900/mes
Valor anual: $22.800
```

**Aplicaciones típicas:**
- Observers que detectan fallos críticos antes de que impacten a clientes
- Alertas de stock bajo que previenen quiebres y ventas perdidas
- Recordatorios de vencimiento de contratos que previenen renovaciones automáticas no deseadas
- Detección de pagos duplicados o anómalos

#### Costos Evitados por Automatización Proactiva (v5.17+)

| Escenario | Costo del problema | Cómo Senda lo evita |
|---|---|---|
| Director pide KPIs diarios a 3 gerentes | 1.5 h/día de gerentes compilando = $3.600/mes | **Chatless UI** entrega KPIs automáticamente al abrir Senda |
| Brecha de conocimiento no detectada | Clientes insatisfechos → churn 2-3% extra | **Intent Discovery** detecta las preguntas sin respuesta |
| Documentos mal armados para RAG | 20% de respuestas erróneas → tickets de soporte | **RAG Prep Engine** previene la carga de documentos deficientes |

### Tipo 3: Ingreso Protegido / Generado

**¿Qué es?** Revenue que el sistema ayuda a proteger (retención de clientes, detección de oportunidades) o generar (leads calificados, procesos de venta más rápidos).

**Cómo calcularlo:**

```
Caso: Agente que detecta oportunidades en riesgo (14+ días sin actividad)
Valor promedio de una oportunidad: $15.000
Tasa de recuperación del equipo de ventas cuando se alerta: 25%
Alertas generadas por mes: 8
Oportunidades recuperadas: 8 × 25% = 2 por mes

Valor mensual: 2 × $15.000 = $30.000
Valor anual: $360.000
```

**Aplicaciones típicas:**
- Alertas de oportunidades de venta en riesgo
- Onboarding de empleados más rápido (menor tiempo hasta productividad)
- Soporte 24/7 que retiene clientes que de otro modo habrían churnado
- Dashboards que aceleran decisiones de gerencia (decisiones más rápidas = más ingresos)

#### Ingresos Protegidos por IA Proactiva (v5.17+)

| Capacidad | Cómo protege ingresos | Impacto estimado |
|---|---|---|
| **Goal-Based Reasoning** | Detecta señales de churn en cada conversación y escala automáticamente | Reducción de churn: 2-4% → $X por cliente retenido |
| **Predictive Analytics** | Anticipa problemas de inventario, SLA o ventas | Prevención de rupturas de stock: ahorro de oportunidades perdidas |
| **Chatless UI + Generative UI** | Ejecutivos toman decisiones más rápidas con datos proactivos | Reducción de tiempo de decisión: horas → minutos |

---

## La Metodología de Implementación del ROI en Senda

### Paso 1: Identificar las Top 10 Automatizaciones por Valor

En el primer mes de implementación, hacer este ejercicio con el cliente:

```
TALLER DE MAPEO DE VALOR (90 minutos con el sponsor del proyecto)

Para cada proceso que Senda automatiza, responder:
1. ¿Quién hacía esto antes? ¿Cuántas horas por semana/mes?
2. ¿Qué pasa cuando esto falla? ¿Cuánto cuesta ese fallo?
3. ¿Este proceso genera o protege ingreso? ¿Cuánto aproximadamente?

Ordenar las automatizaciones de mayor a menor valor calculado.
Configurar el ROI en Mission Control para las Top 5 primero.
```

### Paso 2: Configurar los Valores en Mission Control

Para cada automatización, en Mission Control → Programadas/Observadores → Badge 💰:

- **Tipo de valor**: Elegir Tiempo/Costo/Ingreso
- **Monto por ejecución**: Calcular con la fórmula del paso anterior
- **Etiqueta descriptiva**: Escribir en lenguaje del CFO, no técnico

```
✅ Buen label: "Equivale a 3 horas de trabajo manual de un analista senior"
✅ Buen label: "Previene multas de SLA de hasta $2.000 por fallo no detectado"
❌ Mal label: "Observer trigger on_action_failed con condición gte 3"
```

### Paso 3: El Reporte Mensual de ROI

El primer día de cada mes, exportar el informe desde Mission Control y enviarlo al sponsor del proyecto con este encuadre:

```
Asunto: Informe de Valor Generado por Senda — [Mes]

[Nombre del Sponsor],

Durante [mes], Senda generó $X.XXX de valor documentado para [Empresa]:

📊 TOP AUTOMATIZACIONES DEL MES:
• [Automatización 1]: X ejecuciones × $Y = $Z
  → [Descripción del impacto en palabras del negocio]
• [Automatización 2]: X ejecuciones × $Y = $Z
  → [Descripción]
...

💰 VALOR ACUMULADO TOTAL: $XX.XXX
   Proyección para los próximos 12 meses: $XXX.XXX

📈 PRÓXIMO MES:
Vamos a activar [nueva automatización] que estimamos generará $X adicional.

[Tu nombre]
```

---

## Construir el Business Case Inicial (Pre-Venta)

Antes de que el cliente apruebe el proyecto, necesitás presentar un business case proyectado. Esta es la metodología:

### Discovery de 45 Minutos

Con el sponsor y el responsable de operaciones, recorrer estas preguntas:

**Bloque 1 — Volumen de consultas repetitivas:**
- ¿Cuántas consultas de soporte/preguntas internas reciben por mes?
- ¿Qué porcentaje son siempre las mismas preguntas?
- ¿Quién las responde hoy? ¿Cuánto tiempo le insume?

**Bloque 2 — Procesos manuales recurrentes:**
- ¿Qué reportes se generan manualmente y con qué frecuencia?
- ¿Qué notificaciones/emails se envían manualmente?
- ¿Qué validaciones o aprobaciones siguen siendo manuales?

**Bloque 3 — Costos de fallo:**
- ¿Qué pasa cuando un proceso falla y nadie lo detecta?
- ¿Han tenido multas por SLA, penalidades contractuales, o clientes perdidos por fallos no detectados?

**Bloque 4 — Potencial de ingreso:**
- ¿El equipo de ventas tiene oportunidades que pierden por falta de seguimiento?
- ¿Los clientes abandonan procesos por falta de soporte en horarios no laborales?

### La Proyección Conservadora

Con los datos del discovery, construir una proyección usando los valores más conservadores posibles. Es mejor prometer $50k y entregar $80k que prometer $200k y entregar $150k.

```
PROYECCIÓN DE ROI — PRIMER AÑO

TIEMPO RECUPERADO:
• Consultas de soporte IT (X consultas/mes × 15 min × $20/h): $Y/mes
• Reporte mensual de operaciones (X horas × $30/h): $Z/mes
Subtotal tiempo: $A/mes

COSTOS EVITADOS:
• Fallos de integración no detectados (X fallos/mes × $B): $C/mes
Subtotal costos: $C/mes

TOTAL MENSUAL PROYECTADO: $D/mes
TOTAL ANUAL PROYECTADO: $D × 12 = $E

INVERSIÓN (costo de implementación + suscripción anual): $F
ROI AÑO 1: ($E - $F) / $F × 100 = XX%
PAYBACK PERIOD: $F / $D = X meses
```

---

## El Dashboard de ROI como Herramienta de Renovación

El momento más importante del ROI no es cuando se presenta el business case — es cuando llega la renovación del contrato.

En ese momento, el implementador que tiene 11 meses de datos históricos en el Dashboard de Mission Control puede presentar:

```
"En los últimos 11 meses, Senda generó $127.000 de valor documentado.
La proyección para el próximo año, con las 3 nuevas automatizaciones 
que vamos a activar, es de $180.000.
El costo de la suscripción anual es $24.000.
ROI del próximo año: 650%."
```

Esa no es una negociación de precio. Es una conversación de inversión.

---

## Errores Comunes en la Presentación del ROI

- **Error:** Presentar el ROI solo en términos de "horas ahorradas" sin convertir a dinero.
  - **Corrección:** Siempre convertir a valor monetario. Los directorios no deciden en horas; deciden en dólares.

- **Error:** Usar valores muy optimistas sin soporte ("ahorramos $500k al año").
  - **Corrección:** Usar valores conservadores con metodología visible. La credibilidad es más valiosa que el número alto.

- **Error:** No distinguir entre valor realizado (ya ocurrió) y valor proyectado (va a ocurrir).
  - **Corrección:** Presentar ambos claramente separados. "Valor documentado: $X. Valor proyectado adicional: $Y."

- **Error:** Olvidar el costo de oportunidad. "Si no seguimos usando Senda, ese trabajo lo tiene que hacer alguien."
  - **Corrección:** El costo de NO renovar también tiene un número: el costo de volver a los procesos manuales.

---

## Checklist del Capítulo

- [ ] ¿Realicé el taller de mapeo de valor con el sponsor del cliente?
- [ ] ¿Identifiqué las Top 5 automatizaciones por valor económico?
- [ ] ¿Cada automatización tiene valor ROI configurado en Mission Control?
- [ ] ¿Las etiquetas de valor están escritas en lenguaje del CFO (no técnico)?
- [ ] ¿Tengo el template de reporte mensual preparado para enviar al sponsor?
- [ ] ¿Puedo construir una proyección conservadora de ROI para pre-venta?
- [ ] ¿Sé cómo usar el Dashboard de ROI como argumento de renovación?
- [ ] ¿Incluí el ROI de Studio, Pipeline Canvas y RAG Prep en el business case?
- [ ] ¿Calculé el costo evitado por Chatless UI y Goal-Based Reasoning?

---

> 📖 **Anterior:** [10 — Change Management y Adopción](./07_change_management.md)
> 📖 **Siguiente:** [12 — Trampas y Sorpresas de la IA Empresarial](./10_trampas_y_sorpresas.md)
