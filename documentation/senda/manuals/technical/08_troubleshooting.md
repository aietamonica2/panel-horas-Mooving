# 08. Debugging Técnico: Diagnóstico y Resolución de Problemas

> **Versión documentada:** v5.20.13 · **Última revisión:** 2026-05-29

Este capítulo es la guía de referencia para diagnóstico técnico en implementaciones de Senda. Cubre el análisis de logs internos, el uso de las herramientas de debug disponibles en la plataforma, y los procedimientos para aislar y resolver fallos en cada capa del sistema: router, acciones, RAG, pipelines, fórmulas y MCP.

---

## 1. Diagnóstico del Router

El router de Senda es el componente que, ante cada mensaje de usuario, selecciona qué agente debe responder. Su lógica es un scoring semántico de la intención del usuario contra los **Resúmenes de Responsabilidades** de todos los agentes del espacio.

### 1.1 Cómo leer los logs de router en Mission Control

Cada ejecución de chat con `debug: true` (ver §1.3) o con el **Modo Prueba** activado en el agente emite una tarjeta de debug visible en la conversación:

```
[ROUTER DEBUG]
Agente seleccionado : Especialista SAP
Confidence score    : 87
Runners evaluados   :
  → Agente RRHH       score: 23  → descartado
  → Agente Finanzas   score: 41  → descartado
  → Especialista SAP  score: 87  → ✅ seleccionado
Motivo de selección : mayor score ≥ threshold_router (65)
```

Los campos relevantes:

| Campo | Significado | Acción si es anómalo |
|---|---|---|
| `confidence score` | Certeza del router (0–100) | Si < 60, el Resumen de Responsabilidades es ambiguo o solapado |
| `runners evaluados` | Todos los agentes del espacio y sus scores | Si todos los scores son bajos (< 40), la pregunta no coincide con ningún dominio configurado |
| `threshold_router` | Umbral mínimo para selección (default: 65) | Si ningún agente supera el umbral, el Agente Principal responde por defecto |

### 1.2 Qué significa el confidence score

El score es el porcentaje de alineación semántica entre la intención detectada en el mensaje y el Resumen de Responsabilidades de cada agente. No es un porcentaje de certeza absoluto — es una comparación relativa entre candidatos.

- **Score ≥ 80**: selección clara y confiable
- **Score 65–79**: selección funcional, pero el Resumen puede mejorarse
- **Score < 65**: no se supera el umbral mínimo; el mensaje se deriva al agente principal o genera un fallback genérico
- **Score similar entre dos agentes (diferencia < 10)**: solapamiento de responsabilidades — el router puede oscilar entre ambos según variaciones mínimas en el texto del usuario

### 1.3 Por qué el router puede equivocarse

Los errores de routing tienen tres causas verificables:

1. **Resumen de Responsabilidades ambiguo**: El resumen usa lenguaje genérico ("ayuda con temas de la empresa") en lugar de dominio específico ("gestiona pedidos de compra, órdenes de trabajo y consultas de inventario en SAP MM").

2. **Solapamiento entre agentes**: Dos agentes tienen resúmenes que cubren el mismo vocabulario. El router asigna score similar a ambos y la selección se vuelve no determinista.

3. **Pregunta fuera de todos los dominios**: El usuario hace una consulta que ningún agente cubre. El router baja todos los scores y activa el fallback.

### 1.4 Probar el routing manualmente vía API

> ⚠️ **Nota de implementación:** El parámetro `"debug": true` en el body de `POST /api/v1/chat` **no genera un bloque `debug_info` en la respuesta JSON** en la versión actual. El campo es ignorado silenciosamente por el backend. El mecanismo real de debugging es a través del **Modo Prueba** en la UI y los eventos SSE `type: 'system_alert'`.

**Método correcto para debug del router:**

**Opción A — Modo Prueba en la UI (recomendado):**
1. Ir a **Configuración → Agentes → [Agente] → Modo Prueba: ON**
2. Abrir el chat y enviar el mensaje
3. La **Barra de Chips de Debug** aparece encima de cada respuesta del agente. Cada chip es clicable y abre un modal con el detalle completo (ver §1.6)

**Opción B — Chain Debugger en Mission Control:**
1. Ir a **Mission Control → Chain Debugger**
2. Seleccionar el espacio y el agente
3. Enviar el mensaje desde el simulador — el panel muestra el trazado completo de cada capa

**Opción C — Eventos SSE (para integradores):**
Al usar la API SSE (`Accept: text/event-stream`), cuando el agente está en Modo Prueba, los eventos de tipo `system_alert` incluyen el diagnóstico del router:

```bash
curl -X POST https://senda.telar.ai/api/v1/chat \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "spaceId": "sp_abc123",
    "message": "¿Cuántas unidades de producto X quedan en stock?"
  }'
```

Si el agente está en Modo Prueba, la respuesta SSE incluirá eventos como:

```
event: system_alert
data: {"type": "router_result", "selected_agent": "Especialista SAP", "confidence": 84, "candidates": [...]}

event: system_alert
data: {"type": "action_evaluation", "actions_evaluated": [...], "triggered": "Consultar Stock SAP"}
```


### 1.5 Tabla de síntomas del router

| Síntoma | Causa probable | Solución |
|---|---|---|
| Siempre elige el mismo agente para cualquier pregunta | El Agente Principal tiene `isPrimary=true` pero ningún sub-agente tiene Resumen configurado | Escribir Resúmenes de Responsabilidades en todos los sub-agentes |
| Elige un agente incorrecto consistentemente | Solapamiento de resúmenes o vocabulario demasiado similar entre dos agentes | Diferenciar los resúmenes con términos de dominio excluyentes |
| Confidence < 60 en todos los candidatos | La pregunta no coincide semánticamente con ningún resumen | Revisar si se necesita un agente adicional para ese dominio o actualizar el resumen del existente |
| El routing oscila entre dos agentes para la misma pregunta | Los scores de dos agentes difieren menos de 10 puntos | Reescribir uno de los resúmenes para maximizar la diferenciación semántica |
| El agente correcto se selecciona pero responde fuera de su dominio | Error en la Base de Conocimiento del agente (documentos de otro dominio cargados) | Auditar y limpiar la Base de Conocimiento del agente seleccionado |

### 1.6 La Barra de Chips de Debug (v5.6.70+)

Desde la versión v5.6.70, el **Modo Prueba** muestra una barra compacta de chips de colores encima de cada respuesta del agente. Cada chip representa una capa del pipeline de Senda y al hacer clic abre un **modal detallado** con toda la información de diagnóstico.

#### Chips disponibles

