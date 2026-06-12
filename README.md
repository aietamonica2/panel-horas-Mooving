# Panel de Operaciones Mooving

Panel interactivo para análisis de carga de trabajo, disponibilidad del equipo y distribución de horas por cliente y proyecto.

## Características

- 📊 **Dashboard interactivo** con KPIs en tiempo real
- 🎛️ **Filtros multi-select** por meses, categorías y usuarios
- 📤 **Carga de archivos CSV** dinámicamente
- 📅 **Disponibilidad mensual** con cálculo de horas libres
- ⏰ **Bolsa de Horas** - desglose de Tareas Internas y Reuniones
- 📈 **Gráficos dinámicos** con Chart.js
- 💼 **Distribución de carga** por empleado y cliente
- 📱 **Diseño responsivo** para mobile y desktop

## Requisitos del CSV

El archivo CSV debe contener las siguientes columnas:

- `Proyecto` - Nombre del proyecto (ej: "Tareas Internas", "SENDA")
- `Cliente` - Nombre del cliente
- `Usuario` - Nombre del usuario/empleado
- `Duración (decimal)` - Horas en formato decimal
- `Fecha de inicio` - Formato DD/MM/YYYY

Ejemplo:
```
Proyecto,Cliente,Usuario,Duración (decimal),Fecha de inicio
Tareas Internas,Interno,monica.aieta,2.5,15/06/2026
SENDA,Interno,mateo.nardo,4.0,15/06/2026
```

## Uso

1. Abre `index.html` en tu navegador
2. Carga un archivo CSV con el botón "📤 Cargar CSV"
3. Usa los filtros para analizar datos específicos:
   - Selecciona meses (Ctrl/Cmd + Click para múltiples)
   - Selecciona categorías
   - Elige un usuario específico
4. Clickea "Aplicar Filtros" para actualizar el análisis

## Despliegue en Cloudflare Pages

### Opción 1: Desde GitHub (Recomendado)

1. **Sube el repositorio a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Panel Operaciones Mooving"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/panel-mooving.git
   git push -u origin main
   ```

2. **Conecta con Cloudflare Pages:**
   - Ve a [Cloudflare Pages](https://pages.cloudflare.com/)
   - Conecta tu cuenta GitHub
   - Selecciona el repositorio `panel-mooving`
   - En "Build Settings": 
     - **Build command**: (dejar vacío, es HTML estático)
     - **Build output directory**: `/` (raíz)
   - Clickea "Save and Deploy"

3. Tu sitio estará disponible en: `https://tu-proyecto.pages.dev`

### Opción 2: Despliegue Manual

1. **Crea un repositorio en GitHub** (sin clonarlo)
2. **Sube los archivos manualmente** desde GitHub.com
3. **Conecta a Cloudflare Pages** apuntando a ese repositorio

## Estructura del Proyecto

```
panel-mooving/
├── index.html           # Página principal
├── README.md            # Este archivo
└── wrangler.toml        # Configuración (opcional, para Workers)
```

## Tecnologías

- HTML5
- CSS3 (con variables CSS personalizadas)
- JavaScript (vanilla, sin dependencias externas)
- Chart.js 4.5.0 (CDN)

## Características de Datos

### Cálculo de Disponibilidad
- **Horas esperadas**: 8h/día × días hábiles del mes
- **Días hábiles**: Lunes a viernes, menos feriados argentinos
- **Tiempo libre**: Horas esperadas - Horas registradas

### Bolsa de Horas
- Identifica automáticamente "Tareas Internas" y "Reuniones de Equipo"
- Desglose por usuario y mes
- Facilita el seguimiento de tiempo en actividades administrativas

### Distribución de Carga
- Muestra cómo se distribuyen las horas de cada empleado por cliente
- Calcula porcentajes automáticamente
- Ordenado por total de horas

## Navegador Compatible

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Dispositivos móviles con navegadores modernos

## Notas

- Los datos se cargan en memoria del navegador
- No requiere servidor backend
- Soporta archivos CSV hasta ~10MB
- Los datos se pierden al recargar la página (se puede guardar el CSV localmente)

## Soporte

Para reportar problemas o sugerencias, crea un issue en el repositorio de GitHub.

## Licencia

MIT License - Ver LICENSE para detalles
