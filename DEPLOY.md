# Guía de Despliegue en Cloudflare Pages

Esta guía te muestra cómo subir el Panel de Operaciones Mooving a GitHub y desplegarlo en Cloudflare Pages.

## Paso 1: Crear un Repositorio en GitHub

### 1.1 Crea una cuenta en GitHub (si no tienes)
- Ve a https://github.com
- Haz clic en "Sign up"
- Completa el registro

### 1.2 Crea un nuevo repositorio
- Haz clic en el botón "+" arriba a la derecha
- Selecciona "New repository"
- **Repository name**: `panel-mooving` (o el nombre que prefieras)
- **Description**: "Panel interactivo para análisis de operaciones Mooving"
- **Public** (para que Cloudflare pueda acceder)
- Haz clic en "Create repository"

### 1.3 Copia la URL del repositorio
Después de crear el repositorio, copiarás algo como:
```
https://github.com/tu-usuario/panel-mooving.git
```

## Paso 2: Preparar los Archivos Localmente

### 2.1 Crea una carpeta para el proyecto
```bash
mkdir panel-mooving
cd panel-mooving
```

### 2.2 Copia estos archivos a la carpeta:
- `index.html`
- `README.md`
- `LICENSE`
- `.gitignore`
- `_redirects`

La estructura debe verse así:
```
panel-mooving/
├── index.html
├── README.md
├── LICENSE
├── .gitignore
└── _redirects
```

## Paso 3: Configurar Git y Subirlo a GitHub

### 3.1 Abre Terminal/CMD en la carpeta del proyecto

**En Windows:** 
- Abre CMD o PowerShell en la carpeta

**En Mac/Linux:**
```bash
cd ~/panel-mooving  # O la ruta donde creaste la carpeta
```

### 3.2 Inicializa Git
```bash
git init
git add .
git commit -m "Initial commit: Panel Operaciones Mooving"
git branch -M main
git remote add origin https://github.com/tu-usuario/panel-mooving.git
git push -u origin main
```

**Nota**: Reemplaza `tu-usuario` con tu nombre de usuario de GitHub

### 3.3 Ingresa tus credenciales de GitHub
- GitHub te pedirá usuario y contraseña, o token de autenticación
- Si usas autenticación 2FA, deberás usar un "Personal Access Token"

## Paso 4: Conectar con Cloudflare Pages

### 4.1 Crea una cuenta en Cloudflare (si no tienes)
- Ve a https://dash.cloudflare.com
- Haz clic en "Sign up"
- Completa el registro

### 4.2 Accede a Cloudflare Pages
- Ve a https://pages.cloudflare.com/
- O desde el dashboard: **Workers & Pages** → **Pages**

### 4.3 Crea un nuevo proyecto
- Haz clic en "Create a project"
- Selecciona "Connect to Git"

### 4.4 Conecta tu cuenta GitHub
- Haz clic en "GitHub" (si no está conectado)
- Autoriza Cloudflare para acceder a tus repositorios
- Selecciona `panel-mooving` de la lista

### 4.5 Configura el despliegue
- **Project name**: `panel-mooving` (o similar)
- **Production branch**: `main`
- **Build command**: (dejar vacío - es HTML estático)
- **Build output directory**: `/` (raíz)
- **Environment variables**: (no necesarias)

### 4.6 Deploy
- Haz clic en "Save and Deploy"
- Espera a que se complete el despliegue (2-5 minutos)

## Paso 5: Tu Sitio está Vivo ✨

Después del despliegue, tu sitio estará disponible en:
```
https://panel-mooving.pages.dev
```

(El nombre puede variar según tu configuración)

## Actualizar el Sitio

Cada vez que hagas cambios:

```bash
git add .
git commit -m "Descripción del cambio"
git push origin main
```

Cloudflare se desplegará automáticamente en 1-2 minutos.

## Troubleshooting

### Error: "Permission denied (publickey)"
- Debes generar una SSH key o usar un Personal Access Token
- Ve a GitHub Settings → Developer settings → Personal access tokens
- Copia el token y úsalo como contraseña

### El sitio muestra 404
- Asegúrate que `index.html` está en la raíz del repositorio
- Verifica que `_redirects` está en la carpeta correcta
- Limpia el caché del navegador (Ctrl+Shift+Del)

### Los datos no se cargan
- Es normal - carga tu CSV con el botón "📤 Cargar CSV"
- Los datos se guardan en la memoria del navegador

## Dominio Personalizado (Opcional)

Para usar tu propio dominio:

1. En Cloudflare, ve a **Pages** → **tu proyecto**
2. **Settings** → **Custom domains**
3. Agrega tu dominio y sigue las instrucciones

## Soporte

Para problemas:
- Revisa la documentación de Cloudflare Pages: https://developers.cloudflare.com/pages/
- Abre un issue en tu repositorio de GitHub

---

¡Listo! Tu Panel de Operaciones Mooving está en vivo en Cloudflare Pages.
