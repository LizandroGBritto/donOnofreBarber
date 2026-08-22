# Plan — Precios y horarios por barbero

Vincular cada usuario del panel con un barbero, y que ese barbero maneje sus propios
precios y horarios sobre los del local. La landing pasa a girar alrededor del barbero
elegido: se lo selecciona primero y todo lo que viene después (horarios, servicios,
precios) corresponde a él.

**Fecha:** 2026-08-21. **Última actualización:** 2026-08-22.

**Estado de avance**

| Sprint | Estado | Tests |
|---|---|---|
| 0 — Arnés de tests | ✅ hecho | 4 server + 3 client |
| Seguridad (fuera de plan, pedido aparte) | ✅ hecho | 7 |
| 1 — Roles y vínculo usuario↔barbero | ✅ hecho, sin desplegar | 23 |
| 2 — Precios por barbero | ✅ hecho, sin desplegar | 25 |
| 3 — Horarios por barbero | ✅ hecho, sin desplegar | 21 |
| 4 — Landing con barbero como contexto | ✅ hecho, sin desplegar | 17 (client) |
| 5 — Panel con rol barbero | ✅ hecho, sin desplegar | 8 server + 17 client |
| 6 — Despliegue | **pendiente** | — |

Total actual: **121 tests server + 34 client, todos en verde.** Nada desplegado
a producción todavía (salvo la limpieza de datos y el cierre del puerto 22, que
sí se hicieron y están en `BITACORA.md`).

⚠️ **El Sprint 3 arregla la regeneración rota, así que al desplegar volverán a
generarse turnos ante cada cambio de horario.** Los dos horarios de prueba
(`20:20`, `23:33`) ya se borraron el 2026-08-22, que era la precondición para
que ese arreglo no llenara la agenda de turnos basura.

---

## 1. Punto de partida

| Pieza | Hoy |
|---|---|
| `User` | `{userName, password}`. Sin rol, sin vínculo a `Barbero`. |
| `Barbero` | `{nombre, descripcion, foto, logo, activo, incluirEnAgenda}`. |
| `Servicio` | Global. Precio único para todo el local. |
| `Horario` | Global. `{hora, dias[], estado}`. |
| Generación de turnos | `agendaGenerator`: producto cartesiano `barberos activos × horarios globales`. |
| Autorización | Una sola capa: logueado o no. Cualquier usuario puede borrar barberos, regenerar la agenda y gestionar usuarios. |
| Landing | Agenda arriba (agregada entre todos los barberos), luego Barberos (informativo), luego Servicios (precios globales). El barbero se elige **dentro** del formulario de reserva. |

`scripts/seedProduccion.js` ya crea los usuarios `LisandroAlonzo` y `EliasLugo`, que
corresponden a los barberos `Lisandro Alonzo` y `Elias Lugo`. Hoy ese vínculo existe
únicamente por convención de nombre; este trabajo lo hace explícito.

### 1.1 Bugs preexistentes que este trabajo arregla

1. **Manipulación de precios en la reserva.** `agenda.controller.js:987`
   (`reservarTurnoConBarbero`) calcula `costoServicios` sumando el `precio` que manda
   el cliente en el body. Un cliente puede reservar un servicio de ₲80.000 por ₲0.
   `editarMiTurno` ya lo hace bien (resuelve contra `ServicioModel`); la reserva quedó
   atrás. Con precios por barbero esto pasa de ser un agujero a ser directamente
   inviable, así que el Sprint 2 lo corrige.
2. **La regeneración automática de agenda por cambio de horario está rota.**
   `horario.controller.js:7` regenera haciendo `axios.post` a su propio endpoint
   `/api/agenda/regenerar-por-horarios` **sin mandar la cookie de sesión**. Desde el
   refactor de seguridad (`daf5c87`) esa ruta exige `authenticate`, así que devuelve
   401 y el error se traga en el `catch`. Crear, editar o activar un horario no
   regenera nada desde entonces. Sprint 3 lo reemplaza por una llamada directa al
   servicio.
