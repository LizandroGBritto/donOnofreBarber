# 11 · Aviso push antes del turno

Al confirmar la reserva aparece un modal: "Activá las notificaciones. Así te avisamos una hora
antes de tu turno". El foco arranca en "Activar". Tocarlo pide el permiso del navegador,
suscribe el dispositivo y registra el aviso en
`POST /api/agenda/:id/recordatorio-push?t=<editToken>` con `{ suscripcion }`. El cron
(`services/cron.service.js`, cada minuto) lo manda cuando entra en su ventana.

**Anticipación**: una hora antes. Si falta menos, se recorta de a 20 minutos: 40, 20 y 5. Con
5 minutos o menos no se ofrece. La regla está dos veces, con los mismos casos de prueba:
`client/src/landing/dominio/recordatorio.js` y `server/services/recordatorios.service.js`.
El servidor es quien decide; lo que manda el cliente no cuenta.

Va aparte de las suscripciones del panel (`Suscripcion`, `/api/notifications/subscribe`): un
`RecordatorioPush` está atado a un turno y a una reserva, y solo recibe ese aviso.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| P-01 | Reserva para dentro de más de una hora | Modal "te avisamos una hora antes"; "Activar" con el foco | `test: Reserva.test.jsx` |
| P-02 | Faltan 50, 30 o 12 minutos | El modal dice 40, 20 o 5 minutos | `test: Reserva.test.jsx`, `recordatorio.test.js` |
| P-03 | "Activar" y el permiso se concede | Se registra el aviso, se cierra el modal y aparece "Listo: te avisamos una hora antes" | `test: Reserva.test.jsx`, `server/tests/recordatorios.test.js` |
| P-04 | Llega el momento | Notificación "Tu turno es en 1 hora · A las 11:00 con Pablo en Alonzo Style". Tocarla abre `/editar-turno/:id` | `test: server/tests/recordatorios.test.js`; tocarla: `manual` |
| P-05 | "Ahora no" o Escape | Se cierra, el foco vuelve al título del ticket y no se vuelve a ofrecer para ese turno en este dispositivo | `test: Reserva.test.jsx` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| P-10 | Faltan 5 minutos o menos | No se ofrece. Por API: 409 | `test: Reserva.test.jsx`, `server/tests/recordatorios.test.js` |
| P-11 | El navegador no tiene push (iPhone sin la app instalada, navegador viejo) o lo tiene bloqueado | No se ofrece | `test: Reserva.test.jsx` |
| P-12 | La persona niega el permiso | "Atención: las notificaciones están bloqueadas…", con cómo habilitarlas | `test: Reserva.test.jsx` |
| P-13 | El servidor rechaza (el turno se liberó, ya hay 3 dispositivos) | "Atención" con el motivo del servidor; se puede reintentar | `test: Reserva.test.jsx` |
| P-14 | El servicio de push responde 404/410 al mandar (suscripción vencida) | Se descarta el aviso | `test: server/tests/recordatorios.test.js` |
| P-15 | Otro error al mandar | Se reintenta en el minuto siguiente, hasta 3 veces | `test: server/tests/recordatorios.test.js` |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| P-20 | Registrar un aviso sin token o con el de otro turno | 403 | `test: server/tests/recordatorios.test.js` |
| P-21 | `endpoint` que no es de un servicio de push (`https://127.0.0.1:8081/…`) | 400. El servidor hace un POST a ese `endpoint`: solo se aceptan https a FCM, Mozilla, Windows y Apple (SSRF) | `test: server/tests/recordatorios.test.js` |
| P-22 | Tocar la notificación | Abre la URL de la notificación, solo si es una ruta del mismo sitio. (Corregido: `sw.js` leía `event.data`, que no existe en ese evento, y abría siempre `/admin`) | `manual` |
| P-23 | El turno se libera y lo reserva otra persona | El aviso guarda el hash del `editToken` de la reserva que lo pidió; con otro token se descarta y la primera persona no se entera del turno de la segunda | `test: server/tests/recordatorios.test.js` |
| P-24 | El mismo dispositivo lo activa dos veces | Un solo aviso (índice único `turno + endpoint`) | `test: server/tests/recordatorios.test.js` |
| P-25 | Muchos dispositivos para el mismo turno | Máximo 3; el cuarto recibe 409 | `test: server/tests/recordatorios.test.js` |
| P-26 | El turno ya empezó o se liberó antes del aviso | Se descarta sin mandar | `test: server/tests/recordatorios.test.js` |
| P-27 | Se guarda el token en la base | No: solo su hash sha256 | `test: server/tests/recordatorios.test.js` |
| P-28 | El `editToken` se filtra por `GET /api/agenda/:id` (brecha abierta, ver 05) | Quien lo tenga puede pedir avisos de ese turno para su dispositivo: ve hora y barbero, que esa ruta ya expone | **BRECHA** (la de 05) |
| P-30 | Cualquiera hace `POST /api/notifications/subscribe` | 401. Con sesión: el host del `endpoint` se valida como en P-21 (400 si no) y la suscripción queda a nombre del usuario, no del `userId` del body. Cada reserva, edición o liberación va a los admin y al usuario del barbero del turno; la de prueba, solo a quien la pide. Los barberos también tienen la sección Notificaciones en el panel y la prueba (`/test`) ya no es solo de admin. Las suscripciones anónimas viejas no reciben nada hasta que ese navegador abre el panel. (Corregido el 2026-11-17) | `test: server/tests/notificacionesPanel.test.js` |
