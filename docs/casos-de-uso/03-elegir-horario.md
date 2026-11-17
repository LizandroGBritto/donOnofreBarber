# 03 · Elegir día y hora

Paso 3. Lee `GET /api/agenda/landing?barberoId=` (solo `_id`, fecha, hora, día y estado:
sin datos del cliente) y arma hasta 14 días con turnos por delante. Toda fecha se calcula
en hora de Asunción, no en la del teléfono.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| H-01 | Se entra al paso | Queda elegido el primer día con turnos libres | `test: Reserva.test.jsx`, `agenda.test.js` |
| H-02 | Se toca un turno libre | Queda marcado; la barra muestra "Mañana, 11:00" | `test: Reserva.test.jsx` |
| H-03 | Día sin libres | El día dice "Completo" y se ofrece "Ver el jueves 19, hay horarios" | `test: agenda.test.js` |
| H-04 | Turno reservado por otra persona | Se ve "Reservado" y deshabilitado | `test: Reserva.test.jsx` |
| H-05 | Turno reservado desde este dispositivo | Se ve "Tu turno" y lleva a `/editar-turno/:id` | `test: agenda.test.js` (estado propio) |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| H-10 | La agenda tarda | Esqueletos de días y turnos | `manual` |
| H-11 | La agenda falla | Aviso con "Reintentar"; reintentar carga los turnos | `test: Reserva.test.jsx` |
| H-12 | El barbero no tiene turnos generados | "No tiene horarios cargados en las próximas semanas", con alternativa por WhatsApp | `manual` |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| H-20 | Turnos que ya pasaron hoy | No se muestran, aunque sigan "disponible" | `test: agenda.test.js`, `Reserva.test.jsx` |
| H-21 | Teléfono en otra zona horaria (turista, VPN) | Los días y "hoy" son los de Asunción | `test: agenda.test.js` |
| H-22 | Pasa la hora del turno elegido mientras la persona completa los datos | El turno se suelta (cada minuto se recalcula "ahora"); si estaba en el paso 4 vuelve al 3 con aviso | `test: reserva.test.js` (perderTurno) |
| H-23 | Otra persona toma el turno mientras tanto (o el horario se quitó de la agenda) | Al confirmar, 409: vuelve al paso 3 con "Ese horario ya no está disponible" y la agenda se recarga sin caché | `test: Reserva.test.jsx`, `server/tests/reservaIntegridad.test.js` |
| H-24 | El generador dejó dos turnos a la misma hora | Se muestra uno solo y gana el libre | `test: agenda.test.js` |
| H-25 | La respuesta pública trae datos del cliente | No debe: el endpoint devuelve una lista cerrada de campos (corregido en este trabajo) | `test: server/tests/landingPublica.test.js` |
| H-26 | Se quiere ver el turno de otra persona por su `_id` | **BRECHA**: los `_id` de los turnos ocupados son públicos y `GET /api/agenda/:id` devuelve el turno entero con `editToken`. Restringir esa ruta (sesión o token) | ver 05 |
| H-27 | Cambio de horario de verano | Paraguay usa -03 fijo desde octubre de 2024; el build de zonas horarias del cliente lo incluye | `manual` |
