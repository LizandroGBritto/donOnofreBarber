# Bitácora del Proyecto — Don Onofre Barbería

Registro histórico de auditorías, decisiones técnicas e incidentes del proyecto. Entradas en orden cronológico inverso (más reciente arriba).

---

## 2026-07-17 — Despliegue a producción (VPS Dattatec, alonzostyle.com)

**Alcance:** primer despliegue real del proyecto, sobre una VPS Ubuntu 22.04 nueva (Dattatec, 1 vCPU / ~1GB RAM / 15GB disco) contratada para este fin. Ejecutado en 6 fases (hardening de SO → runtime → deploy de la app → seed de datos reales → verificación de seguridad y e2e → esta entrada de cierre), con verificación después de cada paso. Sin Docker (fuera de presupuesto de RAM); WhatsApp/Evolution API y pagos Adam's Pay quedan **fuera de alcance** por ahora — el código ya tolera su ausencia (solo loguea un warning).

**Arquitectura elegida:**
- Un solo origen: Nginx sirve el build estático de `client/dist` y hace proxy de `/api` y `/uploads` al proceso Node local (127.0.0.1:8000). Sin subdominio `api.*`, evita CORS cross-origin y un certificado extra.
- `systemd` en vez de PM2 para correr Node (sin daemon residente extra, RAM ajustada). Unit con `MemoryMax=450M`, `--max-old-space-size=384`, más hardening (`ProtectSystem=strict`, `NoNewPrivileges`, `ProtectHome`), corriendo como usuario de sistema sin privilegios (`dononofre`), no root.
- MongoDB 7.0 local (no Atlas), `bindIp: 127.0.0.1` (nunca expuesto), `wiredTigerCacheSizeGB: 0.25`, `security.authorization: enabled` con usuario dedicado de la app (permisos solo sobre `OnofreDb`, no admin global).
- Swap de 2GB en disco (con <1GB de RAM real, protección barata contra OOM-kill en picos como `npm install` o `sharp` procesando imágenes).
- TLS con Let's Encrypt/Certbot (snap), renovación automática verificada con `--dry-run` y timer de systemd activo.
- fail2ban con jail sobre los dos puertos SSH (22 y 5749) — verificado de punta a punta con un ban/unban real de prueba (IP de TEST-NET-2), no solo revisando el archivo de config.
- UFW activo, únicamente 22/5749/80/443 abiertos; confirmado desde afuera de la VPS que Mongo (27017) y el puerto directo de Node (8000) no responden.
- Rate limiting en Nginx sobre el login (`/api/auth/login` **y** `/api/user/login`, mismo router montado en ambos prefijos — se detectó que solo cubrir uno dejaba un bypass trivial del límite) y sobre `/api/` en general.
- Headers de seguridad agregados en Nginx (no existían): `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.

**Datos de producción:** seed dirigido (no migración cruda de los datos de prueba locales) vía `server/scripts/seedProduccion.js` (idempotente, contraseñas de los usuarios del panel pasadas por variable de entorno al momento de ejecutar, nunca hardcodeadas en el script). Se cargaron: 11 horarios (09:00–19:00, lunes a sábado), 2 barberos con nombre público real ("Lisandro Alonzo", "Elias Lugo", con foto placeholder hasta que se suban las reales), 3 usuarios de panel (`admin` + los 2 barberos), 3 servicios (Corte ₲50.000, Corte y Barba ₲80.000, Ceja ₲20.000), banner (texto "prueba"/"prueba" — **pendiente de cambiar desde el panel**), ubicación y contacto reales.

**Bug encontrado y corregido durante el seed:** al arrancar el server por primera vez con la base vacía, el generador automático de turnos (ruta legacy, la misma clase de bug ya documentada en la entrada de abajo: "veo el botón de agendar pero no veo disponibilidad") creó 243 documentos fantasma (`barbero: null`, `estado: "disponible"`) antes de que existieran barberos reales. Se ejecutó `regenerarAgendaCompleta()` después del seed, que limpió los que caían dentro del rango regenerado; quedaron 135 fantasmas fuera de rango (fechas ya pasadas) que se confirmaron sin datos de cliente real y se eliminaron a mano (con confirmación explícita del usuario, por ser un `deleteMany` en producción). Estado final: 1760 turnos reales, 0 documentos fantasma.

**Verificación e2e:** ciclo completo de reserva pública probado contra el dominio real (reservar → confirmar que la respuesta de `/api/agenda/landing` no filtra `editToken`/`numeroCliente`/`emailCliente` en ninguno de los 286 turnos devueltos → editar vía token → intento con token inválido rechazado (403) → liberar vía token → turno vuelve a `disponible` con `editToken: null`). Login verificado para los 3 usuarios con cookie `HttpOnly; Secure; SameSite=Lax`.

**Pendiente que requiere acción manual del usuario:**
- Rotar la contraseña root de SSH (se usó la existente para todo este despliegue con permiso explícito del usuario, quien indicó que la rotaría al finalizar).
- Guardar en un lugar seguro la contraseña autogenerada del usuario `admin` (se mostró una única vez en el log de arranque del servicio — comunicada directamente, no queda en este archivo ni en ningún commit).
- Cambiar el texto placeholder del banner ("prueba"/"prueba") desde el panel.
- Subir las fotos reales de los barberos (hoy usan una imagen placeholder genérica) y de los servicios.
- Si en algún momento se decide habilitar WhatsApp real, hace falta instalar Docker (fuera del presupuesto de RAM actual de 1GB — probablemente requiera upgradear el plan de la VPS antes) y configurar `EVOLUTION_API_KEY` en el `.env` de producción.

---

## 2026-07-17 — Remediación de los 38 hallazgos de la auditoría (plan de 6 fases)

**Alcance:** implementación completa del plan de remediación derivado de la auditoría del 2026-07-16 (ver entrada de abajo y `C:\Users\Lizan\.claude\plans\lista-los-problemas-del-concurrent-nebula.md`). Ejecutado en 6 fases contra el servidor real (`localhost:8000`) y la base de datos real (`OnofreDb`), con verificación HTTP (curl) después de cada cambio y limpieza de todos los datos de prueba al cierre de cada fase.

**Resultado: 0 documentos reales perdidos o alterados** (verificado con diff exacto contra el backup `server/db-backups/backup-OnofreDb-2026-07-17T01-35-34-929Z/` al cierre — 1202 → 1203 documentos, la única diferencia es una reserva real y legítima que entró durante la sesión, no un artefacto de prueba).

**Fase 1 — Endurecimiento aislado:**
- Path traversal en borrado de imágenes de servicios: cerrado (whitelist + saneamiento de `path.basename` en `imageProcessor.js`).
- `vapid-keys-generated.txt` sacado del tracking de git (`git rm --cached`).
- API key de WhatsApp hardcodeada eliminada del código fuente (movida a `.env`).
- Seeder de admin ya no usa `admin123` fijo — genera una contraseña aleatoria si no hay `ADMIN_PASSWORD` en el entorno (la cuenta admin real ya existente **no fue rotada automáticamente** — sigue pendiente que el usuario la cambie a mano).
- NoSQL injection en login cerrada (validación de tipo).
- Virtual `confirmPassword` de Mongoose reparado (arrow functions → functions normales).
- Cookie de sesión con `secure`/`sameSite`.
- Inyección de operadores Mongo vía `qs` cerrada en banners/horarios.
- `npm audit`: 22 vulnerabilidades → 0 (migración `bcrypt` → `bcryptjs`, sin romper contraseñas ya hasheadas).

**Fase 2 — Autenticación global:** de 11 grupos de rutas, pasaron de 1 a 10 protegidos con `authenticate`, preservando explícitamente públicos todos los endpoints del flujo de reserva/landing.

**Fase 3 — La más grande:** sistema de token secreto por turno (`editToken`) para la edición pública vía WhatsApp; nuevos endpoints `editar-mi-turno`/`liberar-mi-turno` con whitelist de campos y recálculo de precios en el servidor; `PUT /api/agenda/:id` genérico ahora admin-only; PII (`numeroCliente`/`emailCliente`) ya no se expone en `/api/agenda/landing` (se detectó y corrigió sobre la marcha que el propio `editToken` se filtraba en esa misma respuesta — corregido antes de cerrar la fase); botón "MODIFICAR" ahora navega a `/editar-turno/:id` en vez de un modal roto.

**Fase 4:** race condition de doble-reserva cerrada con `findOneAndUpdate` atómico (verificado con una prueba real de 2 requests concurrentes); guard para no poder eliminar el último usuario del sistema.

**Fase 5:** eliminados 3 endpoints que siempre devolvían error o vacío por desincronización de esquema (`/agenda/diagnostico`, `/migracion/crear-horarios-defecto`, `/servicios/categoria/:categoria`); Error Boundary + `JSON.parse` seguro en `App.jsx`; code-splitting de `/admin` y `/admin/panel` (el público ahora descarga ~106 KB menos); lint de 170 → 152 problemas.

**Fase 6:** eliminados 11 archivos de código muerto confirmado (9 en cliente, 2 en servidor) tras verificar con grep que ninguno tenía referencias vivas. Lint final: 152 → 94 problemas.

**Pendiente que requiere acción manual del usuario (no se puede resolver por código):**
- Rotar la contraseña SSH de producción que estaba en texto plano en `server/.env`.
- Cambiar la contraseña del usuario `admin` existente desde el panel (el fix del seeder no la rota retroactivamente).
- Rotar la API key de WhatsApp (`EVOLUTION_API_KEY`) y las claves VAPID en sus respectivos proveedores — el código ya no las hardcodea, pero los valores viejos siguen siendo válidos hasta que se regeneren.
- `docker-compose.evolution.yml` (tracked en git) también tiene la API key de WhatsApp en texto plano — evaluar si conviene sacarla de ahí también.
- Dropear el índice redundante `fecha_1` en Mongo si se quiere (`db.agendas.dropIndex("fecha_1")`) — no se tocó automáticamente por ser la única operación de escritura sobre índices del plan.

---

## 2026-07-16 — Auditoría integral (seguridad, calidad, performance) + pruebas

**Alcance:** todo `server/` y `client/`, más un análisis de índices/queries de MongoDB. Incluye pruebas reales: lint, build de producción, arranque del servidor y smoke tests HTTP contra la base de datos real.

**Metodología:**
- Lectura completa de todos los controllers/routes/models/services del backend y todos los componentes/hooks del frontend (dos revisiones independientes en paralelo).
- `npm run lint` y `npm run build` en `client/`.
- `npm audit --production` en `server/`.
- Arranque real de `server/server.js` (puerto 8099) contra la base local `OnofreDb` y pruebas HTTP de solo lectura sobre los endpoints públicos.
- **Antes de tocar la base real se tomó un backup completo** (exportación JSON de las 10 colecciones) en `server/db-backups/backup-OnofreDb-2026-07-17T01-35-34-929Z/` (carpeta agregada a `.gitignore`, no se sube al repo). Snapshot: 1202 agendas, 2 users, 2 barberos, 6 horarios, 5 servicios, 1 banner, 1 contacto, 1 ubicación, 2 suscripciones push, 0 mensajes.
- Verificación manual (no solo confianza ciega en los hallazgos automatizados) de los 3 puntos más críticos: path traversal en `deleteImagenServicio`, tracking en git de `vapid-keys-generated.txt`, y el conteo de `npm audit` — los tres se confirmaron exactos.
- Análisis de índices de MongoDB con la skill `mongodb-query-optimizer` (sin servidor MCP de Mongo conectado en este entorno; análisis estático basado en principios ESR/antipatrones, no en `explain()` en vivo — recomendable re-validar con `explain()` cuando haya acceso).

**Nota importante:** se encontró una contraseña SSH de producción en texto plano dentro de un comentario en `server/.env` (línea de la forma `#SERVER: ssh -p ... password: ...`). El archivo está gitignoreado por lo que no está en el historial de git, pero de todas formas es una mala práctica guardar credenciales en un `.env` en texto plano. **Se recomienda rotar esa contraseña SSH cuanto antes** y no volver a guardar credenciales en comentarios; el valor no se repite en esta bitácora ni en ningún archivo del repo.

