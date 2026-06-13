# 03. Fórmulas, Pipelines y UI Generativa

> **Versión documentada:** v5.20.13 · **Última revisión:** 2026-05-29

> **Capítulo 3 del Manual Técnico.** Este capítulo cubre los tres motores más poderosos del catálogo: el motor de Fórmulas No-Code para cálculos matemáticos, el motor de Pipeline para encadenar acciones en secuencia, y la Generative UI para renderizar dashboards y visualizaciones dentro del chat.

---

## Motor de Fórmulas: Cálculos Sin Código

### ¿Qué es y cuándo usarlo?

El motor de **Fórmulas** permite crear acciones que realizan cálculos matemáticos o lógicos sin necesidad de programar. En lugar de conectarse a una [API](00_glosario.md#glosario-api) externa, la acción toma parámetros del usuario, aplica fórmulas definidas por vos, y devuelve los resultados.

Es ideal para:
- Calcular el precio final de un producto con impuestos, descuentos y márgenes
- Determinar la cuota mensual de un préstamo según monto, plazo y tasa de interés
- Calcular el costo logístico según peso, distancia y tipo de envío
- Convertir monedas o unidades
- Calcular penalidades o bonificaciones según reglas de negocio

### La Interfaz del Motor de Fórmulas

```ui-mockup
┌─────────────────────────────────────────────────────────────────┐
│ Motor: Fórmula Visual                                           │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ VARIABLES DE ENTRADA                           [+ Agregar]      │
│ ┌──────────────┬──────────────┬──────────────┬───────────────┐ │
│ │ Nombre       │ Etiqueta     │ Tipo         │ Ejemplo       │ │
│ ├──────────────┼──────────────┼──────────────┼───────────────┤ │
│ │ monto_base   │ Monto base   │ Moneda ($)   │ 1500.00       │ │
│ │ tasa_iva     │ IVA (%)      │ Porcentaje   │ 21            │ │
│ │ descuento    │ Descuento(%) │ Porcentaje   │ 10            │ │
│ └──────────────┴──────────────┴──────────────┴───────────────┘ │
│                                                                 │
│ FÓRMULAS DE SALIDA                             [+ Agregar]      │
│ ┌────────────────┬──────────────────────────────────────────┐   │
│ │ Variable       │ Fórmula                                  │   │
│ ├────────────────┼──────────────────────────────────────────┤   │
│ │ subtotal       │ monto_base * (1 - descuento / 100)       │   │
│ │ iva_calculado  │ subtotal * (tasa_iva / 100)              │   │
│ │ total_final    │ subtotal + iva_calculado                 │   │
│ └────────────────┴──────────────────────────────────────────┘   │
│                                                                 │
│ PREVIEW EN VIVO (con valores de ejemplo):                       │
│   subtotal:      $1,350.00                                      │
│   iva_calculado: $283.50                                        │
│   total_final:   $1,633.50                                      │
│                                                                 │
│                            [Probar con mis valores]             │
└─────────────────────────────────────────────────────────────────┘
```

### Tipos de Variables de Entrada

| Tipo | Para qué | Cómo el agente lo recolecta |
|---|---|---|
| **Número** | Cantidades, montos, días, tasas | Del chat o de un campo `number` en Form Node |
| **Moneda ($)** | Montos monetarios con 2 decimales | Del chat con formato `$1.500,00` |
| **Porcentaje (%)** | Tasas, descuentos | Del chat como `21%` o `21` |
| **Texto** | Códigos, categorías | Del chat o de un `select` en Form Node |

### Funciones Matemáticas Disponibles

Las fórmulas son expresiones JavaScript estándar. Las funciones disponibles:

```javascript
// Aritméticas básicas
+  -  *  /  %  (suma, resta, multiplicación, división, módulo)
**  (potencia, ej: 2**3 = 8)

// Redondeos
Math.round(valor)      // Redondea al entero más cercano
Math.floor(valor)      // Redondea hacia abajo (siempre)
Math.ceil(valor)       // Redondea hacia arriba (siempre)
Math.round(valor * 100) / 100  // Redondear a 2 decimales

// Comparaciones y condicionales
valor > umbral ? resultado_si : resultado_no   // Ternario
Math.max(a, b)         // El mayor de dos valores
Math.min(a, b)         // El menor de dos valores
Math.abs(valor)        // Valor absoluto (sin signo)

// Otros
Math.sqrt(valor)       // Raíz cuadrada
Math.pow(base, exp)    // Potencia
```

### Ejemplo Completo 1: Cotizador de Préstamo

**Escenario:** El agente debe calcular la cuota mensual de un préstamo según monto, plazo y tasa.

**Variables de entrada:**
```
capital          → Monto del préstamo (Moneda)    → Ej: 100000
tasa_mensual     → Tasa de interés mensual (%)    → Ej: 3.5
plazo_meses      → Cantidad de cuotas (Número)    → Ej: 24
```

**Fórmulas de salida:**
```javascript
// Fórmula de cuota fija (Sistema Francés)
tasa_decimal     = tasa_mensual / 100
// Fórmula: C = P * [r(1+r)^n] / [(1+r)^n - 1]
factor           = Math.pow(1 + tasa_decimal, plazo_meses)
cuota_mensual    = Math.round(capital * (tasa_decimal * factor) / (factor - 1) * 100) / 100
total_a_pagar    = Math.round(cuota_mensual * plazo_meses * 100) / 100
interes_total    = Math.round((total_a_pagar - capital) * 100) / 100
```

**Preview con los ejemplos:**
```
Para un préstamo de $100.000 a 24 cuotas al 3.5% mensual:
  cuota_mensual: $6,178.82
  total_a_pagar: $148,291.68
  interes_total: $48,291.68
```

### Ejemplo Completo 2: Calculadora de Descuento Comercial

**Escenario:** El agente de ventas calcula el precio final según categoría de cliente y volumen.

**Variables de entrada:**
```
precio_lista         → Precio de lista (Moneda)   → Ej: 5000
categoria_cliente    → Categoría (Texto)           → Ej: "premium"
cantidad             → Unidades a comprar (Número) → Ej: 150
```

**Fórmulas:**
```javascript
// Descuento por categoría
desc_categoria  = categoria_cliente === "premium" ? 15 : 
                  categoria_cliente === "gold" ? 10 : 5

// Descuento adicional por volumen
desc_volumen    = cantidad >= 200 ? 5 : cantidad >= 100 ? 3 : 0

// Descuento total (no acumulable más de 20%)
desc_total      = Math.min(desc_categoria + desc_volumen, 20)

// Cálculo final
precio_unitario = Math.round(precio_lista * (1 - desc_total/100) * 100) / 100
subtotal        = Math.round(precio_unitario * cantidad * 100) / 100
iva             = Math.round(subtotal * 0.21 * 100) / 100
total           = subtotal + iva
```

### Ejemplo Completo 3: Calculadora de Costo de Envío

```javascript
// Variables: peso_kg, distancia_km, tipo_envio (express/standard/economia)

tarifa_base     = tipo_envio === "express" ? 500 :
                  tipo_envio === "standard" ? 250 : 150

costo_peso      = peso_kg > 5 ? (peso_kg - 5) * 45 : 0
costo_distancia = distancia_km > 100 ? (distancia_km - 100) * 1.5 : 0

subtotal        = tarifa_base + costo_peso + costo_distancia
descuento_vol   = subtotal > 2000 ? subtotal * 0.1 : 0
total           = Math.round((subtotal - descuento_vol) * 100) / 100
```

---

## Motor de Pipeline: Encadenar Acciones en Secuencia

### ¿Qué es un Pipeline?

Un Pipeline es una acción que ejecuta **varias acciones del catálogo en secuencia**, donde el resultado de cada paso puede alimentar al siguiente. Permite orquestar procesos de varios pasos sin que el usuario tenga que invocar cada acción por separado.

**Analogía:** Imaginá una línea de producción en una fábrica. La materia prima entra al primer paso, se transforma, pasa al segundo paso con los datos del primero, se transforma de nuevo, y así sucesivamente hasta el producto final. El usuario solo ve el resultado final.

### Casos de Uso Típicos

- **Ciclo de venta completo:** Buscar cliente en CRM → Verificar deuda pendiente → Calcular cotización con descuentos → Generar PDF → Enviar por email
- **Alta de empleado:** Crear usuario en Active Directory → Registrar en sistema de RRHH → Asignar a grupo de onboarding → Enviar email de bienvenida
- **Gestión de incidente:** Registrar incidente → Crear ticket en Jira → Notificar por Slack → Asignar técnico disponible
- **Proceso de compra:** Verificar stock → Reservar unidades → Generar orden de compra → Enviar a proveedor

### Configurar un Pipeline: Paso a Paso

Cuando seleccionás "Pipeline" como motor en el Wizard, la interfaz muestra un constructor visual de pasos:

```ui-mockup
┌─────────────────────────────────────────────────────────────────┐
│ Pipeline: Proceso Completo de Alta de Empleado                  │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                 │
│  PASO 1 ─────────────────────────────────────────────────────   │
│  Acción: "Crear Usuario en Active Directory"                    │
│  Output Key: usuario_ad                                         │
│  Input:                                                         │
│    nombre_completo: {{nombre_completo}}    ← del parámetro      │
│    email:           {{email}}              ← del parámetro      │
│    departamento:    {{departamento}}       ← del parámetro      │
│                                                                 │
│  PASO 2 ─────────────────────────────────────────────────────   │
│  Acción: "Registrar en Sistema RRHH"                            │
│  Output Key: registro_rrhh                                      │
│  Input:                                                         │
│    usuario_id:  {{usuario_ad.id}}          ← del paso 1         │
│    nombre:      {{nombre_completo}}        ← del parámetro      │
│    email:       {{email}}                  ← del parámetro      │
│    fecha_alta:  {{fecha_hoy}}              ← variable de sistema │
│                                                                 │
│  PASO 3 ─────────────────────────────────────────────────────   │
│  Acción: "Enviar Email de Bienvenida"                           │
│  Input:                                                         │
│    destinatario: {{email}}                 ← del parámetro      │
│    nombre:       {{nombre_completo}}       ← del parámetro      │
│    usuario_ad:   {{usuario_ad.username}}   ← del paso 1         │
│    legajo_rrhh:  {{registro_rrhh.legajo}}  ← del paso 2         │
│                                                                 │
│                                          [+ Agregar Paso]       │
└─────────────────────────────────────────────────────────────────┘
```

### Conceptos Clave del Pipeline

**Output Key:**
Cada paso necesita un nombre de "variable" donde se guarda su resultado. Ese nombre se usa para referenciar datos del paso en los pasos siguientes.

```
Paso 1 → Output Key: "busqueda_cliente"
  → Guarda el resultado completo de la acción "Buscar Cliente"

En Paso 2 puedo acceder a:
  {{busqueda_cliente.id}}
  {{busqueda_cliente.nombre}}
  {{busqueda_cliente.email}}
  {{busqueda_cliente.saldo_pendiente}}
```

**Variables de Parámetro (`{{nombre_param}}`):**
Son los datos que el usuario proveyó al inicio (los parámetros de la acción Pipeline en sí). Se usan en cualquier paso.

**Variables de Sistema:**
Senda provee variables automáticas disponibles en todos los pasos:
```
{{fecha_hoy}}          → Fecha actual (YYYY-MM-DD)
{{hora_actual}}        → Hora actual (HH:MM)
{{usuario_actual}}     → Nombre del usuario que inició la conversación
{{usuario_email}}      → Email del usuario actual
{{tenant_nombre}}      → Nombre del tenant
```

### Ejemplo Completo: Pipeline de Cotización y Envío

**Objetivo:** El agente recibe una solicitud de cotización, calcula el precio, genera el PDF y lo envía por email, todo en un solo flujo.

**Parámetros del Pipeline:**
```
cliente_id     → ID del cliente
productos      → Lista de productos y cantidades
email_destino  → Email donde enviar la cotización
```

**Configuración:**

```
PASO 1
Acción:     "Buscar Cliente en CRM"
Output Key: cliente
Input:
  id: {{cliente_id}}

PASO 2  
Acción:     "Calcular Descuento Comercial" (Fórmula)
Output Key: descuento
Input:
  categoria_cliente: {{cliente.categoria}}
  total_bruto:       {{total_items}}  ← calculado por el agente

PASO 3
Acción:     "Generar PDF de Cotización"
Output Key: documento
Input:
  nombre_cliente:   {{cliente.razon_social}}
  cuit:             {{cliente.cuit}}
  items:            {{productos}}
  descuento_pct:    {{descuento.porcentaje_final}}
  total:            {{descuento.precio_final}}
  validez_dias:     30

PASO 4
Acción:     "Enviar Email con Adjunto"
Input:
  destinatario:  {{email_destino}}
  nombre:        {{cliente.contacto_nombre}}
  asunto:        "Cotización {{documento.numero}} — válida por 30 días"
  pdf_url:       {{documento.url}}
```

**Lo que ve el usuario:**
```
Usuario: "Mandame una cotización para García SA, 
          50 unidades del producto X y 20 del Y"

Agente: [Ejecuta Pipeline en background]
        ↓ Paso 1: Busca cliente... ✅
        ↓ Paso 2: Calcula descuento (10% por categoría Gold)... ✅
        ↓ Paso 3: Genera PDF... ✅
        ↓ Paso 4: Envía email... ✅

Agente: "✅ Cotización COT-2847 enviada a carlos@garcia-sa.com.
         
         Detalle:
         • 50 un. Producto X: $12.500
         • 20 un. Producto Y: $8.200
         • Descuento Gold 10%: -$2.070
         • **Total: $18.630 + IVA**
         
         Válida por 30 días."
```

### Manejo de Errores en Pipelines

Si un paso del pipeline falla, Senda detiene la ejecución y reporta en qué paso falló y por qué. Configurá la **Acción Inversa** en la acción Pipeline para poder hacer rollback si algún paso intermedio generó efectos colaterales.

### Pipeline Canvas: Editor Visual de Flujos (BETA)

> 🔖 **BETA** — Disponible desde v5.15.0. Protegido bajo flag `feature_pipeline_canvas`.

Además del constructor de pipelines paso a paso descrito arriba, Senda ofrece un **editor visual drag-and-drop** donde se diseñan flujos arrastrando nodos sobre un canvas interactivo. Usa la librería React Flow (`@xyflow/react`) con un diseño glassmorphism.

#### Los 4 tipos de nodo

| Tipo | Ícono | Color | Forma | Conexiones | Función |
|---|---|---|---|---|---|
| `trigger` | ⚡ | Verde (emerald) | Tarjeta | Solo salida (bottom) | Define el evento que inicia el flujo |
| `action` | 🔧 | Índigo (borde) | Tarjeta con badge | Entrada (top) + Salida (bottom) | Ejecuta una acción del catálogo. Muestra `action_id` y parámetros |
| `condition` | 🔀 | Ámbar (amarillo) | Diamante | Entrada (top) + 2 Salidas: `true` (verde, 35%) y `false` (rojo, 65%) | Bifurca el flujo según una evaluación truthy del resultado anterior |
| `output` | 📤 | Violeta (purple) | Tarjeta | Solo entrada (top) | Recoge el resultado final del flujo |

Los nodos `condition` tienen forma de diamante (rombo) mediante `clipPath`, con dos salidas coloreadas que representan las ramas verdadera y falsa.

#### Crear un flujo en el Canvas

1. **Arrastrar nodos** desde la paleta lateral (sidebar) al canvas
2. **Conectar nodos** arrastrando desde el handle de salida al handle de entrada del siguiente nodo
3. **Configurar cada nodo** haciendo clic: seleccionar la acción del catálogo, definir parámetros, escribir la condición
4. **Validar** — el sistema verifica automáticamente:
   - Que exista al menos 1 nodo
   - Que haya un nodo `trigger`
   - Que los nodos `action` tengan `action_id` asignado
   - Que el grafo sea un **DAG** (Directed Acyclic Graph) usando el **algoritmo de Kahn** — no se permiten ciclos
   - Que todas las aristas referencien nodos existentes
5. **Guardar** → El pipeline se almacena como JSON (`nodes_json` + `edges_json`) en la tabla `pipelines`

#### Generación desde Lenguaje Natural

El sidebar incluye un campo de texto donde podés **describir el flujo en lenguaje natural** y Senda genera automáticamente los nodos y conexiones:

```
Input: "Cuando llega un ticket nuevo, verificar si el cliente es Premium.
        Si es Premium, asignar a soporte VIP. Si no, asignar a cola general.
        Al final, enviar confirmación por email."

Output: trigger → condition(Premium?) → [true] action(asignar VIP)
                                      → [false] action(asignar general)
        ambos → output(enviar email)
```

Endpoint: `POST /api/pipelines/generate` (requiere prompt de al menos 5 caracteres)

#### Ejecución del Pipeline Canvas

La ejecución sigue el orden topológico del grafo (determinado por Kahn's algorithm):

1. Se resuelve el nodo `trigger` → pasa los datos del evento
2. Cada nodo `condition` evalúa el resultado del nodo padre (truthy check)
3. Cada nodo `action` combina los outputs de sus padres + sus parámetros propios, y ejecuta `executeAction()`
4. Los nodos `output` recolectan el resultado final

**Deadline:** Cada ejecución tiene un límite de **30 segundos** (`PIPELINE_CANVAS_DEADLINE_MS`). Si se excede, la ejecución falla con timeout.

**Manejo de errores:** La ejecución es fail-fast — si un nodo `action` falla, el pipeline se detiene inmediatamente sin ejecutar los nodos siguientes.

#### API Endpoints del Pipeline Canvas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/pipelines/` | Listar pipelines del tenant |
| `POST` | `/api/pipelines/` | Crear pipeline |
| `PUT` | `/api/pipelines/:id` | Actualizar pipeline |
| `DELETE` | `/api/pipelines/:id` | Eliminar pipeline |
| `POST` | `/api/pipelines/:id/execute` | Ejecutar un pipeline |
| `POST` | `/api/pipelines/generate` | Generar pipeline desde lenguaje natural |

Todos los endpoints están protegidos bajo el feature flag `feature_pipeline_canvas`.

#### Pipeline lineal vs. Pipeline Canvas: ¿cuál usar?

| Criterio | Pipeline lineal (arriba) | Pipeline Canvas |
|---|---|---|
| Complejidad del flujo | Secuencia lineal (A → B → C) | Flujos con bifurcaciones, paralelos y merge |
| Interfaz | Constructor paso a paso | Canvas drag-and-drop visual |
| Condiciones | No soporta | Nodo `condition` con ramas true/false |
| Generación NL | No | Sí — describir el flujo y Senda lo genera |
| Almacenamiento | Parte de una acción tipo Pipeline | Entidad propia en tabla `pipelines` |
| Estado | GA | BETA |

> 📝 **Recomendación:** Para flujos lineales simples (A → B → C), usá el pipeline estándar. Para flujos con bifurcaciones, condiciones o generación automática, usá el Pipeline Canvas.

---

## UI Generativa: Dashboards en el Chat

### ¿Qué es la Generative UI?

La Generative UI (Interfaz Generativa) es la capacidad de Senda de renderizar **componentes visuales interactivos directamente dentro de la conversación**, en lugar de texto plano. Cuando una acción devuelve datos, en vez de que el agente los describa en palabras, Senda los visualiza como gráficos, tablas KPI o reportes formateados.

**Agnóstico del Canal (SSP):** Senda no inyecta "código de programación web" en el chat. Utiliza el **Senda Standard Presentation Protocol (SSP)**. El motor central emite una "representación abstracta" de la información (`presentation_type` y `dataset`). Esto garantiza que la misma visualización pueda mostrarse como un widget interactivo en la web de escritorio, y al mismo tiempo procesarse como una imagen estática o resumen en WhatsApp, todo usando la misma configuración de la acción.

Esto es lo que convierte a Senda de un "chatbot que da datos" en un "sistema operativo visual". Cuando el CEO de tu cliente ve un gráfico de barras aparecer en el chat al escribir "¿cómo vamos en ventas?", entiende instantáneamente el potencial de la plataforma.

### Los 18 Widgets Disponibles

#### 1. KpiCardsWidget — Para métricas individuales

Muestra tarjetas de KPIs con valor principal, meta y variación porcentual.

```
Configuración en la acción (campo "Render Type"): KpiCardsWidget

Estructura de datos esperada (JSON de respuesta de tu API):
{
  "kpis": [
    { "titulo": "Ventas del Mes", "valor": 2300000, "meta": 2000000, "variacion": 15.5, "moneda": true },
    { "titulo": "Tickets Resueltos", "valor": 847, "meta": 800, "variacion": 5.9 },
    { "titulo": "NPS Promedio", "valor": 4.3, "meta": 4.0, "variacion": 7.5 }
  ]
}

```ui-mockup
Resultado en el chat:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Ventas/Mes   │ │ Tickets Res. │ │ NPS Prom.    │
│ $2.3M        │ │ 847          │ │ 4.3/5.0      │
│ Meta: $2M    │ │ Meta: 800    │ │ Meta: 4.0    │
│ ▲ 15.5%      │ │ ▲ 5.9%       │ │ ▲ 7.5%       │
└──────────────┘ └──────────────┘ └──────────────┘
```

#### 2. BarChartWidget — Para comparaciones entre categorías

```
Render Type: BarChartWidget

Datos esperados:
{
  "titulo": "Ventas por Región",
  "eje_x": ["Norte", "Centro", "Sur", "Oeste"],
  "series": [
    { "nombre": "Este mes", "datos": [890000, 720000, 690000, 540000] },
    { "nombre": "Mes anterior", "datos": [820000, 680000, 710000, 490000] }
  ]
}
```

Ideal para: Ventas por producto, tickets por área, performance por vendedor, consumo por sucursal.

#### 3. LineChartWidget — Para tendencias en el tiempo

```
Render Type: LineChartWidget

Datos esperados:
{
  "titulo": "Evolución de Ventas — Últimos 6 Meses",
  "etiquetas": ["Dic", "Ene", "Feb", "Mar", "Abr", "May"],
  "series": [
    { "nombre": "Ventas ($M)", "datos": [1.8, 1.6, 2.1, 1.9, 2.4, 2.3] }
  ]
}
```

Ideal para: Tendencias históricas, evolución de KPIs, proyecciones.

#### 4. AreaChartWidget — Para volúmenes acumulados

Similar al LineChart pero con el área bajo la curva rellena. Visualmente más impactante para mostrar crecimiento acumulado.

```
Render Type: AreaChartWidget
```

Ideal para: Consumo acumulado de energía, usuarios activos acumulados, facturación acumulada.

#### 5. DonutChartWidget — Para distribución y proporciones

```
Render Type: DonutChartWidget

Datos esperados:
{
  "titulo": "Estado de Tickets",
  "segmentos": [
    { "etiqueta": "Abiertos", "valor": 142, "color": "#ef4444" },
    { "etiqueta": "En Progreso", "valor": 87, "color": "#f59e0b" },
    { "etiqueta": "Cerrados", "valor": 618, "color": "#10b981" }
  ]
}
```

Ideal para: Distribución por estado, composición de cartera, mix de productos.

#### 6. HtmlWidget — Para reportes complejos y marca blanca

El más flexible. Senda renderiza HTML puro con estilos en línea dentro del chat. Podés crear reportes con el logo del cliente, tablas complejas, múltiples secciones.

```
Render Type: HtmlWidget

Datos esperados: El sistema devuelve directamente el HTML como string:
{
  "html": "<div style='font-family: Arial...'><h2>Informe Ejecutivo</h2>..."
}

O alternativamente, Senda inyecta los datos del JSON en un template HTML
que definís en la configuración de la acción.
```

Ideal para: Informes ejecutivos formateados, cotizaciones con logo del cliente, reportes de compliance, facturas.

#### 7. IntentGraphWidget — Tarjetas de Intents de Acciones

Muestra un grafo de opciones (tarjetas clicables) o formularios anidados directamente en el chat. **Aclaración importante:** estas tarjetas no se activan "automáticamente" a nivel agente. Aparecen **únicamente** cuando una Acción configurada devuelve este formato específico. 

> **Tip:** Para desactivar estas tarjetas en un agente particular, simplemente desasigná la acción que las genera desde el catálogo del agente.

```
Render Type: Se activa automáticamente si la API devuelve `__intent_graph: true`

Datos esperados:
{
  "__intent_graph": true,
  "message": "Seleccioná el tipo de reporte:",
  "nodes": [
    {
      "id": "opcion1",
      "label": "Verificar Deuda",
      "action_id": "act_12345",
      "action_params": { "tipo": "deuda" },
      "variant": "primary"
    }
  ]
}
```

Ideal para: Flujos guiados, opciones predefinidas y formularios modulares interactivos sin necesidad de tipear.

#### 8. TimelineWidget (`timeline_milestones`) — Para líneas de tiempo y logs históricos

Muestra acontecimientos, estados o logs históricos de forma secuencial, ya sea en diseño vertical u horizontal.

```
Render Type: timeline_milestones

Datos esperados:
{
  "title": "Historial de Envío",
  "layout": "vertical", // Opcional: "vertical" (por defecto) o "horizontal"
  "events": [
    {
      "id": "evt_1",
      "title": "Despachado en Origen",
      "description": "El paquete salió del centro de distribución.",
      "timestamp": "2026-05-23 10:15",
      "status": "completed", // "completed" | "in_progress" | "pending" | "failed"
      "icon": "🚚" // Opcional: emoji o texto corto
    },
    {
      "id": "evt_2",
      "title": "En camino al destino",
      "description": "Asignado al chofer de reparto.",
      "timestamp": "2026-05-23 14:00",
      "status": "in_progress",
      "icon": "📦"
    }
  ]
}
```

Ideal para: Trazabilidad de envíos, auditorías de cambios, historial de tickets o estados de procesos.

#### 9. BoardWidget (`board_cards`) — Para tableros Kanban

Permite organizar y ver tareas, leads u órdenes organizadas en columnas de estados interactivos estilo Kanban.

```
Render Type: board_cards

Datos esperados:
{
  "title": "Flujo de Ventas (CRM)",
  "columns": [
    {
      "id": "col_lead",
      "title": "Contacto Inicial",
      "cards": [
        {
          "id": "card_1",
          "title": "Acme Corp - 50 Licencias",
          "description": "Llamada de calificación agendada.",
          "tags": ["Licencias", "Enterprise"],
          "priority": "high", // "low" | "medium" | "high"
          "assignedTo": "JS" // Iniciales de asignación
        }
      ]
    },
    {
      "id": "col_demo",
      "title": "Demostración",
      "cards": []
    }
  ]
}
```

Ideal para: CRM de ventas, seguimiento de tareas/bugs (Kanban), gestión de colas de atención.

#### 10. StepperWidget (`stepper_flow`) — Para flujos interactivos paso a paso

Renderiza una secuencia lineal de etapas, indicando el paso activo, completado o pendiente en procesos multi-fase.

```
Render Type: stepper_flow

Datos esperados:
{
  "title": "Alta de Cuenta de Ahorros",
  "currentStepIndex": 1,
  "steps": [
    {
      "index": 1,
      "label": "Datos Personales",
      "description": "Completar formulario básico.",
      "state": "done" // "done" | "active" | "upcoming"
    },
    {
      "index": 2,
      "label": "Biometría",
      "description": "Validación de identidad facial.",
      "state": "active",
      "optional": false // Opcional
    },
    {
      "index": 3,
      "label": "Firma de Contrato",
      "description": "Firma digital del documento legal.",
      "state": "upcoming",
      "optional": true
    }
  ]
}
```

Ideal para: Monitoreo de solicitudes complejas, asistentes de onboarding, flujos de check-out.

#### 11. NetworkTreeWidget (`network_tree`) — Para visualización jerárquica colapsable

Muestra estructuras de red, dependencias u organigramas con un nodo raíz y nodos hijos anidados interactivamente.

```
Render Type: network_tree

Datos esperados:
{
  "title": "Dependencias de Microservicios",
  "root": {
    "id": "srv_gateway",
    "name": "API Gateway",
    "role": "Punto de Entrada",
    "status": "active", // "active" | "inactive" | "warning"
    "children": [
      {
        "id": "srv_auth",
        "name": "Servicio de Auth",
        "role": "Seguridad",
        "status": "active"
      },
      {
        "id": "srv_payments",
        "name": "Servicio de Pagos",
        "role": "Transaccional",
        "status": "warning",
        "children": [
          {
            "id": "db_stripe",
            "name": "Stripe Gateway API",
            "role": "Tercero",
            "status": "inactive"
          }
        ]
      }
    ]
  }
}
```

Ideal para: Organigramas de equipos, mapas de dependencias de infraestructura, taxonomías de productos.

#### 12. CalendarScheduleWidget (`calendar_schedule`) — Para disponibilidad y reserva de turnos

Muestra días de atención y franjas horarias libres. Al hacer clic en un horario disponible, el widget envía un mensaje automático al chat para que el agente procese la reserva.

```
Render Type: calendar_schedule

Datos esperados:
{
  "title": "Reserva de Asesoría Financiera",
  "timeZone": "America/Argentina/Buenos_Aires", // Opcional
  "days": [
    {
      "date": "2026-05-25",
      "label": "Lunes 25",
      "slots": [
        {
          "id": "slot_0900",
          "time": "09:00",
          "available": true
        },
        {
          "id": "slot_1000",
          "time": "10:00",
          "available": false
        }
      ]
    },
    {
      "date": "2026-05-26",
      "label": "Martes 26",
      "slots": [
        {
          "id": "slot_1100",
          "time": "11:00",
          "available": true
        }
      ]
    }
  ]
}
```

Ideal para: Agendamiento de soporte, reserva de consultorías, salas de reuniones o turnos de atención.

#### 13. ComparisonMatrixWidget (`comparison_matrix`) — Para tablas y matrices comparativas

Compara side-by-side características y precios de productos, planes o servicios, con opción de destacar la opción recomendada.

```
Render Type: comparison_matrix

Datos esperados:
{
  "title": "Comparación de Planes Cloud",
  "items": [
    {
      "id": "item_dev",
      "name": "Plan Developer",
      "price": "Gratis"
    },
    {
      "id": "item_pro",
      "name": "Plan Pro",
      "price": "USD 29/mes",
      "highlighted": true // Destaca la columna en el diseño
    }
  ],
  "features": [
    {
      "name": "Acciones por mes",
      "values": ["1.000", "Ilimitadas"]
    },
    {
      "name": "Soporte SLA",
      "values": ["No", "Sí (4h)"]
    },
    {
      "name": "Soporte Multi-tenant",
      "values": ["false", "true"] // Valores booleanos ("true", "yes", "✓" renderizan como check)
    }
  ]
}
```

Ideal para: Ofertas de suscripción, comparativa de hardware/software, análisis competitivo de productos.

#### 14. DataTableWidget (`data_table`) — Para tablas de datos con búsqueda, orden y paginación

Renderiza datos tabulares con columnas ordenables (clic en el header), búsqueda de texto libre, paginación automática (50 filas por página) y exportación a CSV con un clic.

**Cuándo usarlo:** Cuando la acción devuelve un listado extenso de registros que el usuario necesita explorar, filtrar o descargar — logs de actividad, reportes de transacciones, inventarios, listados de clientes.

```typescript
// Interfaz del dataset esperado
interface DataTableData {
  title?: string;              // Título de la tabla (ej: "Últimas Transacciones")
  columns: string[];           // Nombres de columnas (ej: ["Fecha", "Cliente", "Monto"])
  rows: (string | number)[][]; // Filas de datos, cada fila es un array de celdas
}
```

```json
// Ejemplo de presentation_data
{
  "title": "Últimas 5 Transacciones",
  "columns": ["Fecha", "Cliente", "Concepto", "Monto"],
  "rows": [
    ["2026-05-28", "Acme Corp", "Licencias Q2", 45000],
    ["2026-05-27", "Tech SA", "Soporte Premium", 12800],
    ["2026-05-26", "MegaStore", "Hardware", 89500],
    ["2026-05-25", "LogiPro", "Consultoría", 23000],
    ["2026-05-24", "Acme Corp", "Capacitación", 15000]
  ]
}
```

> 📝 **Nota:** Las celdas numéricas se formatean automáticamente con separador de miles (`toLocaleString`). La búsqueda filtra sobre todas las columnas. El botón de exportación genera un archivo `.csv` con BOM UTF-8 para compatibilidad con Excel.

#### 15. QrCodeWidget (`qr_code`) — Para generar códigos QR

Genera y muestra un código QR en formato SVG a partir de cualquier texto o URL. Incluye el valor original como texto legible debajo del código y un botón para descargar el QR como archivo SVG.

**Cuándo usarlo:** Accesos rápidos a URLs, verificación de tickets o entradas, links de descarga de apps, identificación de activos o productos.

```typescript
// Interfaz del dataset esperado
interface QrCodeData {
  title?: string;   // Título sobre el QR (default: "Código QR")
  value?: string;   // Contenido del QR (texto o URL)
  text?: string;    // Alias de value (fallback si value no está presente)
}
```

```json
// Ejemplo de presentation_data
{
  "title": "Acceso al Portal del Cliente",
  "value": "https://app.senda.telar.ai/portal/cliente/acme-corp"
}
```

> 📝 **Nota:** El QR se renderiza con nivel de corrección "M" (Medium, ~15% de recuperación) y tamaño de 200×200px. Si ni `value` ni `text` tienen contenido, el widget no se renderiza.

#### 16. ActionCardWidget (`action_card`) — Para formularios interactivos que ejecutan acciones

Tarjeta interactiva con campos de formulario y validación client-side que ejecuta directamente una acción del catálogo (`POST /api/actions/:id/execute`). Es el componente central de la experiencia **Chatless UI**: permite al usuario completar datos y ejecutar una acción sin necesidad de escribir en el chat.

**Cuándo usarlo:** Formularios de alta/edición (crear ticket, registrar cliente), aprobaciones con datos adicionales, ejecución de acciones operativas desde dashboards.

```typescript
// Interfaz del dataset esperado
interface ActionCardField {
  name: string;           // Nombre interno del campo
  label: string;          // Etiqueta visible
  type: 'text' | 'textarea' | 'select' | 'multi_select'
      | 'date' | 'datetime' | 'number' | 'email' | 'url' | 'toggle';
  required?: boolean;     // Si es obligatorio (default: false)
  placeholder?: string;
  default_value?: any;
  options?: Array<{ label: string; value: string }>;  // Solo para select / multi_select
  validation?: {
    min?: number;         // Solo para number
    max?: number;         // Solo para number
    pattern?: string;     // Regex de validación
    message?: string;     // Mensaje de error custom
  };
}

interface ActionCardData {
  title: string;                              // Título del card
  description?: string;                       // Descripción breve
  action_id: string;                          // ID de la acción a ejecutar
  submit_label?: string;                      // Texto del botón (default: "Ejecutar")
  fields: ActionCardField[];                  // Campos del formulario
  prefilled_values?: Record<string, any>;     // Valores pre-cargados
  on_success_message?: string;                // Mensaje tras ejecución exitosa
}
```

```json
// Ejemplo de presentation_data
{
  "title": "Crear Ticket de Soporte",
  "description": "Completá los datos para abrir un nuevo ticket.",
  "action_id": "act_crear_ticket_soporte",
  "submit_label": "Abrir Ticket",
  "fields": [
    {
      "name": "asunto",
      "label": "Asunto",
      "type": "text",
      "required": true,
      "placeholder": "Describí brevemente el problema"
    },
    {
      "name": "prioridad",
      "label": "Prioridad",
      "type": "select",
      "required": true,
      "options": [
        { "label": "Baja", "value": "low" },
        { "label": "Media", "value": "medium" },
        { "label": "Alta", "value": "high" }
      ]
    },
    {
      "name": "detalle",
      "label": "Descripción detallada",
      "type": "textarea",
      "placeholder": "Pasos para reproducir el problema..."
    },
    {
      "name": "urgente",
      "label": "Requiere atención inmediata",
      "type": "toggle"
    }
  ],
  "on_success_message": "Ticket creado exitosamente. Un agente de soporte lo tomará pronto."
}
```

> ⚠️ **Importante:** El campo `action_id` debe corresponder a una acción existente en el catálogo del agente. Los `fields` y sus `name` deben coincidir con los parámetros esperados por esa acción. El widget valida campos required, rangos numéricos y patterns regex antes de enviar.

#### 17. ThirdPartyWidgetLoader (`third_party_widget`) — Para embeber contenido externo en iframe aislado

Renderiza contenido de terceros dentro de un `<iframe>` sandboxed con política `allow-scripts` y `referrerPolicy: no-referrer`. Permite incrustar dashboards externos, herramientas SaaS o visualizaciones custom sin comprometer la seguridad del host.

**Cuándo usarlo:** Incrustar dashboards de Metabase/Grafana/Looker, formularios de terceros, visualizaciones interactivas custom que no están en el catálogo de widgets nativos.

```typescript
// Interfaz del dataset esperado
interface ThirdPartyWidgetData {
  title?: string;                       // Título visible sobre el iframe
  iframeUrl?: string;                   // URL del contenido a embeber (principal)
  url?: string;                         // Alias de iframeUrl (fallback)
  dataset?: Record<string, any>;        // Datos a enviar al iframe vía postMessage
  props?: Record<string, any>;          // Alias de dataset (fallback)
}
```

```json
// Ejemplo de presentation_data
{
  "title": "Dashboard de Ventas — Metabase",
  "iframeUrl": "https://metabase.acme.com/public/dashboard/abc123",
  "dataset": {
    "filtro_region": "norte",
    "periodo": "2026-Q2"
  }
}
```

**Protocolo de comunicación iframe ↔ Senda:**

| Dirección | Evento | Payload | Descripción |
|---|---|---|---|
| Senda → iframe | `SENDA_WIDGET_INIT` | `{ dataset, theme, locale }` | Inicialización al cargar. Envía datos, tema (dark/light) y locale |
| iframe → Senda | `SENDA_WIDGET_EVENT` action: `resize` | `{ height: number }` | Ajuste dinámico de altura (100–800px) |
| iframe → Senda | `SENDA_WIDGET_EVENT` action: `sendMessage` | `{ text: string }` | Envía un mensaje al chat desde el iframe |

> ⚠️ **Seguridad:** El iframe se ejecuta con `sandbox="allow-scripts"` — sin acceso a cookies, storage ni DOM del host. La altura se limita a un rango de 100–800px para evitar que un widget externo rompa el layout.

#### 18. AdaptiveDashboardWidget (`adaptive_dashboard`) — Para dashboards multi-widget con grilla responsiva

Widget contenedor que organiza múltiples sub-widgets (KPIs, gráficos de barras, líneas, donut y tablas) en una grilla CSS Grid de 4 columnas. Es el componente central de la capacidad **Adaptive Dashboards**: el LLM define la composición del dashboard y Senda lo renderiza automáticamente.

**Cuándo usarlo:** Cuando el usuario pide una vista consolidada ("¿cómo va todo?", "dame el dashboard de ventas"), reportes ejecutivos multi-métrica, o cualquier escenario donde una sola visualización no alcanza.

```typescript
// Interfaz del dataset esperado
interface GridPosition {
  col: number;      // Columna de inicio (1-4)
  row: number;      // Fila de inicio (1-N)
  colSpan: number;  // Ancho en columnas (1-4)
  rowSpan: number;  // Alto en filas (1-N)
}

interface DashboardWidget {
  id: string;                           // ID único del sub-widget
  type: 'kpi_card' | 'chart_bar' | 'chart_line' | 'chart_donut' | 'data_table';
  title: string;                        // Título del sub-widget
  gridPosition: GridPosition;           // Posición en la grilla
  query: string;                        // Query SQL de origen (informativo)
  data?: {                              // Datos ya resueltos
    rows?: Record<string, unknown>[];   // Filas de resultado
    error?: string;                     // Error si la query falló
  };
}

interface DashboardSpec {
  title: string;                        // Título del dashboard
  widgets: DashboardWidget[];           // Sub-widgets a renderizar
  refreshIntervalMs?: number;           // Intervalo de refresh (ms)
}

// El widget recibe: { spec: DashboardSpec }
```

```json
// Ejemplo de presentation_data
{
  "spec": {
    "title": "Dashboard Comercial — Mayo 2026",
    "widgets": [
      {
        "id": "w1",
        "type": "kpi_card",
        "title": "Ventas Totales",
        "gridPosition": { "col": 1, "row": 1, "colSpan": 1, "rowSpan": 1 },
        "query": "SELECT SUM(monto) FROM ventas WHERE mes = 5",
        "data": { "rows": [{ "label": "Total", "value": 2340000 }] }
      },
      {
        "id": "w2",
        "type": "kpi_card",
        "title": "Tickets Abiertos",
        "gridPosition": { "col": 2, "row": 1, "colSpan": 1, "rowSpan": 1 },
        "query": "SELECT COUNT(*) FROM tickets WHERE status = 'open'",
        "data": { "rows": [{ "label": "Abiertos", "value": 42 }] }
      },
      {
        "id": "w3",
        "type": "chart_bar",
        "title": "Ventas por Región",
        "gridPosition": { "col": 3, "row": 1, "colSpan": 2, "rowSpan": 1 },
        "query": "SELECT region, SUM(monto) FROM ventas GROUP BY region",
        "data": {
          "rows": [
            { "region": "Norte", "total": 890000 },
            { "region": "Centro", "total": 720000 },
            { "region": "Sur", "total": 730000 }
          ]
        }
      },
      {
        "id": "w4",
        "type": "chart_line",
        "title": "Tendencia Semanal",
        "gridPosition": { "col": 1, "row": 2, "colSpan": 4, "rowSpan": 1 },
        "query": "SELECT semana, ventas FROM ventas_semanal",
        "data": {
          "rows": [
            { "semana": "S1", "ventas": 450000 },
            { "semana": "S2", "ventas": 520000 },
            { "semana": "S3", "ventas": 610000 },
            { "semana": "S4", "ventas": 760000 }
          ]
        }
      }
    ]
  }
}
```

> 📝 **Nota:** La grilla es de 4 columnas con filas de mínimo 180px. Cada sub-widget puede ocupar de 1 a 4 columnas (`colSpan`) y múltiples filas (`rowSpan`). Los tipos de sub-widget soportados son un subconjunto de los widgets de GenUI: `kpi_card`, `chart_bar`, `chart_line`, `chart_donut` y `data_table`.

> ⚠️ **Importante:** El LLM genera la `DashboardSpec` incluyendo las queries SQL. Los datos (`data.rows`) vienen pre-resueltos por el backend — el widget de frontend no ejecuta queries.

### ¿Cómo diseña un analista un Intent Graph sin saber programación?

Actualmente, Senda no tiene un constructor visual de arrastrar y soltar exclusivo para dibujar estos árboles conversacionales, pero **no hace falta escribir código JSON manualmente**. Existen dos vías principales para hacerlo:

1. **La Vía Rápida (El Copiloto IA)**: Dentro del Action Wizard, el analista funcional simplemente le pide al Copiloto en lenguaje natural: *"Creame una acción que no pida parámetros y devuelva un Intent Graph con 3 tarjetas clicables: 'Consultar Deuda', 'Ver Políticas' y 'Soporte Técnico'. Que la segunda sea de tipo prompt_node."* El Copiloto genera automáticamente toda la estructura del grafo de opciones lista para guardar.
2. **El Mapeo Visual (Output Mapping)**: Si los botones dependen de un sistema externo (por ejemplo, una API que devuelve una lista dinámica de maquinarias), el analista usa la sección de "Output Mapping" de la acción. Allí enlaza visualmente qué campo de la respuesta (ej: `nombre_maquina`) representa la "etiqueta de la tarjeta" y qué campo representa la "acción al hacer clic", convirtiendo una respuesta cruda en un árbol visual.

### Configurar una Acción con Generative UI

En la sección **Avanzado** de la acción:

1. Seleccionar el **Render Type** del widget deseado
2. Verificar que la respuesta de tu API devuelva el [JSON](00_glosario.md#glosario-json) con la estructura que el widget espera
3. Si la estructura de tu API es diferente, usar el **Output Mapping** para transformar los campos

**Ejemplo de mapeo si la API de ventas devuelve un formato diferente:**

```
Tu API devuelve:
{ "monthly_data": { "region_north": 890000, "region_center": 720000 } }

Output Mapping para BarChartWidget:
etiquetas → ["Norte", "Centro"]
series[0].datos → [response.monthly_data.region_north, response.monthly_data.region_center]
```

### El Flujo Conversacional con Generative UI

Un usuario bien configurado con dashboards puede tener esta experiencia:

```
Usuario: "¿Cómo van las ventas?"

[KPI Cards]
Total mes: $2.3M | Meta: $2M | ▲ 115% | Proyección cierre: $2.8M

Usuario: "¿Y por región?"

[Bar Chart — Ventas por Región]
Norte: $890K | Centro: $720K | Sur: $690K | Oeste: $540K

Usuario: "¿Qué hay crítico en inventario?"

[Bar Chart — Stock Crítico]
Producto A: 12 un (mín: 50) ⚠️ | Prod. C: 3 un (mín: 20) 🔴

Usuario: "Generame el informe para la reunión de directorio"

[HTML Widget — Informe Ejecutivo con logo, tablas y gráficos]
```

Todo eso sin abrir un solo sistema externo. Eso es Senda.

---

## Checklist: Antes de Publicar tu Motor

### Para Fórmulas
- [ ] Todas las variables de entrada tienen tipo correcto (número, %, moneda)
- [ ] Las fórmulas fueron validadas con el Preview en vivo usando casos extremos
- [ ] Se verificaron casos borde: ¿qué pasa si monto es 0? ¿Si el descuento es 100%?
- [ ] Los resultados tienen el número de decimales correcto (Math.round a 2 decimales)

### Para Pipelines
- [ ] Cada paso tiene un Output Key único y descriptivo
- [ ] Las referencias de variables entre pasos son correctas (`{{paso1.campo}}`)
- [ ] Se probó el pipeline completo en el Chain Debugger antes de publicar
- [ ] La acción del paso más crítico tiene Confirmación Humana activa
- [ ] Existe una Acción Inversa configurada si el pipeline crea datos en sistemas externos
- [ ] ¿Entiendo la diferencia entre Pipeline lineal y Pipeline Canvas?
- [ ] ¿Conozco los 4 tipos de nodos del Canvas (trigger, action, condition, output)?
- [ ] ¿Sé cómo generar un pipeline desde lenguaje natural?

### Para Generative UI
- [ ] El Render Type seleccionado es uno de los 18 tipos disponibles (17 allowed + `html_raw` bloqueado)
- [ ] El Render Type seleccionado coincide con la estructura de datos que devuelve la API
- [ ] Se probó la acción con datos reales y el widget se renderizó correctamente
- [ ] Para HtmlWidget: el HTML fue validado en un navegador antes de configurarlo
- [ ] Para ActionCardWidget: el `action_id` existe en el catálogo y los `fields` coinciden con los parámetros de la acción
- [ ] Para ThirdPartyWidgetLoader: la URL del iframe es accesible y el contenido funciona con `sandbox="allow-scripts"`
- [ ] Para AdaptiveDashboardWidget: la `spec` tiene al menos un widget y las `gridPosition` no se superponen

---

> 📖 **Anterior:** [02 — Acciones HTTP y Formularios](./02_acciones_http_y_formularios.md)  
> 📖 **Siguiente:** [04 — Intent Graph y Flujos Conversacionales](./04_intent_graph.md)
