# Don Onofre / Alonzo Style

@~/documentacion/convenciones.md

Sistema de reservas de una barbería (alonzostyle.com): landing pública con reserva de turnos
por barbero, panel con roles admin/barbero, recordatorios por WhatsApp y Web Push.
**No pertenece a ninguna familia de la agencia**: es MERN (Express + Mongoose + React), no
Laravel, y el repo es personal (`LizandroGBritto/donOnofreBarber`), no de `Agencia-Web-Porta`.

## Base

- Monorepo sin `package.json` raíz: `server/` (Express 4, Mongoose 8, MongoDB) y `client/`
  (React 18 + Vite 5, Tailwind 3 + Flowbite + MUI, PWA). Todo comando se corre adentro de
  cada carpeta.
- Server: `node server.js` (no hay `npm start`). `server.js` hace los efectos de arranque
  (validar config, conectar Mongo, cron, seeder del admin, bootstrap de agenda); `app.js` es
  la app de Express **sin efectos**, para que los tests la monten. No metas nada con efectos
  en `app.js`.
- **Sin medios de pago.** `config.payment` (Adam's Pay) y las variables `ADAM_*` existen,
  pero ningún código las usa. `DEPLOYMENT.md` las lista como requeridas: no lo son.
- Nutrición, optimizaciones y H-071 no aplican (no es Laravel, no hay
  `app/Http/Controllers/Panel/`).
- Scripts propios en `server/scripts/`: `seed:admin` (también corre solo al arrancar si no
  hay usuarios; sin `ADMIN_PASSWORD` genera una aleatoria y la muestra una vez),
  `resetPassword.js <userName>` (pide la clave por prompt o `NUEVA_PASSWORD`, nunca por
  argumento), `migrarRolesUsuarios.js` (idempotente), `seedProduccion.js`,
  `extraer-produccion.ps1` (baja la base de producción vía la API a `server/db-backups/`,
  ignorado) e `importarExportProd.js` (carga esos JSON en local conservando los `_id`).
- WhatsApp necesita el stack de Evolution API aparte:
  `docker compose -f docker-compose.evolution.yml up -d` (puerto 8081). Sin él, solo fallan
  los endpoints de WhatsApp. `EVOLUTION_API_KEY` **no tiene default**: sin la variable,
  `whatsapp.service.js` avisa por consola y las llamadas fallan.

## Qué no aplica de `convenciones.md`

Las secciones del panel (identidad de Porta, dos filas de pestañas, formularios jasny,
DataTables, `FlashesSwal`) describen el template Laravel de la agencia. Este panel es React
propio y lleva la identidad del cliente, **no la de Porta**: es la excepción de la
convención y queda escrita acá para que nadie lo "corrija". Sí aplican idioma, dinero en
guaraníes enteros, git y la regla de integraciones sin credenciales.

## Estado de seguridad

**Sin verificar** — no se corrió `/deteccion`. `seguridad.md` está redactado en términos de
Laravel; las reglas valen igual, traducidas al stack.

Observado durante el relevamiento del 2026-11-17 (no es un veredicto de `/deteccion`):

- **S-09 · `GET /api/agenda/:id` es pública y devuelve el turno entero**, con `editToken`,
  `nombreCliente` y `numeroCliente` (`agenda.controller.js`, `getOneAgenda`). Los endpoints
  públicos de disponibilidad sí sanean, pero exponen los `_id` de los turnos ocupados, así
  que cualquiera puede obtener el token y editar o liberar el turno de otro. La verificación
  de la bitácora del 2026-08-22 («0 `editToken` filtrados») miró los listados, no esta ruta.
- **S-09 · `POST /:id/generar-token` y `POST /delete-and-create/:id`** solo llevan
  `authenticate`: un barbero puede operar sobre turnos de otro barbero (falta
  `requireTurnoPropio` o `requireAdmin`).
- **S-09 · `POST /api/notifications/subscribe` es pública** y `notificarNuevaReserva` (y
  editado/liberado) se manda a todas las `Suscripcion` activas con nombre, fecha y hora del
  cliente: cualquiera que se suscriba recibe los datos de todos. Además acepta cualquier
  `endpoint`, al que el servidor hace POST (SSRF). Los avisos de clientes no usan esa ruta.
- **S-19 · `authenticate` trata un usuario sin `rol` como admin** (`auth.middleware.js`).
  La bitácora del 2026-08-22 lo dejó pendiente de quitar; sigue ahí.
- **S-12 · `docker-compose.evolution.yml` versiona la API key de Evolution y la clave de
  Postgres** en texto plano. Hay que moverlas a variables de entorno.

## Autorización

Tres middlewares, siempre después de `authenticate`: `requireAdmin`,
`requireBarberoPropio(fn)` (el id del barbero viene en la URL) y `requireTurnoPropio`
(`middleware/turnoPropio.middleware.js`, que busca el barbero dentro del turno). El rol se
relee de la base en cada request (`.lean()` a propósito), no sale del JWT.

Lo público es deliberado: disponibilidad, `landing`, `horarios-semanas`,
`verificar-turno/:numeroCliente`, `reservar-con-barbero`, los `GET` del catálogo y del
barbero, y `editar-mi-turno`, `liberar-mi-turno` y `:id/recordatorio-push`, que van con el
`editToken` del turno (`?t=`) en lugar de sesión. El split real está en `server/routes/*.route.js`; leelo antes de
asumir.

En el cliente, `components/panel/navItems.js` decide qué ítems ve cada rol, y el panel se
hidrata de `GET /api/user/me` al montar (no de `localStorage["user"]`, que es editable).
Ocultar un ítem es comodidad: la autorización la hace el servidor.

## Agenda, horarios y precios por barbero

- **La home no dibuja los `Horario`, dibuja documentos `Agenda`.** El `Horario` es la
  plantilla: crear o editar uno no cambia nada hasta que corre el generador
  (`AgendaGeneratorService.regenerarAgendaCompleta()`, que `horario.controller.js` llama
  directo; antes lo hacía por HTTP sin cookie y falló en silencio un mes).
- `services/agendaGenerator.service.js` es el generador vigente: barberos `activo &&
  incluirEnAgenda` por los horarios del día. `services/agendaService.js` solo se usa en el
  arranque (`inicializarSiEsNecesario`).
- `services/horarios.service.js` es el único lugar que decide qué horarios rigen: con
  `usaHorariosPropios` el barbero usa **solo** los suyos (reemplazo, no suma). La
  personalización arranca clonando los del local.
- `services/precios.service.js` es el único lugar que decide un precio. `PrecioBarbero` es
  un override por `(barbero, servicio)`; `activo: false` significa que ese barbero no lo
  ofrece. La reserva acepta `servicioIds` e **ignora cualquier precio del body**. Los
  `servicios[]` embebidos en `Agenda` son una foto del momento de la reserva, a propósito.
- **La reserva pública solo toma turnos generados**: `reservar-con-barbero` reclama un turno
  `disponible` existente y por delante de "ahora"; si no lo hay responde 409 y no crea nada.
  El índice parcial `turno_unico_por_barbero` `(barbero, fecha, hora)` impide la doble
  reserva. Mongoose lo crea al arrancar; si una base tiene duplicados no puede, y
  `node scripts/indiceTurnoUnico.js` los lista (no borra nada; con `--ejecutar` crea el
  índice). Correrlo en producción antes de desplegar.
- **`Agenda.fecha` es el inicio del día, no el momento del turno**: el momento es fecha +
  `hora` (`momentoDelTurno`). Compararlo solo por `fecha` fue el bug de la regla de 12 horas
  y de los recordatorios. Todo lo que depende del momento vive en
  `services/recordatorios.service.js` (regla de un turno abierto por celular, recordatorio
  de WhatsApp una hora antes, avisos push), que el cron llama cada minuto.
- **Avisos push de clientes**: modelo `RecordatorioPush`, aparte de `Suscripcion` (panel). Se
  atan al hash del `editToken`: si el turno cambia de dueño el aviso se descarta. La
  anticipación (60, 40, 20 o 5 min) está en el server y en `landing/dominio/recordatorio.js`;
  el endpoint de push solo acepta hosts de FCM, Mozilla, Windows y Apple.
- **Celular**: `server/utils/celular.js` es copia de `client/src/landing/dominio/celular.js`
  (con tests de los mismos casos). Paraguay se guarda `09XXXXXXXX`; otro país, `+<código>…`.
  Se evaluó `libphonenumber-js` y no se instaló: son reglas propias, por largo.
- Las `imagenes[]` de `PrecioBarbero` **reemplazan** a las del catálogo cuando ese barbero
  está elegido; no se mezclan.
- Fechas y horas siempre con `utils/paraguayDate.js` (`America/Asuncion`), en el server y en
  el cliente (`client/src/utils/paraguayDate.js`).
- Decisiones completas: `docs/plan-barberos-precios-horarios.md`.

## Cliente

- `src/config/api.config.js` centraliza las rutas y `src/hooks/useApi.js` es el único patrón
  de fetch (axios con `withCredentials`). Algunos flujos viejos del admin todavía llaman a
  `axios` directo; lo nuevo va por `useApi`.
- `components/AdminDashboard.jsx` (~3500 líneas) es el panel entero: cambia de sección con
  `activeView`, sin rutas anidadas. Lo propio del barbero está en `components/panel/`
  (`MisPrecios`, `MisHorarios`, `FotosServicioBarbero`, `VistaPreviaArchivo`).
- **La landing pública vive en `src/landing/`** (`views/Landing.jsx` solo la re-exporta). Es el
  rediseño de la demo `alonzo-style-standalone.html` y no usa Tailwind, Flowbite ni MUI: CSS
  Modules más los tokens de `estilos/tokens.css`, colgados de `.landing` para no tocar el
  panel. Capas: `datos/` (`clienteLanding.js`, con caché de 30 s que `invalidarTurnos` limpia
  después de reservar o de un 409; `usePeticion`), `dominio/` (funciones puras con tests; el
  asistente de reserva es el reducer de `dominio/reserva.js`), `hooks/` y `componentes/`.
  Las formas de las props están en `tiposProps.js`; los archivos de componentes solo exportan
  componentes (Fast Refresh).
- **El banner es fijo**: el escenario de la demo (mascota y neón, en `landing/assets/`). La
  sección Banners se sacó del menú del panel (`navItems.js`) porque cambiarlo rompe el efecto;
  el modelo y la API de banners siguen, sin uso en la landing.
- "Turno propio" = este dispositivo guardó `editToken:<id>` en localStorage al reservar. No se
  consulta por número de celular, a propósito.
- three.js (poste del encabezado) y Leaflet (mapa) se cargan con import dinámico. El mapa usa
  teselas oscuras de CARTO sobre OpenStreetMap y solo se dibuja si `Ubicacion.coordenadas`
  está cargado (campo opcional, se edita en el panel como "lat, lng"); el botón sigue yendo a
  `enlaceMaps`. Los enlaces que vienen del panel pasan por `urlExterna` (solo http/https).
- Instagram: **copia diaria en el servidor** (`InstagramFeed`, `services/instagramFeed.service.js`,
  `/api/instagram`). Si tiene menos de 24 h la landing la dibuja y no carga Elfsight (cada carga
  gasta una vista del plan). Si venció, monta el widget oculto en un contenedor fijo de 1280 px
  (así dibuja 4x2 = 8), `dominio/instagram.js` le lee foto, me gusta y comentarios (la
  descripción no, a propósito) y la landing los manda por `POST`. El servidor baja las fotos por
  el proxy `phosphor.utils.elfsightcdn.com` (las URLs del CDN de Instagram vienen vencidas, 403)
  y las guarda en `uploads/instagram/`. El `POST` es público: ver 07, I-30. El HTML de Elfsight
  no es una API; verificado en localhost: `.es-post` con los contadores al lado del enlace.
- Los carriles horizontales (servicios, Instagram) se arrastran con el mouse por
  `hooks/useArrastreHorizontal.js`; con el dedo es el scroll nativo.
- `public/sw.js` es el service worker de todo el sitio (panel y landing). En
  `notificationclick` los datos están en `event.notification.data`; navega con
  `client.navigate()` porque la landing no escucha mensajes.
- `utils/paraguayDate.js` importa el build de moment-timezone 1970–2030 (no el completo, que
  eran ~600 KB del chunk de la landing). Si se suma otra zona horaria, revisar el rango.
- La reserva es `landing/componentes/reserva/Reserva.jsx`. `EditarTurno` se carga lazy.
- `src/utils/sessionInterceptor.js` es lo que echa al admin cuando vence la cookie (401 en
  `/admin/*` → `/admin?sessionExpired=1`).

## Producción

Lo que está desplegado y cómo, en `BITACORA.md`. **`DEPLOYMENT.md` está desactualizado**:
describe PM2, Atlas y un subdominio `api.*`. Lo real es una VPS con Nginx en un solo origen
(sirve `client/dist` y hace de proxy de `/api` y `/uploads` a Node en `127.0.0.1:8000`),
systemd (`dononofre.service`) y MongoDB local. El build del cliente se hace **en local**,
porque Vite se queda sin memoria en la VPS. En el server se instala con
`npm ci --omit=dev`, porque `mongodb-memory-server` descarga un binario de MongoDB.

## Tests

- **Server:** `npm test` (Jest + supertest + `mongodb-memory-server`). Está aislado:
  `tests/setup.js` fija `MONGODB_URI` a la base en memoria antes de importar `app.js`, y
  dotenv no pisa variables ya definidas. Cada test vacía las colecciones. La primera corrida
  descarga el binario de mongod; sin internet, `MONGOMS_SYSTEM_BINARY` apunta al instalado.
  **Un test nunca importa `server.js`**: conecta a la base real y levanta el cron.
- **Cliente:** `npm test` (Vitest + jsdom + Testing Library). Los de la landing mockean
  `datos/clienteLanding`, `poste3d` y `MapaOscuro`; jsdom no tiene `scrollIntoView` ni canvas.
- Casos de uso con flujo normal, errores e integridad: `docs/casos-de-uso/`.
- `/preparar-pruebas` es para Laravel/MySQL y no aplica.

## Sitio local para pruebas

**No configurado.** No hay base `_e2e` separada: `node server.js` + `npm run dev` escriben
en la base de `MONGODB_URI` del `.env`. El probador no hace pruebas en navegador.

## Trampas conocidas

- **Tres fallbacks distintos del secreto JWT.** `user.controller.js` y
  `auth.middleware.js` usan `JWT_SECRET || "secretKey"`, mientras `app.config.js` valida
  `JWT_SECRET || SECRET || "defaultSecret"`, que nadie usa para firmar. Con solo `SECRET`
  cargado en producción, el arranque pasa y los tokens se firman con `"secretKey"`.
- El comentario de `agenda.route.js` sobre `GET /` («hasta el Sprint 5 un barbero ve
  todos») está viejo: `getAllAgendas` ya filtra por barbero.
- La sesión dura 250 horas a propósito (`app.config.js`). Las notificaciones push no
  dependen de ella.
- CORS es una lista cerrada en `app.config.js`: un dominio nuevo va ahí o en
  `CLIENT_URL` / `CLIENT_URL_WWW`.
- `.env.example` del server y del cliente son la lista de variables; mantenelos al día.