### Resumen ejecutivo

El hallazgo estructural más importante: de los 11 grupos de rutas montados en `server.js`, **solo `/api/user` exige un JWT válido**. Los otros 10 (agenda, banners, barberos, contacto, ubicación, servicios, horarios, notificaciones, migración, y **WhatsApp**) son de acceso completamente anónimo, incluyendo operaciones destructivas (borrar turnos, regenerar agenda) y el control del canal de WhatsApp del negocio. Esto no es un bug puntual sino la causa raíz de la mayoría de los hallazgos críticos de abajo — conviene resolverlo como un solo esfuerzo (middleware de auth aplicado de forma consistente) en vez de parchear ruta por ruta.

El segundo hallazgo estructural: hay **funcionalidad rota en producción ahora mismo** por desincronización de esquemas (`Horario`, `Servicio`) tras refactors que no actualizaron a todos los consumidores — dos endpoints devuelven 500 siempre, un endpoint de filtrado devuelve `[]` siempre, y una migración pierde datos silenciosamente.

### Resultados de las pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `npm run lint` (client) | **170 problemas** (163 errores, 7 warnings) — 123 `react/prop-types`, 39 `no-unused-vars`, 7 `react-hooks/exhaustive-deps`, 1 `react/display-name` |
| `npm run build` (client) | Compila OK, pero bundle único de **1.55 MB (279 KB gzip)** sin code-splitting — warning explícito de Vite |
| `npm audit --production` (server) | **22 vulnerabilidades**: 2 críticas, 11 altas, 5 moderadas, 4 bajas (`axios`, `qs`, `tar`/`@mapbox/node-pre-gyp`/`bcrypt`, `send`/`serve-static`) |
| Arranque del servidor | OK — conecta a Mongo, no crashea, seeder de admin es idempotente, no disparó regeneración de agenda (ya había turnos del mes) |
| Smoke tests HTTP (solo lectura, base real) | Todos los endpoints públicos devuelven 200 (`servicios`, `barberos`, `agenda/landing`, `horarios`, `banners`, `ubicacion`, `contacto`); `/api/user` devuelve 401 correctamente; **`/api/notifications` devuelve 404** (confirma hallazgo #43, ver abajo) |
| `server`/`client` test runners | **No existen.** `server`'s `npm test` es un stub (`exit 1`); `client` no tiene ningún framework de test configurado |

No se ejecutaron pruebas de endpoints destructivos (delete/regenerar) contra la base real para no arriesgar los 1202 turnos existentes más allá del backup ya tomado; esos flujos se revisaron solo de forma estática (lectura de código).

### Tabla de hallazgos priorizados

| # | Área | Hallazgo | Severidad | Impacto de negocio | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Server | Path traversal en `deleteImagenServicio` → borrado arbitrario de archivos, sin auth | Crítica | Puede borrar `.env`, `server.js` o cualquier archivo con permisos del proceso Node; tumba el servidor | S |
| 2 | Server | Todas las rutas excepto `/api/user` sin autenticación (10 de 11 grupos) | Crítica | Causa raíz de la mayoría de hallazgos de abajo; cualquiera puede borrar/editar todo el contenido y la agenda | M |
| 3 | Server | Endpoints de WhatsApp sin auth (`/connect` expone QR, `/send-test` envía mensajes) | Crítica | Secuestro del número de WhatsApp del negocio o uso como relay de spam | S |
| 4 | Client | PII de todos los clientes (nombre+teléfono) expuesta en `/api/agenda/landing`, página pública | Crítica | Fuga de datos personales de todos los clientes con turno, sin login | M |
| 5 | Client | `EditarTurno` (ruta pública) sin verificación de dueño; guarda el turno completo | Crítica | Cualquiera con el link (o adivinando/reenviando) puede modificar/cancelar turnos ajenos | M |
| 6 | Server | Credenciales SSH de producción en texto plano en comentario de `server/.env` | Crítica | Compromiso del servidor de producción si el archivo se filtra | S (rotar ya) |
| 7 | Server | `vapid-keys-generated.txt` (clave privada VAPID real) trackeado en git pese al `.gitignore` | Crítica | Permite falsificar notificaciones push al admin | S |
| 8 | Server | API key de Evolution (WhatsApp) hardcodeada como fallback en `whatsapp.service.js` | Crítica | Bypass del backend, control directo de la instancia de WhatsApp | S |
| 9 | Server | Admin `admin`/`admin123` autogenerado y hardcodeado en el seeder | Crítica | Toma de control total del panel admin en cualquier DB nueva/reseteada | S |
| 10 | Server | Race condition (TOCTOU) en `reservarTurnoConBarbero` — no usa `findOneAndUpdate` atómico | Alta | Doble reserva del mismo turno en horarios populares | M |
| 11 | Server | Mass assignment: `createAgenda`/`updateOneAgendaById` aceptan `req.body` completo | Alta | Cualquiera puede marcar turnos como pagados/completados o cambiar `costoTotal` sin pasar por el flujo real | S |
| 12 | Server | 22 vulnerabilidades npm (2 críticas, 11 altas: axios SSRF, qs DoS, tar path traversal) | Alta | Superficie de ataque de dependencias; algunas explotables sin interacción | S–M |
| 13 | Server | NoSQL injection potencial en login (`userName` sin validar tipo) | Alta | Bypass de autenticación con payload `{"$ne": null}` (mitigado parcialmente por bcrypt) | S |
| 14 | Server | IDOR en rutas de usuario — cualquier cuenta autenticada edita/borra cualquier otra | Alta | Se vuelve explotable en cuanto exista una segunda cuenta (ej. barbero) | M |
| 15 | Client | Falta `await` en `Form.jsx` → reactiva el botón antes de que la reserva termine | Alta | Doble-submit de reservas con conexión lenta o doble clic | S |
| 16 | Client | Mismatch camelCase/PascalCase entre `Form.jsx` y `FormAgendar.jsx` | Alta | El botón "Cancelar Cita" nunca aparece para turnos creados por el flujo real; campos no se precargan | S |
| 17 | DB | N+1 queries en generación de turnos (~300 round-trips por regeneración de mes) | Alta | Lentitud/timeouts al regenerar agenda desde el panel admin | M |
| 18 | Server | Esquema `Horario` desincronizado → 2 endpoints devuelven 500 siempre | Media | `POST /api/migracion/crear-horarios-defecto` y `GET /api/agenda/diagnostico` rotos hoy | S |
| 19 | Server | Esquema `Servicio` desincronizado → filtro por categoría siempre `[]`, migración pierde `categoria`/`duracion`/`color` | Media | Endpoint de filtro público inútil; pérdida silenciosa de datos en migraciones | S–M |
| 20 | Server | Virtual `confirmPassword` roto (arrow functions rompen el binding de `this`) | Media | Validación de "confirmar contraseña" no funciona realmente en `register` | S |
| 21 | Server | Cookie JWT sin `secure`/`sameSite`; expira en ~10 días, no ~25h como dice el comentario | Media | Sesión larga expuesta a CSRF/interceptación en HTTP | S |
| 22 | Server | Inyección de operadores Mongo vía `qs` bracket-notation en filtros de `banner`/`horario` | Media | Mismo patrón que #13 pero en listados de contenido (impacto menor) | S |
| 23 | Client | `AdminDashboard.jsx` monolítico (~3650 líneas, 30+ `useState`) | Media | Re-renders innecesarios, jank al escribir en cualquier modal; difícil de mantener/testear | L |
| 24 | Client | Sin Error Boundary; `JSON.parse(localStorage.getItem("user"))` sin `try/catch` en `App.jsx` | Media | Pantalla en blanco total si `localStorage` se corrompe | S |
| 25 | Client | Manejo de errores silencioso (`console.error` sin UI) en varios fetch del panel admin | Media | Admin ve secciones vacías indistinguibles de un fallo de red real | S |
| 26 | Client | 7 archivos de código muerto (`AgendaAdmin*.jsx`, `FormAgendarAdmin.jsx`, 4 hooks sin usar) | Media | Confunde a futuros desarrolladores; aumenta superficie de auditoría | S |
| 27 | Client | Contrato de respuesta de `GET /api/servicios` asumido distinto en 4+ componentes | Media | Selector de servicios queda vacío silenciosamente en el flujo "MODIFICAR" | S |
| 28 | Build | Bundle de producción sin code-splitting (1.55 MB / 279 KB gzip en un chunk) | Media | Carga inicial más lenta, especialmente en móvil/conexiones lentas | M |
| 29 | Lint | 170 problemas de ESLint (163 errores) | Media | Sin PropTypes reales ni limpieza de variables no usadas; deuda técnica acumulándose | M |
| 30 | Server | Manejo de errores inconsistente — algunos controllers exponen objetos `Error` crudos, `register` responde 200 en fallo | Media | Filtración menor de info interna; status codes incorrectos | S |
| 31 | Server | Sin test runner ni linter configurado en `server/` | Media | Ningún resguardo automatizado contra regresiones (agravado por #18/#19, que ya están rotos sin que nadie lo note) | M |
| 32 | Server | Rutas de "migración temporal" montadas permanentemente en producción | Baja | Deuda técnica + superficie de ataque innecesaria (cubierto por #2) | S |
| 33 | Server | `agenda.controller.backup.js` con esquema obsoleto, código muerto | Baja | Riesgo si se reconecta por error en un merge futuro | S |
| 34 | Server | Endpoint público `/api/notifications/subscriptions` expone metadata de suscripciones admin | Baja | Fuga menor de metadata (userId, dispositivo), sin auth | S |
| 35 | DB | Índices redundantes (`fecha:1` simple, `{fecha:1,hora:1}` simple) | Baja | Overhead de escritura innecesario, sin beneficio de lectura | S |
| 36 | DB | `$push: "$$ROOT"` en aggregate de duplicados carga documentos completos | Baja | Uso de memoria innecesario en rangos amplios | S |
| 37 | Client | `notifications.getAll()` en `useApi.js` apunta a un endpoint inexistente (404) | Baja | Código muerto que rompería si se llegara a usar | S |
| 38 | Client | `console.log` de depuración en producción en `EditarTurno.jsx` (ruta pública) | Baja | Expone estructura interna del turno en la consola del navegador | S |

*Esfuerzo: S = horas, M = 1-3 días, L = requiere planificación/refactor mayor.*

### Hoja de ruta sugerida (por impacto/esfuerzo)

1. **Ya (crítico, esfuerzo bajo):** rotar contraseña SSH, VAPID keys y API key de Evolution; sacar `vapid-keys-generated.txt` del historial de git; parchear el path traversal (#1); forzar contraseña de admin no trivial en el seeder.
2. **Esta semana:** unificar los dos sistemas de auth JWT en uno solo y aplicar `authenticate` a los 10 grupos de rutas hoy abiertos, empezando por WhatsApp y agenda; sacar `nombreCliente`/`numeroCliente` de terceros de `/api/agenda/landing`; agregar verificación de dueño en `EditarTurno`.
3. **Corto plazo:** `findOneAndUpdate` atómico en la reserva de turnos (#10); whitelist de campos en `createAgenda`/`updateOneAgendaById` (#11); `npm audit fix`; arreglar el `await` faltante en `Form.jsx`.
4. **Cuando haya tiempo:** resolver la desincronización de esquemas `Horario`/`Servicio` (#18/#19) — son bugs activos, no solo deuda técnica; limpiar los 7 archivos muertos del cliente; dividir `AdminDashboard.jsx`.
5. **Mejora continua:** configurar ESLint+CI para que el build falle con los 163 errores actuales; evaluar code-splitting del bundle; agregar un test runner (aunque sea smoke tests básicos) dado que hoy no hay ninguna red de seguridad automatizada.

### Artefactos generados en esta sesión
- Backup de la base de datos real: `server/db-backups/backup-OnofreDb-2026-07-17T01-35-34-929Z/` (gitignoreado).
- `server/.gitignore` actualizado para excluir `db-backups/`.
