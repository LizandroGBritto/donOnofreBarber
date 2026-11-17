# 04 · Datos y confirmación

Paso 4. Nombre y celular, recibo con lo elegido y "Confirmar". El cliente primero consulta
`GET /api/agenda/verificar-turno/:numero` (un turno abierto por celular) y después hace
`POST /api/agenda/reservar-con-barbero` con `{ fecha, hora, barberoId, nombreCliente,
numeroCliente, servicioIds }`. Nunca manda precios.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| D-01 | Datos válidos y "Confirmar" | Se reserva, se guarda `editToken:<id>` en el dispositivo y se muestra el ticket | `test: Reserva.test.jsx` |
| D-02 | Celular escrito "+595 981 123 456", "0981-123-456" o "981 123 456" | Se normaliza a `0981123456` antes de enviar; el servidor vuelve a normalizar con la misma regla | `test: Reserva.test.jsx`, `celular.test.js`, `server/tests/celular.test.js` |
| D-03 | Nombre con tildes o ñ | Se acepta | `test: formato.test.js` |
| D-04 | Se confirma con Enter en el formulario | Mismo efecto que el botón de la barra (es el mismo `form`) | `manual` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| D-10 | Celular fijo, corto, repetido ("0981111111") o de otro país sin código | Al salir del campo: "Revisá el número. Si no es de Paraguay, escribilo con el código de país (+54…)"; "Confirmar" deshabilitado | `test: Reserva.test.jsx`, `celular.test.js` |
| D-11 | Nombre de menos de 3 letras o con números | Mensaje al salir del campo; no se envía | `test: formato.test.js` |
| D-12 | Ya tiene un turno en las próximas 12 horas | Aviso "Ya tenés un turno…" con fecha, hora y barbero; no se reserva | `test: Reserva.test.jsx` |
| D-13 | La verificación falla (red) | Se sigue con la reserva: es una ayuda, no la validación | `test: Reserva.test.jsx` |
| D-14 | Sin red al confirmar | Aviso "Revisá tu conexión"; se queda en el paso 4 con los datos cargados | `test: Reserva.test.jsx` |
| D-15 | 409, 404 o 400 del servidor | Ver 01 (B-20), 02 (S-12) y 03 (H-23) | `test: reserva.test.js` |
| D-16 | Doble toque en "Confirmar" | Un solo envío: el botón queda en "Reservando…" deshabilitado | `manual` |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| D-20 | Se llama a la API directo con una fecha y hora que no están en la agenda (03:00, un domingo cerrado, una fecha pasada, `hora: "99:99"`) | 409 si el horario no está en la agenda, ya pasó o no está disponible; 400 si la hora, la fecha o el barbero están mal formados. Nunca se crea un turno. (Corregido: antes lo creaba ya reservado) | `test: server/tests/reservaIntegridad.test.js` |
| D-21 | Dos o más personas reservan a la vez el mismo turno | Una sola gana; las demás reciben 409. La base rechaza un segundo turno del mismo barbero a la misma hora (índice `turno_unico_por_barbero`); el admin recibe 409 si intenta crearlo. (Corregido) | `test: server/tests/reservaIntegridad.test.js` |
| D-22 | Se salta la regla de 12 horas llamando a la API directo | 409 con `motivo: "turno_abierto"` y los datos del turno; el cliente muestra "Ya tenés un turno". (Corregido: antes solo la aplicaba el cliente) | `test: server/tests/recordatorios.test.js`, `reserva.test.js` |
| D-23 | La regla de 12 horas con un turno de hoy | Se compara fecha + hora del turno (`turnoAbiertoDelCelular`): a las 10:00 un turno de hoy a las 13:00 cuenta; uno que ya pasó o a más de 12 h no. (Corregido: comparaba el inicio del día) | `test: server/tests/recordatorios.test.js` |
| D-24 | `numeroCliente` vacío, con letras o mal formado por API | 400. Paraguay: `09` + operadora (5 a 9) + 7 dígitos, se guarda `09XXXXXXXX`. Otro país: con código, 10 a 15 dígitos, se guarda `+…`; Argentina, Brasil y EE. UU. con el largo exacto de un celular. Se rechazan los rellenos ("0981111111"). (Corregido) | `test: server/tests/recordatorios.test.js`, `server/tests/celular.test.js` |
| D-25 | `nombreCliente` de 5.000 caracteres o con HTML por API | 400: solo letras y espacios, de 3 a 60 caracteres, en el cliente y en el servidor. (Corregido) | `test: server/tests/recordatorios.test.js` |
| D-26 | Un script reserva todos los turnos de la semana | **BRECHA**: no hay rate limit en `reservar-con-barbero` (sí en el login). Agregar límite por IP y por celular | **BRECHA** |
| D-27 | Se consulta `verificar-turno/:numero` con números ajenos | **BRECHA** de privacidad: devuelve si esa persona tiene turno, cuándo y con quién | **BRECHA** |
| D-29 | Reserva por API con `servicioIds: []` | **BRECHA**: el servidor la acepta con costo 0; solo el cliente exige al menos un servicio | **BRECHA** |
| D-30 | Recordatorio por WhatsApp una hora antes | Sale cuando falta una hora o menos (fecha + hora), una sola vez, y no a quien reservó con menos de una hora de anticipación. Si WhatsApp falla se marca igual, para no mandarlo tarde. (Corregido: salía cerca de las 23:00 de la noche anterior diciendo "hoy", y la marca `recordatorioEnviado` no estaba en el esquema, así que Mongoose la descartaba) | `test: server/tests/recordatorios.test.js` |
| D-28 | localStorage lleno o bloqueado (modo privado) | La reserva queda hecha igual; solo no se recuerda como "propio" | `test: turnosPropios.test.js` |
