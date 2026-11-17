# 01 · Elegir barbero

Paso 1 del asistente. Lista `GET /api/barberos/activos`; cada tarjeta muestra foto, nombre,
descripción y "Desde Gs. X" (el precio más bajo de `GET /api/barberos/:id/servicios`).
**No lleva el "Libre: …" de la demo**, para que la tarjeta no crezca.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| B-01 | Hay barberos activos | Una tarjeta por barbero, como radio; "Desde Gs. 50.000" con el menor precio | `test: PasoBarbero.test.jsx` |
| B-02 | Se toca una tarjeta | Queda marcada "Elegido" (`aria-checked`) y se pasa al paso 2 | `test: PasoBarbero.test.jsx`, `Reserva.test.jsx` |
| B-03 | Barbero con logo cargado | El logo reemplaza a las iniciales en el monograma | `manual` |
| B-04 | Barbero sin foto | Se ve el patrón de reemplazo, no una imagen rota | `manual` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| B-10 | La lista tarda | Dos tarjetas esqueleto y "Cargando barberos…" para lectores | `test: PasoBarbero.test.jsx` |
| B-11 | La lista falla (red, 500) | Aviso "Atención" con "Reintentar"; reintentar vuelve a pedir | `test: PasoBarbero.test.jsx` |
| B-12 | No hay barberos activos | "Por ahora no hay barberos disponibles para reservar." | `test: PasoBarbero.test.jsx` |
| B-13 | Fallan los servicios de un barbero | Esa tarjeta no muestra "Desde"; no se inventa un precio | `test: PasoBarbero.test.jsx` |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| B-20 | El admin desactiva al barbero mientras alguien reserva con él | Al confirmar, el servidor responde 404; la persona vuelve al paso 1 con aviso y la lista se recarga | `test: reserva.test.js` (avisoParaError), `manual` para el recorrido |
| B-21 | Se cambia de barbero en el paso 3 o 4 | Se sueltan el día y la hora (otra agenda); los servicios se conservan y se podan a los que ofrece el nuevo | `test: reserva.test.js` |
| B-22 | Se vuelve a tocar el mismo barbero | No se pierde el turno elegido | `test: reserva.test.js` |
| B-23 | Barbero activo pero con `incluirEnAgenda: false` | Aparece en la lista (la API lo devuelve) pero sin turnos: el paso 3 dice que no tiene horarios. Revisar si `/barberos/activos` debería excluirlo | `manual` |
| B-24 | Nombre de barbero con HTML (`<b>`) | Se muestra como texto; React escapa | `manual` |
