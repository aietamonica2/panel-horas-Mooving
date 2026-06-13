# Glosario para Implementadores de Senda

> **Versión documentada:** v5.20.13 · **Última revisión:** 2026-05-29

> Este glosario contiene todos los términos técnicos que aparecen en la documentación, explicados con lenguaje accesible para perfiles funcionales. Cada término incluye una analogía y un ejemplo en el contexto de Senda.

---

<h2 id="agente">Agente</h2>
**Qué es:** Un asistente de IA especializado en un tema concreto dentro de Senda. A diferencia de un chatbot genérico, cada agente tiene identidad propia, instrucciones específicas, documentación exclusiva y herramientas asignadas.  
**Analogía:** Un empleado virtual contratado para una función específica, con su propio manual de trabajo.  
**En Senda:** El "Especialista SAP" y el "Especialista de RRHH" son dos agentes distintos, con conocimiento separado, que nunca se confunden entre sí.

---

<h2 id="agente-principal">Agente Principal (Router)</h2>
**Qué es:** El primer agente que recibe cada mensaje del usuario. Su trabajo no es responder, sino entender la consulta y derivarla al especialista correcto.  
**Analogía:** La recepcionista de una empresa que dice "para facturación, pasá a la ventanilla 3".  
**En Senda:** Sin un Agente Principal bien configurado, todos los mensajes van al mismo agente genérico y la especialización no funciona.

---

<h2 id="api">API (Application Programming Interface)</h2>
**Qué es:** Un "enchufe" digital que permite que dos sistemas informáticos se comuniquen entre sí e intercambien datos de forma automática.  
**Analogía:** El tomacorriente de la pared. Cualquier aparato que tenga el conector correcto puede conectarse y obtener electricidad, sin importar cómo está hecho por dentro.  
**En Senda:** Cuando el agente necesita consultar el stock en SAP o crear un ticket en Jira, lo hace a través de la API de esos sistemas.

---

<h2 id="autonomia">Autonomía Proactiva</h2>
**Qué es:** La capacidad de Senda de ejecutar tareas sin que ningún usuario escriba nada, disparadas por un horario o por eventos del sistema.  
**Analogía:** Un empleado nocturno que hace rondas de seguridad aunque nadie se lo pida, porque ese es su trabajo.  
**En Senda:** El Monday Report que llega solo todos los lunes a las 9am, o la alerta que se envía automáticamente cuando una integración falla tres veces seguidas.

---

