# 5. Modelos de IA y Funciones IA

> **Versión documentada:** v5.6.92 · **Última revisión:** 2026-05-27

Senda no usa un único modelo de IA para todas las operaciones. Internamente, cada conversación puede involucrar hasta cuatro llamadas a distintos modelos, cada una con un propósito específico. El administrador puede configurar qué modelo usar en cada función, balanceando costo, calidad y latencia según las necesidades del tenant.

---

## Arquitectura: Funciones IA vs. Modelos

Una **Función IA** (`ai_function`) es un componente lógico del sistema con un propósito específico. Un **modelo** es el motor de lenguaje que ejecuta esa función. Son dos conceptos ortogonales: la función define el *qué*, el modelo define el *cómo*.

Senda permite asignar un modelo diferente a cada función. Esta separación es lo que permite, por ejemplo, usar un modelo económico para el enrutamiento (decisión rápida y binaria) y un modelo premium para la generación de respuestas (calidad conversacional alta).

---

## AI Gateway Multi-Proveedor

Desde la versión v5.6.64, Senda cuenta con un gateway multi-proveedor que permite administrar modelos de OpenAI, Anthropic, Google Gemini y Cloudflare Workers AI con una configuración común. Esto evita que cada función IA dependa de un único proveedor y facilita estrategias de costo, calidad, latencia y resiliencia.

### Campos de Gobierno

| Campo | Para qué sirve | Criterio de administración |
|---|---|---|
| `provider` | Proveedor principal de la función IA | Elegir por calidad, latencia, costo y disponibilidad contractual |
| `model` | Modelo principal dentro del proveedor | Mantener una tabla aprobada por tenant |
| `fallback_provider` | Proveedor alternativo | Debe pertenecer a un proveedor disponible y autorizado |
| `fallback_model` | Modelo alternativo | Debe ser suficiente para continuar la operación sin degradación crítica |
| `reasoning_effort` | Nivel de razonamiento cuando el proveedor lo soporta | Usar bajo/medio para operaciones rápidas; alto solo en tareas complejas |
| `temperature` | Variabilidad de la salida | Bajar para clasificación/extracción; moderar para respuesta conversacional |

### Buenas Prácticas

1. Configurar fallback para funciones críticas del ciclo de chat.
2. Evitar modelos premium en extractores simples si no hay mejora medible.
3. Revisar latencia P95 y tasa de fallback antes de cambiar el modelo de `agent_response`.
4. Documentar quién aprobó cada proveedor por razones de seguridad, privacidad y costo.
5. Probar cambios en un espacio controlado antes de aplicarlos a todo el tenant.

---

## Las Funciones IA del Sistema

Senda define las siguientes funciones IA de sistema, cada una con su código interno y propósito:

### Funciones del Ciclo de Chat

| Función | Código | Propósito | Impacto en latencia |
|---|---|---|---|
| **Router de Chat** | `chat_router` | Determina qué agente debe atender la conversación basándose en el mensaje del usuario y los resúmenes de los agentes disponibles | Bajo (solo en primer mensaje del chat) |
| **Extractor de Acción** | `action_extractor` | Evalúa si el usuario quiere ejecutar una de las acciones disponibles del agente (score de confianza 0–100) | Medio (por cada mensaje si hay acciones activas) |
| **Extractor de Parámetros** | `params_extractor` | Cuando se detecta intención de acción, extrae los parámetros necesarios de la conversación | Medio (solo cuando hay acción detectada) |
| **Respuesta del Agente** | `agent_response` | Genera la respuesta conversacional final al usuario, integrando el contexto, documentos RAG y resultados de acciones | Alto (siempre, en cada mensaje) |

### Funciones de Analytics

| Función | Código | Propósito |
|---|---|---|
| **Extracción de Aprendizajes** | `analytics_learning` | Analiza conversaciones y extrae insights operacionales |
| **Consolidación de Aprendizajes** | `analytics_consolidation` | Compila múltiples aprendizajes en un documento maestro para la base de conocimiento |
| **Efectividad de Prompts** | `prompt_enhance_effectiveness` | Evalúa el puntaje de efectividad de cada conversación (1–100) |
| **Aprendizaje de Prompts** | `prompt_enhance_learning` | Mejora automática de system prompts basada en patrones de conversación |
| **Etiquetado** | `prompt_enhance_tagging` | Categoriza automáticamente cada conversación con etiquetas temáticas |

