# Acciones: Conectar Senda con tus Sistemas

> **Versión documentada:** v5.20.13 · **Última revisión:** 2026-05-29

Hasta ahora, aprendiste a crear agentes, escribir prompts y cargar documentos. Con eso, Senda responde preguntas. Pero la verdadera transformación ocurre cuando Senda deja de **hablar** sobre tus sistemas y empieza a **operar** sobre ellos: crear tickets, enviar reportes, calcular cotizaciones, actualizar registros. Todo eso lo hacen las **Acciones**.

Este capítulo está escrito para el analista de negocio que no programa. Vas a aprender qué son las acciones, cuáles podés crear vos mismo y cuáles requieren apoyo técnico.

---

## ¿Qué es una Acción?

Una acción es un **botón que el agente puede apretar** por vos. Cuando un usuario le escribe "quiero crear un ticket" o "mandame el reporte de ventas del mes", el agente no solo responde con texto: ejecuta la acción correspondiente y actúa en el sistema real.

Pensá en el catálogo de acciones como el **panel de herramientas de un asistente**. Vos configurás las herramientas disponibles; el agente elige cuál usar según lo que el usuario necesita.

El catálogo se encuentra en **Configuración → Acciones**.

### Los 5 Tipos de Acción

| Tipo | Para qué sirve | ¿Lo configurás vos solo? |
|---|---|---|
| **Formulario** | Recopilar datos del usuario en un formulario del chat | ✅ Sí, sin ayuda técnica |
| **Conectar sistema** (HTTP) | Conectarse a Jira, SAP, Slack, tu CRM, etc. | ⚠️ Con la URL que te da el equipo técnico |
| **Fórmula** | Calcular algo: cotizaciones, cuotas, costos de envío | ✅ Sí, con interfaz visual |
| **Pipeline** | Encadenar varias acciones en secuencia | ⚠️ Requiere planificación técnica |
| **Script** | Lógica de programación avanzada | ❌ Solo equipo técnico |

> Para el 80% de los casos de negocio habituales, vas a usar los tipos **Formulario** y **Conectar sistema**. Las Fórmulas las podés sumar a medida que te sentís cómodo. Los Pipelines y Scripts los delegás al equipo técnico.

---

## Tu Primera Acción: El Formulario

El formulario es el tipo de acción más accesible y, muchas veces, el más valioso. En lugar de que el agente le haga preguntas una por una al usuario (un turno de conversación por cada dato), le presenta **un formulario completo en el chat** que el usuario completa y envía en un solo paso.

**Sin formulario** — el usuario tiene que responder 5 preguntas seguidas. Se cansa.
**Con formulario** — el usuario ve todos los campos de una vez, los completa y listo.

### Ejemplo: "Registro de Consulta Comercial"

Imaginá que querés que el agente registre cada vez que un cliente potencial pide información sobre un producto. En lugar de que el agente improvise las preguntas, configurás un formulario que siempre recopila los mismos campos.

**Paso 1 — Crear la acción**

Ir a **Configuración → Acciones → + Nueva Acción**.

Completar los campos de identidad:

| Campo | Qué escribir en el ejemplo |
|---|---|
| **Nombre** | `Registrar Consulta Comercial` |
| **Descripción** | `Registrar los datos de un cliente potencial que pide información sobre productos. Usar cuando el usuario quiere que lo contacten, pide más info o quiere hablar con ventas.` |
| **Carpeta** | `Ventas` |

> La **descripción** es el campo más importante de toda la acción. El agente la lee para decidir cuándo usar esta herramienta. Escribila en lenguaje natural, como si le explicaras a un colega cuándo debe usar este formulario.

**Paso 2 — Elegir el motor: Formulario**

En la sección Motor, seleccionás **Formulario**. Aparece un constructor visual donde agregás los campos.

**Paso 3 — Definir los campos**

Para el ejemplo de consulta comercial:

| Campo | Tipo | ¿Obligatorio? |
|---|---|---|
| Nombre completo | Texto corto | ✅ Sí |
| Email de contacto | Texto corto | ✅ Sí |
| Empresa | Texto corto | No |
| Producto de interés | Lista desplegable (Producto A / Producto B / Producto C / Otro) | ✅ Sí |
| Mensaje adicional | Texto largo | No |

