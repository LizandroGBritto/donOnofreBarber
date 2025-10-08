# 🚀 Guía de Despliegue para Producción

## 📋 Preparación para Producción

### 1. Variables de Entorno Requeridas

Copia el archivo `.env.example` a `.env` y configura las siguientes variables:

#### Base de Datos

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/OnofreDb
DB_NAME=OnofreDb
```

#### Servidor y URLs

```env
NODE_ENV=production
PORT=8000
CLIENT_URL=https://tu-dominio.com
SERVER_URL=https://api.tu-dominio.com
```

#### Seguridad

```env
JWT_SECRET=una_clave_muy_segura_de_al_menos_32_caracteres
```

#### Notificaciones Push (VAPID)

```env
VAPID_PUBLIC_KEY=tu_clave_publica_vapid
VAPID_PRIVATE_KEY=tu_clave_privada_vapid
VAPID_EMAIL=tu-email@dominio.com
```

#### Pagos (Adam's Pay)

```env
ADAM_API_KEY=tu_api_key_produccion
ADAM_API_SECRET=tu_api_secret_produccion
ADAM_API_URL=https://production.adamspay.com/api/v1
```

### 2. Generar Claves VAPID

Para generar nuevas claves VAPID para producción:

```javascript
const webpush = require("web-push");
const vapidKeys = webpush.generateVAPIDKeys();
console.log("Public Key:", vapidKeys.publicKey);
console.log("Private Key:", vapidKeys.privateKey);
```

### 3. Configuración de Base de Datos

#### MongoDB Atlas (Recomendado para producción)

1. Crear cuenta en [MongoDB Atlas](https://cloud.mongodb.com)
2. Crear un cluster
3. Configurar usuario de base de datos
4. Obtener string de conexión
5. Añadir IP del servidor a la whitelist

#### MongoDB Local

Si usas MongoDB local, asegúrate de:

- Tener replica set configurado
- Configurar autenticación
- Backup automático

### 4. Lista de Verificación Pre-Despliegue

- [ ] Todas las variables de entorno configuradas
- [ ] Base de datos de producción configurada
- [ ] Claves VAPID generadas para producción
- [ ] API keys de Adam's Pay actualizadas
- [ ] CORS configurado con dominio de producción
- [ ] JWT_SECRET único y seguro
- [ ] Archivos .env no incluidos en repositorio
- [ ] Directorio uploads/ con permisos correctos

### 5. Comandos de Despliegue

#### Instalar dependencias

```bash
cd server
npm install --production
```

#### Ejecutar aplicación

```bash
# Desarrollo
npm start

# Producción con PM2 (recomendado)
npm install -g pm2
pm2 start server.js --name "onofre-api"
pm2 startup
pm2 save
```

### 6. Configuración del Servidor Web

#### Nginx (Ejemplo)

```nginx
server {
    listen 80;
    server_name api.tu-dominio.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7. Monitoreo y Logs

#### Con PM2

```bash
# Ver logs
pm2 logs onofre-api

# Monitorear recursos
pm2 monit

# Reiniciar aplicación
pm2 restart onofre-api
```

### 8. Backup y Mantenimiento

#### Backup de MongoDB

```bash
# Backup
mongodump --uri="mongodb+srv://..." --out=./backup-$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb+srv://..." ./backup-folder
```

#### Backup de archivos subidos

```bash
# Crear backup del directorio uploads
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
```

### 9. Variables de Entorno para Diferentes Ambientes

#### Desarrollo

```env
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/OnofreDb
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:8000
```

#### Staging

```env
NODE_ENV=staging
MONGODB_URI=mongodb+srv://staging-user:password@staging-cluster.mongodb.net/OnofreDb-staging
CLIENT_URL=https://staging.tu-dominio.com
SERVER_URL=https://api-staging.tu-dominio.com
```

#### Producción

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://prod-user:password@prod-cluster.mongodb.net/OnofreDb
CLIENT_URL=https://tu-dominio.com
SERVER_URL=https://api.tu-dominio.com
```

### 10. Consideraciones de Seguridad

- ✅ Nunca commitear archivos .env
- ✅ Usar HTTPS en producción
- ✅ Configurar rate limiting
- ✅ Validar todas las entradas
- ✅ Mantener dependencias actualizadas
- ✅ Configurar firewall del servidor
- ✅ Usar claves JWT fuertes y únicas
- ✅ Configurar CORS restrictivo

### 11. Troubleshooting Común

#### Error: "Configuración no válida"

- Verificar que todas las variables de entorno estén configuradas
- Revisar formato de MONGODB_URI
- Confirmar que JWT_SECRET esté definido

#### Error de CORS

- Verificar CLIENT_URL en .env
- Confirmar configuración de CORS en servidor

#### Problemas de notificaciones

- Verificar claves VAPID
- Confirmar VAPID_EMAIL válido
- Revisar permisos de notificaciones en navegador