| Chip | Color | Qué muestra al hacer clic |
|---|---|---|
| **COT** | Ámbar | Indica que la Cadena de Pensamiento está activa. El agente verifica internamente su respuesta antes de mostrarla |
| **Agente Asignado** | Celeste | Modal con 5 pestañas: **Perfil** (descripción, razón de asignación, capacidades), **Config** (preview del system prompt, estrategia anti-alucinación, componentes GenUI, configuración de Visión/QR), **RAG** (archivos de conocimiento asignados), **Acciones** (acciones con umbral, fast-track, confirmación), **Routing** (agentes descartados y contexto de re-routing) |
| **Capacidades** | Naranja | Lista completa de todas las funciones activas del agente: Visión, Escáner QR, COT, Gráficos, Citas RAG, GenUI, cantidad de acciones |
| **RAG Consultado** | Azul | Fragmentos semánticos inyectados al LLM: nombre del archivo fuente, barra de similitud con porcentaje, texto completo del chunk, ID del vector |
| **Modelo Principal/Respaldo** | Zinc | Modelo de IA utilizado, proveedor, y si se activó el modelo de respaldo por fallo del principal |
| **Payload LLM** | Rosa | El prompt completo enviado al LLM: mensajes del sistema, historial truncado, y mensaje del usuario. Incluye modelo, tokens estimados y latencia |
| **Respuesta LLM** | Teal | La respuesta cruda generada por el modelo. Incluye modelo, tokens estimados, longitud y tiempo total del pipeline |
| **CCR** | Índigo | El **Chat Context Registry**: todos los parámetros de contexto extraídos durante la conversación, agrupados por categoría (Acción, Extraído, Usuario, Sistema). Se abre en modal pre-expandido |

#### Barra de confianza del Router

El modal de **Agente Asignado** incluye una barra de confianza visual:
- 🟢 **≥ 80%**: selección clara y confiable (verde)
- 🟡 **60–79%**: selección funcional, el Resumen puede mejorarse (ámbar)
- 🔴 **< 60%**: confianza baja, posible solapamiento de responsabilidades (rojo)

#### Pestaña "Routing" — Agentes descartados

Esta pestaña muestra los agentes que fueron evaluados pero no seleccionados, incluyendo:
- Nombre y si es el Agente Principal (badge `1°`)
- Resumen de responsabilidades (truncado)
- Total de agentes evaluados
- Si se activó el re-routing periódico (cada 5 turnos de conversación)

> 💡 **Tip**: Usar la pestaña "Config" del chip de Agente Asignado para verificar el system prompt que realmente recibe el LLM. Esto es útil para diagnosticar respuestas inesperadas causadas por prompts mal configurados.

---

## 2. Debugging de Acciones

### 2.1 El log de evaluación de acciones

Cuando el flag `debug: true` está activo (o Modo Prueba en la UI), cada acción evaluada por el LLM genera una entrada en `debug_info.actions_evaluated`:

```json
"actions_evaluated": [
  {
    "action_id": "act_crear_ticket_jira",
    "action_name": "Crear Ticket Jira",
    "score": 82,
    "threshold": 80,
    "activated": true,
    "extractedParams": {
      "titulo": "Error en módulo de facturación",
      "prioridad": "P1"
    },
    "missingFields": ["descripcion"]
  },
  {
    "action_id": "act_consultar_kpis",
    "action_name": "KPIs de Ventas",
    "score": 31,
    "threshold": 70,
    "activated": false,
    "extractedParams": {},
    "missingFields": ["periodo"]
  }
]
```

Campos clave para el diagnóstico:

| Campo | Qué indica | Cuándo es problemático |
|---|---|---|
| `score` | Certeza del LLM de que el usuario quiere esta acción (0–100) | Si es consistentemente bajo (< 40) para una acción que debería activarse, la Descripción no captura el vocabulario del usuario |
| `threshold` | Umbral configurado en la acción | Si `score` < `threshold` pero la acción debería haberse ejecutado, bajar el threshold |
| `activated` | Si la acción se ejecutó o no | `score ≥ threshold` → `activated: true` |
| `extractedParams` | Parámetros que el LLM extrajo del mensaje | Si un campo está vacío o es incorrecto, revisar el prompt de slot filling o agregar Directiva |
| `missingFields` | Campos requeridos que el LLM no pudo extraer | Si hay campos aquí, el agente entrará en slot-filling conversacional para pedirlos |

### 2.2 Casos frecuentes de fallo

**Acción no se dispara (score bajo, threshold no alcanzado)**

La Descripción de la acción no captura el vocabulario real del usuario. Ejemplo problemático:

```
Descripción actual (mala): "Crea un ticket en el sistema de gestión"
Descripción corregida:      "Crea un ticket de soporte técnico en Jira cuando el usuario 
                            reporta un error, problema, fallo, incidente o solicita ayuda 
                            técnica. NO usar si solo hace preguntas sobre el estado de tickets."
```

La descripción debe incluir sinónimos reales del vocabulario de los usuarios de ese tenant.

**Parámetros no se extraen (slot filling fallido)**

Si `extractedParams` aparece vacío para parámetros que el usuario claramente mencionó, el nombre del parámetro en la configuración puede ser demasiado técnico o diferente al vocabulario del mensaje. Agregar una Directiva explícita:

```
Directiva de ejemplo:
"El parámetro 'cliente_id' corresponde al número de cuenta del cliente, 
que el usuario puede mencionar como 'cuenta', 'número de cliente', 
'ID', 'código de cliente' o simplemente 'el cliente 12345'."
```

**Acción se ejecuta sin confirmación humana**

Si una acción mutante (POST/PUT/DELETE) se ejecuta directamente sin pedir confirmación, verificar que el campo **Confirmación Humana** esté activado en la configuración de la acción. Este campo es independiente del threshold — el LLM puede superar el threshold pero la acción debe pausarse para confirmación del usuario antes de llamar al endpoint externo.

### 2.3 Cómo usar el Chain Debugger en Mission Control

El Chain Debugger está disponible en **Mission Control → Historial → [Ver detalles de una ejecución]**. Para pipelines y acciones con múltiples pasos, muestra la ejecución paso a paso:

```
EJECUCIÓN: Pipeline Alta de Empleado — 2026-05-21 14:32:17
─────────────────────────────────────────────────────────
PASO 1 — Crear Usuario en Active Directory
  Status  : ✅ Éxito
  Input   : { "nombre": "Ana García", "email": "ana@empresa.com" }
  Output  : { "id": "usr_ad_4821", "username": "ana.garcia" }
  Latencia: 312 ms

PASO 2 — Registrar en Sistema RRHH
  Status  : ❌ Error
  Input   : { "usuario_id": "usr_ad_4821", "email": "ana@empresa.com" }
  Error   : HTTP 422 — "El campo 'departamento' es requerido"
  Latencia: 88 ms
  
PASO 3 — Enviar Email de Bienvenida
  Status  : ⏭ No ejecutado (pipeline abortado en paso 2)
─────────────────────────────────────────────────────────
```

El Chain Debugger revela exactamente en qué paso falló, el payload enviado, la respuesta del sistema externo y la latencia de cada step.

### 2.4 Testing de acciones con curl/Postman

Para testear una acción HTTP del catálogo de forma aislada (sin pasar por el LLM), podés invocarla directamente:

```bash
# Invocar una acción específica del catálogo directamente
curl -X POST https://senda.telar.ai/api/v1/actions/act_crear_ticket_jira/execute \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "params": {
      "titulo": "Test de integración",
      "prioridad": "P2",
      "descripcion": "Prueba manual desde curl"
    }
  }'
```