**Tipos de campo disponibles:**

| Tipo | Para qué sirve |
|---|---|
| Texto corto | Nombre, email, código |
| Texto largo | Descripciones, comentarios |
| Número | Cantidades, montos |
| Lista desplegable | Elegir una opción de una lista |
| Botones de selección | Opciones visuales clicables (ej: Urgente / Normal / Baja) |
| Casilla de verificación | Sí / No |
| Selector de usuario | Buscar y elegir un usuario de tu organización |
| Fecha | Calendario |
| Fecha y hora | Fecha + hora exacta |

**Paso 4 — Configurar el comportamiento**

Después de definir los campos, configurás cómo se comporta la acción:

- **Umbral de certeza (Threshold):** Cuánta certeza necesita el agente de que el usuario quiere este formulario para mostrarlo. Ver tabla en la próxima sección.
- **Confirmación humana:** El agente muestra un resumen antes de guardar los datos y pregunta "¿Confirmo?". Para un formulario de registro, podés dejarlo en **No** (los datos se guardan directamente).
- **Directiva:** Instrucciones específicas para el agente. Para este ejemplo: *"Cuando el usuario mencione que quiere información de un producto, que lo contacten o que hablar con ventas, mostrar el formulario de registro. Nunca preguntar los campos uno por uno."*

**Paso 5 — Activar y vincular al agente**

Una vez guardada la acción, vas al agente correspondiente y la agregás en su sección de acciones. Desde ese momento, el agente puede usar el formulario.

---

## Conectar con un Sistema Externo

Cuando el objetivo no es solo recopilar datos sino **hacer algo en otro sistema** (crear un ticket, enviar un email, actualizar un registro en tu CRM), usás el tipo de acción **Conectar sistema**.

### La Analogía del Teléfono

Pensá en esta acción como pedirle a Senda que llame por teléfono a otro sistema. Senda marca el número (la dirección del sistema), se presenta (autenticación), y le da un mensaje con los datos (el formulario que completó el usuario). El otro sistema responde, y Senda te trae la respuesta.

No necesitás saber programar para configurar esto. Lo que sí necesitás:
1. La **dirección del sistema** (te la da el equipo técnico o el proveedor del sistema)
2. El **tipo de operación** (crear, consultar, modificar)
3. Las **credenciales de acceso** (la contraseña para que Senda pueda entrar — la gestiona el equipo técnico)

### ¿Qué podés hacer vos solo vs. qué necesita el equipo técnico?

| Tarea | ¿Quién lo hace? |
|---|---|
| Definir el nombre, descripción y carpeta de la acción | ✅ Vos |
| Decidir qué datos recopila el formulario | ✅ Vos |
| Configurar el umbral y la confirmación humana | ✅ Vos |
| Escribir la directiva del agente | ✅ Vos |
| Conseguir la dirección del sistema externo | ⚠️ El proveedor o el equipo técnico |
| Registrar las credenciales de acceso en la Bóveda | ⚠️ El equipo técnico (por seguridad) |
| Configurar el formato exacto del mensaje que se envía al sistema | ⚠️ El equipo técnico la primera vez |
| Probar que la conexión funciona | ✅ Vos (con el botón Probar) |

### Las Credenciales: La Llave del Sistema

Para conectarse a un sistema externo, Senda necesita una contraseña o token de acceso. Esas claves se guardan en la **Bóveda de Credenciales** — un lugar seguro dentro de Senda donde nunca se ven en texto plano.

**Regla importante:** Nunca escribas una contraseña directamente en la configuración de una acción. Siempre se registra en la Bóveda y Senda la usa automáticamente cuando ejecuta la acción.

El equipo técnico registra las credenciales. Vos solo necesitás saber que existen y que el agente las usa de forma segura.

### El Umbral (Threshold): Cuándo Actúa el Agente

El umbral define cuánta certeza necesita el agente de que el usuario quiere ejecutar la acción. Si el usuario es muy explícito ("quiero crear un ticket") el agente actúa. Si solo pregunta ("¿cómo hago para crear un ticket?") el agente explica, pero no ejecuta.

