# 🚀 Guía Rápida de Instalación en Servidor Nuevo

## ⚡ Pasos Rápidos (5 minutos)

### 1. Instalar Node.js

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs
```

**macOS:**
```bash
brew install node
```

**Verificar:**
```bash
node --version
npm --version
```

---

### 2. Descargar Proyecto

```bash
# Opción A: Git
git clone <URL_REPO>
cd cmit

# Opción B: Archivo ZIP
unzip cmit.zip
cd cmit
```

---

### 3. Instalar Dependencias

```bash
npm install
```

Esto instala:
- express
- sqlite3
- jsonwebtoken
- bcryptjs
- cookie-parser
- body-parser
- dotenv

---

### 4. Configurar Archivos `.env`

**`.env` (raíz):**
```bash
cat > .env << EOF
SECRET_KEY=TuClaveSecretaAquí123!
CLAVE_MAESTRA=ClaveParaAdmins456!
HORAS_PAGADAS=720
HORAS_LIBRES=20
EOF
```

**`server/.env`:**
```bash
cat > server/.env << EOF
SECRET_KEY=TuClaveSecretaAquí123!
CLAVE_MAESTRA=ClaveParaAdmins456!
HORAS_PAGADAS=720
HORAS_LIBRES=20
EOF
```

---

### 5. Iniciar Servidor

```bash
npm start
```

✅ **¡Listo!** Servidor corriendo en `http://localhost:3001`

---

## ✅ Checklist de Instalación

- [ ] Node.js instalado (`node --version`)
- [ ] npm instalado (`npm --version`)
- [ ] Proyecto descargado
- [ ] `npm install` completado
- [ ] Archivos `.env` configurados
- [ ] Servidor iniciado (`npm start`)
- [ ] Base de datos creada (automática)
- [ ] Acceso a `http://localhost:3001`

---

## 🔑 Variables Clave

| Variable | Propósito |
|----------|-----------|
| `SECRET_KEY` | Firma de tokens JWT (cambiar) |
| `CLAVE_MAESTRA` | Contraseña para registrar admin (cambiar) |
| `HORAS_PAGADAS` | Minutos totales por período |
| `HORAS_LIBRES` | Minutos libres inicial |

**⚠️ Cambiar estas valores en producción**

---

## 🔥 En Producción (usando PM2)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicación
pm2 start server/server.js --name "control-horas"

# Autoarranque
pm2 startup
pm2 save

# Monitorear
pm2 monit
```

---

## 📞 Soporte

- Email: cm.it-consulting@outlook.com
- WhatsApp: +54 3624604122