3. **`createHorario` valida la unicidad de `hora` globalmente.** Con horarios por
   barbero, dos barberos no podrían tener ambos las 09:00. Sprint 3 pasa la validación
   a `(barbero, hora)`.

---

## 2. Decisiones de diseño

### D1 — Los precios son *overrides*, no un catálogo paralelo

Colección nueva `PrecioBarbero {barbero, servicio, precio, activo}`. El catálogo de
servicios sigue siendo global y lo define el admin; el barbero solo fija **su precio**
para un servicio existente, o lo **desactiva** si no lo ofrece.

*Por qué:* el pedido es "usar los precios existentes **o** modificar los suyos" — eso
es semántica de fallback, no de catálogo duplicado. Mantiene una sola lista de
servicios (la landing sigue siendo coherente), no toca el `Servicio` actual y deja
intacta la gestión global del admin. Un servicio propio de un solo barbero queda como
extensión futura, no entra acá.

### D2 — Los horarios propios *reemplazan* a los globales, con clonado inicial

`Horario` gana `barbero` (`null` = horario del local) y `Barbero` gana
`usaHorariosPropios`. Con el flag prendido se usan exclusivamente los horarios propios;
con el flag apagado, los del local.

*Por qué reemplazo y no suma:* si los propios se sumaran a los globales, un barbero
nunca podría **sacarse** una hora en la que no trabaja, que es el caso real (alguien
que arranca 13:00 cuando el local abre 09:00). Para que reemplazar no obligue a
recargar todo a mano, la personalización arranca **clonando** los horarios del local
(`POST /api/barberos/:id/horarios/clonar-globales`) y de ahí el barbero edita.

*Por qué un flag explícito y no "tiene filas propias":* sin flag, un barbero que borra
su última hora personalizada volvería en silencio a los horarios del local, cuando lo
que quiso decir es "ese día no trabajo". El flag hace la intención inequívoca.

### D3 — El precio se resuelve **siempre** en el servidor

`services/precios.service.js` es el único lugar del sistema que decide un precio. La
reserva pasa a aceptar solo `servicioIds`; cualquier `precio` que llegue en el body se
ignora. Sin esto, los precios por barbero no son exigibles: bastaría con mandar el
precio del barbero barato.

Los `servicios[]` embebidos en `Agenda` siguen siendo un **snapshot histórico**:
cambiar un precio hoy no altera turnos ya reservados. Eso es intencional y hay un test
que lo fija.

### D4 — En la landing, el barbero es el contexto de la página

En vez de mostrar un precio ambiguo ("desde ₲X") y elegir barbero dentro del
formulario, se invierte el orden: **primero se elige barbero**, y a partir de ahí la
agenda, los servicios y los precios que se muestran son los de ese barbero. El
formulario de reserva pierde el selector de barbero.

*Consecuencia buena en el server:* hoy `getTurnosLanding` tiene que agregar N barberos
en una sola fila por hora, y para eso inventa **turnos virtuales** (`_id: "virt-..."`,
`hayDisponibilidad`, `totalBarberos`, `barberosOcupados`). Con el barbero ya elegido,
un turno real por hora alcanza y toda esa maquinaria se elimina.

### D5 — El rol se lee de la base en cada request, no del JWT

`authenticate` verifica el token y después re-hidrata el usuario desde MongoDB.

*Por qué:* las cookies vigentes duran ~10 días y se firmaron con `{_id, userName}`. Si
el rol viviera en el token, un usuario ya logueado no tendría rol hasta re-loguearse, y
quitarle permisos a alguien no surtiría efecto hasta que la cookie expire. El costo es
una query por request, despreciable a esta escala.

---

## 3. Modelo de datos resultante