> ⚠️ **Nota:** El parámetro `dry_run` **no está implementado** en la versión actual de la API — si se incluye en el body, es ignorado silenciosamente. Para validar el Body Template sin ejecutar la llamada real, usar alguna de estas alternativas:
> - **Botón "🧪 Probar"** en el Catálogo de Acciones: muestra el payload construido antes de enviarlo
> - **Endpoint de staging/echo**: configurar temporalmente la URL de la acción hacia `https://httpbin.org/post` para ver el payload que Senda enviaría
> - **Entorno QA**: ejecutar la acción en `sendaqa.telar.ai` contra un sistema externo de prueba

### 2.5 Troubleshooting de acciones HTTP

| Error HTTP | Causa | Diagnóstico y solución |
|---|---|---|
| `401 Unauthorized` | Token en la Bóveda expirado o incorrecto | Ir a **Configuración → Integraciones → Credenciales**, verificar que el nombre de la clave coincide exactamente (case-sensitive) con la referencia en el header |
| `403 Forbidden` | El token tiene permisos insuficientes | El token es válido pero el usuario de API no tiene permisos para esa operación. Verificar scopes con el equipo del sistema externo |
| `404 Not Found` | URL incorrecta o recurso no existe | Copiar la URL del endpoint y verificarla con curl/Postman usando las credenciales reales |
| `400 Bad Request` | El Body Template tiene formato incorrecto | Revisar el Body Template contra la documentación del API. Verificar tipos de datos (string vs number vs boolean) |
| `422 Unprocessable Entity` | El payload es JSON válido pero falta un campo requerido por la API externa | Leer el mensaje de error de la API externa en el historial — suele indicar el campo faltante |
| `429 Too Many Requests` | Rate limit del sistema externo alcanzado | Reducir la frecuencia de schedules o implementar retry exponencial. Contactar al proveedor para aumentar el límite |
| `500 / 502 / 503` | Error del servidor externo (no de Senda) | Verificar el status del sistema externo. El error no está en la configuración de Senda |
| `connection timeout` | El endpoint externo no es alcanzable desde la red | Verificar que la URL no sea una dirección interna (LAN/VPN) inaccesible desde Cloudflare Workers. Los endpoints deben ser públicos o tener IP allowlisting configurado |
| `SSL handshake failed` | Certificado TLS del servidor externo inválido o auto-firmado | Los Workers de Cloudflare rechazan certificados no confiables. El sistema externo debe tener un certificado válido (no auto-firmado) |

### 2.6 Debugging de Scripts (Senda Script)

Cuando una acción usa el motor **Script**, los errores de ejecución se registran en el log de la acción con el stack trace completo. En el **Chain Debugger** o en **Mission Control → Historial → Ver detalles**:

```
ACCIÓN: Calcular Riesgo Crediticio (Script)
Status : ❌ Error
Error  : ReferenceError: score is not defined
         at line 14: return score * factor_ajuste
         
Contexto de variables disponibles al error:
  params.monto       : 50000
  params.plazo_meses : 24
  score              : undefined  ← la variable no fue inicializada
```

Causas comunes en Scripts:

- **`ReferenceError`**: Variable usada antes de ser definida o con typo en el nombre
- **`TypeError`**: Operación sobre un tipo inesperado (ej: intentar `.split()` sobre un número)
- **`SyntaxError`**: Error de sintaxis JavaScript — el script no pasa el parser. El editor de script en Senda muestra este error en tiempo real antes de guardar
- **Timeout (> 30s)**: El script tiene un loop infinito o una operación que excede el tiempo máximo de ejecución de Cloudflare Workers

---

## 3. Debugging RAG / Base de Conocimiento

### 3.1 Por qué el agente no usa los documentos

El sistema RAG de Senda realiza búsqueda vectorial sobre la Base de Conocimiento del agente. Hay cuatro razones por las cuales el agente puede ignorar los documentos:

1. **Umbral de similitud no alcanzado**: La similitud coseno entre el embedding de la pregunta y los fragmentos indexados está por debajo del umbral mínimo de recuperación (default: 0.65). El sistema no recupera nada y el agente responde con conocimiento paramétrico del LLM.

2. **Documentos mal indexados**: El proceso de indexación falló silenciosamente — el documento aparece en el listado pero su contenido extraído es vacío o corrupto. El estado `indexed: true` en el listado indica que el proceso terminó, no que el contenido fue extraído correctamente.

3. **Texto no extraíble**: PDFs escaneados (imágenes de texto sin OCR), tablas embebidas como imágenes, o documentos con codificación binaria propietaria (algunos formatos `.doc` antiguos).

4. **Fragmento demasiado corto o sin contexto**: El chunking dividió el documento en fragmentos de menos de 50 tokens. El embedding de un fragmento tan corto pierde contexto semántico y raramente supera el umbral de similitud.

### 3.2 Verificar estado de indexación

```bash
# Verificar el estado de indexación de todos los documentos de un espacio
GET https://senda.telar.ai/api/v1/knowledge/{spaceId}/status

# Respuesta
{
  "space_id": "sp_abc123",
  "documents": [
    {
      "doc_id": "doc_001",
      "filename": "Manual SAP FI.pdf",
      "status": "indexed",
      "chunks_count": 47,
      "chars_extracted": 82340,
      "indexed_at": "2026-05-20T10:22:00Z",
      "error": null
    },
    {
      "doc_id": "doc_002",
      "filename": "Procedimientos escaneados.pdf",
      "status": "indexed",
      "chunks_count": 3,
      "chars_extracted": 412,
      "indexed_at": "2026-05-20T10:23:00Z",
      "error": null,
      "warning": "low_content_extraction — possible scanned PDF"
    }
  ]
}
```

Señales de alerta en la respuesta:

| Indicador | Diagnóstico |
|---|---|
| `chars_extracted < 500` para un PDF de > 5 páginas | El documento es probablemente un PDF escaneado sin OCR |
| `chunks_count = 0` o `chunks_count = 1` para un documento largo | Fallo en el pipeline de chunking — re-indexar |
| `status: "error"` | El proceso de indexación falló. Ver el campo `error` para el motivo |
| `warning: "low_content_extraction"` | El extractor detectó contenido insuficiente — posible imagen o formato no soportado |

### 3.3 Re-indexar documentos problemáticos

```bash
# Re-indexar un documento específico
POST https://senda.telar.ai/api/v1/knowledge/{spaceId}/documents/{docId}/reindex

# Respuesta
{
  "job_id": "job_reindex_xyz789",
  "status": "queued",
  "estimated_seconds": 45
}
```

Verificar el resultado del job:

```bash
GET https://senda.telar.ai/api/v1/knowledge/jobs/{jobId}
```

### 3.4 Probar una búsqueda vectorial manual

Para verificar qué fragmentos recuperaría el RAG ante una pregunta específica, sin pasar por el LLM:

```bash
POST https://senda.telar.ai/api/v1/knowledge/{spaceId}/search
-H "Authorization: Bearer <SESSION_TOKEN>"
-d '{
  "query": "¿Cuál es el proceso para aprobar una nota de crédito?",
  "top_k": 5,
  "similarity_threshold": 0.60
}'

# Respuesta
{
  "results": [
    {
      "doc_id": "doc_001",
      "filename": "Manual SAP FI.pdf",
      "chunk_index": 23,
      "similarity": 0.87,
      "text": "Para emitir una nota de crédito en SAP FI, acceder a la transacción FB75..."
    },
    {
      "doc_id": "doc_003",
      "filename": "Procedimientos Finanzas.pdf",
      "chunk_index": 8,
      "similarity": 0.71,
      "text": "Las notas de crédito requieren aprobación del jefe de área cuando superen..."
    }
  ]
}
```

Si la búsqueda manual retorna resultados con similitud > 0.65 pero el agente no los usa, el problema está en el prompt del agente (instruye al LLM a no referenciar documentos, o el System Prompt es tan largo que la instrucción RAG se pierde en el contexto).

### 3.5 Problemas comunes y sus soluciones

| Problema | Causa raíz | Solución |
|---|---|---|
| PDF escaneado con `chars_extracted < 500` | El PDF es una imagen. No hay texto extraíble. | Usar OCR externo (Adobe Acrobat, ABBYY, Tesseract) antes de subir, o reemplazar por el Word/documento original con texto real |
| Tabla como imagen dentro de PDF | La tabla es un `.jpg` embebido, no texto estructurado | Convertir la tabla a Markdown o texto plano y subir como `.txt` o `.md` adicional |
| Codificación UTF-8 incorrecta | El documento tiene caracteres especiales (ñ, á, é) que el extractor interpretó como bytes inválidos | Abrir el documento en Word/LibreOffice, hacer "Guardar como" con encoding UTF-8, re-subir |
| Documento indexado pero similarity siempre < 0.5 | El contenido del documento usa jerga interna muy específica que el modelo de embedding no comprende sin contexto | Agregar un glosario al principio del documento que traduzca los términos técnicos internos a lenguaje natural |
| `chunks_count = 0` en un `.docx` | Formato `.docx` con macros o elementos de ActiveX que bloquean la extracción | Exportar a `.pdf` con "Guardar como PDF" nativo de Word, sin imprimir a PDF |

---

## Arquitectura del RAG Pipeline (v5.7.0)

Desde la versión v5.7.0, el sistema RAG de Senda implementa un **pipeline de búsqueda de 4 capas** que mejora significativamente la precisión de recuperación de fragmentos. Este pipeline reemplaza la búsqueda vectorial simple por una cadena de refinamiento progresivo.

### Pipeline de Búsqueda: las 4 capas

Cada consulta RAG atraviesa secuencialmente estas capas:

**Capa 1 — Vector Search (búsqueda semántica)**

- Modelo de embedding: `bge-m3` (1024 dimensiones)
- Recupera los **top-5 candidatos** más cercanos semánticamente
- Umbral de similitud coseno: **0.55** (reducido desde el 0.65 anterior para ampliar el recall)
- Si ningún fragmento supera el umbral, el pipeline continúa sin resultados vectoriales y delega al LLM con conocimiento paramétrico

**Capa 2 — Keyword Search (búsqueda por palabras clave)**

- Motor: consultas `LIKE` sobre D1 contra el campo `raw_content` de los chunks almacenados
- **No se activa siempre** — una heurística determina si la query del usuario contiene patrones que se benefician de búsqueda exacta:
  - Códigos o IDs alfanuméricos (ej: `SAP-FI-2847`, `NF-00123`)
  - Términos entre comillas (ej: `"nota de crédito"`)
  - Nombres propios o términos técnicos con mayúsculas internas (ej: `ActiveDirectory`, `PowerBI`)
- Cuando se activa, busca coincidencias exactas que la búsqueda vectorial podría perder por distancia semántica

**Capa 3 — LLM Re-ranking (re-ordenamiento por relevancia)**

- Llamada ligera al LLM con `max_tokens: 64`
- Recibe los candidatos de las capas 1 y 2 junto con la query original
- Reordena los candidatos por relevancia contextual real, no solo por similitud de embedding
- Permite descartar falsos positivos semánticos (fragmentos con alta similitud pero baja relevancia para la intención real del usuario)
- Los logs de esta capa se emiten con el prefijo `[Senda RAG Rerank]`

**Capa 4 — Context Assembly (ensamblado de contexto)**

- Toma los **top 3 fragmentos** del re-ranking
- Si la capa 2 (keyword) se activó, fusiona sus resultados con los re-rankeados (deduplicando por `chunk_id`)
- El resultado final se inyecta como `ragContext` en el prompt del LLM
- El orden de los fragmentos en `ragContext` respeta el ranking de la capa 3

