# 🐳 Guía de Instalación con Docker

## ¿Por qué usar Docker?

✅ **Ventajas:**
- Entorno consistente en todos los servidores
- No necesitas instalar Node.js manualmente
- Aislamiento de la aplicación
- Fácil deployment y escalabilidad
- Reproducibilidad garantizada

---

## 📋 Requisitos

### Instalar Docker

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker
```

**CentOS/RHEL:**
```bash
sudo yum install -y docker docker-compose
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
```

**macOS (con Homebrew):**
```bash
brew install docker docker-compose
```

**Windows:**
- Descargar [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)

**Verificar instalación:**
```bash
docker --version
docker-compose --version
```

---

## 🚀 Instalación Rápida con Docker Compose

### 1. Descargar/Clonar proyecto

```bash
git clone <URL_REPO>
cd cmit
```

### 2. Crear archivo `.env` (si no existe)

```bash
cat > .env << EOF
SECRET_KEY=TuClaveSecretaAquí123!
CLAVE_MAESTRA=ClaveParaAdmins456!
HORAS_PAGADAS=720
HORAS_LIBRES=20
EOF
```

```bash
mkdir -p server
cat > server/.env << EOF
SECRET_KEY=TuClaveSecretaAquí123!
CLAVE_MAESTRA=ClaveParaAdmins456!
HORAS_PAGADAS=720
HORAS_LIBRES=20
EOF
```

### 3. Iniciar los contenedores

```bash
# Construir e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f control-horas

# Verificar estado
docker-compose ps
```

### 4. Acceder a la aplicación

```
http://localhost:3001
```

---

## 🛠️ Comandos Útiles de Docker

### Iniciar/Detener/Reiniciar
```bash
# Iniciar
docker-compose up -d

# Detener
docker-compose stop

# Reiniciar
docker-compose restart

# Detener y eliminar contenedores
docker-compose down
```

### Ver logs
```bash
# Logs en vivo
docker-compose logs -f

# Últimas 100 líneas
docker-compose logs --tail=100

# Logs de un servicio específico
docker-compose logs -f control-horas
```

### Ejecutar comandos en el contenedor
```bash
# Acceder a la terminal del contenedor
docker-compose exec control-horas sh

# Ejecutar comando
docker-compose exec control-horas npm --version

# Resetear base de datos
docker-compose exec control-horas node server/reset.js
```

### Información y mantenimiento
```bash
# Ver estado de servicios
docker-compose ps

# Ver estadísticas de uso
docker stats control-horas

# Limpieza: remover contenedores detenidos
docker-compose down -v

# Remover imágenes
docker image rm control-horas:latest
```

---

## 🐳 Construcción Manual (sin Docker Compose)

### 1. Construir imagen

```bash
docker build -t control-horas:latest .
```

### 2. Ejecutar contenedor

```bash
docker run -d \
  --name control-horas \
  -p 3001:3001 \
  -e SECRET_KEY="VgRiMF29#an2$GZ9@DuYKr3!" \
  -e CLAVE_MAESTRA="5!Pipokross*" \
  -e HORAS_PAGADAS=720 \
  -e HORAS_LIBRES=20 \
  -v $(pwd)/server/database.db:/app/server/database.db \
  -v $(pwd)/server/.env:/app/server/.env:ro \
  control-horas:latest
```

### 3. Ver logs

```bash
docker logs -f control-horas
```

### 4. Detener

```bash
docker stop control-horas
docker rm control-horas
```

---

## 📦 Estructura de Docker

### Dockerfile

```dockerfile
# Multi-stage build para optimizar imagen
FROM node:18-alpine AS builder
  # Instala dependencias

FROM node:18-alpine
  # Ejecuta aplicación
  # Usuario no-root por seguridad
  # Health check automático
  # Dumb-init para manejo de señales
```

**Características:**
- ✅ Multi-stage: imagen final más pequeña (~150MB)
- ✅ Alpine: base lightweight
- ✅ Usuario no-root: seguridad
- ✅ Health check: detecta fallos automáticamente
- ✅ Dumb-init: manejo correcto de procesos

### docker-compose.yml

**Servicios:**
- `control-horas`: Aplicación Node.js

**Configuración:**
- Volúmenes: Base de datos persistente
- Puertos: 3001 exposición
- Variables de entorno: Desde archivo .env
- Health check: Verifica estado cada 30s
- Reinicio automático: unless-stopped
- Red privada: Aislamiento

---

## 🔐 Seguridad en Docker

### Prácticas implementadas:

1. **Usuario no-root**
   ```dockerfile
   USER nodejs  # No corre como root
   ```

2. **Image scanning**
   ```bash
   docker scan control-horas:latest
   ```

3. **Actualizar base regularmente**
   ```bash
   docker pull node:18-alpine
   docker-compose build --pull
   ```

4. **Secretos seguros**
   - Usa archivo `.env` (no versionado en git)
   - Variables de entorno en docker-compose
   - Nunca incluyas secretos en Dockerfile

---

## 📊 Volúmenes y Persistencia

### Base de datos

```yaml
volumes:
  - ./server/database.db:/app/server/database.db