```js
// user.model.js  (+2 campos)
rol:     { type: String, enum: ["admin", "barbero"], default: "barbero", required: true }
barbero: { type: ObjectId, ref: "Barbero", default: null }
// un barbero = un usuario, pero varios usuarios pueden tener barbero: null
UserSchema.index({ barbero: 1 }, {
  unique: true,
  partialFilterExpression: { barbero: { $type: "objectId" } },
})

// barbero.model.js  (+1 campo)
usaHorariosPropios: { type: Boolean, default: false }

// horario.model.js  (+1 campo)
barbero: { type: ObjectId, ref: "Barbero", default: null, index: true }  // null = del local
HorarioSchema.index({ barbero: 1, hora: 1 }, { unique: true })

// precioBarbero.model.js  (NUEVO)
{
  barbero:  { type: ObjectId, ref: "Barbero",  required: true },
  servicio: { type: ObjectId, ref: "Servicio", required: true },
  precio:   { type: Number, min: 0, required: true },
  activo:   { type: Boolean, default: true },   // false = este barbero no ofrece el servicio
}
PrecioBarberoSchema.index({ barbero: 1, servicio: 1 }, { unique: true })
```

`Servicio` y `Agenda` no cambian de forma.

---

## 4. Resolución (el núcleo)

```
precio(barbero, servicio):
  override = PrecioBarbero(barbero, servicio)
  si no existe          -> Servicio.precio          (precio del local)
  si existe y !activo   -> el servicio no se ofrece (rechazar en reserva)
  si existe y activo    -> override.precio

horarios(barbero, diaSemana):
  si barbero.usaHorariosPropios -> Horario{barbero: id,   dias: dia, estado: activo}
  si no                         -> Horario{barbero: null, dias: dia, estado: activo}
```

Dos servicios nuevos, y nada fuera de ellos calcula precios ni horarios:

- `services/precios.service.js`
  - `listarServiciosDeBarbero(barberoId)` → catálogo resuelto para la landing.
  - `resolverServiciosParaReserva(barberoId, servicioIds)` → snapshot `[{servicioId,
    nombre, precio, duracion}]` + `costoTotal`. Falla con error tipado si un id no
    existe, está inactivo globalmente o el barbero lo desactivó.
- `services/horarios.service.js`
  - `resolverHorariosDeBarbero(barberoId, diaSemana?)`.

---

## 5. Matriz de permisos

| Recurso | anónimo | barbero | admin |
|---|---|---|---|
| Ver servicios / horarios / disponibilidad de un barbero | ✅ | ✅ | ✅ |
| Reservar turno (link público) | ✅ | ✅ | ✅ |
| Editar/liberar turno propio con `editToken` | ✅ | ✅ | ✅ |
| Ver turnos | — | solo los suyos | todos |
| Cambiar estado de un turno | — | solo los suyos | todos |
| Sus precios / sus horarios | — | ✅ | ✅ (de cualquiera) |
| Catálogo global de servicios y horarios del local | — | — | ✅ |
| CRUD de barberos | — | — | ✅ |
| CRUD de usuarios | — | solo su propia contraseña | ✅ |
| Banners / contacto / ubicación / WhatsApp | — | — | ✅ |
| Operaciones destructivas de agenda (`eliminar-hoy`, `regenerar-*`, `limpiar-*`) | — | — | ✅ |

El gate del front es comodidad; **quien decide es el backend**.

---

## 6. Sprints

Cada sprint cierra con sus tests en verde y es desplegable por sí solo, salvo la
dependencia explícita entre Sprint 2 (server) y Sprint 4 (client) por el cambio de
payload de reserva.

### Sprint 0 — Arnés de tests

No cambia comportamiento. Hoy no hay tests en ningún paquete.

**Server** — Jest + supertest + `mongodb-memory-server`:
- **Extraer `server/app.js`**: la app de Express (middlewares, rutas, estáticos) se
  exporta sin `listen()`. `server.js` queda como bootstrap: `config.validate()`,
  conexión a Mongo, `CronService.init()`, seeders, `app.listen()`. Es requisito para
  poder testear con supertest sin levantar cron ni pegarle a la base real.