| Tipo de acción | Umbral recomendado | Razonamiento |
|---|---|---|
| Consultas (ver datos, generar reportes) | 65–70 | Bajo riesgo, mejor ejecutar ante la duda |
| Acciones estándar (crear ticket, enviar notificación) | 78–82 | Balance entre utilidad y seguridad |
| Modificar datos existentes (actualizar un cliente en el CRM) | 85–90 | Alto riesgo, ser conservador |
| Acciones críticas (emitir pagos, cancelar órdenes) | 92–95 | Máxima seguridad, solo ante pedido explícito |

**Error clásico:** Poner un umbral de 60 en todas las acciones "para que funcione mejor". Resultado: el agente ejecuta acciones críticas ante la menor insinuación.

### Confirmación Humana: El Paso de Revisión

Cuando la confirmación humana está activa, el agente no ejecuta la acción directamente. Primero muestra al usuario un resumen de lo que va a hacer y pregunta "¿Confirmo?". Solo si el usuario dice que sí, se ejecuta.

**Cuándo activarla:**
- ✅ Siempre que la acción cree, modifique o elimine datos en un sistema externo
- ✅ Siempre que la acción envíe comunicaciones (emails, notificaciones)
- ❌ No es necesaria si la acción solo consulta datos (leer el estado de un ticket, ver un reporte)

### Directiva de Respuesta: Cómo Explicar el Resultado

La directiva de respuesta le dice al agente cómo convertir la salida técnica de una acción en una respuesta útil. Es especialmente importante cuando una acción devuelve JSON, códigos internos, URLs técnicas o muchos campos.

Ejemplo funcional:

```
Cuando la acción cree un ticket:
- Confirmá el número de ticket si viene en el campo `key`.
- Mencioná prioridad y equipo asignado si están disponibles.
- No muestres el JSON completo.
- Si el sistema devuelve un error, explicalo en lenguaje simple y sugerí el próximo paso.
```

Usá esta directiva para evitar dos errores comunes: que el agente copie un payload técnico que el usuario no entiende, o que omita datos importantes que sí venían en la respuesta.

### Probar Antes de Activar

Antes de activar cualquier acción en producción, usá el botón **🧪 Probar** en la pantalla de la acción. Esto ejecuta la acción con los parámetros que vos definas y te muestra si funcionó correctamente. Si algo está mal, podés corregirlo antes de que ningún usuario lo use.

---

## Las Fórmulas: Calcular Sin Programar

Si necesitás que el agente realice cálculos (cotizaciones, cuotas de préstamos, costos de envío, descuentos por categoría de cliente), el tipo **Fórmula** te permite configurarlo visualmente sin escribir una sola línea de código.

Definís las variables de entrada (los datos que ingresa el usuario), las fórmulas de cálculo y Senda te muestra en tiempo real el resultado con valores de ejemplo.

**Ejemplos de lo que podés calcular:**
- Precio final con IVA y descuento comercial
- Cuota mensual de un préstamo según monto, plazo y tasa
- Costo de envío según peso y distancia
- Bonificación por volumen de compra

Las fórmulas usan operaciones matemáticas estándar (+, −, ×, ÷, porcentajes, promedios, máximos y mínimos). No necesitás saber programar para usarlas.

---

## Tarjetas Visuales y UI Generativa

Cuando un agente responde, a veces el texto no es el mejor formato para mostrar la información. Senda cuenta con el motor de **UI Generativa (Generative UI)**, que permite al agente construir y mostrar tarjetas interactivas directamente en el chat en tiempo real. 

Además de los gráficos tradicionales (barras, líneas, áreas y donas) y las tarjetas de KPIs, cuentas con las siguientes herramientas visuales:

