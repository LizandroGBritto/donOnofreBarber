# 06 · Escenario y banner fijo

El banner es fijo: la mascota con el contorno de neón, las brasas y el título "Creando tu
estilo", como en la demo. Ya no se lee de `Banner`: la sección Banners se sacó del menú del
panel porque cambiar la imagen rompe el efecto (el neón está calcado sobre la mascota). La
cortina con la reserva sube por encima del escenario al desplazarse. El poste del
encabezado gira cuando el local está abierto (three.js, con un poste en CSS mientras carga
o si falla).

El atajo "Próximo horario libre… Tomarlo" debajo de "Reservar turno" se quitó el
2026-11-17: no se veía bien en todos los teléfonos. Con él se fueron E-02, E-03, E-10, E-11,
E-20 y E-21.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| E-01 | Se abre la landing | Mascota, neón, "Creando tu estilo" y "Reservar turno" hacia `#reservar` | `test: Landing.test.jsx` |
| E-04 | Local abierto ahora | El poste gira; cerrado, queda quieto | `manual` |
| E-05 | Se desplaza hacia abajo | La cortina tapa el escenario, que se achica y se apaga | `manual` |
| E-06 | Panel de admin | No aparece "Banners" en el menú | `test: navItems.test.js` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| E-12 | Sin WebGL o three.js no carga | Queda el poste en CSS | `manual` |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| E-22 | Movimiento reducido | Sin brasas animadas, sin recorrido de neón, sin desplazamiento suave | `manual` |
| E-23 | Alguien llama a la API de banners con sesión de admin | Sigue funcionando (el modelo y las rutas existen), pero la landing no la lee. Si se quiere borrar del todo, es otro trabajo | `manual` |
| E-24 | Pantalla muy baja (teléfono apaisado) | El escenario tiene alto mínimo de 520 px; la cortina no tapa el llamado a reservar | `manual` |