### Funciones de Infraestructura de Conocimiento

| Función | Código | Propósito |
|---|---|---|
| **Indexador de Conocimiento** | `knowledge_indexer` | Vectoriza documentos para búsqueda semántica (RAG) |
| **Sumario de Conocimiento** | `knowledge_summary` | Genera resúmenes de documentos para el índice temático |
| **Purificación de Conocimiento** | `knowledge_purification` | Limpia y normaliza documentos antes de indexarlos |

### Funciones Especiales

| Función | Código | Propósito |
|---|---|---|
| **Análisis de Visión** | `vision_analysis` | Procesa imágenes enviadas por el usuario |
| **Mejorador de Prompts** | `prompt_enhance` | Ayuda a los analistas a mejorar system prompts desde la interfaz |
| **Generador de Agentes** | `agent_generator` | Crea agentes automáticamente desde plantillas |

---

## Modelos Disponibles en Senda

Senda soporta modelos de múltiples proveedores. La selección del modelo en cada función determina el costo y la calidad de esa operación.

### Modelos OpenAI

| Modelo | Perfil | Costo relativo | Uso recomendado |
|---|---|---|---|
| `gpt-4o` | Alta calidad, multimodal | 💰💰💰 Alto | Respuestas complejas, análisis, acciones críticas |
| `gpt-4o-mini` | Buena calidad, muy eficiente | 💰 Bajo | Router, evaluaciones rápidas, analytics |

### Modelos Anthropic

| Modelo | Perfil | Costo relativo | Uso recomendado |
|---|---|---|---|
| `claude-sonnet-4-5` | Muy alta calidad, razonamiento | 💰💰💰 Alto | Respuestas que requieren razonamiento complejo, redacción larga |
| `claude-haiku-3-5` | Rápido y eficiente | 💰 Bajo | Tareas de clasificación, extracción estructurada |

### Modelos Google

| Modelo | Perfil | Costo relativo | Uso recomendado |
|---|---|---|---|
| `gemini-2.0-flash` | Velocidad extrema, multimodal | 💰 Bajo | Evaluaciones en tiempo real, procesamiento de imágenes |
| `gemini-2.5-pro` | Alta capacidad de contexto | 💰💰 Medio | Análisis de documentos largos, síntesis |

### Modelos Cloudflare Workers AI (Fallback)

| Modelo | Perfil | Costo relativo | Uso recomendado |
|---|---|---|---|
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Open-source, sin costo adicional | 🆓 Incluido | Fallback cuando el proveedor principal no responde |
| `@cf/meta/llama-3.1-8b-instruct` | Muy liviano | 🆓 Incluido | Tareas de baja complejidad, fallback de extracción |
| `@cf/meta/llama-3.2-11b-vision-instruct` | Con capacidad visual | 🆓 Incluido | Análisis de imágenes como fallback |

---

## Configuración de una Función IA

**Ruta:** Administración → IA → Funciones IA → [nombre de la función]

Cada función tiene los siguientes parámetros configurables:

| Parámetro | Descripción | Rango |
|---|---|---|
| **Modelo** | El modelo primario para esta función | Ver lista de modelos disponibles |
| **Temperatura** | Aleatoriedad de la respuesta. 0 = determinista, 1 = creativo | `0.0` – `1.0` |
| **Max Tokens** | Límite de tokens en la respuesta generada | `256` – `8192` |
| **Modelo de Fallback** | Modelo alternativo si el principal falla o supera el timeout | Ver lista |
| **Endpoint de Fallback** | URL del proveedor alternativo | URL |

### Configuración de Temperatura por Tipo de Función