*   📅 **Líneas de Tiempo (`timeline_milestones`)**: Muestran acontecimientos, estados o logs históricos de forma secuencial. Ideal para rastrear el envío de un paquete, ver el historial de auditoría de un ticket o el progreso de una solicitud de crédito.
*   🗂️ **Tableros de Tarjetas (`board_cards`)**: Permiten visualizar y organizar tareas, leads comerciales o tickets de soporte en columnas de estados estilo Kanban.
*   🚦 **Secuencia de Pasos (`stepper_flow`)**: Una guía interactiva paso a paso para que el usuario conozca el progreso de solicitudes multi-etapa, formularios complejos o procesos de alta.
*   🌳 **Organigramas y Árboles (`network_tree`)**: Visualizaciones jerárquicas colapsables para explorar organigramas de equipos, dependencias de sistemas o categorías complejas de productos.
*   📅 **Agenda de Turnos (`calendar_schedule`)**: Muestra los días de disponibilidad y horarios libres de tu equipo para que el usuario pueda reservar llamadas, soporte o reuniones haciendo clic en un horario libre directamente desde el chat.
*   📊 **Tabla Comparativa (`comparison_matrix`)**: Compara de forma clara las características y precios de productos o planes, permitiendo al agente resaltar la opción recomendada.

---

## Automatizaciones: Senda Trabaja Sin que lo Llamen

Hasta aquí, todas las acciones son **reactivas**: el usuario escribe algo y el agente actúa. Las automatizaciones agregan una dimensión completamente diferente: **Senda actúa solo**, sin que nadie escriba nada.

La diferencia es simple:

| Modo | ¿Cuándo actúa? | ¿Quién lo inicia? | Ejemplo |
|---|---|---|---|
| **Reactivo** | Cuando el usuario escribe | El usuario | "Creame un ticket urgente" |
| **Automatización programada** | En un horario definido | El reloj del sistema | Reporte de ventas todos los lunes a las 9am |
| **Automatización por evento** | Cuando algo ocurre | Un evento del sistema | Si una acción falla 3 veces seguidas, avisar al equipo |

Las automatizaciones se configuran en **Inteligencia & Datos → Mission Control**.

### Automatizaciones Programadas: El Reloj

Una automatización programada ejecuta una acción del catálogo en un horario definido: todos los días, todos los lunes, el primer día de cada mes.

**Casos de uso típicos:**
- 📊 Reporte semanal de KPIs enviado automáticamente a gerencia cada lunes a las 9am
- 📦 Verificación diaria de stock crítico y alerta si hay productos bajo mínimo
- 📧 Resumen de conversaciones del día enviado al equipo cada viernes a las 17hs
- 📅 Recordatorio mensual de renovaciones de contratos 30 días antes del vencimiento

#### Cómo Crear una Automatización Programada

**Ejemplo: "Reporte de Incidentes Abiertos"**

Supongamos que tenés una acción en el catálogo llamada "Generar Reporte de Incidentes" que consulta tu sistema de tickets y envía un resumen por email.

**Paso 1:** En Mission Control, ir a la tab **📅 Programadas** → **+ Nueva automatización programada**.

**Paso 2:** Elegir la acción del catálogo que se va a ejecutar automáticamente:
→ `Generar Reporte de Incidentes Abiertos`

**Paso 3:** Configurar el horario:

| Opción | Tu elección para el ejemplo |
|---|---|
| Frecuencia | Semanal |
| Días | Lunes |
| Hora | 08:00 |
| Zona horaria | America/Buenos_Aires |

**Paso 4:** Nombrar la automatización y guardar:
→ Nombre: `Reporte Semanal — Incidentes Abiertos`
→ Estado: Guardar como borrador (primero probar)

**Paso 5:** Probar antes de activar.
→ Hacer click en **🧪 Probar**. Senda ejecuta la acción ahora mismo con los parámetros configurados y te muestra si funcionó.
→ Si el resultado es correcto, activar la automatización.

### Automatizaciones por Evento: El Vigilante

Un observador de eventos espera que algo ocurra y reacciona automáticamente. La lógica es siempre: **"Si pasa X y se cumple Y → ejecutar Z"**.

**Ejemplos:**
- Si una acción falla 3 veces seguidas → avisar al equipo por Slack
- Si se registra un usuario nuevo → enviar email de bienvenida automáticamente
- Si una acción de pagos falla con un error crítico → crear ticket de incidente en Jira