<h2 id="base-de-conocimiento">Base de Conocimiento (RAG)</h2>
**Qué es:** El conjunto de documentos (PDFs, manuales, guías) que el agente puede consultar para responder preguntas. Impide que la IA "invente" respuestas no verificadas.  
**Analogía:** La biblioteca personal del agente. Solo puede citar libros que están en esa biblioteca.  
**En Senda:** Si subís el manual de SAP, el agente cita ese manual. Si no lo subís, improvisa — y eso es peligroso.  
*Ver también: [RAG](#rag)*

---

<h2 id="bóveda">Bóveda de Credenciales</h2>
**Qué es:** Un almacén seguro donde Senda guarda las contraseñas y tokens necesarios para conectarse a sistemas externos, de forma cifrada y sin exponerlos en la configuración.  
**Analogía:** Un llavero con candado. Las llaves están ahí, pero nadie puede verlas directamente; el sistema las usa sin mostrarlas.  
**En Senda:** En lugar de escribir `Bearer sk_live_123abc` en el header de una acción, escribís `{{TENANT_CREDS.jira_token}}` y Senda busca la clave real de forma segura.

---

<h2 id="canary-rollout">Canary Rollout</h2>
**Qué es:** Una técnica para lanzar una funcionalidad nueva primero a un grupo pequeño de usuarios ("canarios") antes de activarla para todos.  
**Analogía:** Las mineras históricamente llevaban canarios a las minas para detectar gas tóxico antes de que afectara a todos los mineros. Si el canario estaba bien, era seguro avanzar.  
**En Senda:** Activás el nuevo agente solo para el equipo de IT del cliente (10 personas) durante dos semanas. Si todo va bien, lo activás para los 500 empleados.  
*Ver también: [Feature Flag](#feature-flag)*

---

<h2 id="catálogo-de-acciones">Catálogo de Acciones</h2>
**Qué es:** El panel central donde se gestionan todas las "herramientas" que los agentes pueden usar: crear tickets, consultar datos, enviar emails, calcular fórmulas, etc.  
**Analogía:** El taller de herramientas de un carpintero. El agente entra al taller, elige la herramienta correcta y la usa.  
**En Senda:** Un agente sin acciones solo conversa. Un agente con acciones opera sistemas reales.

---

<h2 id="chain-debugger">Chain Debugger</h2>
**Qué es:** El entorno de simulación donde podés probar pipelines y acciones complejas antes de activarlas en producción, viendo en tiempo real cómo razona el agente.  
**Analogía:** El simulador de vuelo de un piloto. Practicás todos los escenarios posibles sin riesgo de accidente real.  
**En Senda:** El Chain Debugger intercepta la ejecución y te muestra "el agente va a ejecutar la acción X con los parámetros Y. ¿Confirmás?" antes de que toque ningún sistema real.

---

<h2 id="cifrado">Cifrado (AES-GCM)</h2>
**Qué es:** Una técnica matemática que convierte datos sensibles (como contraseñas) en texto incomprensible que solo puede leer quien tenga la clave correcta.  
**Analogía:** Escribir un mensaje en un código secreto que solo el destinatario puede descifrar.  
**En Senda:** Las credenciales de la Bóveda se guardan cifradas con AES-GCM. Aunque alguien accediera ilegalmente a la base de datos, solo vería caracteres sin sentido.

---

<h2 id="cron">Cron (Expresión Cron)</h2>
**Qué es:** Una notación técnica para definir horarios de ejecución automática. Ej: `0 9 * * 1` significa "a las 09:00 todos los lunes".  
**Analogía:** El despertador programado de tu teléfono, pero con mucha más precisión.  
**En Senda:** El Wizard de Schedules genera la expresión cron automáticamente cuando vos simplemente elegís "Lunes a las 9am". No necesitás aprenderla.  
*Ver también: [Schedule](#schedule)*

---

<h2 id="deployment">Deployment (Despliegue)</h2>
**Qué es:** El proceso de hacer que una funcionalidad nueva esté disponible para los usuarios finales en el entorno real de producción.  
**Analogía:** Abrir las puertas de un negocio al público después de haberlo preparado internamente.  
**En Senda:** Nunca se despliega sin pasar por las 5 fases del Playbook. El deployment apresurado es la causa #1 de experiencias fallidas con IA.

---

<h2 id="directiva">Directiva de Acción</h2>
**Qué es:** Instrucciones adicionales que se inyectan en el razonamiento del agente específicamente cuando está a punto de ejecutar una acción, complementando el System Prompt.  
**Analogía:** Una nota adhesiva en la herramienta misma: "antes de usar esto, verificá que el usuario confirmó el monto".  
**En Senda:** La directiva es donde le decís al agente "cuando el usuario quiera crear un ticket, usá el formulario integrado y nunca preguntes campo por campo".

---

<h2 id="dry-run">Dry Run (Ejecución en Seco)</h2>
**Qué es:** Probar la lógica de un Observer o Pipeline sin ejecutar ninguna acción real. El sistema evalúa si las condiciones se cumplen y qué haría, pero no hace nada.  
**Analogía:** Un ensayo teatral sin público. Todos los actores actúan, pero nadie del público está viendo. Si algo sale mal, nadie se entera y se corrige.  
**En Senda:** Simulás un payload de fallo de integración y verificás que el observer habría enviado la alerta correcta, sin que nada real llegue a Slack.

---

<h2 id="efectividad">Efectividad del Agente</h2>
**Qué es:** Una puntuación (generalmente de 0 a 100) que el propio sistema de IA genera evaluando qué tan bien respondió el agente a cada conversación.  
**Analogía:** Una autoevaluación tras cada turno de trabajo. El agente mismo revisa si cumplió su objetivo.  
**En Senda:** Configurás el Prompt de Efectividad con tus criterios de éxito. El sistema evalúa y te da datos agregados en el dashboard de Analytics.

---

<h2 id="endpoint">Endpoint</h2>
**Qué es:** La dirección web exacta dentro de una API a la que se envía una solicitud específica. Cada operación tiene su propio endpoint.  
**Analogía:** El número de ventanilla en un banco. "Para retiros, ventanilla 3. Para depósitos, ventanilla 5." Aunque estés en el mismo banco, cada tarea tiene su propia dirección.  
**En Senda:** `POST https://empresa.atlassian.net/rest/api/3/issue` es el endpoint para crear un ticket en Jira. Si la URL está mal, la acción falla.
---

<h2 id="equipo-hibrido">Equipo Híbrido (Mooving Vision)</h2>
**Qué es:** El modelo conceptual donde humanos y Agentes IA interactúan como pares en la resolución de problemas, teniendo niveles similares de privilegios, permisos y auditoría.  
**Analogía:** Un equipo de trabajo donde tu compañero de escritorio es un especialista virtual con el que debatis ideas, le pasás tareas y él te devuelve resultados, todo auditado bajo el mismo estándar de la empresa.  
**En Senda:** Un Agente IA no es "software que se ejecuta", es un usuario más con cuenta de servicio, que puede ser asignado a un Espacio, tener permisos específicos y dialogar con otros humanos u otros Agentes IA.

---
<h2 id="espacio">Espacio (Space)</h2>
**Qué es:** Un contenedor virtual dentro de Senda que agrupa agentes, documentos y acciones bajo una identidad visual y temática común. Los usuarios acceden al espacio, no a la plataforma directa.  
**Analogía:** Un departamento dentro de una empresa. El usuario entra al departamento de "Soporte IT" o al de "RRHH", y cada uno tiene su propio equipo y cultura.  
**En Senda:** Podés tener múltiples espacios por tenant: "Mesa de Ayuda IT", "Onboarding de Empleados", "Operaciones Logísticas".

---

<h2 id="feature-flag">Feature Flag (Indicador de Funcionalidad)</h2>
**Qué es:** Un interruptor de software que permite activar o desactivar una funcionalidad sin necesidad de cambiar el código, y hacerlo de forma granular por tenant o grupo de usuarios.  
**Analogía:** Un interruptor de luz eléctrica. La instalación ya está hecha (el código existe), pero decidís cuándo encender cada habitación.  
**En Senda:** Un agente nuevo puede estar completamente configurado y listo, pero "apagado" con un Feature Flag hasta que decidís activarlo primero para 10 usuarios de prueba.  
*Ver también: [Canary Rollout](#canary-rollout)*

---

<h2 id="flujo">Flujo (Flow)</h2>
**Qué es:** Un concepto central en Senda que se manifiesta de 3 formas distintas, cada una con su propósito:

| Tipo de Flujo | Herramienta | ¿Para qué se usa? | ¿Quién lo diseña? |
|---|---|---|---|
| **Flujo Conversacional** | [Intent Graph](#intent-graph) | Guiar al usuario paso a paso en un proceso (como un wizard) | El implementador funcional, arrastrando nodos |
| **Flujo de Ejecución** | [Pipeline](#pipeline) | Encadenar acciones técnicas que se ejecutan en secuencia automática | El implementador técnico, configurando pasos |
| **Flujo Autónomo** | [Schedule](#schedule) + [Observer](#observer) | Ejecutar procesos sin intervención humana, por horario o evento | El implementador, con Mission Control |

**Analogía:** Pensá en una empresa real. Un Flujo Conversacional es como un formulario que el empleado completa paso a paso. Un Flujo de Ejecución es como la línea de montaje que procesa ese formulario internamente. Un Flujo Autónomo es como el proceso de cierre contable que ocurre todos los meses sin que nadie lo pida.  
**En Senda:** La confusión más frecuente en implementaciones es mezclar estos tres tipos. Si el proceso requiere interacción del usuario → Intent Graph. Si son pasos técnicos encadenados → Pipeline. Si debe ocurrir solo → Schedule/Observer.

---

<h2 id="form-node">Form Node (Nodo de Formulario)</h2>
**Qué es:** Un componente visual que el agente inyecta en el chat mostrando un formulario completo con campos para que el usuario complete todos los datos de una acción en un único turno.  
**Analogía:** En lugar de que el cajero del banco te haga 5 preguntas una por una, te da el formulario de papel para que lo completés todo de una vez.  
**En Senda:** Reduce conversaciones de 6 turnos a 1 turno. El usuario ve el formulario, lo completa, hace click en "Confirmar" y el agente ejecuta.

---

<h2 id="generative-ui">Generative UI (Interfaz Generativa)</h2>
**Qué es:** La capacidad de Senda de mostrar gráficos, tablas de KPIs, dashboards y reportes interactivos directamente dentro de la conversación, en lugar de texto plano.  
**Analogía:** En lugar de que el analista te diga "las ventas del norte fueron $890k", aparece un gráfico de barras interactivo en el chat.  
**En Senda:** Funciona bajo el Protocolo SSP, lo que significa que el agente no dibuja gráficos (no envía código), sino que envía un "Dataset" abstracto que cada plataforma (Web, Móvil, WhatsApp) decide cómo dibujar de forma nativa.

---

<h2 id="hallucination">Alucinación (Hallucination)</h2>
**Qué es:** Cuando un modelo de IA inventa información que parece plausible pero es falsa, porque no tiene conocimiento real del tema y "rellena" los vacíos con texto convincente.  
**Analogía:** Un empleado nuevo que, en vez de decir "no sé", inventa una respuesta segura para no quedar mal. El resultado puede ser peor que el silencio.  
**En Senda:** La Base de Conocimiento (RAG) es el mecanismo principal para prevenir alucinaciones: si el agente solo puede citar lo que está en sus documentos, no puede inventar.

---

<h2 id="header">Header (Encabezado HTTP)</h2>
**Qué es:** Metadatos que acompañan una solicitud a una API, como el tipo de contenido enviado o las credenciales de autenticación. No son parte del contenido, sino del "sobre".  
**Analogía:** El remite y los sellos de un sobre de correo. No son la carta en sí, pero son necesarios para que llegue al destino correcto.  
**En Senda:** `Authorization: Bearer {{TENANT_CREDS.jira_token}}` es un header que le dice a Jira quién está haciendo la solicitud antes de que lea el contenido.

---

<h2 id="human-in-the-loop">Confirmación Humana (Human-in-the-Loop)</h2>
**Qué es:** Un mecanismo de seguridad donde el agente, antes de ejecutar una acción que altera datos externos, muestra un resumen de lo que va a hacer y espera confirmación explícita del usuario.  
**Analogía:** El piloto automático de un avión que, antes de cambiar la ruta, le muestra al piloto humano el nuevo trayecto y espera que apriete "Confirmar".  
**En Senda:** Obligatorio para acciones que crean, modifican o eliminan datos. El agente muestra "Voy a crear el ticket con estos datos: [resumen]. ¿Procedo?" y espera el "Sí".

---

<h2 id="intent-graph">Intent Graph (Grafo de Intenciones)</h2>
**Qué es:** La estructura lógica que define qué acciones puede tomar el agente y en qué secuencia. No es un árbol rígido de decisiones, sino un grafo flexible donde cada nodo puede derivar a otros nodos.  
**Analogía:** Un mapa de metro. Podés llegar de A a Z por varias rutas, y en cada estación podés decidir qué línea tomar según el destino.  
**En Senda:** Permite que acciones disparen formularios (Form Nodes), que formularios disparen pipelines, y que pipelines disparen nuevas acciones, todo en cadena.

---

<h2 id="json">JSON (JavaScript Object Notation)</h2>
**Qué es:** El formato estándar de texto estructurado que usan los sistemas informáticos para intercambiar datos a través de APIs. Es legible para humanos y máquinas.  
**Analogía:** Un formulario digital universal que todos los sistemas saben leer. Cada campo tiene su nombre y su valor.  
**En Senda:** `{"asunto": "Error en SAP", "prioridad": "Alta", "asignado": "ana@empresa.com"}` es un JSON que Senda envía a Jira para crear un ticket con esos datos.

---

<h2 id="llm">LLM (Large Language Model)</h2>
**Qué es:** El modelo de inteligencia artificial que procesa texto, razona sobre él y genera respuestas. Es el "motor" que hace que el agente "entienda" y "hable".  
**Analogía:** El motor de un auto. El auto (Senda) es el vehículo completo con carrocería, frenos y GPS. El motor (LLM) es lo que genera la potencia para moverse.  
**En Senda:** Senda es compatible con múltiples LLMs (GPT-4, Llama, Kimi K2.6). El implementador no configura el LLM directamente — Senda lo orquesta.

---

<h2 id="mission-control">Mission Control</h2>
**Qué es:** El panel centralizado de Senda donde se gestiona toda la actividad autónoma: acciones programadas, observadores de eventos, historial de ejecuciones y dashboard de ROI.  
**Analogía:** La sala de control de una estación espacial. Desde ahí se monitorea y controla todo lo que ocurre en el sistema sin tener que ir "al espacio" a verificar nada.  
**En Senda:** Mission Control es donde Senda trabaja sin que nadie escriba nada: schedules, observers, webhooks y el cálculo de ROI de cada automatización.

---

<h2 id="multi-tenancy">Multi-Tenancy (Aislamiento por Tenant)</h2>
**Qué es:** La arquitectura de software donde múltiples clientes comparten la misma plataforma tecnológica, pero sus datos están completamente separados e invisibles entre sí.  
**Analogía:** Un edificio de oficinas compartido. Cada empresa tiene su piso con llave propia. El edificio es el mismo, pero nadie puede entrar al piso de otro.  
**En Senda:** Cada cliente (empresa) es un "tenant". Sus agentes, documentos, conversaciones y datos nunca se mezclan con los de otro cliente, aunque estén en el mismo servidor.

---

<h2 id="observer">Observer (Observador)</h2>
**Qué es:** Una lógica de vigilancia que monitorea eventos del sistema y ejecuta una acción automáticamente cuando se cumplen ciertas condiciones, sin intervención humana.  
**Analogía:** Un guardia de seguridad con instrucciones precisas: "si el detector de humo suena 3 veces seguidas, llama a los bomberos".  
**En Senda:** "Si la acción de procesamiento de pagos falla 3 veces consecutivas, enviar alerta al canal de Slack #emergencias y crear un ticket de incidente P1 en Jira."

---

<h2 id="output-key">Output Key</h2>
**Qué es:** El nombre de variable que se le asigna al resultado de un paso dentro de un Pipeline, para poder referenciar esos datos en los pasos siguientes.  
**Analogía:** Etiquetar una caja en una mudanza: "CAJA 1 - COCINA". El paso siguiente sabe exactamente de dónde vienen las cosas.  
**En Senda:** Si el Paso 1 busca un cliente con Output Key `cliente`, el Paso 2 puede usar `{{cliente.id}}`, `{{cliente.nombre}}`, etc.

---

<h2 id="payload">Payload (Carga Útil)</h2>
**Qué es:** El contenido real de datos que se envía dentro de una solicitud a una API. Es la "carga" en oposición a los metadatos del transporte.  
**Analogía:** Si la API es el camión de reparto y los headers son el sobre de instrucciones de entrega, el payload es la mercadería adentro del camión.  
**En Senda:** El payload de crear un ticket en Jira incluye el título, descripción, prioridad y asignado. Sin payload correcto, el sistema externo no puede hacer nada.

---

<h2 id="pipeline">Pipeline</h2>
**Qué es:** Una acción compuesta que ejecuta varias acciones del catálogo en secuencia, donde el resultado de cada paso puede alimentar al siguiente.  
**Analogía:** Una línea de montaje fabril. La materia prima entra en el Paso 1, se transforma, pasa al Paso 2 con los datos nuevos, y así sucesivamente hasta el producto final.  
**En Senda:** Buscar cliente en CRM → Calcular descuento → Generar PDF → Enviar por email. El usuario ve solo el resultado final; el pipeline corre completo en segundos.

---

<h2 id="produccion">Producción (Entorno de Producción)</h2>
**Qué es:** El entorno real donde trabajan los usuarios finales del sistema. Opuesto al entorno de desarrollo o pruebas.  
**Analogía:** La sala de operaciones de un hospital vs. el laboratorio de práctica. En el laboratorio podés cometer errores; en quirófano, no.  
**En Senda:** Los errores en producción afectan a usuarios reales. Por eso existe el Playbook de 5 Fases: nunca se va a producción directo desde configuración.

---

<h2 id="prompt">Prompt (System Prompt)</h2>
**Qué es:** El conjunto de instrucciones que definen la personalidad, el comportamiento, las reglas y los límites de un agente de IA. Es el "manual de empleo" del agente.  
**Analogía:** El contrato de trabajo y el manual de procedimientos de un empleado, combinados. Define qué hace, cómo lo hace y qué no puede hacer.  
**En Senda:** Un agente sin System Prompt es una IA genérica que puede decir cualquier cosa. Con un buen System Prompt, es un especialista predecible y confiable.

---

<h2 id="rag">RAG (Retrieval-Augmented Generation)</h2>
**Qué es:** Una técnica de IA que combina búsqueda en documentos con generación de texto. Antes de responder, el sistema busca información relevante en los documentos cargados y la usa como base.  
**Analogía:** Un abogado que antes de dar su opinión consulta la jurisprudencia existente. No inventa; argumenta basado en fuentes reales.  
**En Senda:** Es lo que hace que el agente responda "según el Manual de Procedimientos, el proceso es..." en lugar de inventar. La calidad del RAG depende 100% de la calidad de los documentos cargados.  
*Ver también: [Base de Conocimiento](#base-de-conocimiento)*

---

<h2 id="render-type">Render Type</h2>
**Qué es:** La configuración que le indica a Senda cómo mostrar visualmente el resultado de una acción: como gráfico de barras, tarjetas de KPI, gráfico de líneas, o HTML personalizado.  
**Analogía:** El tipo de presentación de un informe: oral, diapositivas, tabla de Excel o infografía. El contenido puede ser el mismo, pero el impacto visual cambia completamente.  
**En Senda:** Una acción que retorna datos de ventas con Render Type `BarChartWidget` muestra un gráfico; sin configurarlo, muestra texto plano.

---

<h2 id="rollback">Rollback (Reversión)</h2>
**Qué es:** El proceso de deshacer una acción ejecutada, mediante la ejecución de su acción inversa configurada.  
**Analogía:** El botón "Deshacer" (Ctrl+Z) de Word, pero para operaciones en sistemas externos. Solo funciona si el sistema externo soporta la operación inversa.  
**En Senda:** Si un observer envió automáticamente un email masivo con datos incorrectos, podés hacer rollback desde el Historial de Mission Control (dentro de la ventana de tiempo configurada).

---

<h2 id="roi">ROI (Return on Investment — Retorno de Inversión)</h2>
**Qué es:** La medida del valor económico que genera una inversión en relación a su costo. En Senda, cada automatización puede tener un valor asignado por ejecución.  
**Analogía:** Si gastás $1.000 en una máquina que te ahorra $3.000 de mano de obra, el ROI es 200%.  
**En Senda:** El Dashboard de ROI de Mission Control acumula el valor de cada ejecución automática y lo presenta en formato exportable para el CFO del cliente.

---

<h2 id="ssp">SSP (Standard Presentation Protocol)</h2>
**Qué es:** El estándar arquitectónico de Senda que separa completamente la lógica de negocio de la presentación visual. Los agentes no envían componentes de interfaz, envían intenciones visuales agnósticas al canal.  
**Analogía:** El guion de una obra de teatro. El autor no construye el escenario, solo escribe qué debe pasar. Luego, un teatro gigante o uno pequeño lo adaptan a su espacio.  
**En Senda:** Cuando un agente responde con gráficos, envía un `presentation_type` y un `dataset`. La interfaz Web lo dibuja como un componente de React interactivo, mientras que WhatsApp podría transformarlo en un resumen de texto o una imagen estática.

---

<h2 id="schedule">Schedule (Acción Programada)</h2>
**Qué es:** Una configuración que hace que una acción del catálogo se ejecute automáticamente en un horario definido, sin intervención humana.  
**Analogía:** El programador automático de la cafetera: a las 7:30am, el café ya está listo aunque nadie haya hecho nada.  
**En Senda:** "Todos los lunes a las 9am, ejecutar la acción 'Generar Reporte de KPIs' y enviarlo por email a la gerencia."

---

<h2 id="sse">SSE (Server-Sent Events)</h2>
**Qué es:** Una tecnología web que mantiene una conexión abierta entre el servidor y el navegador, permitiendo que el servidor envíe datos en tiempo real sin que el usuario recargue la página.  
**Analogía:** Una transmisión de radio en vivo. La señal fluye continuamente desde la radio (servidor) hacia tu aparato (navegador) sin que vos tengas que "pedir" cada parte de la música.  
**En Senda:** Es lo que hace posible que veas al agente escribiendo palabra por palabra (streaming), y que los gráficos de Generative UI aparezcan progresivamente en el chat.

---

<h2 id="streaming">Streaming de Respuesta</h2>
**Qué es:** La técnica por la que la respuesta del agente aparece en el chat de forma progresiva, palabra por palabra, en lugar de aparecer toda junta al final del procesamiento.  
**Analogía:** Leer un mensaje a medida que se escribe, en lugar de esperar a que el remitente lo termine y lo envíe.  
**En Senda:** El streaming mejora la percepción de velocidad del sistema. Los usuarios perciben el agente como más rápido y "vivo" aunque el tiempo total de respuesta sea el mismo.

---

<h2 id="system-prompt">System Prompt</h2>
*Ver: [Prompt](#prompt)*

---

<h2 id="tenant">Tenant</h2>
**Qué es:** Un cliente o empresa dentro de la plataforma Senda. Cada tenant tiene su propio espacio de datos, agentes, configuraciones y usuarios completamente aislados de los demás.  
**Analogía:** Un inquilino en un edificio de departamentos. Comparte el edificio (la infraestructura) con otros inquilinos, pero su departamento (sus datos) es completamente privado.  
**En Senda:** Mooving es el operador del edificio; cada cliente que implementa Senda es un tenant con su propio piso.

---

<h2 id="threshold">Threshold (Umbral de Activación)</h2>
**Qué es:** Un valor numérico (0-100) que define cuán seguro debe estar el LLM de que el usuario quiere ejecutar una acción antes de que la dispare automáticamente.  
**Analogía:** El nivel de evidencia que necesita un juez para dictar sentencia. A mayor gravedad del veredicto, más evidencia se requiere.  
**En Senda:** Una acción de consulta de inventario puede tener threshold 70 (se activa con pedidos moderadamente claros). Una acción que emite pagos debe tener threshold 95 (solo con pedidos absolutamente explícitos).

---

<h2 id="webhook">Webhook</h2>
**Qué es:** Una notificación automática que envía un sistema externo a Senda en el momento en que ocurre un evento específico, sin que Senda tenga que preguntar.  
**Analogía:** El timbre de la puerta. No vas a mirar cada 5 minutos si alguien llegó — esperás que el timbre te avise cuando alguien llega.  
**En Senda:** Shopify puede "tocar el timbre" (enviar un webhook) a Senda cada vez que entra un pedido nuevo, y Senda reacciona automáticamente registrando el pedido y notificando al almacén.

---

<h2 id="widget">Widget de Generative UI</h2>
**Qué es:** Un componente visual específico que Senda puede renderizar en el chat como respuesta a una acción: gráficos de barras, tarjetas de KPI, gráficos circulares, líneas temporales, o HTML personalizado.  
**Analogía:** Las diferentes formas de presentar información: un panel de control de avión tiene distintos instrumentos (altímetro, velocímetro, brújula) cada uno optimizado para su tipo de información.  
**En Senda:** Los 15+ widgets disponibles incluyen: KpiCards, BarChart, LineChart, AreaChart, DonutChart, DataTable, IntentGraph, QrCode, Timeline, Board, Stepper, NetworkTree, CalendarSchedule, ComparisonMatrix, ThirdPartyWidget y HtmlWidget.

---

<h2 id="acl">ACL (Access Control List)</h2>
**Qué es:** Una lista explícita que define exactamente qué usuarios, roles o equipos tienen acceso a un recurso específico, y con qué nivel de permiso.  
**Analogía:** La lista de invitados de un evento. Podés tener cuenta en el sistema, pero si no estás en la lista del espacio, no accedés.  
**En Senda:** Cada espacio tiene su propia ACL. Se pueden agregar entradas por usuario individual, por rol o por equipo, con nivel `read` (solo chatear) o `admin` (chatear y configurar).

---

<h2 id="auditoria">Log de Auditoría</h2>
**Qué es:** Un registro inmutable y cronológico de todas las acciones administrativas realizadas en el sistema: quién hizo qué, sobre qué recurso y cuándo.  
**Analogía:** La caja negra de un avión. Registra todo de forma continua, es inalterable, y se consulta cuando hay que investigar.  
**En Senda:** Captura eventos como "cambió el System Prompt", "agregó usuario al equipo" o "revocó acceso al espacio". Solo el Oficial de Seguridad (`r_security_officer`) puede consultarlo.

---

<h2 id="equipos">Equipos (User Groups)</h2>
**Qué es:** Agrupaciones de usuarios que permiten gestionar el acceso a espacios de forma colectiva. Al dar acceso a un equipo, todos sus miembros heredan ese acceso automáticamente.  
**Analogía:** Los departamentos de una empresa. En lugar de darle a cada empleado una llave individual, se le da al departamento y todos la tienen.  
**En Senda:** El equipo "Logística" tiene acceso al espacio "Operaciones". Cuando entra una persona nueva, se la agrega al equipo y automáticamente tiene acceso.

---

<h2 id="iam">IAM (Identity and Access Management)</h2>
**Qué es:** El sistema que gestiona las identidades (quién sos) y los permisos (qué podés hacer) dentro de una plataforma.  
**Analogía:** El departamento de seguridad corporativa: emite tarjetas de acceso, define qué puertas abre cada tarjeta, y las revoca cuando alguien se va.  
**En Senda:** El IAM de v5.0 cubre Roles (RBAC), Equipos, ACL de Espacios, Log de Auditoría, y la base técnica para SSO y SCIM.

---

<h2 id="rbac">RBAC (Role-Based Access Control)</h2>
**Qué es:** Un modelo donde los permisos no se asignan a personas sino a roles. Las personas heredan los permisos del rol asignado.  
**Analogía:** En un banco, el "Cajero" puede ver saldos pero no aprobar préstamos. El "Gerente" puede aprobar préstamos. Los permisos son del rol, no de la persona.  
**En Senda:** Los 5 roles del sistema tienen permisos predefinidos. Se asigna el rol y los permisos vienen incluidos: `r_tenant_owner`, `r_admin`, `r_security_officer`, `r_user`, `r_superadmin`.

---

<h2 id="scim">SCIM 2.0</h2>
**Qué es:** Protocolo estándar que permite que directorios corporativos (Azure AD, Okta) gestionen automáticamente usuarios y grupos en aplicaciones como Senda.  
**Analogía:** Un puente automático entre el sistema de RRHH y todas las apps. Cuando RRHH da de alta a un empleado, aparece en todas las apps. Cuando se va, desaparece.  
**En Senda:** Con SCIM activo, no es necesario crear usuarios manualmente. La gestión se centraliza en el directorio corporativo.

---

<h2 id="sso">SSO (Single Sign-On)</h2>
**Qué es:** Sistema que permite acceder a múltiples aplicaciones con una sola sesión de login corporativo, sin contraseña adicional por app.  
**Analogía:** La tarjeta de identificación corporativa. Un solo documento abre la entrada, el torniquete y la sala de reuniones.  
**En Senda:** Con SSO activo, el empleado entra con sus credenciales de Microsoft 365 o Google Workspace. Si IT revoca el acceso corporativo, el acceso a Senda cae automáticamente.

---

<h2 id="visibilidad">Visibilidad del Espacio</h2>
**Qué es:** Configuración que define el comportamiento de acceso de un espacio. Tres modos: **Interno** (solo usuarios del tenant), **Privado** (solo quienes tienen ACL explícita), **Público** (accesible sin login via token de URL).  
**Analogía:** Las persianas de una oficina. Interna = semiabierta (la gente adentro lo ve). Privada = cerrada (solo con llave). Pública = vitrina (cualquiera desde afuera puede ver).  
**En Senda:** Espacios "Públicos" para atención al cliente externo. Espacios "Privados" para el directorio o área legal. La mayoría son "Internos" con ACL por equipo.

---

<h2 id="space-tools">Space Tools (Herramientas del Espacio)</h2>
**Qué es:** Botones y chips de acceso rápido que aparecen persistentemente en la interfaz de un espacio, permitiendo a los usuarios ejecutar acciones o lanzar consultas frecuentes con un solo clic — sin escribir.  
**Analogía:** Los accesos directos del escritorio de tu computadora. Las aplicaciones ya están instaladas, pero tener íconos visibles en el escritorio acelera el acceso.  
**En Senda:** Un espacio de "Soporte IT" puede tener un botón ⚡ "Crear Ticket" (ejecuta directamente) y un chip 💡 "Mis tickets pendientes" (envía la pregunta al agente). Máximo 10 tools por espacio.  
*Ver también: [Intent Graph](#intent-graph), [Catálogo de Acciones](#catálogo-de-acciones)*

---

<h2 id="senda-bridge">Senda Bridge SDK</h2>
**Qué es:** Un SDK interno disponible dentro de las acciones de tipo Script que permite interactuar programáticamente con toda la plataforma: ejecutar otras acciones, llamar al LLM, almacenar estado, agendar ejecuciones futuras y suscribirse a eventos.  
**Analogía:** Un control remoto universal que desde un script puede operar cualquier parte de la casa (luces, TV, calefacción, alarma) sin levantarse del sillón.  
**En Senda:** Con `senda.callAction()` un script puede orquestar múltiples acciones, con `senda.askAI()` puede enriquecer datos con IA, y con `senda.schedule()` puede programar tareas futuras. Documentado en el Manual Técnico, Cap. 09.

---

<h2 id="intent-graph-v2">Intent Graph v2 (Grafos Encadenados)</h2>
**Qué es:** La segunda versión del Intent Graph que permite que el resultado de una acción devuelva un nuevo grafo de intenciones, creando flujos multi-paso encadenados que se resuelven sin que el LLM intervenga en cada paso.  
**Analogía:** Un wizard de instalación de software: cada pantalla lleva a la siguiente según las opciones que elegiste, sin que vuelvas al menú principal.  
**En Senda:** Un usuario elige "Solicitar Vacaciones" → Form Node recolecta fechas → La acción responde con nuevo Intent Graph → "¿Notificar al líder?" → [Sí] [No]. Todo en el chat, sin round-trips al LLM.  
*Ver también: [Intent Graph](#intent-graph), [Form Node](#form-node)*

---

<h2 id="inline-app">Inline App (Aplicación Embebida)</h2>
**Qué es:** Una mini-aplicación web de terceros que se renderiza dentro del chat de Senda como un iframe seguro, comunicándose con la plataforma a través del protocolo `postMessage`.  
**Analogía:** Una ventana dentro de una ventana. Podés usar Google Maps embebido dentro de otra app sin salir de ella.  
**En Senda:** Un widget de firma digital, un formulario externo de un CRM, o un mapa interactivo pueden aparecer inline en la conversación, adaptándose al tema visual del espacio.

---

<h2 id="directiva-de-respuesta">Directiva de Respuesta (Response Directive)</h2>
**Qué es:** Instrucciones que definen cómo el agente debe transformar el resultado técnico de una acción en una respuesta comprensible para el usuario final. Se aplica DESPUÉS de ejecutar la acción.  
**Analogía:** Un intérprete que traduce los resultados de un examen médico a lenguaje que el paciente pueda entender.  
**En Senda:** Si Jira devuelve `{"key":"INC-2847","status":"In Progress","assignee":"ana@empresa.com"}`, la Directiva de Respuesta puede convertirlo en "✅ Tu ticket INC-2847 está en progreso, asignado a Ana."

---

<h2 id="context-conditions">Context Conditions (Condiciones de Contexto)</h2>
**Qué es:** Reglas almacenadas en Space Tools que permiten condicionar la visibilidad o disponibilidad de un tool basándose en el contexto del usuario (rol, horario, estado de una variable).  
**Analogía:** Las puertas de acceso que se abren solo con ciertas tarjetas: el botón de "Aprobar Pago" solo aparece si sos gerente.  
**En Senda:** Campo `context_conditions` de la tabla `space_tools` (actualmente almacenado pero no evaluado — funcionalidad en desarrollo).

---

<h2 id="chatless-ui">Chatless UI</h2>
**Qué es:** Una funcionalidad que permite a Senda mostrar widgets proactivos (KPIs, tareas pendientes, alertas, acciones sugeridas) sin que el usuario escriba nada en el chat. El sistema evalúa el contexto (hora, rol, historial) y presenta la información relevante automáticamente.  
**Analogía:** Llegar a tu escritorio y encontrar un resumen ejecutivo personalizado esperándote, preparado por un asistente que sabe exactamente qué necesitás hoy.  
**En Senda:** Disponible como funcionalidad BETA. 5 tipos de triggers: hora del día, primer acceso, evento externo, cron programado y condición de datos.  
*Ver también: [Widget de Generative UI](#widget)*

---

<h2 id="marketplace">Marketplace de Skills (Skill Packs)</h2>
**Qué es:** Una tienda de paquetes de capacidades pre-armados que incluyen agentes, acciones, prompts, documentación y configuraciones listos para instalar. Permite implementar casos de uso frecuentes en minutos.  
**Analogía:** La App Store de tu celular, pero para capacidades de IA empresarial. Buscás, instalás y funciona.  
**En Senda:** Los Skill Packs oficiales cubren casos como Mesa de Ayuda IT, Onboarding de RRHH, y Soporte al Cliente. Los implementadores también pueden publicar sus propios packs.

---

<h2 id="pipeline-canvas">Pipeline Canvas</h2>
**Qué es:** Un editor visual drag-and-drop que permite diseñar flujos de proceso arrastrando nodos (Trigger, Action, Condition, Output) sobre un canvas interactivo. A diferencia del Pipeline textual, el Canvas permite visualizar el flujo completo y editarlo como un diagrama.  
**Analogía:** Visio o Lucidchart, pero lo que dibujás se ejecuta automáticamente.  
**En Senda:** Disponible como funcionalidad BETA. Los flujos diseñados en el Canvas se validan con el algoritmo de Kahn (verificación de grafos acíclicos) y se ejecutan con un deadline de 30 segundos por paso.  
*Ver también: [Pipeline](#pipeline), [Flujo](#flujo)*

---

<h2 id="senda-studio">Senda Studio</h2>
**Qué es:** Una funcionalidad que permite crear agentes, acciones y configuraciones completas describiendo lo que se necesita en lenguaje natural. Senda interpreta la descripción, clasifica el tipo de solución y genera automáticamente todos los componentes necesarios.  
**Analogía:** Un arquitecto que traduce tus deseos ("quiero una casa con 3 habitaciones y jardín") en planos técnicos ejecutables.  
**En Senda:** Disponible como funcionalidad BETA. El proceso sigue 4 fases: clasificar intención → generar spec → refinar con el usuario → confirmar y crear.

---

> 📖 Este glosario se actualiza con cada nueva versión de la plataforma.  
> **Versión del glosario:** v5.20.13 — Mayo 2026