- `jest.config.js` (`testEnvironment: "node"`), `tests/setup.js` (levanta la base en
  memoria, limpia colecciones entre tests, cierra al final).
- `tests/helpers/auth.js`: crear usuario con rol y obtener su cookie de sesión. Lo van
  a usar todos los sprints siguientes.
- Scripts: `"test": "jest --runInBand"`, `"test:watch": "jest --watch"`.

**Client** — Vitest + React Testing Library + jsdom:
- `vitest.config.js`, `src/test/setup.js`, `"test": "vitest run"`.
- `axios` se mockea con `vi.mock("axios")`. Si se vuelve incómodo, migrar a MSW.

**Tests:** un smoke por paquete (`GET /api/servicios` responde 200; un componente
renderiza su skeleton).

**Aceptación:** `npm test` verde en `server/` y `client/`; `node server.js` arranca
exactamente igual que antes.

---

### Sprint 1 — Roles y vínculo usuario ↔ barbero

- `User.rol` + `User.barbero` con el índice único parcial (§3).
- `authenticate` recarga el usuario desde la base y expone `{_id, userName, rol,
  barbero}`; 401 si el usuario ya no existe. **Leer con `.lean()`**, no con un
  documento hidratado: Mongoose rellena los `default` del schema al hidratar, así que
  un usuario viejo sin `rol` volvería como `"barbero"` y la red de seguridad de R1
  nunca se activaría. Con `.lean()` el campo llega `undefined` y el fallback funciona.
- Middlewares nuevos: `requireAdmin`, y `requireBarberoPropio(getBarberoId)` (admin
  pasa siempre; barbero solo sobre su propio `barbero`).
- `login` devuelve `rol` y `barbero` (el front los necesita para el nav).
- **Migración `scripts/migrarRolesUsuarios.js`** (idempotente):
  - todos los usuarios existentes → `rol: "admin"`;
  - vincula `barbero` cuando el `userName` normalizado (sin espacios ni tildes,
    lowercase) coincide con un `Barbero.nombre` normalizado — resuelve
    `LisandroAlonzo` → `Lisandro Alonzo`;
  - si hay ambigüedad, no adivina: lo reporta y sigue.
  - **No** degrada a nadie a `barbero`: eso lo decide el admin desde el panel.

  Mapeo real verificado contra producción el 2026-08-22 (los `_id` son estables,
  vienen todos de la misma corrida de `seedProduccion.js`):

  | Usuario | `user._id` | Rol destino | `barbero._id` |
  |---|---|---|---|
  | `admin` | `6a59b8c7f424089b682cd3fe` | `admin` | `null` |
  | `LisandroAlonzo` | `6a59b9de7856b3033fffc2b9` | `barbero` | `6a59b9de7856b3033fffc2b3` (Lisandro Alonzo) |
  | `EliasLugo` | `6a59b9de7856b3033fffc2bd` | `barbero` | `6a59b9de7856b3033fffc2b6` (Elias Lugo) |

  El match por nombre normalizado resuelve los dos casos sin ambigüedad, así que
  la heurística alcanza; los `_id` de arriba quedan como verificación, no como
  valores hardcodeados en el script.

  **Ningún turno se pierde en la migración:** los 1696 turnos de producción
  tienen `barbero` asignado (848 Lisandro / 848 Elias), cero huérfanos. Al
  vincular el usuario con su barbero, sus turnos históricos quedan
  automáticamente atribuidos — no hace falta tocar la colección `agendas`.
  Hay un test que lo fija (`GET /api/agenda` como barbero devuelve solo los
  suyos, y la suma de los dos barberos da el total).
- `createAdminSeeder.js` y `seedProduccion.js` setean `rol` explícito.
- Red de seguridad de una release: si `rol` viene `undefined`, tratarlo como `admin` y
  loguear un warning (ver riesgo R1).
- Se cierra con `requireAdmin` todo lo que hoy está solo detrás de `authenticate`:
  `barbero.route`, catálogo global de `servicio.route` y `horario.route`, las rutas
  destructivas de `agenda.route`, `migracion.route`, `whatsapp.route` y el CRUD de
  `user.route` (con excepción: un barbero puede cambiar **su propia** contraseña).