Este tipo de automatización es especialmente útil para vigilancia y alertas en tiempo real. Los detalles técnicos de las condiciones los configura el equipo técnico; vos definís qué evento quería vigilar y qué acción debe ejecutarse.

### Mission Control: El Panel de Control

El panel de Mission Control te muestra en tiempo real todo lo que está pasando con tus automatizaciones:

- **Cuántas automatizaciones están activas** (programadas y observadores)
- **Cuántas ejecuciones hubo hoy** y cuál es la tasa de éxito
- **El valor económico generado** por las automatizaciones (más sobre esto abajo)
- **El historial completo** de cada ejecución: cuándo ocurrió, si fue exitosa, qué respondió el sistema

Si una automatización falla, lo ves en el historial con el detalle del error. Podés reintentar la ejecución o pausar la automatización mientras investigás el problema.

#### ¿La automatización está funcionando?

Para verificar que una automatización está corriendo como esperás:

1. Ir a **Mission Control → 🕐 Historial**
2. Filtrar por el nombre de la automatización
3. Ver la columna de estado: ✅ Éxito o ❌ Error
4. Si hay errores, hacer click en "Ver detalles" para leer el mensaje de error

#### Plantillas Listas para Usar

Mission Control incluye más de 20 plantillas de automatizaciones listas para instalar en segundos, organizadas por área:

- **Operaciones:** Monitor de salud de sistemas, limpieza nocturna de sesiones
- **Ventas:** Alerta de oportunidad sin actividad por 14 días, reporte del pipeline semanal
- **RRHH:** Bienvenida automática a nuevos usuarios, recordatorio de evaluaciones
- **IT:** Alerta cuando una acción crítica falla, notificación de usuario nuevo
- **Legal:** Recordatorio de vencimiento de contratos

Para instalar una plantilla: tab **📚 Templates** → buscar → click en "Instalar" → completar los campos personalizados (destinatario del email, canal de Slack, etc.) → listo.

---

## El ROI de las Acciones

Cada automatización tiene un valor económico real. Senda te permite registrarlo y acumularlo en el panel de Mission Control, generando un **argumento irrefutable** para las renovaciones de contrato y la justificación de la inversión.

### Cómo Calcular el Valor de una Automatización

Hay tres formas de pensar el valor:

| Tipo de valor | Cómo calcularlo | Ejemplo |
|---|---|---|
| **Tiempo recuperado** | Horas de trabajo manual evitadas × costo horario del perfil | Reporte KPIs semanal: 3h de analista a $30/h = $90 por ejecución |
| **Costo evitado** | Multas, reprocesos o errores que la automatización previene | Observer de fallo de integración: evita multas de SLA de $200 por evento |
| **Ingreso protegido** | Revenue en riesgo que la automatización detecta o recupera | Alerta de oportunidad perdida: 30% de recuperación × $5.000 promedio = $1.500 |

### Por Qué Hacerlo Desde el Día 1

Configurar el valor económico desde el primer día tiene tres beneficios:
1. **Renovaciones**: "En los últimos 6 meses, Senda generó $142.000 de valor documentado" es un argumento que ningún CFO puede ignorar.
2. **Priorización**: Sabés qué automatizaciones generan más valor y las priorizás.
3. **Demostraciones**: El panel con valores reales (anonimizados) es la mejor herramienta de venta para nuevos clientes.

Para más detalle sobre cómo construir el business case completo, ver el capítulo **ROI y Business Case**.

---

## Lo que No Podés Hacer Solo (y Está Bien)

Ser honesto sobre los límites te ahorra frustraciones y te permite pedir ayuda de forma efectiva. Estas son las tareas que requieren el equipo técnico:

| Tarea | Por qué requiere soporte técnico |
|---|---|
| Registrar credenciales en la Bóveda | Requiere acceso a contraseñas y tokens reales del sistema |
| Configurar el formato exacto del mensaje al sistema externo | Requiere conocer la documentación técnica del sistema (Jira, SAP, etc.) |
| Crear Pipelines de múltiples pasos complejos | Requiere entender el flujo de datos entre sistemas |
| Configurar integraciones OAuth2 (Google, Microsoft 365) | Requiere configuración en los portales de desarrolladores |
| Configurar el protocolo MCP para integraciones avanzadas | Solo equipo técnico |
| Escribir acciones de tipo Script | Requiere programación |

