# Glosario Técnico

> **Versión cubierta:** v5.6.92 | Última actualización: 2026-05-27

> Este glosario documenta los términos técnicos específicos del Manual Técnico de Senda. Para términos funcionales generales (Agente, Espacio, RAG, etc.), consultá el [Glosario Funcional](../functional/00_glosario.md).

---

<h2 id="action-catalog">Action Catalog (Catálogo de Acciones)</h2>
**Qué es:** La tabla central (`action_catalog`) que almacena todas las acciones configuradas para un tenant. Cada acción define un nombre, tipo de ejecución, endpoint, parámetros, threshold y directiva.
**Referencia:** [Cap. 01 — Acciones: Conceptos y Tipos](./01_acciones_conceptos_y_tipos.md)

---

<h2 id="agent-actions">Agent Actions (Vínculo Agente-Acción)</h2>
**Qué es:** La tabla de relación (`agent_actions`) que conecta acciones del catálogo con agentes específicos. Una acción solo puede ser evaluada por el LLM si está vinculada a un agente a través de esta tabla.
**Diferencia clave:** Las Space Tools de tipo `action` + `direct` ejecutan SIN pasar por `agent_actions`. Las de tipo `intent` SÍ necesitan que la acción esté vinculada.
**Referencia:** [Cap. 01 — Space Tools](./01_acciones_conceptos_y_tipos.md#acciones-en-la-barra-de-espacio-space-tools--feature-flag)

---

<h2 id="threshold">Threshold (Umbral de Activación)</h2>
**Qué es:** Valor numérico (0–100) que determina la certeza mínima que el LLM necesita alcanzar para ejecutar una acción. Si el score del LLM es menor al threshold, el agente conversa en lugar de ejecutar.
**Valores recomendados:** 70 (consultas), 80 (estándar), 85-90 (acciones de escritura), 90+ (acciones destructivas).
**Referencia:** [Cap. 01 — El Umbral en Profundidad](./01_acciones_conceptos_y_tipos.md#el-umbral-threshold-en-profundidad)

---

<h2 id="render-type">Render Type / Presentation Type</h2>
**Qué es:** Campo de la acción que indica cómo debe renderizarse la respuesta en el chat. Los valores posibles incluyen: `kpi_cards`, `bar_chart`, `line_chart`, `area_chart`, `donut_chart`, `data_table`, `intent_graph`, `qr_code`, `timeline`, `board`, `stepper`, `network_tree`, `calendar_schedule`, `comparison_matrix`, `third_party_widget`, `html_widget`.
**Referencia:** [Cap. 03 — Generative UI](./03_formulas_pipelines_y_ui.md)

---

<h2 id="form-node">Form Node</h2>
**Qué es:** Un nodo del Intent Graph que renderiza un formulario interactivo dentro del chat. Soporta 9 tipos de campo (`text`, `textarea`, `number`, `select`, `radio_pills`, `checkbox`, `user_picker`, `date`, `date_time`). Reemplaza la recopilación conversacional de parámetros por un formulario de 1 solo turno.
**Referencia:** [Cap. 04 — Intent Graph](./04_intent_graph.md)

---

<h2 id="intent-graph">Intent Graph</h2>
**Qué es:** Estructura de datos tipo grafo que modela flujos conversacionales determinísticos. Cada nodo contiene una pregunta o formulario y edges con opciones de respuesta que determinan el siguiente nodo. Se resuelve sin LLM roundtrips entre nodos.
**Referencia:** [Cap. 04 — Intent Graph y Flujos Conversacionales](./04_intent_graph.md)

---

<h2 id="intent-graph-v2">Intent Graph v2 (Grafos Encadenados)</h2>
**Qué es:** Extensión del Intent Graph donde el resultado de una acción puede devolver un nuevo grafo (`__intent_graph`), creando flujos multi-paso encadenados sin intervención del LLM entre cada paso.
**Referencia:** [Cap. 04](./04_intent_graph.md)

---

<h2 id="pipeline">Pipeline de Acciones</h2>
**Qué es:** Cadena secuencial de procesamiento que se activa cuando un usuario envía un mensaje. Incluye: Router → Agente → RAG Search → Action Evaluator → Action Extractor → Action Executor → Response Generation. Cada paso puede cortocircuitar si no es necesario.
**Referencia:** [Cap. 08 — Troubleshooting](./08_troubleshooting.md)

---

<h2 id="eventbus">EventBus</h2>
**Qué es:** Sistema interno de eventos que conecta acciones ejecutadas, webhooks entrantes y observers. Los eventos internos usan prefijo `on_` (ej: `on_action_failed`), los externos usan prefijo `ext:` (ej: `ext:mi-crm:ticket_created`), y los custom usan `custom:`.
**Referencia:** [Cap. 05 — Mission Control](./05_mission_control.md) · [Cap. 07 — Webhooks](./07_integraciones_y_webhooks.md)

---

<h2 id="observer">Observer (Observador)</h2>
**Qué es:** Regla que escucha un evento del EventBus y, opcionalmente con una condición, ejecuta una acción del catálogo cuando se cumple. Soporta operadores `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `not_contains`, `in` sobre campos del payload del evento.
**Referencia:** [Cap. 05 — Mission Control](./05_mission_control.md)

---

<h2 id="schedule">Schedule (Acción Programada)</h2>
**Qué es:** Ejecución automática de una acción del catálogo según un horario definido por expresión cron. El Wizard de la UI convierte selecciones humanas ("Lunes a las 9am") en cron.
**Referencia:** [Cap. 05 — Mission Control](./05_mission_control.md)

---

<h2 id="circuit-breaker">Circuit Breaker</h2>
**Qué es:** Patrón de resiliencia que protege contra fallos en cascada. Cuando el proveedor de LLM (OpenAI) acumula errores HTTP 5xx consecutivos, el circuit breaker se abre y rechaza nuevas llamadas para evitar latencia acumulada. Vuelve a CLOSED tras 30 segundos si el LLM responde OK.
**Estados:** `closed` (funcionando), `open` (bloqueando), `half-open` (probando).
**Referencia:** [Cap. 08 — Troubleshooting §7.2](./08_troubleshooting.md)

---

<h2 id="hmac">HMAC (Hash-based Message Authentication Code)</h2>
**Qué es:** Mecanismo de verificación de integridad y autenticidad de webhooks entrantes. Senda verifica automáticamente la firma HMAC-SHA256 de los webhooks usando el signing secret configurado por fuente.
**Referencia:** [Cap. 07 — Webhooks](./07_integraciones_y_webhooks.md)

---

<h2 id="ssrf">SSRF (Server-Side Request Forgery)</h2>
**Qué es:** Vector de ataque donde un script malicioso intenta hacer requests HTTP a recursos internos. Senda protege contra SSRF en `senda.fetch()` y `senda.registerAction()` restringiendo las URLs a hostnames registrados en el `action_catalog` del tenant + allowlist.
**Referencia:** [Cap. 09 — Senda Bridge SDK §4](./09_senda_bridge_sdk.md)

---

<h2 id="senda-bridge">Senda Bridge SDK</h2>
**Qué es:** SDK interno disponible en acciones de tipo Script via el objeto `senda`. Expone 8 métodos: `callAction`, `getAvailableActions`, `askAI`, `registerAction`, `schedule`, `state.*`, `observe`, `fetch`. Ejecuta en sandbox con timeout de 10s y cycle detection de profundidad 5.
**Referencia:** [Cap. 09 — Senda Bridge SDK](./09_senda_bridge_sdk.md)

---

<h2 id="sandbox">Sandbox de Ejecución</h2>
**Qué es:** Entorno aislado donde corren las acciones de tipo Script. Restricciones: `setTimeout`/`setInterval` deshabilitados, timeout de 10 segundos, cycle detection (máx 5 niveles de recursión), SSRF protection, static fallback parser para resiliencia ante errores.
**Referencia:** [Cap. 09 — Senda Bridge SDK §4](./09_senda_bridge_sdk.md)

---

<h2 id="tenant-creds">TENANT_CREDS (Bóveda de Credenciales)</h2>
**Qué es:** Sistema de variables seguras del tenant accesibles en headers y bodies de acciones HTTP mediante la sintaxis `{{TENANT_CREDS.nombre}}`. Las credenciales se almacenan cifradas con AES-256-GCM y nunca se exponen en logs, exports ni payloads de debug.
**Referencia:** [Cap. 02 — Acciones HTTP](./02_acciones_http_y_formularios.md)

---

<h2 id="confirm-before">Confirmación Humana (confirm_before)</h2>
**Qué es:** Flag booleano en la acción que, cuando está activo, obliga al sistema a mostrar un modal de confirmación al usuario ANTES de ejecutar el endpoint externo. Independiente del threshold — el LLM puede superar el threshold pero la acción se pausa para aprobación.
**Referencia:** [Cap. 01 — Conceptos](./01_acciones_conceptos_y_tipos.md)

---

<h2 id="response-directive">Response Directive (Directiva de Respuesta)</h2>
**Qué es:** Instrucciones en texto libre que definen cómo el agente debe transformar la respuesta técnica de una acción en un mensaje comprensible para el usuario final. Se aplica DESPUÉS de ejecutar la acción, antes de generar la respuesta.
**Referencia:** [Cap. 01 — Directivas](./01_acciones_conceptos_y_tipos.md)

---

<h2 id="reverse-action">Reverse Action (Acción de Reversión)</h2>
**Qué es:** Acción del catálogo vinculada como "inversa" de otra mediante el campo `reverse_action_id`. Habilita el botón ↩ Revertir en el Historial de Mission Control. Sujeta a una ventana de tiempo (`reverse_window_hours`, default 24h).
**Referencia:** [Cap. 05 — Mission Control](./05_mission_control.md)

---

<h2 id="feature-flag">Feature Flag</h2>
**Qué es:** Registro en la tabla `feature_flags` que controla la activación progresiva de funcionalidades. Campos principales: `code`, `status` (`off`/`on`), `category` (`platform`/`tenant`). Soporta overrides por tenant para Canary Rollout.
**Referencia:** [Cap. 01 — Space Tools](./01_acciones_conceptos_y_tipos.md)

---

<h2 id="space-tools">Space Tools</h2>
**Qué es:** Tabla `space_tools` (18 columnas, migración 0079) que almacena botones y chips de acceso rápido por espacio. Tipos: `action` (ejecución directa) e `intent` (sugerencia conversacional). Máximo 10 por espacio.
**Referencia:** [Cap. 01 — Space Tools](./01_acciones_conceptos_y_tipos.md#acciones-en-la-barra-de-espacio-space-tools--feature-flag)

---

<h2 id="mcp">MCP (Model Context Protocol)</h2>
**Qué es:** Protocolo estándar (JSON-RPC 2.0 sobre stdio/SSE) que permite a los agentes de Senda conectarse con herramientas externas de forma estandarizada. Senda implementa tanto MCP Client (consume herramientas externas) como MCP Server (expone el catálogo de acciones a clientes externos como Claude Desktop).
**Referencia:** [Cap. 06 — MCP Client y Server](./06_mcp_client_y_server.md)

---

<h2 id="oauth2">OAuth2</h2>
**Qué es:** Protocolo de autorización delegada que permite a Senda acceder a recursos externos (Drive, Calendar, Outlook) en nombre de un usuario o tenant sin almacenar contraseñas. Flujo: redirect → consent → authorization code → access/refresh token.
**Referencia:** [Cap. 07 — Integraciones OAuth2](./07_integraciones_y_webhooks.md)

---

<h2 id="third-party-widget">Third-Party Widget</h2>
**Qué es:** Mini-aplicación web de terceros renderizada en un iframe sandboxed (`allow-scripts`, sin `allow-same-origin`) dentro del chat. Comunica con Senda via `postMessage` (protocolo `SENDA_WIDGET_INIT` / `SENDA_WIDGET_EVENT`). Requiere manifest `senda-widget.json`.
**Referencia:** [Cap. 07 — Widgets de Terceros](./07_integraciones_y_webhooks.md)

---

<h2 id="dry-run">Dry Run</h2>
**Qué es:** Modo de prueba de observers que evalúa la condición campo por campo contra un payload simulado sin ejecutar la acción real. Permite validar la lógica del observer antes de activarlo.
**Referencia:** [Cap. 05 — Mission Control](./05_mission_control.md)

---

<h2 id="chain-debugger">Chain Debugger</h2>
**Qué es:** Herramienta de depuración que intercepta cada paso del pipeline en vivo: routing, evaluación de acciones, extracción de parámetros y ejecución. Muestra un modal con el payload antes de enviarlo al endpoint externo.
**Referencia:** [Cap. 08 — Troubleshooting](./08_troubleshooting.md)

---

<h2 id="cot">CoT (Chain of Thought)</h2>
**Qué es:** Tarjetas de razonamiento que muestran el proceso de decisión del agente paso a paso en la interfaz de debug. Incluyen: routing decision, action evaluation, parameter extraction y execution result.
**Referencia:** [Cap. 08 — Troubleshooting](./08_troubleshooting.md)

---

<h2 id="kv-state">KV State (Estado Persistente)</h2>
**Qué es:** Almacenamiento clave-valor persistente por tenant (Cloudflare KV) accesible desde scripts via `senda.state.get/set/delete/list`. Soporta TTL configurable (default 24h). Útil para: workflows multi-paso, rate limiting, caché.
**Referencia:** [Cap. 09 — Senda Bridge SDK §3.6](./09_senda_bridge_sdk.md)

---

<h2 id="cycle-detection">Cycle Detection (Detección de Ciclos)</h2>
**Qué es:** Mecanismo de seguridad del Senda Bridge que previene bucles infinitos cuando una acción llama a otra que llama a la primera. Implementado via `visitedActionIds` (Set) con profundidad máxima de 5 niveles.
**Referencia:** [Cap. 09 — Senda Bridge SDK §4](./09_senda_bridge_sdk.md)

---

<h2 id="tenant-isolation">Tenant Isolation (Aislamiento Multi-Tenant)</h2>
**Qué es:** Patrón de seguridad donde cada registro de cada tabla incluye `tenant_id` y todas las queries filtran obligatoriamente por este campo. Garantiza que un tenant nunca acceda a datos de otro, aunque compartan la misma base de datos D1.
**Referencia:** [Manual Admin — Cap. 08](../admin/08_privacidad_y_compliance.md)

---

<h2 id="aes-gcm">AES-256-GCM</h2>
**Qué es:** Algoritmo de cifrado simétrico autenticado usado para proteger credenciales en reposo: `TENANT_CREDS`, `totp_secret`, `mfa_backup_codes`, y signing secrets de webhooks. Proporciona confidencialidad e integridad simultáneamente.
**Referencia:** [Manual Admin — Cap. 04](../admin/04_seguridad_y_auditorias.md)

---

<h2 id="d1">Cloudflare D1</h2>
**Qué es:** Base de datos SQLite distribuida de Cloudflare donde Senda almacena toda su información persistente: usuarios, conversaciones, acciones, logs de auditoría y configuración. Cada ambiente (preview, QA, production) tiene su propia instancia D1.

---

<h2 id="vectorize">Cloudflare Vectorize</h2>
**Qué es:** Servicio de base de datos vectorial de Cloudflare que almacena los embeddings generados durante la ingesta de documentos RAG. Se usa para la búsqueda semántica cuando un usuario hace una pregunta.

---

<h2 id="r2">Cloudflare R2</h2>
**Qué es:** Object storage compatible con S3 donde se almacenan los archivos originales de la base de conocimiento (PDFs, DOCX, imágenes) y las imágenes de la Bóveda Visual.

---

> 📖 Este glosario se actualiza con cada nueva versión de la plataforma.
> **Versión del glosario:** v5.6.92 — Mayo 2026

---

> 📖 **Siguiente:** [01 — Acciones: Conceptos y Tipos](./01_acciones_conceptos_y_tipos.md)
