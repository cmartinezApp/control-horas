# 🏗️ Documentación Técnica - Arquitectura del Sistema

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Flujo de Autenticación](#flujo-de-autenticación)
3. [Flujo de Autorización](#flujo-de-autorización)
4. [API Endpoints Detallados](#api-endpoints-detallados)
5. [Base de Datos](#base-de-datos)
6. [Seguridad](#seguridad)
7. [Componentes Frontend](#componentes-frontend)

---

## 🏛️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Frontend)                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ login.html  │ admin.html  │ view.html  │ register.html  │ │
│  │             │             │            │                 │ │
│  │ * JavaScript para UI      │            │ * Validación   │ │
│  │ * Fetch API para requests │            │   de datos    │ │
│  │ * Manejo de cookies       │            │ * Gráficos    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│                   Comunicación HTTP/REST                      │
└─────────────────────────────────────────────────────────────┘
                          ↓↑
                    HTTP/HTTPS
                          ↓↑
┌─────────────────────────────────────────────────────────────┐
│                  SERVIDOR (Backend)                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Express.js                            │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Middleware:                                             │ │
│  │ • body-parser (JSON parsing)                            │ │
│  │ • cookie-parser (Cookie handling)                       │ │
│  │ • authenticateToken (JWT validation)                    │ │
│  │ • authorizeAdmin (Admin check)                          │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Rutas (/routes.js):                                     │ │
│  │ • POST /api/login         → Autenticar usuario         │ │
│  │ • GET  /api/me            → Info del usuario           │ │
│  │ • POST /api/register      → Registrar usuario nuevo    │ │
│  │ • GET  /api/empresas      → Listar empresas            │ │
│  │ • GET  /api/horas/:anio/:mes  → Obtener horas         │ │
│  │ • POST /api/horas         → Crear entrada de horas    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    SQLite3 Database                      │ │
│  │                                                           │ │
│  │ • usuarios (users)                                       │ │
│  │ • empresas (companies)                                   │ │
│  │ • horas (hours records)                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Flujo de Autenticación

### Login Flow

```
┌──────────────────┐
│ Usuario Ingresa  │
│ Usuario/Password │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────────────┐
│ POST /api/login                      │
│ Body: {username, password}           │
└────────┬─────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│ 1. Buscar usuario en BD              │
│ 2. Comparar password con bcrypt      │
└────────┬─────────────────────────────┘
         │
         ↓
    ¿Válido?
    /    \
  SÍ      NO
  │        │
  ↓        ↓
┌──────┐ ┌────────────────────┐
│ OK   │ │ Error 400          │
└──┬───┘ │ Usuario no valido  │
   │     └────────────────────┘
   ↓
┌─────────────────────────────────────┐
│ 1. Generar JWT Token:               │
│    - user.id                        │
│    - user.username                  │
│    - user.empresa_id                │
│    - user.is_admin                  │
│    - Expira en 1 hora               │
│                                     │
│ 2. Establecer Cookie HTTP-only:     │
│    - authToken = token              │
│    - httpOnly: true                 │
│    - Expira en 1 hora               │
└──────┬──────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│ Response 200                                 │
│ {token: JWT, is_admin: boolean}             │
└──────┬───────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│ Cliente:                                     │
│ 1. Navegador guarda cookie automáticamente   │
│ 2. Redirigir a /admin.html o /view.html     │
└──────────────────────────────────────────────┘
```

---

## 🔒 Flujo de Autorización

### En cada petición protegida:

```
┌─────────────────────────────────┐
│ GET /admin.html                 │
│ (Cookie authToken adjuntada)    │
└────────┬────────────────────────┘
         │
         ↓
┌────────────────────────────────────────────┐
│ Middleware: authenticateToken()            │
│                                            │
│ 1. Leer cookie 'authToken'                │
│ 2. Si no existe → Redirect /login.html    │
│ 3. Si existe → Verificar JWT              │
└────────┬───────────────────────────────────┘
         │
         ↓
    JWT válido?
    /          \
  SÍ            NO
  │              │
  ↓              ↓
┌────┐      ┌─────────────────┐
│OK  │      │ Cookie expirada │
└─┬──┘      │ Redirect /login │
  │         └─────────────────┘
  ↓
¿Es ruta protegida?
 /              \
SÍ               NO
│                │
↓                ↓
Middleware:   Continuar
authorizeAdmin()
  │
  ↓
¿user.is_admin?
 /        \
SÍ         NO
│          │
↓          ↓
OK    Redirect
      /view.html
```

---

## 📡 API Endpoints Detallados

### 1. POST `/api/login`
**Autenticación de usuario**

```
Request:
POST /api/login
Content-Type: application/json
Credentials: include

{
  "username": "juan",
  "password": "pass123"
}

Response (200 OK):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "is_admin": false
}

Cookies Set:
authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...;
HttpOnly;
Secure;
SameSite=Strict;
Max-Age=3600000

Errores:
- 400: Usuario no encontrado
- 400: Contraseña incorrecta
```

---

### 2. GET `/api/me`
**Obtener datos del usuario autenticado**

```
Request:
GET /api/me
Credentials: include
(Cookie authToken adjuntada automáticamente)

Response (200 OK):
{
  "id": 1,
  "username": "juan",
  "empresa_id": 5,
  "is_admin": false
}

Errores:
- 401: No autorizado
- 403: Token inválido
```

---

### 3. POST `/api/register`
**Registrar nuevo usuario (solo Admin)**

```
Request:
POST /api/register
Content-Type: application/json
Credentials: include

{
  "username": "nuevousuario",
  "password": "nuevapass",
  "clave_maestra": "5!Pipokross*",
  "empresa_id": 2,
  "is_admin": 0
}

Response (200 OK):
{
  "id": 15
}

Errores:
- 400: Campos faltantes
- 403: Clave maestra incorrecta
- 500: Usuario ya existe
```

**Notas:**
- Solo admin puede registrar
- Requiere clave maestra correcta
- Contraseña es hasheada con bcryptjs

---

### 4. GET `/api/empresas`
**Obtener lista de empresas**

```
Request:
GET /api/empresas
Credentials: include

Response (200 OK):
[
  {
    "id": 1,
    "nombre": "Empresa A",
    "horas_libres": 680,
    "horas_totales": 720
  },
  {
    "id": 2,
    "nombre": "Empresa B",
    "horas_libres": 500,
    "horas_totales": 720
  }
]
```

---

### 5. GET `/api/horas/:anio/:mes`
**Obtener horas de un período (mes/año)**

```
Request:
GET /api/horas/2026/04
Credentials: include

Query params (opcional):
?empresa_id=2

Response (200 OK):
[
  {
    "id": 1,
    "fecha": "2026-04-01",
    "horas_usadas": 60,
    "horas_libres": 660,
    "solicitante": "Juan",
    "tarea": "Desarrollo",
    "empresa_id": 1
  },
  {
    "id": 2,
    "fecha": "2026-04-05",
    "horas_usadas": 120,
    "horas_libres": 540,
    "solicitante": "Maria",
    "tarea": "Testing",
    "empresa_id": 1
  }
]

Notas:
- Si usuario NO es admin: solo ve su empresa
- Si usuario ES admin: puede filtrar cualquier empresa
- Si no pasan empresa_id: admin ve TODAS
```

---

### 6. POST `/api/horas`
**Crear nueva entrada de horas**

```
Request:
POST /api/horas
Content-Type: application/json
Credentials: include

{
  "fecha": "2026-04-06",
  "horas_usadas": 90,
  "solicitante": "Carlos",
  "tarea": "Mantenimiento",
  "empresa_id": 1
}

Response (200 OK):
{
  "id": 45
}

Process:
1. Validar datos
2. Obtener horas_libres actuales de empresa
3. Calcular nuevas_horas_libres = horas_libres - horas_usadas
4. Insertar registro en tabla horas
5. Actualizar horas_libres en tabla empresas

Errores:
- 400: Datos inválidos
- 404: Empresa no encontrada
- 500: Error BD
```

---

### 7. GET `/api/horas-libres/:empresa_id`
**Obtener horas libres de una empresa**

```
Request:
GET /api/horas-libres/1
Credentials: include

Response (200 OK):
{
  "horas_libres": 540
}

Errores:
- 404: Empresa no encontrada
```

---

### 8. POST `/api/renew`
**Renovar horas de TODAS las empresas (solo Admin)**

```
Request:
POST /api/renew
Credentials: include

Response (200 OK):
{
  "message": "Horas renovadas para todas las empresas"
}

Process:
UPDATE empresas SET horas_libres = horas_totales

Errores:
- 403: No es admin
- 500: Error BD
```

---

## 💾 Base de Datos

### Schema Completo

```sql
-- Tabla de usuarios
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  empresa_id INTEGER NOT NULL,
  is_admin BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

-- Tabla de empresas
CREATE TABLE empresas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT UNIQUE NOT NULL,
  horas_libres INTEGER DEFAULT 720,
  horas_totales INTEGER DEFAULT 720,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de registros de horas
CREATE TABLE horas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha DATE NOT NULL,
  horas_usadas INTEGER NOT NULL,
  horas_libres INTEGER NOT NULL,
  solicitante TEXT NOT NULL,
  tarea TEXT NOT NULL,
  empresa_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

-- Índices para optimizar consultas
CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX idx_horas_empresa ON horas(empresa_id);
CREATE INDEX idx_horas_fecha ON horas(fecha);
```

---

## 🛡️ Seguridad

### 1. Almacenamiento de Contraseñas
```javascript
// En login y registro
const hashedPassword = await bcrypt.hash(password, 10);
// 10 = salt rounds (costo computacional)
```

### 2. JWT Token
```javascript
// Payload incluye:
{
  id: user.id,
  username: user.username,
  empresa_id: user.empresa_id,
  is_admin: user.is_admin === 1
  iat: <issued-at>,
  exp: <expiration> // 1 hora después
}

// Firmado con SECRET_KEY
// Solo verificable con la misma clave
```

### 3. Cookies HTTP-Only
```javascript
res.cookie('authToken', token, {
  httpOnly: true,   // No accesible desde JavaScript
  secure: false,    // true en producción HTTPS
  sameSite: 'strict' // Protege CSRF
});
```

### 4. Validación en Backend
- Cada endpoint protegido valida JWT
- Se verifica expiración
- Se verifica permisos (admin/usuario)

### 5. Protección CSRF
- Cookies con `SameSite: Strict`
- Valida origen de requests

---

## 🎨 Componentes Frontend

### login.html / login.js
```
Flujo:
1. Usuario ingresa usuario/pass
2. Fetch POST /api/login
3. Navegador guarda cookie automáticamente
4. Decodificar response para saber tipo de usuario
5. Redirigir a /admin.html o /view.html
```

### admin.html / admin.js
```
Flujo:
1. Verificar autenticación llamando /api/me
2. Si no es admin: redirigir a /view.html
3. Cargar lista de empresas
4. Formulario para cargar horas
5. Al enviar: POST /api/horas
6. Actualizar horas libres
```

### view.html / view.js
```
Flujo:
1. Verificar autenticación
2. Obtener info del usuario
3. Si es admin: mostrar selector de empresas
4. Si NO es admin: solo ver su empresa
5. Cargar tabla y gráfico de horas
6. Mostrar horas libres
7. Filtrar por mes/año
```

### register.html / register.js
```
Flujo:
1. Verificar que sea admin
2. Cargar lista de empresas
3. Formulario con campos:
   - username
   - password
   - empresa (select)
   - clave_maestra
4. POST /api/register
5. Validar clave maestra
6. Crear usuario
```

---

## 🔄 Flujos de Datos

### Cargar Horas (Admin)

```
admin.html
    ↓
[Formulario Data]
    ↓
admin.js
    ↓
fetch POST /api/horas
    ↓
server.js (routes)
    ↓
1. Validar datos
2. Obtener horas_libres actual
3. Calcular nuevas horas
    ↓
database.db
    ↓
INSERT horas table
UPDATE empresas table
    ↓
Response 200 {id}
    ↓
admin.js actualiza UI
```

### Ver Horas (Usuario Común)

```
view.html
    ↓
fetch GET /api/me
    ↓
Obtener empresa_id del usuario
    ↓
fetch GET /api/horas/:año/:mes?empresa_id=X
    ↓
server valida:
- JWT válido?
- Es admin? Si no → usar empresa_id del token
    ↓
database.db
    ↓
SELECT * FROM horas
WHERE fecha >= ... AND empresa_id = ?
    ↓
Response [horas...]
    ↓
view.js:
- Cargar tabla
- Generar gráfico
- Mostrar horas_libres
```

---

## 📊 Estados y Transiciones

### Estado de Usuario

```
┌─────────────────┐
│ No Autenticado  │
└────────┬────────┘
         │
         │ POST /api/login ✓
         │
         ↓
┌─────────────────────────────────┐
│ Autenticado + Cookie HttpOnly   │
│ JWT en memoria del navegador    │
└────────────┬────────────────────┘
             │
    ┌────────┴─────────┐
    │                  │
    ↓                  ↓
┌────────┐       ┌──────────┐
│ Admin  │       │ Usuario  │
│        │       │ Común    │
└────────┘       └──────────┘
```

---

## 🔗 Relaciones de Datos

```
usuarios → empresas (1:N)
         └─ empresa_id

empresas → horas (1:N)
        └─ empresa_id

horas → usuarios (N:1)
      └ solicitante (referencia por nombre)
```

---

## 📈 Escalabilidad Futura

Si el proyecto crece, considerar:

1. **Migraciones a PostgreSQL**
   - Mejor para concurrencia
   - Mayor capacidad

2. **Caché (Redis)**
   - Empresas frecuentes
   - Lista de horas

3. **Logs y Auditoría**
   - Quién cambió qué, cuándo

4. **Roles más granulares**
   - Lectura/Escritura separadas
   - Supervisores por empresa

5. **API Gateway**
   - Rate limiting
   - Throttling
   - Load balancing