**Tests** (`tests/auth.roles.test.js`):
- login de admin devuelve `rol: "admin"`;
- un cambio de rol en la base se refleja **sin re-loguear**;
- barbero → 403 en `POST /api/barberos`, `DELETE /api/agenda/eliminar-hoy`,
  `POST /api/user/register`; admin → 2xx en las mismas;
- no se pueden vincular dos usuarios al mismo barbero;
- `PUT /api/user/:id` sobre sí mismo: 200; sobre otro: 403;
- la migración deja `admin` a un usuario preexistente sin `rol` y lo vincula por nombre;
- correr la migración dos veces no cambia nada la segunda vez.

**Aceptación:** matriz de permisos de §5 verde en la parte de roles; ningún usuario
existente pierde acceso al panel.

---

### Sprint 2 — Precios por barbero

- Modelo `PrecioBarbero` + `services/precios.service.js` (§4).
- Endpoints:
  - `GET  /api/barberos/:id/servicios` — **público**, catálogo resuelto (lo consume la landing);
  - `GET  /api/barberos/:id/precios` — dueño o admin; incluye los servicios no
    personalizados con su precio global, para poblar el formulario;
  - `PUT  /api/barberos/:id/precios` — dueño o admin; body `[{servicioId, precio,
    activo}]`; upsert masivo; `precio: null` borra el override y vuelve al precio del local.
- **Reescritura de la reserva (cambio breaking de payload):**
  - `reservarTurnoConBarbero` acepta `{fecha, hora, barberoId, nombreCliente,
    numeroCliente, servicioIds[]}` y resuelve todo por `precios.service`;
  - `editarMiTurno` resuelve contra **el barbero del turno** (hoy resuelve global);
  - `updateOneAgendaById` (admin) idem cuando vienen servicios;
  - **compatibilidad de una release:** si llega `servicios: [{servicioId, ...}]` se
    aceptan los ids y se descarta el resto, para que un despliegue desfasado de client
    y server no rompa las reservas.
- Al desactivar o borrar un servicio global, limpiar sus overrides huérfanos (y además
  filtrarlos en el resolver, por las dudas).

**Tests** (`tests/precios.test.js`):
- sin override → precio global; con override → precio del barbero;
- `activo: false` → el servicio no aparece en el catálogo del barbero y reservarlo da 400;
- **reserva con `precio` manipulado en el body → el turno guarda el precio del servidor**;
- dos barberos con precios distintos → cada reserva guarda el suyo;
- `PUT /precios` de A sobre B → 403; admin sobre cualquiera → 200;
- `precio: null` borra el override;
- editar un turno recalcula con el precio del barbero de ese turno;
- **cambiar un precio no altera turnos ya reservados** (snapshot histórico).

**Aceptación:** ningún precio del sistema se origina en el cliente.

---

### Sprint 3 — Horarios por barbero

- `Horario.barbero`, `Barbero.usaHorariosPropios`, índice `(barbero, hora)` y la
  validación de unicidad corregida.
- `services/horarios.service.js` con la resolución de §4.
- Endpoints:
  - `GET   /api/barberos/:id/horarios` — público;
  - `POST  /api/barberos/:id/horarios/clonar-globales` — dueño o admin; copia los del
    local, prende `usaHorariosPropios`, idempotente. **Es el arranque de la personalización.**
  - `POST/PUT/DELETE/PATCH /api/barberos/:id/horarios[/:horarioId]` — dueño o admin;
  - `PATCH /api/barberos/:id/horarios/usar-globales` — vuelve a los del local
    conservando los propios por si quiere retomarlos.
- **Generador** (`agendaGenerator.service.js`): `generarTurnosPorFecha` deja de cruzar
  `horarios globales × barberos` y pasa a iterar barberos resolviendo los horarios de
  cada uno.
