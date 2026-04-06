# Sistema de Gestión de Horas - CM IT Consulting

## 📋 Descripción

Aplicación web para gestionar y controlar horas de trabajo por empresa. Cuenta con un sistema de autenticación con dos tipos de usuarios:

- **Administrador**: Puede cargar horas, registrar usuarios y visualizar datos de todas las empresas
- **Usuario Común**: Solo puede visualizar las horas de su empresa asignada

---

## 🔧 Requisitos Previos

Antes de instalar el proyecto en un servidor nuevo, necesitas tener instalados:

### Sistema Operativo
- **Linux** (Ubuntu 18.04+, Debian, CentOS, etc.)
- **macOS** (10.14+)
- **Windows** (con WSL2 o Git Bash)

### Software Necesario
1. **Node.js** (versión 14.0 o superior)
   ```bash
   # Verificar versión instalada
   node --version
   ```

2. **npm** (viene incluido con Node.js)
   ```bash
   npm --version
   ```

### Sistema de Base de Datos
- **SQLite3**: Se instala automáticamente con npm (no requiere configuración adicional)

---

## 📦 Instalación Paso a Paso

### 1. Clonar o descargar el proyecto

```bash
# Si el proyecto está en un repositorio Git
git clone <URL_DEL_REPOSITORIO>
cd cmit

# Si es un archivo descargado
unzip cmit.zip
cd cmit
```

### 2. Instalar dependencias

```bash
npm install
```

Este comando instala todos los paquetes necesarios:
- Express.js (servidor web)
- SQLite3 (base de datos)
- JWT (autenticación)
- bcryptjs (cifrado de contraseñas)
- body-parser (parseo de datos)
- cookie-parser (manejo de cookies)
- dotenv (variables de entorno)

### 3. Configurar variables de entorno

#### En la raíz del proyecto (`.env`):
```
SECRET_KEY=VgRiMF29#an2$GZ9@DuYKr3!
CLAVE_MAESTRA=5!Pipokross*
HORAS_PAGADAS=720
HORAS_LIBRES=20
```

#### En la carpeta `server/` (`server/.env`):
```
SECRET_KEY=VgRiMF29#an2$GZ9@DuYKr3!
CLAVE_MAESTRA=5!Pipokross*
HORAS_PAGADAS=720
HORAS_LIBRES=20
```

**⚠️ Nota importantes:**
- Cambia `SECRET_KEY` y `CLAVE_MAESTRA` por valores seguros único para tu servidor
- No compartas estas claves en repositorios públicos
- Guarda `.env` en `.gitignore` para no subirlo a control de versiones

### 4. Inicializar la base de datos

```bash
# La base de datos se crea automáticamente la primera vez que inicies el servidor
# Si necesitas resetear la BD (borrar todos los datos):
node server/reset.js
```

### 5. Iniciar el servidor

```bash
npm start
```

El servidor estará disponible en: **`http://localhost:3001`**

---

## 🗂️ Estructura del Proyecto

```
cmit/
├── public/                  # Archivos del cliente (HTML, CSS, JS)
│   ├── login.html          # Página de login
│   ├── admin.html          # Página de administtrador
│   ├── view.html           # Página de visualización de horas
│   ├── register.html       # Página de registro de usuarios
│   ├── css/                # Estilos CSS
│   │   ├── login-styles.css
│   │   ├── admin-styles.css
│   │   ├── view-styles.css
│   │   └── register-styles.css
│   └── js/                 # Scripts JavaScript
│       ├── login.js
│       ├── admin.js
│       ├── view.js
│       └── register.js
│
├── server/                 # Backend y lógica del servidor
│   ├── server.js          # Configuración principal del servidor
│   ├── routes.js          # Rutas API
│   ├── db.js              # Configuración de base de datos
│   ├── manage.js          # Funciones de gestión
│   ├── .env               # Variables de entorno
│   ├── database.db        # Base de datos SQLite (se crea automáticamente)
│   └── reset.js           # Script para resetear BD
│
├── package.json           # Dependencias del proyecto
├── .env                   # Variables de entorno (raíz)
└── README.md             # Este archivo
```

---

## 🚀 Uso de la Aplicación

### 1️⃣ Acceder a la aplicación
1. Abre el navegador: `http://localhost:3001`
2. Inicia sesión con tus credenciales

### 2️⃣ Para Administrador
**Pantalla: `/admin.html`**
- ✅ Cargar horas de trabajo por empresa
- ✅ Registrar nuevos usuarios
- ✅ Visualizar todas las empresas y sus horas en `/view.html`

**Acciones disponibles:**
```
1. Seleccionar empresa
2. Ingresar fecha, minutos usados, solicitante y tarea
3. Hacer clic en "Cargar Minutos"
4. Registrar usuario: Clic en "Registrar Usuario"
5. Ver datos: Ir a "pantalla de visualización"
```