```

**Esto significa:**
- Base de datos del contenedor se persiste en el host
- Si eliminas contenedor, BD se conserva
- Múltiples contenedores pueden compartir BD

### Manejo de datos

```bash
# Hacer backup de BD
docker-compose exec control-horas cp \
  /app/server/database.db \
  /app/server/database.db.backup

# Restaurar BD
docker-compose exec control-horas cp \
  /app/server/database.db.backup \
  /app/server/database.db
```

---

## 🚢 Deployment en Producción

### Cambios recomendados

#### 1. En `docker-compose.yml`:

```yaml
services:
  control-horas:
    environment:
      - NODE_ENV=production
      - SECRET_KEY=${SECRET_KEY}  # Desde variable
      - CLAVE_MAESTRA=${CLAVE_MAESTRA}
    restart: always  # Reinicio automático
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

#### 2. Usar Nginx como proxy inverso

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - control-horas

  control-horas:
    # ... con expose en lugar de ports
    expose:
      - 3001
```

#### 3. Variables de entorno seguras

```bash
# Crear archivo .env.prod (NO versionar)
SECRET_KEY=$(openssl rand -base64 32)
CLAVE_MAESTRA=$(openssl rand -base64 16)

# Cargar en docker-compose
docker-compose --env-file .env.prod up -d
```

#### 4. Logs centralizados

```yaml
services:
  control-horas:
    logging:
      driver: "splunk"  # o "awslogs", "gcplogs"
      options:
        splunk-token: "${SPLUNK_TOKEN}"
        splunk-url: "${SPLUNK_URL}"
```

---

## 🆘 Solución de Problemas

### Error: Puerto 3001 en uso

```bash
# Opción 1: Usar otro puerto
docker-compose down
# Editar docker-compose.yml
# ports: "3002:3001"
docker-compose up -d

# Opción 2: Ver qué usa el puerto
docker ps | grep 3001
```

### Error: Permiso denegado al ejecutar docker

```bash
# Solución
sudo usermod -aG docker $USER
newgrp docker
```

### Base de datos corrupta

```bash
# Eliminar y recrear
docker-compose down -v
docker-compose up -d
```

### El contenedor se detiene inmediatamente

```bash
# Ver logs
docker-compose logs -f control-horas

# Acceder a terminal para debug
docker run -it --rm \
  -v $(pwd)/server/.env:/app/server/.env:ro \
  control-horas:latest sh
```

### Cambios en código no se reflejan

```bash
# Reconstruir imagen
docker-compose build --no-cache control-horas
docker-compose restart
```

---

## 📈 Escalabilidad con Docker

### Correr múltiples instancias

```yaml
services:
  control-horas-1:
    build: .
    ports:
      - "3001:3001"

  control-horas-2:
    build: .
    ports:
      - "3002:3001"

  # Con Nginx balanceador de carga...
```

### Registry privado (para equipos)

```bash
# Taggear imagen
docker tag control-horas:latest \
  registry.empresa.com/control-horas:1.0.0

# Push a registro privado
docker push registry.empresa.com/control-horas:1.0.0

# Pull en otro servidor
docker pull registry.empresa.com/control-horas:1.0.0
```

---

## 📊 Monitoreo

### Ver uso de recursos

```bash
docker stats control-horas

# Output:
# CONTAINER    CPU%  MEM USAGE / LIMIT
# control...   0.5%  85.2 MiB / 512 MiB
```

### Health check

```bash
# Ver estado
docker-compose ps

# Output:
# STATUS: Up 2 hours (healthy) ✓
# STATUS: Up 5 min (unhealthy) ✗
```

### Logs

```bash
# Exportar logs para análisis
docker-compose logs control-horas > logs.txt

# Filtrar por error
docker-compose logs control-horas | grep -i error
```

---

## 🔄 CI/CD con Docker

### GitHub Actions ejemplo

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build Docker image
        run: docker build -t control-horas:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | \
          docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push control-horas:${{ github.sha }}

      - name: Deploy
        run: |
          ssh user@server 'cd /app && \
          docker-compose pull && \
          docker-compose up -d'
```

---

## 📚 Recursos

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Security Best Practices](https://docs.docker.com/engine/security/)

---

## ✅ Checklist Docker

- [ ] Docker instalado (`docker --version`)
- [ ] docker-compose instalado (`docker-compose --version`)
- [ ] Permisos de usuario configurados
- [ ] Archivos `.env` creados
- [ ] `docker-compose up -d` funcionando
- [ ] Aplicación accesible en http://localhost:3001
- [ ] Logs sin errores
- [ ] Base de datos persistente verificada

---

**Última actualización**: 2026-04-06