### Cómo Pedirle al Equipo Técnico lo que Necesitás

Una solicitud clara acelera el trabajo. Usá este formato cuando pidas ayuda:

---

**Template de brief técnico**

**Acción que necesito crear:** `[nombre de la acción]`

**Para qué sirve:** `[descripción funcional en lenguaje de negocio]`

**Sistema externo al que debe conectarse:** `[nombre del sistema: Jira, SAP, Salesforce, etc.]`

**Operación que necesito:** `[Crear / Consultar / Modificar / Eliminar]`

**Datos que el usuario ingresa:** `[lista de campos del formulario]`

**Qué debe mostrar el resultado al usuario:** `[ej: "el número de ticket creado", "el saldo del cliente", "confirmación de envío"]`

**Credenciales disponibles:** `[¿ya tenemos acceso al sistema? ¿quién las tiene?]`

---

Con este brief, el equipo técnico puede configurar la parte técnica en una sola sesión y vos te encargás del resto: nombre, descripción, directiva, umbral, confirmación humana.

---

## Senda Studio: Creá Acciones Describiendo Lo Que Necesitás

> 🔖 **BETA** — Disponible desde v5.11.0.

Hasta ahora vimos dos formas de crear acciones: manualmente con el wizard, o pidiendo ayuda al Copiloto IA. Senda Studio introduce una tercera vía que cambia por completo la experiencia: **describís lo que necesitás en lenguaje natural y Senda lo construye por vos**.

### ¿Qué puede crear Senda Studio?

| Tipo | ¿Qué genera? | Ejemplo |
|---|---|---|
| 🤖 **Agente** | Agente completo con nombre, resumen, System Prompt y capacidades | *"Necesito un agente de soporte que acceda a Jira y responda con la wiki interna"* |
| 🔧 **Acción** | Acción HTTP con endpoint, método, parámetros y directivas | *"Una acción que consulte el stock en SAP por código de producto"* |
| 🔄 **Pipeline** | Pipeline multi-paso con la secuencia de acciones conectadas | *"Un pipeline que busque el cliente, calcule descuento y envíe cotización"* |
| ⏰ **Automatización** | Schedule con expresión cron y acción vinculada | *"Un reporte de KPIs que se envíe todos los lunes a las 9am"* |

### ¿Cómo funciona?

1. **Describís** lo que necesitás en una o dos oraciones
2. **Senda clasifica** automáticamente qué tipo de recurso necesitás (agente, acción, pipeline o automatización)
3. **Genera una vista previa** con todos los detalles: nombre, configuración, parámetros
4. **Refinás** con instrucciones adicionales si querés ajustar algo (*"Agregá un parámetro de prioridad"*)
5. **Confirmás** y Senda crea todo en la plataforma, listo para probar

> 💡 **Analogía:** Es como dictarle instrucciones a un arquitecto. Vos describís lo que necesitás, él traduce tus palabras en planos ejecutables, te los muestra para aprobación, y después construye.

### Las tres vías de creación: ¿cuál elegir?

| Vía | Mejor para | Velocidad | Control |
|---|---|---|---|
| 📝 **Manual (Wizard)** | Cuando sabés exactamente qué querés y necesitás control total | Media | Máximo |
| 🤖 **Copiloto IA** | Cuando tenés la estructura pero querés que la IA la mejore | Rápida | Alto |
| 🎨 **Senda Studio** | Cuando querés empezar desde cero describiendo el resultado esperado | Muy rápida | Medio (con refinamiento) |

> 📝 **Recomendación:** Usá Studio para prototipar rápidamente, y después ajustá los detalles con el wizard manual.

---

## Marketplace de Skills: Capacidades Listas para Instalar

> 🔖 **BETA** — Disponible desde v5.12.0.