```
┌─────────────────────────────────────────────────────────┐
│              RAG Pipeline v5.7.0                        │
│                                                         │
│  Query del usuario                                      │
│       │                                                 │
│       ▼                                                 │
│  ┌──────────────────┐                                   │
│  │ Capa 1: Vector   │  bge-m3, top-5, threshold 0.55   │
│  │ Search           │──────────────┐                    │
│  └──────────────────┘              │                    │
│       │                            │                    │
│       ▼ (heurística)               │                    │
│  ┌──────────────────┐              │                    │
│  │ Capa 2: Keyword  │  D1 LIKE     │                    │
│  │ Search (condic.) │──────────┐   │                    │
│  └──────────────────┘          │   │                    │
│                                ▼   ▼                    │
│                     ┌──────────────────┐                │
│                     │ Capa 3: LLM      │                │
│                     │ Re-ranking       │                │
│                     │ (max_tokens: 64) │                │
│                     └────────┬─────────┘                │
│                              │                          │
│                              ▼                          │
│                     ┌──────────────────┐                │
│                     │ Capa 4: Context  │                │
│                     │ Assembly         │                │
│                     │ → ragContext     │                │
│                     └──────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

### Debugging del RAG Pipeline: tabla de síntomas

| Síntoma | Causa probable | Solución |
|---|---|---|
| El agente no encuentra un código exacto (ej: `NF-00123`) | El campo `raw_content` no está almacenado en D1 o el documento no fue indexado correctamente | Verificar que el documento tiene `chars_extracted > 500` (ver §3.2). La búsqueda keyword requiere texto almacenado en D1 — si `raw_content` está vacío, re-indexar el documento |
| El agente trae fragmentos irrelevantes a pesar de tener buena Base de Conocimiento | El re-ranking no pudo reordenar correctamente los candidatos, o el contexto de la query es ambiguo | Verificar los logs con prefijo `[Senda RAG Rerank]` en el Chain Debugger. Si el re-ranking recibe candidatos de baja calidad desde la capa 1, el problema está en los embeddings — considerar re-indexar |
| La búsqueda RAG es lenta (+500ms) | La capa 2 (keyword search) se activó innecesariamente + el re-ranking sumó latencia adicional | Verificar si la heurística de la capa 2 se activa con queries que no contienen códigos ni términos entrecomillados. Si la latencia es consistente, revisar el tamaño de la Base de Conocimiento — bases con >10.000 chunks pueden requerir optimización |

### Metadata de Vectores Enriquecida

Desde v5.7.0, cada vector almacenado en el índice incluye metadata enriquecida que mejora la trazabilidad y el diagnóstico:

| Campo | Tipo | Descripción |
|---|---|---|
| `text` | `string` | Contenido del chunk (el texto que se embeddió) |
| `source` | `string` | Nombre del archivo fuente (ej: `Manual SAP FI.pdf`) |
| `thematic_index` | `string[]` | Palabras clave temáticas extraídas automáticamente del chunk |
| `file_id` | `string` | ID del archivo en la Base de Conocimiento — permite trazabilidad completa desde vector hasta documento original |
| `ingested_at` | `ISO 8601` | Fecha de ingestión del chunk — útil para verificar frescura del contenido indexado |
| `chunk_index` | `number` | Posición del chunk dentro del documento (0-indexed) |
| `chunk_total` | `number` | Total de chunks generados para ese documento |

Esta metadata es visible en el chip **RAG Consultado** del Modo Prueba (ver §1.6) y en la respuesta de búsqueda vectorial manual (ver §3.4).

### Auto-Refresh Detector: alertas de contenido obsoleto

Senda incluye un detector automático de contenido potencialmente obsoleto en la Base de Conocimiento. Este mecanismo funciona como un **cron job** (job #9 en el scheduler) que se ejecuta una vez al día, protegido por un gate de KV para evitar ejecuciones duplicadas.

**Lógica del detector:**

1. Consulta la tabla `knowledge_files` buscando archivos con `uploaded_at` anterior a **180 días**
2. Agrupa los archivos obsoletos por agente asignado
3. Crea registros en la tabla `system_alerts` con tipo `stale_knowledge` y severidad `warning`
4. Las alertas aparecen en **Mission Control → Alertas del Sistema** y como notificación para los administradores del espacio

**Schema de `system_alerts`:**

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `TEXT PK` | Identificador único de la alerta |
| `tenant_id` | `TEXT` | Tenant al que pertenece la alerta (aislamiento multi-tenant) |
| `type` | `TEXT` | Tipo de alerta (ej: `stale_knowledge`, `index_error`, `model_fallback`) |
| `severity` | `TEXT` | Nivel de severidad: `info`, `warning`, `critical` |
| `title` | `TEXT` | Título descriptivo de la alerta |
| `message` | `TEXT` | Mensaje detallado con contexto y acción recomendada |
| `metadata` | `TEXT (JSON)` | Datos estructurados adicionales (ej: lista de archivos afectados, IDs de agentes) |
| `dismissed` | `INTEGER` | `0` = activa, `1` = descartada por un administrador |

**Ejemplo de alerta generada:**

```json
{
  "id": "alert_stale_kb_20260528",
  "tenant_id": "tn_empresa_xyz",
  "type": "stale_knowledge",
  "severity": "warning",
  "title": "3 archivos de conocimiento tienen más de 180 días sin actualización",
  "message": "El agente 'Especialista SAP' tiene 3 archivos en su Base de Conocimiento que fueron subidos hace más de 6 meses. El contenido podría estar desactualizado. Archivos: Manual SAP FI.pdf (210 días), Procedimientos MM.docx (195 días), Guía de Transacciones.pdf (188 días).",
  "metadata": {
    "agent_id": "ag_sap_001",
    "agent_name": "Especialista SAP",
    "stale_files": [
      { "file_id": "doc_001", "filename": "Manual SAP FI.pdf", "days_since_upload": 210 },
      { "file_id": "doc_007", "filename": "Procedimientos MM.docx", "days_since_upload": 195 },
      { "file_id": "doc_012", "filename": "Guía de Transacciones.pdf", "days_since_upload": 188 }
    ]
  },
  "dismissed": 0
}
```

> 💡 **Tip**: Las alertas de contenido obsoleto no significan que el contenido sea incorrecto — solo indican que no ha sido actualizado en los últimos 6 meses. Revisar si el contenido sigue vigente y, si es correcto, re-subir el archivo para reiniciar el contador de frescura.

### RAG Prep Engine: Análisis de Calidad Pre-Ingestión (BETA)

> 🔖 **BETA** — Disponible desde v5.6.94. Endpoint: `POST /api/prep/analyze`.

El **RAG Prep Engine** es un sistema de análisis automático que evalúa la calidad de un documento **antes de cargarlo** en la Base de Conocimiento. Detecta problemas que degradarían la calidad del RAG y genera recomendaciones accionables.

#### ¿Por qué analizar antes de cargar?

Un documento mal estructurado, con información sensible o contradictorio con documentos existentes produce respuestas pobres del agente. El Prep Engine actúa como un **control de calidad preventivo** — es más barato arreglar un documento antes de cargarlo que diagnosticar por qué el agente responde mal después.

#### Las 8 capas de análisis

El motor ejecuta 8 análisis en paralelo (3 con LLM, 5 con heurísticas):

| # | Análisis | Método | ¿Qué detecta? |
|---|---|---|---|
| 1 | **Escaneo PII** | Regex (instant) | Emails, teléfonos, DNI/CUIT, tarjetas de crédito, API keys, passwords. Máscara automática en hallazgos |
| 2 | **Detección de inyección** | Regex (instant) | Intentos de prompt injection en español e inglés: "ignorá tus instrucciones", "forget your rules", "jailbreak" |
| 3 | **Chequeo de longitud** | Heurística | Documentos muy cortos (<200 chars) o muy largos (>100K chars) |
| 4 | **Chequeo de formato** | Heurística | PDFs escaneados (sin texto extraíble) |
| 5 | **Análisis de estructura** | LLM | Títulos, listas, FAQs, tablas, índice, boilerplate, fechas, estilo de redacción |
| 6 | **Análisis de coherencia** | LLM | Alineación con el propósito del agente. Sugiere agente alternativo si está desalineado |
| 7 | **Detección de contradicciones** | LLM | Compara contra documentos existentes. Detecta políticas conflictivas (ej: "30 días" vs "15 días") |
| 8 | **Simulación de chunks** | Heurística | Ejecuta `chunkText()` y reporta: total de chunks, tamaño promedio, chunks pequeños (<200) y grandes (>1800) |

El análisis LLM usa **muestreo estratégico**: primeros 3000 chars + 2000 centrales + últimos 2000 chars. Si el LLM falla, cae a análisis heurístico automáticamente.

#### El Scorecard de Calidad

Cada documento recibe una **calificación de A a F** basada en 6 dimensiones ponderadas:

| Dimensión | Peso | ¿Qué evalúa? |
|---|---|---|
| Estructura | 25% | Organización del documento: títulos, secciones, índice |
| Coherencia | 30% | Alineación con el propósito del agente |
| RAG-Friendly | 15% | Facilidad para el sistema de búsqueda vectorial |
| Densidad | 10% | Proporción de contenido útil vs. boilerplate |
| Limpieza | 10% | Ausencia de PII, inyecciones y contenido problemático |
| Longitud | 10% | Rango óptimo de longitud para RAG |

| Calificación | Rango | Etiqueta |
|---|---|---|
| **A** | ≥90 | Excelente para RAG |
| **B** | ≥75 | Bueno con mejoras menores |
| **C** | ≥60 | Funcional pero mejorable |
| **D** | ≥40 | Requiere correcciones |
| **F** | <40 | No apto para RAG |

#### Análisis adicionales

- **Detección de duplicados cross-agente:** Calcula hash SHA-256 de los primeros 10K caracteres y lo compara contra `knowledge_files.file_hash` de todos los agentes del tenant
- **Alineación bidireccional:** Sugiere mejoras al System Prompt del agente si detecta que tópicos del documento ya están cubiertos en las instrucciones del prompt
- **Sugerencias de System Prompt:** Alerta si el `agent_summary` es demasiado corto o si hay tópicos redundantes

#### Prompt de optimización automática

De todos los hallazgos, el Prep Engine genera un **prompt copy-paste** listo para usar con ChatGPT o Claude que corrige todos los problemas detectados automáticamente:

```
"Reescribí el siguiente documento aplicando estas correcciones:
1. Agregá títulos H2 cada 500 palabras
2. Eliminá los 3 emails detectados
3. Reestructurá el párrafo 7 como lista de pasos
[...]"
```

El usuario copia este prompt, lo pega en su herramienta de IA, y obtiene el documento corregido.

#### API Endpoints del Prep Engine

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/prep/analyze` | Analizar un documento (rate limit: 20/min por usuario) |
| `GET` | `/api/prep/report/:id` | Obtener un reporte específico |
| `GET` | `/api/prep/reports` | Listar reportes (filtro opcional por `?agentId=`) |