- **Regeneración con alcance:** nueva `regenerarAgendaDeBarbero(barberoId, desde,
  hasta)` que solo borra y recrea turnos `disponible + creadoAutomaticamente` **de ese
  barbero y a futuro**. Los cambios de horario de un barbero llaman a esta, no a
  `regenerarAgendaCompleta`, que hoy arrasa con la agenda de todos. Nunca se tocan
  turnos con cliente ni fechas pasadas.
- **Arreglo del bug 2:** `horario.controller.js` deja de hacer `axios.post` a sí mismo
  y llama directo al servicio.
- `getHorariosYSemanas` y `getTurnosLanding` aceptan `?barberoId=`; sin el parámetro
  mantienen el comportamiento actual (unión / agregado) por compatibilidad.

**Tests** (`tests/horarios.test.js`, `tests/generador.test.js`):
- barbero sin personalizar → sus turnos salen de los horarios del local;
- con `usaHorariosPropios` → **solo** sus horas, y las globales que borró no reaparecen;
- `clonar-globales` copia y es idempotente;
- A no puede crear ni borrar horarios de B (403);
- dos barberos con horarios distintos → el generador emite el set correcto para cada uno;
- regenerar por un cambio de A **no** borra turnos disponibles de B;
- regenerar no toca turnos reservados ni fechas pasadas;
- crear un horario del local regenera la agenda (verifica que el 401 quedó arreglado).

---

### Sprint 4 — Landing: el barbero como contexto

- **`Landing.jsx`**: estado `barberoSeleccionado`, persistido en
  `localStorage["barberoSeleccionado"]`. Orden nuevo de secciones:
  `NavBar → Barberos (selector) → Agenda → Servicios → Instagram → Footer`.
  - un solo barbero activo → queda auto-seleccionado y el bloque se muestra informativo;
  - varios y ninguno elegido → Agenda y Servicios muestran estado vacío con CTA "Elegí
    tu barbero" que scrollea al selector. **No** se preselecciona uno arbitrario: elegir
    es el punto de esa pantalla.
- **`Barberos.jsx`**: tarjetas seleccionables, estado visible (borde + badge
  "Seleccionado"), accesible (`role="radiogroup"`, `aria-checked`, navegable por
  teclado). Al elegir, scrollea a la agenda.
- **`Servicios.jsx`**: consume `GET /api/barberos/:id/servicios` y muestra el precio de
  ese barbero.
- **`Agenda.jsx`**: `/api/agenda/landing?barberoId=` y
  `/api/agenda/horarios-semanas?barberoId=`. La grilla pasa a ser la de ese barbero.
- **`FormReservarConBarbero.jsx` → `FormReservarTurno.jsx`**: se le quitan el bloque de
  selección de barbero y la carga de `disponibilidad-barberos`; recibe el barbero por
  props, envía `servicioIds` y muestra el total que confirmó el servidor.
- **Simplificación del server (D4):** con `?barberoId=`, `getTurnosLanding` devuelve un
  turno real por hora y desaparecen los turnos virtuales `virt-*`, `hayDisponibilidad`,
  `totalBarberos` y `barberosOcupados`.

**Tests (client):**
- `Barberos` marca el seleccionado y dispara el callback;
- `Servicios` muestra el precio de A y, al cambiar a B, el de B;
- sin barbero elegido, `Servicios` y `Agenda` muestran el estado vacío con CTA;
- el submit manda `servicioIds` y **no** manda `precio`;
- la selección sobrevive a un reload.

**Tests (server):** `getTurnosLanding?barberoId=` devuelve solo turnos de ese barbero y
sin campos virtuales.

> Sprint 2 (server) y Sprint 4 (client) tienen que desplegarse juntos, o apoyarse en la
> compatibilidad temporal de payload del Sprint 2.

---

### Sprint 5 — Panel con rol barbero

