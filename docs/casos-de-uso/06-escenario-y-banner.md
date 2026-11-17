# 06 · Escenario, banner fijo y "Tomarlo"

El banner es fijo: la mascota con el contorno de neón, las brasas y el título "Creando tu
estilo", como en la demo. Ya no se lee de `Banner`: la sección Banners se sacó del menú del
panel porque cambiar la imagen rompe el efecto (el neón está calcado sobre la mascota). La
cortina con la reserva sube por encima del escenario al desplazarse. El poste del
encabezado gira cuando el local está abierto (three.js, con un poste en CSS mientras carga
o si falla).

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| E-01 | Se abre la landing | Mascota, neón, "Creando tu estilo" y "Reservar turno" hacia `#reservar` | `test: Landing.test.jsx` |
| E-02 | Hay turnos libres | "Próximo horario libre: mañana a las 10:00 con Elias. Tomarlo" (el más cercano entre todos los barberos) | `test: Landing.test.jsx`, `agenda.test.js` |
| E-03 | "Tomarlo" | Arma la reserva con ese barbero, día y turno, y lleva al paso 2; al seguir, el turno ya está marcado | `test: Landing.test.jsx` |
| E-04 | Local abierto ahora | El poste gira; cerrado, queda quieto | `manual` |
| E-05 | Se desplaza hacia abajo | La cortina tapa el escenario, que se achica y se apaga | `manual` |
| E-06 | Panel de admin | No aparece "Banners" en el menú | `test: navItems.test.js` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| E-10 | La agenda falla | No se muestra el atajo (es una ayuda); la reserva sigue disponible | `test: Landing.test.jsx` |
| E-11 | Ningún barbero tiene libres en 14 días | "No hay horarios libres en las próximas dos semanas." | `manual` |
| E-12 | Sin WebGL o three.js no carga | Queda el poste en CSS | `manual` |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| E-20 | Mientras cargan los barberos | El atajo muestra un esqueleto, no "no hay libres" | revisado en código (`useProximoLibre`) |
| E-21 | "Tomarlo" con un turno que otro tomó después | Al cargar la agenda del paso 3 el turno ya no está libre y se suelta; si llegó a confirmar, 409 | `test: reserva.test.js`, `Reserva.test.jsx` |
| E-22 | Movimiento reducido | Sin brasas animadas, sin recorrido de neón, sin desplazamiento suave | `manual` |
| E-23 | Alguien llama a la API de banners con sesión de admin | Sigue funcionando (el modelo y las rutas existen), pero la landing no la lee. Si se quiere borrar del todo, es otro trabajo | `manual` |
| E-24 | Pantalla muy baja (teléfono apaisado) | El escenario tiene alto mínimo de 520 px; la cortina no tapa el llamado a reservar | `manual` |