#### Tabla de síntomas del Prep Engine

| Síntoma | Causa probable | Acción |
|---|---|---|
| Calificación F | Documento sin estructura, solo texto plano | Agregar títulos, listas y secciones |
| PII detectada | Datos personales en el documento | Limpiar antes de cargar |
| Inyección detectada | Contenido que intenta manipular al agente | Eliminar las líneas problemáticas |
| Coherencia baja | Documento no alineado con el agente | Mover al agente correcto o crear uno nuevo |
| Chunks desbalanceados | Secciones muy largas o muy cortas | Reestructurar con títulos intermedios |
| Contradicción detectada | Conflicto con documento existente | Revisar ambos documentos y unificar política |

---

## 4. Debugging de Pipelines y Fórmulas

### 4.1 El log paso a paso de un pipeline

Toda ejecución de pipeline se registra en el Historial de Mission Control con el detalle de cada step. En el Chain Debugger:

```
PIPELINE: Proceso de Cotización y Envío
Iniciado por: usuario@empresa.com — 2026-05-21 09:14:32
Duración total: 4.8s

PASO 1 — Buscar Cliente en CRM
  Status   : ✅ Éxito (312ms)
  Payload  : { "id": "CLI-2847" }
  Output   : { "razon_social": "García SA", "categoria": "gold", "email": "carlos@garcia.com" }

PASO 2 — Calcular Descuento Comercial (Fórmula)
  Status   : ✅ Éxito (8ms)
  Input    : { "categoria_cliente": "gold", "total_bruto": 18000 }
  Output   : { "desc_categoria": 10, "desc_total": 10, "precio_final": 16200 }

PASO 3 — Generar PDF de Cotización
  Status   : ❌ Error (1.2s)
  Payload  : { "nombre_cliente": "García SA", "total": 16200 }
  Error    : HTTP 400 — "Missing required field: 'numero_cotizacion'"
  
PASO 4 — Enviar Email con Adjunto
  Status   : ⏭ Abortado (pipeline detenido)
```

### 4.2 Tipos de error en pipelines

| Tipo de error | Síntoma en el log | Causa más frecuente | Solución |
|---|---|---|---|
| **Variable no definida** | `{{paso1.campo}}` aparece como string literal en el payload enviado | El Output Key del paso anterior no coincide con el nombre referenciado | Verificar que el Output Key en la configuración y la referencia en el paso siguiente sean idénticos (case-sensitive) |
| **Campo no existe en la respuesta** | El payload llega al step con el campo en `null` o ausente | El sistema externo no devuelve ese campo en todos los casos | Usar valores por defecto o agregar validación condicional en la Directiva del pipeline |
| **Tipo de dato incorrecto** | El sistema externo rechaza el payload con `400` | Un campo numérico se envía como string o viceversa | En el Body Template, asegurarse de no envolver números entre comillas: `"monto": {{monto}}` (no `"monto": "{{monto}}"`) |
| **Timeout en step intermedio** | El step marca `Error: timeout after 30s` | El sistema externo tardó más de 30 segundos en responder | Verificar el performance del endpoint externo. Los Workers de Cloudflare tienen un límite de CPU; considerar un step de notificación asíncrona en lugar de esperar la respuesta |
| **Dependencia circular** | El pipeline entra en loop o falla con "circular reference detected" | Dos pasos se referencian mutuamente | Rediseñar el flujo — los pipelines de Senda son acíclicos (DAG). No hay soporte para loops |

### 4.3 Debugging de Fórmulas: el preview en tiempo real y sus limitaciones

El motor de Fórmulas tiene un preview en tiempo real que evalúa las expresiones con los valores de ejemplo definidos en la configuración. Este preview tiene limitaciones importantes:

- **Evalúa con valores estáticos**: Solo usa los valores de ejemplo de la configuración. Si el error ocurre solo con ciertos valores de producción (ej: división por cero cuando `plazo_meses = 0`), el preview no lo detectará.
- **No simula el slot filling**: El preview asume que todos los parámetros están provistos. Si el agente extrae un parámetro vacío o con tipo incorrecto, la fórmula puede fallar en producción aunque el preview sea exitoso.
- **JavaScript estricto**: El motor usa un sandbox JavaScript. Funciones como `fetch()`, `setTimeout()`, o el acceso a `window`/`document` no están disponibles y generarán `ReferenceError`.

Para debuggear fórmulas en producción, habilitar el log de ejecución en el historial de la acción:

```json
{
  "action": "Calcular Precio Final",
  "status": "error",
  "formula_trace": {
    "inputs": { "monto_base": "abc", "tasa_iva": 21 },
    "error": "TypeError: Cannot multiply 'abc' * 0.79 — NaN propagation",
    "step": "subtotal = monto_base * (1 - descuento / 100)"
  }
}
```

El `formula_trace` muestra exactamente qué valores recibió la fórmula y en qué expresión falló. En el ejemplo, el LLM extrajo `monto_base` como string ("abc") en lugar de número — el slot filling requiere una Directiva que fuerce el tipo o un Form Node con campo `number`.

### 4.4 Errores de dependencia circular entre steps

Los pipelines de Senda son DAGs (grafos acíclicos dirigidos). Si accidentalmente referenciás el output de un step posterior en un step anterior durante la configuración, la plataforma detecta la dependencia circular y devuelve:

```
Error: Circular dependency detected between steps [paso_3 → paso_1].
Pipeline cannot be saved.
```

Esto se resuelve rediseñando el orden de los steps para que el flujo de datos sea siempre en una sola dirección (paso anterior → paso siguiente, nunca al revés).

---

## 5. Debugging MCP

### 5.1 Verificar que el servidor MCP está activo

Antes de diagnosticar problemas de integración, verificar que el servidor MCP externo responde correctamente:

```bash
# Verificar health del servidor MCP
curl -X GET https://mcp.erp-empresa.com/v1/health \
  -H "Authorization: Bearer <ERP_TOKEN>"

# Respuesta esperada
{
  "status": "ok",
  "version": "1.2.0",
  "tools_count": 8
}
```

Si el servidor MCP no expone un endpoint `/health`, verificar el endpoint de descubrimiento:

```bash
GET https://mcp.erp-empresa.com/v1/tools/list
```

### 5.2 Errores de auto-discovery

Cuando Senda conecta un servidor MCP externo y dispara el auto-discovery, puede fallar por:

**Formato inválido de `tools/list`**

El endpoint `tools/list` debe devolver el JSON Schema de MCP. Si el servidor retorna un formato propietario o con campos faltantes, Senda rechaza el servidor. Verificar que la respuesta incluya:

```json
{
  "tools": [
    {
      "name": "get_stock_level",
      "description": "Returns current stock level for a given product ID",
      "inputSchema": {
        "type": "object",
        "properties": {
          "product_id": { "type": "string", "description": "Product SKU" }
        },
        "required": ["product_id"]
      }
    }
  ]
}
```

Campos que si están ausentes provocan fallo de auto-discovery:

| Campo faltante | Error en Senda | Impacto |
|---|---|---|
| `tools[n].name` | `MCP_DISCOVERY_ERROR: tool missing name` | La tool no se importa al catálogo |
| `tools[n].inputSchema` | `MCP_DISCOVERY_ERROR: missing schema` | La tool se importa pero el LLM no puede generar parámetros |
| `inputSchema.type` | `MCP_DISCOVERY_ERROR: schema type undefined` | El slot filling falla — el agente no sabe qué tipos de datos pedir |
| `description` vacía | Warning, no error | El LLM no sabrá cuándo usar la tool — el score de activación será bajo |

**Tipos incompatibles**

El MCP define `inputSchema` con tipos JSON Schema (`string`, `number`, `boolean`, `array`, `object`). Si el servidor usa tipos propietarios o no estándar, el parser de Senda los ignorará y los tratará como `string`. Verificar que los tipos del schema coincidan con lo que el endpoint realmente acepta.

### 5.3 Timeout en invocaciones MCP

El timeout por defecto para invocaciones MCP es de **15 segundos**. Si el servidor MCP externo es lento, configurar un timeout personalizado en la definición del servidor:

```yaml
name: "ERP Corporativo"
url: "https://mcp.erp-empresa.com/v1"
auth:
  type: "bearer"
  token_secret: "ERP_TOKEN"
timeout_ms: 30000   # 30 segundos para endpoints lentos
auto_discover: true
```

Si el timeout se supera, la acción registra:

```json
{
  "error": "MCP_TIMEOUT",
  "message": "MCP server did not respond within 30000ms",
  "tool": "get_stock_level",
  "server": "ERP Corporativo"
}
```

En ese caso, verificar si el endpoint del servidor MCP puede optimizarse o si el procesamiento debe ser asíncrono (el servidor responde inmediatamente con un `job_id` y Senda hace polling).

### 5.4 Logs de invocación MCP en el panel de integraciones

Los logs completos de invocación MCP están en **Configuración → Integraciones → MCP Servers → [nombre del servidor] → Ver logs**:

```
2026-05-21 09:14:32 | GET tools/list          | 200 OK   | 145ms
2026-05-21 09:14:45 | POST invoke/get_stock   | 200 OK   | 892ms
2026-05-21 09:15:12 | POST invoke/create_po   | 422 ERR  | 310ms
  Error: { "code": "VALIDATION_ERROR", "field": "currency", "message": "Invalid currency code 'ARS'" }
2026-05-21 09:18:03 | POST invoke/get_stock   | 504 TIMEOUT | 15001ms
```

Estos logs son la fuente de verdad para diagnosticar si el problema está en Senda (parámetros malformados) o en el servidor MCP (responde con error o no responde).

---

## 6. Errores Comunes y Códigos HTTP

### 6.1 Tabla de errores de la API de Senda

| Código HTTP | Error code | Causa | Solución |
|---|---|---|---|
| `400` | `INVALID_PAYLOAD` | El request body tiene formato incorrecto o falta un campo requerido | Verificar el schema del endpoint en la documentación del API de Senda |
| `401` | `UNAUTHORIZED` | El session token es inválido, expiró o no fue provisto | Re-autenticar. Los tokens de sesión tienen TTL definido por la configuración del tenant |
| `403` | `INSUFFICIENT_PERMISSIONS` | El usuario autenticado no tiene el rol requerido para esa operación | Verificar que el usuario tenga rol `admin` o `analyst` según corresponda |
| `404` | `RESOURCE_NOT_FOUND` | El `spaceId`, `agentId`, `actionId` o recurso referenciado no existe en el tenant | Verificar los IDs contra la lista de recursos del tenant |
| `409` | `CONFLICT` | Intento de crear un recurso con nombre duplicado o estado incompatible | Cambiar el nombre o verificar el estado actual del recurso |
| `422` | `VALIDATION_ERROR` | Los valores provistos son válidos en formato pero fallan validación de negocio | Leer el campo `details` en la respuesta — indica exactamente qué campo falló |
| `429` | `RATE_LIMIT_EXCEEDED` | El tenant superó el rate limit de la API de Senda | Implementar backoff exponencial. Consultar los límites del plan en la documentación |
| `500` | `INTERNAL_ERROR` | Error inesperado en el servidor de Senda | Reportar a soporte con el `request_id` de la respuesta |

### 6.2 Errores específicos de Cloudflare Workers

La API de Senda corre sobre Cloudflare Workers. Algunos errores vienen de la capa de infraestructura, no de la aplicación:

| Código CF | Nombre | Causa | Diagnóstico |
|---|---|---|---|
| `1001` | DNS Resolution Error | El Worker no puede resolver el hostname del sistema externo al que intenta conectarse | Verificar que la URL del endpoint sea un hostname público con DNS válido. Las IPs privadas y hosts locales (`localhost`, `192.168.x.x`) no son alcanzables desde Workers |
| `1014` | CNAME Cross-User Banned | El dominio del endpoint externo tiene una configuración CNAME que Cloudflare bloquea | Contactar al equipo técnico del sistema externo |
| `524` | A Timeout Occurred | El Worker tardó más de 30 segundos esperando la respuesta del origen (sistema externo) | El endpoint externo es demasiado lento. Optimizar el sistema externo o implementar respuesta asíncrona |
| `527` | Railgun Listener to Origin Error | Error de conexión entre Cloudflare y el servidor D1 (base de datos interna de Senda) | Este error es temporal. Si persiste más de 5 minutos, contactar soporte de Senda. No tiene solución del lado del integrador |
| `530` | 1xxx Error | Redirigido a error 1xxx específico | Ver el sub-código 1xxx en la documentación de Cloudflare |