| Tipo de función | Temperatura recomendada | Razón |
|---|---|---|
| Router, Extractor de acción, Extractor de parámetros | `0.1` – `0.2` | Requieren precisión y determinismo. Una temperatura alta introduce errores de clasificación. |
| Respuesta conversacional del agente | `0.2` – `0.5` | Algo de variabilidad mejora la naturalidad. Demasiada da respuestas inconsistentes. |
| Análisis de efectividad y etiquetado | `0.1` | Clasificaciones deben ser reproducibles. |
| Generación creativa (mejorador de prompts) | `0.3` – `0.6` | Se beneficia de variabilidad controlada. |

---

## Tabla de Recomendaciones por Función

Esta es la configuración de referencia. Adáptarla según el presupuesto y los requisitos de calidad del tenant.

| Función | Modelo Primario Recomendado | Fallback Recomendado | Temperatura | Max Tokens |
|---|---|---|---|---|
| `chat_router` | `gpt-4o-mini` | `@cf/meta/llama-3.1-8b-instruct` | `0.1` | `256` |
| `action_extractor` | `@cf/meta/llama-3.1-8b-instruct` | `gpt-4o-mini` | `0.2` | `512` |
| `params_extractor` | `gpt-4o-mini` | `@cf/meta/llama-3.1-8b-instruct` | `0.1` | `1024` |
| `agent_response` | `gpt-4o-mini` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | `0.3` | `2048` |
| `analytics_learning` | `gpt-4o-mini` | `@cf/meta/llama-3.1-8b-instruct` | `0.2` | `1024` |
| `analytics_consolidation` | `gpt-4o` | `gpt-4o-mini` | `0.2` | `4096` |
| `vision_analysis` | `@cf/meta/llama-3.2-11b-vision-instruct` | `gpt-4o` | `0.2` | `1024` |

---

## Tradeoffs: Costo vs. Calidad vs. Latencia

Comprender este triángulo es esencial para optimizar la configuración del tenant:

```
        CALIDAD
        (GPT-4o, Claude Sonnet)
           /\
          /  \
         /    \
COSTO   /______\ VELOCIDAD
(alto) (Llama 70B) (Gemini Flash, GPT-4o-mini)
```

**Escenario de optimización de costo:** Usar `@cf/meta/llama-3.3-70b` como modelo primario en `agent_response` y `gpt-4o-mini` como fallback. Ahorro estimado del 60–70% en consumo de AI, con leve impacto en calidad de respuesta.

**Escenario de máxima calidad:** Usar `gpt-4o` o `claude-sonnet-4-5` en `agent_response`. Adecuado para espacios ejecutivos o espacios donde la calidad de redacción es crítica para la marca.

**Escenario de mínima latencia:** Usar `gemini-2.0-flash` o `gpt-4o-mini` en todas las funciones. Reduce la latencia total del ciclo de chat de ~3s a ~1.5s.

---

## Configuración del Modelo de Fallback

El fallback se activa automáticamente cuando el modelo primario:

- Devuelve un error HTTP 5xx (el proveedor está caído o sobrecargado).
- Supera el timeout configurado para la función.
- Recibe una respuesta malformada que no puede parsearse.

**Cómo configurar:**

1. **Administración → IA → Funciones IA** → seleccionar la función.
2. En el campo **Modelo de Fallback**, seleccionar el modelo alternativo.
3. En **Endpoint de Fallback**, ingresar la URL del proveedor alternativo (si es diferente al del modelo primario).
4. Guardar.

> **Recomendación operacional:** Siempre configurar Workers AI (`@cf/meta/llama-3.3-70b`) como fallback para las funciones críticas del ciclo de chat (`agent_response`, `chat_router`). Workers AI no tiene costo adicional por llamada y está co-ubicado con el Worker de Senda en la red de Cloudflare, lo que minimiza la latencia del fallback.

La métrica **Tasa de Fallback** en el Dashboard de AI Admin indica qué porcentaje de llamadas está yendo al fallback. Un valor superior al 10% es una señal de alerta que requiere investigar si el proveedor primario tiene problemas de disponibilidad.

---

## Monitoreo del Consumo por Función IA

**Ruta:** Administración → IA → Dashboard de Consumo

El dashboard muestra el consumo desglosado por:

- **Función IA:** qué porcentaje del gasto total corresponde a `agent_response`, `chat_router`, etc.
- **Modelo usado:** permite detectar si el fallback se está activando con frecuencia.
- **Tokens de entrada vs. salida:** identifica si el costo está concentrado en prompts largos (mucho RAG) o en respuestas largas.
- **Tendencia temporal:** comparación semana a semana para detectar anomalías.

### KPIs de Referencia

| Métrica | Valor esperado | Alerta |
|---|---|---|
| Tokens promedio por chat | < 6.000 tokens | > 10.000 → prompts demasiado largos o historial acumulado excesivo |
| Tasa de Fallback | < 5% | > 10% → problema con el proveedor primario |
| Proporción `agent_response` | 50–70% del total de tokens | Si `action_extractor` > 30% → revisar acciones innecesariamente activas |
| Latencia P95 del chat | < 4s | > 6s → considerar modelo más rápido o reducir contexto RAG |

### Exportar datos de consumo

**Ruta:** Administración → IA → Dashboard → **Exportar CSV**

El export incluye datos de `ai_usage_logs`: función, modelo usado, tokens de entrada/salida, latencia y timestamp. Útil para reportes de costo al área de finanzas o para auditorías internas de uso de IA.

---

## Impacto de la Selección de Modelo en la Experiencia de Usuario

Los usuarios finales no ven qué modelo responde sus mensajes, pero sí perciben los efectos:

| Modelo con alto contexto (GPT-4o, Claude Sonnet) | Modelos eficientes (GPT-4o-mini, Llama 70B) |
|---|---|
| Respuestas más coherentes en conversaciones largas | Pueden perder contexto en chats de más de 20 turnos |
| Mejor seguimiento de instrucciones complejas en el system prompt | Pueden ignorar instrucciones secundarias o poco enfatizadas |
| Mayor costo por token | Menor costo por token |
| Latencia ligeramente mayor (~0.5s más) | Más rápidos en responder |

**Recomendación por tipo de espacio:**

| Tipo de espacio | Modelo recomendado para `agent_response` |
|---|---|
| Soporte operacional de alto volumen | `gpt-4o-mini` o `llama-3.3-70b` |
| Espacio ejecutivo / analítico | `gpt-4o` o `claude-sonnet` |
| Espacio de cara al cliente (externalizado) | `gpt-4o-mini` con fallback `llama-3.3-70b` |
| Agente con acciones críticas (pagos, modificaciones de datos) | `gpt-4o` para `params_extractor` (reduce errores de extracción) |

---

## Procedimiento: Cambio de Modelo en Producción

Un cambio de modelo en producción afecta inmediatamente a todas las conversaciones nuevas en el tenant. Seguir este proceso para minimizar riesgos:

1. **Comunicar al equipo funcional** que el cambio va a ocurrir y en qué función.
2. **Configurar el cambio en el ambiente QA** primero y verificar la calidad de respuestas durante 24–48 horas.
3. **Aplicar en producción** durante horario de baja actividad (noche o fin de semana).
4. **Monitorear el Dashboard de Consumo** durante las primeras 2 horas post-cambio:
   - Verificar que la Tasa de Fallback no subió.
   - Verificar que la latencia P95 es aceptable.
   - Revisar cualquier reporte de usuarios sobre calidad de respuestas.
5. **Documentar el cambio** con fecha, función, modelo anterior y nuevo en el sistema de tickets.

---

## Checklist del Capítulo

- [ ] ¿Cada función IA tiene un modelo primario y un fallback configurados?
- [ ] ¿El fallback de funciones críticas (`agent_response`, `chat_router`) usa Workers AI?
- [ ] ¿La temperatura está calibrada según el tipo de función (determinista vs. creativa)?
- [ ] ¿La Tasa de Fallback es < 5%?
- [ ] ¿La latencia P95 del ciclo de chat es < 4 segundos?
- [ ] ¿Los cambios de modelo se prueban primero en QA antes de producción?
- [ ] ¿El consumo por función está documentado y reportado al área de finanzas?

---

> 📖 **Anterior:** [4 — Seguridad, Auditorías y Logs](04_seguridad_y_auditorias.md)
> 📖 **Siguiente:** [6 — Analytics y Consumo de la Plataforma](06_analytics_y_consumo.md)