- `UserContext` guarda `rol` y `barbero`.
- **`AdminDashboard.jsx`**: los ítems del nav pasan a ser un array `NAV_ITEMS` con
  `roles: []`, filtrado por rol. Hoy los 12 botones están escritos **dos veces a mano**
  (mobile y desktop); extraerlos elimina esa duplicación y hace el gate por rol trivial.
  - barbero ve: Dashboard, Mis Turnos, Mis Precios, Mis Horarios;
  - admin ve todo lo de hoy.
- **`components/panel/MisPrecios.jsx`** (nuevo): tabla de servicios con input de precio,
  badge "usa el precio del local" vs "personalizado", switch de activo, y botón "volver
  al precio del local".
- **`components/panel/MisHorarios.jsx`** (nuevo): si `usaHorariosPropios` está apagado,
  cartel "Estás usando los horarios del local" + botón "Personalizar mis horarios"
  (llama a `clonar-globales`); si está prendido, CRUD de sus horas + "volver a los del
  local".
- Turnos: para rol barbero, `GET /api/agenda` filtra por su barbero **en el server**, no
  en el cliente.
- **`GestionUsuarios.jsx`**: selects de rol y barbero, avisando si ese barbero ya tiene
  usuario.

**Tests:**
- el nav de barbero no incluye Usuarios/Barberos/Banners; el de admin sí;
- `MisPrecios` guarda contra `/api/barberos/:id/precios` con el id del usuario logueado;
- `MisHorarios` muestra el CTA de clonado cuando no hay horarios propios;
- server: `GET /api/agenda` como barbero devuelve solo los suyos.

---

### Sprint 6 — Despliegue

Orden obligatorio:

1. Backup de la base de producción (ya existe `server/db-backups/`).
2. Correr `migrarRolesUsuarios.js` **antes** de que el nuevo `authenticate` reciba
   tráfico (ver R1).
3. Desplegar server y client juntos (cambió el payload de reserva).
4. Verificar que todos los barberos quedaron con `usaHorariosPropios: false` y sin
   overrides → el comportamiento visible tiene que ser **idéntico** al de hoy.
5. Regenerar la agenda a futuro y comparar conteos contra el backup.
6. Humo: reservar como cliente anónimo, editar por link de WhatsApp, login admin, login
   barbero, cambiar un precio propio y verlo en la landing.
7. Entrada en `BITACORA.md`.

---

## 7. Riesgos

**R1 — Lock-out del panel (el más serio).** Mongoose aplica los `default` del schema al
hidratar documentos que no tienen el campo. Si el nuevo `authenticate` recibe tráfico
antes de la migración, los usuarios existentes se leerían como `rol: "barbero"` y
perderían el panel de admin. Mitigación en tres partes: (a) la migración corre primero;
(b) durante una release `authenticate` trata un `rol` ausente como `admin` con un
warning; (c) `authenticate` lee con `.lean()` — si leyera un documento hidratado,
Mongoose ya habría rellenado `"barbero"` y **(b) nunca se dispararía**.

Test que lo cubre: insertar un usuario crudo sin `rol` con el driver (esquivando
Mongoose), pegarle a una ruta de admin con su cookie y verificar que pasa.

**R2 — Payload de reserva breaking.** Server y client tienen que ir juntos; la
compatibilidad temporal del Sprint 2 es la red.

**R3 — Regeneración destructiva.** `regenerarAgendaCompleta` borra todos los turnos
disponibles del rango. Si cada cambio de horario de un barbero la dispara, es lento y
arriesgado. Sprint 3 la saca del camino caliente con `regenerarAgendaDeBarbero`.

**R4 — Snapshots históricos.** Los `servicios[]` y `nombreBarbero` de `Agenda` son
copias al momento de reservar. Ningún cambio de precio debe reescribir turnos pasados;
hay un test que lo fija.

**R5 — `AdminDashboard.jsx` tiene ~3600 líneas.** El plan **no** lo reescribe: agrega el
gate por rol, extrae el array del nav y suma dos componentes nuevos en
`components/panel/`. Refactorizarlo entero es otro trabajo.
