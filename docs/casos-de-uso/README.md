# Casos de uso de la landing y la reserva

Un archivo por punto del rediseño. Cada uno tiene tres partes:

- **Normal**: lo que pasa cuando todo sale bien.
- **Errores**: fallas esperables (red, servidor, datos inválidos) y qué ve la persona.
- **Casos raros e integridad**: carreras, datos manipulados, estados que no deberían
  existir. Acá se prueba que el sistema no quede inconsistente aunque el cliente mienta.

Cada caso dice cómo está cubierto:

| Marca | Significa |
|---|---|
| `test:` archivo | Cubierto por un test automático (cliente: Vitest; servidor: Jest). |
| `manual` | Se prueba a mano en el navegador; no hay test. |
| **BRECHA** | Comportamiento actual incorrecto o sin protección. Va con lo que habría que hacer. |

Los tests del cliente están bajo `client/src/landing/` y los del servidor en `server/tests/`.
Una **BRECHA** no es un caso que falle por el rediseño: es algo que ya estaba en el servidor
y quedó documentado al relevarlo. Las del servidor no se corrigieron en este trabajo, salvo
las marcadas como corregidas.

| # | Archivo | Punto |
|---|---|---|
| 01 | [01-elegir-barbero.md](01-elegir-barbero.md) | Paso 1: tarjetas de barbero |
| 02 | [02-elegir-servicios.md](02-elegir-servicios.md) | Paso 2: servicios y precios |
| 03 | [03-elegir-horario.md](03-elegir-horario.md) | Paso 3: días y turnos |
| 04 | [04-datos-y-confirmacion.md](04-datos-y-confirmacion.md) | Paso 4: datos y reserva |
| 05 | [05-ticket-y-edicion.md](05-ticket-y-edicion.md) | Ticket, turno propio y edición |
| 06 | [06-escenario-y-banner.md](06-escenario-y-banner.md) | Banner fijo y panel sin Banners |
| 07 | [07-instagram.md](07-instagram.md) | Feed de Instagram forzado al estilo de la demo |
| 08 | [08-ubicacion-y-mapa.md](08-ubicacion-y-mapa.md) | Mapa oscuro y coordenadas en el panel |
| 09 | [09-horarios-y-apertura.md](09-horarios-y-apertura.md) | Horarios del local y "abierto ahora" |
| 10 | [10-contacto.md](10-contacto.md) | Contacto, copiar y enlaces |
| 11 | [11-aviso-push.md](11-aviso-push.md) | Aviso push antes del turno |

## Brechas corregidas

- ~~La reserva creaba el turno si no existía~~: ahora solo se reserva un turno `disponible`
  generado en la agenda y por delante de "ahora"; lo demás es 409 (04, D-20).
- ~~Sin índice único `(barbero, fecha, hora)`~~: índice parcial `turno_unico_por_barbero`.
  Mongoose lo crea al arrancar; si una base ya tiene duplicados no puede, y
  `node scripts/indiceTurnoUnico.js` los lista sin borrar nada (04, D-21).
- ~~Recordatorios de WhatsApp a las 23:00 de la noche anterior~~: se compara fecha + hora, y la
  marca `recordatorioEnviado` ahora está en el esquema (antes Mongoose la descartaba) (04, D-30).
- ~~La regla de 12 horas comparaba el inicio del día y solo la aplicaba el cliente~~: el
  servidor responde 409 `turno_abierto` mirando fecha + hora (04, D-22 y D-23).
- ~~El servidor no validaba celular ni nombre~~: mismas reglas que el cliente (04, D-24 y D-25).
- ~~Las notificaciones push abrían siempre `/admin`~~: `sw.js` leía `event.data`, que no existe
  en `notificationclick`; ahora usa la URL de la notificación (11, P-22).
- ~~`/api/notifications/subscribe` era pública~~ y cada reserva iba a todas las suscripciones con
  los datos del cliente: ahora pide sesión, valida el host y avisa solo a quien ve ese turno
  (11, P-30).
- ~~Los rate limits eran globales~~: detrás de Nginx faltaba `trust proxy` y todos tenían la IP
  del proxy (07, I-29).

## Brechas abiertas, por prioridad

1. `delete-and-create` recrea el turno **sin barbero**: el horario liberado no vuelve a la
   agenda pública de ese barbero hasta que corre el generador (05, T-24).
2. `GET /api/agenda/:id` es pública y devuelve el `editToken`, y la disponibilidad expone los
   `_id`: cualquiera puede editar o liberar el turno de otro (05).
3. `verificar-turno/:numeroCliente` es pública: con un número se sabe si esa persona tiene
   turno, cuándo y con quién (04).
4. El servidor acepta reservas sin ningún servicio y no limita la frecuencia de reservas (04).
5. La copia diaria de Instagram la renueva el navegador de una visita con un `POST` público: se
   valida que todo sea de Instagram, pero no que sea de esta cuenta (07, I-30).