### 3️⃣ Para Usuario Común
**Pantalla: `/view.html`**
- ✅ Visualizar horas de su empresa
- ✅ Ver gráficos y tablas
- ✅ Filtrar por mes y año

**Restricciones:**
- ❌ No puede acceder a `/admin.html`
- ❌ No puede registrar usuarios
- ❌ Solo ve datos de su empresa asignada

---

## 🔐 Seguridad

### Autenticación
- **Método**: JWT (JSON Web Tokens)
- **Duración**: 1 hora
- **Almacenamiento**: Cookies HTTP-only (no accesibles desde JavaScript)
- **Codificación**: bcryptjs para contraseñas

### Autorización
- **Middleware**: Valida token en cada petición
- **Rutas protegidas**:
  - `/admin.html` → Solo admin
  - `/view.html` → Admin y usuarios comunes
  - `/register.html` → Solo admin

---

## 📊 Base de Datos

### Estructura (SQLite3)

**Tabla `usuarios`**
```sql
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  empresa_id INTEGER,
  is_admin BOOLEAN,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);
```

**Tabla `empresas`**
```sql
CREATE TABLE empresas (
  id INTEGER PRIMARY KEY,
  nombre TEXT,
  horas_libres INTEGER,
  horas_totales INTEGER
);
```

**Tabla `horas`**
```sql
CREATE TABLE horas (
  id INTEGER PRIMARY KEY,
  fecha DATE,
  horas_usadas INTEGER,
  horas_libres INTEGER,
  solicitante TEXT,
  tarea TEXT,
  empresa_id INTEGER,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);
```

---

## 🔌 API Endpoints

### Autenticación

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| POST | `/api/login` | Iniciar sesión | ❌ No |
| POST | `/api/register` | Registrar usuario | ✅ Admin |
| POST | `/api/logout` | Cerrar sesión | ✅ Sí |
| GET | `/api/me` | Obtener info del usuario | ✅ Sí |

### Horas

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| GET | `/api/horas/:anio/:mes` | Obtener horas por mes/año | ✅ Sí |
| POST | `/api/horas` | Crear nueva entrada de horas | ✅ Sí |
| GET | `/api/horas-libres/:empresa_id` | Obtener horas libres | ✅ Sí |

### Empresas

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| GET | `/api/empresas` | Obtener todas las empresas | ❌ No |

---

## 🆘 Solución de Problemas

### Error: "Cannot find module 'express'"
```bash
# Solución: Instalar dependencias
npm install
```

### Error: "ENOENT: no such file or directory, open '.env'"
```bash
# Solución: Crear archivo .env con variables requeridas
cp .env.example .env
```

### Base de datos corrupta
```bash
# Solución: Resetear la BD (se borran todos los datos)
node server/reset.js
npm start
```

### Puerto 3001 ya en uso
```bash
# Solución: Cambiar puerto en server.js (línea 10)
const PORT = 3002;  // Usar otro puerto
```

---

## 📝 Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SECRET_KEY` | Clave para firmar JWT | Cadena aleatoria segura |
| `CLAVE_MAESTRA` | Clave para registrar admin | Cadena aleatoria segura |
| `HORAS_PAGADAS` | Minutos totales por mes | 720 |
| `HORAS_LIBRES` | Minutos libres iniciales | 20 |

---

## 🛠️ Mantenimiento

### Crear backup de la base de datos
```bash
cp server/database.db server/database.db.backup
```

### Actualizar dependencias
```bash
npm update
```

### Ver logs del servidor
```bash
# El servidor muestra logs en consola
# Para guardarlos en archivo:
npm start > server.log 2>&1
```

---

## 🚢 Deployment (Producción)

### Cambios necesarios para producción:

1. **Cambiar HTTPS** en `server/routes.js` (línea que establece cookie):
```javascript
res.cookie('authToken', token, {
  httpOnly: true,
  secure: true,        // ← Cambiar a true
  sameSite: 'strict',
  maxAge: 3600000
});
```

2. **Cambiar puerto** en `server/server.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

3. **Usar gestor de procesos** (recomendado: PM2):
```bash
npm install -g pm2
pm2 start server/server.js --name "control-horas"
```

4. **Usar proxy inverso** (Nginx):
```nginx
server {
    listen 80;
    server_name dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 👨‍💻 Autor

**Carlos Martínez** - CM IT Consulting

📧 Email: cm.it-consulting@outlook.com
📱 WhatsApp: +54 3624604122

---

## 📄 Licencia

ISC

---

## 📚 Recursos Adicionales

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [JWT.io](https://jwt.io/)

---

**Última actualización**: 2026-04-06