> **Nota sobre el error 527 / D1 Rate Limit:** El error 527 ocasional puede indicar que una automatización está ejecutando queries en un bucle (N+1 queries dentro de un pipeline con muchos steps). Si el error es recurrente durante ejecuciones de pipelines complejos, revisar si hay pasos que generan múltiples llamadas a la API de Senda en paralelo.

---

## 7. Herramientas de Diagnóstico: Referencia Rápida

### 7.1 Mission Control → Chain Debugger

**Cómo acceder:** Mission Control → tab **🕐 Historial** → click en cualquier ejecución → **[Ver detalles]**

**Qué muestra:**
- Input y output de cada step de un pipeline o acción
- Status (✅ Éxito / ❌ Error / ⏭ Abortado) y latencia por step
- Payload exacto enviado al sistema externo y respuesta recibida
- Botón **[🔄 Reintentar]** para re-ejecutar la acción fallida con los mismos parámetros
- Botón **[↩ Revertir]** para ejecutar la acción inversa (si está configurada y dentro de la ventana de rollback)

### 7.2 API REST debug mode

> ⚠️ **Nota:** El flag `"debug": true` en el payload de `POST /api/v1/chat` es **ignorado silenciosamente** por el servidor en la versión actual. No genera un bloque `debug_info` en la respuesta JSON. Para depurar respuestas, usá los chips de debug del frontend (ver §1.6) o el Chain Debugger de Mission Control (ver §7.1).

**Alternativas funcionales para obtener información de diagnóstico:**

- **Modo Prueba en la UI (§1.6):** Activa la Barra de Chips de Debug con información de router, acciones evaluadas, RAG y payload LLM.
- **Chain Debugger (§7.1):** Muestra el trazado completo paso a paso de cada ejecución.
- **Eventos SSE (§1.4):** Con el agente en Modo Prueba, los eventos `system_alert` incluyen diagnóstico del router y evaluación de acciones.

### 7.3 Audit Logs

Todos los eventos de seguridad y acceso quedan registrados con trazabilidad completa. Acceso: **Administración → Auditoría**.

Los audit logs cubren:
- Cambios en configuración de agentes, acciones y espacios (quién modificó qué, cuándo)
- Accesos y logins (incluyendo intentos fallidos)
- Ejecuciones de acciones con parámetros (sin valores de credenciales — siempre redactados)
- Cambios de rol y permisos de usuarios

Para buscar eventos relacionados con un incidente específico:

```bash
GET /api/v1/audit-logs?from=2026-05-21T09:00:00Z&to=2026-05-21T10:00:00Z&category=action_executed&actor_id=usr_xyz
```

### 7.4 Logs de Acciones en `/config/action-logs`

Para acceso rápido a los logs de ejecuciones de acciones del catálogo sin pasar por Mission Control completo, ir a **Configuración → Acciones → [nombre de la acción] → Ver logs de ejecución**.

Esta vista filtrada muestra:
- Ejecuciones de esa acción específica en las últimas 72 horas
- Estado de cada ejecución y latencia
- Error exacto en las ejecuciones fallidas
- El usuario o agente que disparó cada ejecución

Es la forma más rápida de verificar si una acción específica está funcionando correctamente en producción sin tener que filtrar en el historial general de Mission Control.

---

## Checklist de Diagnóstico Rápido

Ante cualquier comportamiento inesperado, seguir este árbol de decisión en orden:

```
¿El problema es de routing (agente incorrecto responde)?
  → Revisar §1: leer el confidence score en el Modo Prueba
  → Mejorar los Resúmenes de Responsabilidades de los agentes involucrados

¿El problema es que una acción no se dispara?
  → Revisar §2.1: verificar score vs threshold en el log de acciones evaluadas
  → Ajustar la Descripción de la acción o bajar el threshold

¿El problema es que los parámetros se extraen incorrectamente?
  → Revisar §2.1: campo extractedParams y missingFields
  → Agregar Directiva con instrucciones de extracción específicas

¿El problema es que el agente no usa los documentos?
  → Revisar §3.2: verificar chars_extracted en el status de indexación
  → Probar búsqueda vectorial manual con §3.4

¿El problema es un pipeline que falla en un step intermedio?
  → Abrir el Chain Debugger (§7.1) y leer el payload y error del step fallido
  → Verificar tipos de datos y Output Keys según §4.2

¿El problema es una acción HTTP con error de API externa?
  → Consultar la tabla de errores HTTP de §2.5
  → Testear el endpoint directamente con curl/Postman con las mismas credenciales

¿El problema es un servidor MCP que no responde o auto-discovery falla?
  → Revisar el health del servidor (§5.1) y los logs de invocación (§5.4)
  → Verificar el formato del tools/list contra el schema de §5.2

¿El problema es un error HTTP 524 o 527?
  → Ver §6.2 — estos son errores de infraestructura de Cloudflare
  → Error 524 = endpoint externo lento; Error 527 = transitorio de D1
```

---

## Checklist del Capítulo

- [ ] ¿El Modo Prueba está desactivado en los agentes de producción (solo activar para debugging)?
- [ ] ¿Los Resúmenes de Responsabilidades de cada agente son específicos y sin solapamiento?
- [ ] ¿Las Descripciones de acciones usan el vocabulario real de los usuarios del tenant?
- [ ] ¿Las acciones HTTP tienen directiva para campos con nombres ambiguos?
- [ ] ¿Los documentos de la Base de Conocimiento tienen `chars_extracted` > 500?
- [ ] ¿La metadata de vectores (`file_id`, `ingested_at`, `chunk_index`) está presente en los chunks indexados?
- [ ] ¿Las alertas de `stale_knowledge` en Mission Control están revisadas y no hay archivos con >180 días sin actualizar?
- [ ] ¿Los pipelines tienen Output Keys consistentes entre steps?
- [ ] ¿Los servidores MCP tienen health check accesible y timeout configurado?
- [ ] ¿El equipo conoce el árbol de diagnóstico rápido de este capítulo?
- [ ] ¿Sé cómo usar el RAG Prep Engine para analizar un documento antes de cargarlo?
- [ ] ¿Entiendo las 6 dimensiones del scorecard de calidad (A-F)?
- [ ] ¿Conozco los 8 tipos de análisis que ejecuta el Prep Engine?

---

> 📖 **Anterior:** [07 — Integraciones OAuth2 y Webhooks](./07_integraciones_y_webhooks.md)
> 📖 **Siguiente:** [09 — Senda Bridge SDK](./09_senda_bridge_sdk.md)
> 📖 **Referencia cruzada:** [01 — Conceptos y Tipos de Acción](./01_acciones_conceptos_y_tipos.md) · [05 — Mission Control](./05_mission_control.md)