El **Marketplace** permite instalar **Skill Packs** — paquetes de capacidades pre-armados que incluyen agentes, acciones, prompts y documentación, listos para usar en tu espacio.

### ¿Qué es un Skill Pack?

Pensá en un Skill Pack como una app de tu celular: alguien ya hizo el trabajo de configurar todo, y vos solo lo instalás y lo adaptás a tu contexto.

Cada Skill Pack puede incluir:
- Un agente configurado con System Prompt optimizado
- Acciones pre-armadas (HTTP, fórmulas, pipelines)
- Documentación para la Base de Conocimiento
- Space Tools listos para activar

### Cómo instalar un Skill Pack

1. **Buscar** → Navegá el catálogo por categoría o buscar por nombre
2. **Revisar** → Mirá la descripción, qué incluye, las reseñas de otros implementadores, y los requisitos previos (credenciales, permisos)
3. **Instalar** → El wizard de 3 fases te guía: configurá credenciales, seleccioná qué componentes incluir, y confirmá

### Publicar tu propio Skill Pack

Si creás una solución que funciona bien, podés empaquetarla y publicarla en el Marketplace para que otros implementadores la usen. El flujo de publicación incluye: versión, descripción, capturas, y revisión por el equipo de Senda.

---

## Intent Discovery: Senda Te Dice Qué Falta

> 🔖 **BETA** — Disponible desde v5.13.0.

El **Intent Discovery Engine** analiza las conversaciones reales con tus usuarios y detecta automáticamente patrones de consultas que ningún agente puede resolver todavía.

### ¿Cómo funciona?

Senda escanea las conversaciones con baja efectividad (donde el agente no supo responder bien) y agrupa esas consultas en **intents no servidos** — temas que los usuarios preguntan pero que tu configuración actual no cubre.

### El flujo de revisión

1. **Senda escanea** → Analiza conversaciones con IA para detectar patrones
2. **Te muestra los resultados** → Lista de intents descubiertos con frecuencia, ejemplos de mensajes reales y confianza
3. **Vos decidís** → Para cada intent podés:
   - ✅ **Aceptar** → Senda sugiere crear un agente, acción o documento para cubrirlo
   - ❌ **Descartar** → No es relevante (spam, consultas fuera de alcance)

> 💡 **Ejemplo real:** Intent Discovery detecta que 47 usuarios preguntaron por *"estado de mi envío"* en las últimas 2 semanas. Te sugiere crear una acción HTTP que consulte el tracking del courier.

> 🎯 **Por qué esto importa:** Sin Intent Discovery, las brechas de conocimiento se descubren por queja. Con Intent Discovery, se descubren por dato.

---

## Checklist del Capítulo

- [ ] ¿Entiendo la diferencia entre los 5 tipos de acción (Formulario, HTTP, Fórmula, Pipeline, Script)?
- [ ] ¿Configuré al menos un formulario con campos, umbral y directiva?
- [ ] ¿El umbral de cada acción está calibrado según su nivel de riesgo?
- [ ] ¿Las acciones que crean, modifican o eliminan datos tienen confirmación humana activa?
- [ ] ¿Las credenciales están en la Bóveda (no hardcodeadas en la acción)?
- [ ] ¿Cada acción tiene una directiva de respuesta que traduce el resultado técnico a lenguaje del usuario?
- [ ] ¿Las automatizaciones tienen valor ROI configurado desde el primer día?
- [ ] ¿Probé cada acción con el botón 🧪 antes de activarla?
- [ ] ¿Conozco las tres vías de creación de acciones (Manual, Copiloto IA, Senda Studio)?
- [ ] ¿Sé cómo instalar un Skill Pack desde el Marketplace?
- [ ] ¿Entiendo cómo funciona Intent Discovery y cómo revisar los intents descubiertos?

---

> 📖 **Anterior:** [05 — La Base de Conocimiento](./04_base_de_conocimiento.md)
> 📖 **Siguiente:** [07 — Probar y Validar Agentes](./07_probar_y_validar_agentes.md)
> 📖 **Complementario:** [09 — Playbook de Implementación](./06_playbook_implementacion.md) | [11 — ROI y Business Case](./08_roi_y_business_case.md)
