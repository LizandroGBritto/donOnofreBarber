# 02 · Elegir servicios

Paso 2. Muestra los servicios que ofrece el barbero elegido, con su precio para ese
barbero (override de `PrecioBarbero` si existe) y sus fotos (las del barbero reemplazan a
las del catálogo). Carrusel con desplazamiento automático salvo con movimiento reducido.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| S-01 | Se marcan uno o más servicios | Checkbox marcado; la barra inferior muestra "N servicios" y el total en guaraníes enteros | `test: Reserva.test.jsx` |
| S-02 | Se desmarca un servicio | Sale de la selección y el total baja | `test: reserva.test.js` |
| S-03 | "Continuar" | Pasa al paso 3; deshabilitado sin al menos un servicio | `test: reserva.test.js`, `Reserva.test.jsx` |
| S-04 | Movimiento reducido activado | El carrusel no se desplaza solo | `manual` |
| S-05 | Arrastrar el carrusel con el mouse | Se desplaza y se pausa el avance automático; al soltar se acomoda a la tarjeta más cercana y no marca el servicio que quedó bajo el puntero | `test: useArrastreHorizontal.test.jsx` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| S-10 | Los servicios tardan o fallan | Esqueletos; si falla, aviso con "Reintentar" | `manual` |
| S-11 | El barbero no ofrece ningún servicio | Mensaje y enlace para cambiar de barbero | `manual` |
| S-12 | Al confirmar, un servicio ya no está activo (400 con "servicio") | Vuelve al paso 2 con aviso y se recargan los servicios | `test: reserva.test.js` (avisoParaError) |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| S-20 | Se manipula el body y se manda `precio: 0` | El servidor ignora cualquier precio del body; resuelve contra el catálogo y los overrides | `test: Reserva.test.jsx` (el cliente no manda precio); servidor: tests de precios existentes |
| S-21 | Se manda un `servicioId` que este barbero desactivó (`PrecioBarbero.activo: false`) | 400 del servidor, nunca se reserva a precio de catálogo | servidor: tests de precios existentes |
| S-22 | Se elige un servicio y se cambia a un barbero que no lo ofrece | Se poda de la selección al cargar los servicios del nuevo barbero | `test: reserva.test.js` |
| S-23 | Precio con decimales en la base | Se muestra redondeado a guaraníes enteros, sin coma | `test: formato.test.js` |
| S-24 | El ticket y la barra muestran totales distintos | No debería pasar: el ticket usa el `costoTotal` que devuelve el servidor, que manda | `manual` |
