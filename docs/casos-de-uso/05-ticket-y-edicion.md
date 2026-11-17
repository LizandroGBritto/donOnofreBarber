# 05 · Ticket, turno propio y edición

Después de confirmar se muestra el ticket con lo que devolvió el servidor (hora, servicios
y total). Tocarlo lo da vuelta y muestra cómo llegar. "Modificar o cancelar" lleva a
`/editar-turno/:id`, que usa el `editToken` guardado en el dispositivo.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| T-01 | Reserva confirmada | Ticket con hora, fecha larga, cliente, barbero, servicios, total y código `AS-DDMM-HHXX` | `test: Reserva.test.jsx`, `formato.test.js` |
| T-02 | Se toca el ticket o el botón "Dar vuelta" | Muestra dirección, horarios e Instagram; la cara oculta queda `inert` | `manual` |
| T-03 | "Nueva reserva" | Vuelve al paso 1 vacío y la agenda se pide de nuevo | `test: reserva.test.js` (reiniciar) |
| T-04 | Volver a la landing después de reservar | En el paso 3 ese turno aparece como "Tu turno" | `test: agenda.test.js` |
| T-05 | "Modificar o cancelar" | Abre `/editar-turno/:id` sin pedir login | `manual` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| T-10 | El servidor no devuelve `costoTotal` | Se usa `costoServicios`; si tampoco hay, Gs. 0 (no NaN) | `test: formato.test.js` (guaranies) |
| T-11 | Sin ubicación ni contacto cargados | El dorso muestra solo lo que haya | `manual` |
| T-12 | Se abre `/editar-turno/:id` en otro dispositivo | Sin token en ese dispositivo no se puede editar; se usa el enlace del WhatsApp | `manual` |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| T-20 | Alguien copia un `_id` de la agenda pública y abre `GET /api/agenda/:id` | Debería pedir sesión o token. **BRECHA**: devuelve el turno entero con `editToken`, nombre y celular; con ese token se puede editar o liberar el turno de otro | **BRECHA** |
| T-21 | Se edita a mano localStorage y se agrega `editToken:<id ajeno>` con cualquier valor | En la landing se vería "Tu turno" en ese horario, pero el servidor rechaza cualquier edición sin el token real. Es cosmético | `manual` |
| T-22 | Un barbero opera sobre el turno de otro con `POST /:id/generar-token` o `/delete-and-create/:id` | Debería rechazarse. **BRECHA**: esas rutas solo llevan `authenticate` | **BRECHA** |
| T-24 | El admin libera un turno con `delete-and-create` | El horario debería volver a la agenda de ese barbero. **BRECHA**: el turno nuevo se crea sin `barbero`, así que no aparece en la reserva pública hasta que corre el generador (que crea otro) | **BRECHA** |
| T-23 | Ticket de una reserva y "Tomarlo" desde el escenario | "Tomarlo" descarta el ticket anterior y arma una reserva nueva | `test: reserva.test.js` |
