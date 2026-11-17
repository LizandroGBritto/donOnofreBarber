# 09 · Horarios del local y "abierto ahora"

Sale de `GET /api/horarios?estado=activo` (los `Horario` del local, que son las horas de
inicio de los turnos). El cierre de cada día se calcula como el último turno más el menor
intervalo entre turnos (una hora si no se puede saber). Se agrupan días seguidos con el
mismo horario y se resalta el de hoy. El mismo cálculo decide si el poste gira.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| A-01 | Turnos de 09:00 a 19:00, de martes a sábado | "Lunes · Cerrado", "Martes a sábado · 09:00 a 20:00", "Domingo · Cerrado" | `test: horariosLocal.test.js` |
| A-02 | Dentro del horario | "Abierto hasta las 20:00" | `test: horariosLocal.test.js` |
| A-03 | Antes de abrir | "Abre hoy a las 09:00" | `test: horariosLocal.test.js` |
| A-04 | Después de cerrar el sábado | "Abre el martes a las 09:00" (salta los días cerrados) | `test: horariosLocal.test.js` |
| A-05 | Fila de hoy | Resaltada y con `aria-current="date"` | `test: SeccionInfo.test.jsx` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| A-10 | No hay horarios cargados | El bloque no aparece y el poste no gira | `test: horariosLocal.test.js`, `SeccionInfo.test.jsx` |
| A-11 | Falla la consulta | Igual que A-10; no se muestra un horario inventado | revisado en código |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| A-20 | Justo a la hora de cierre | Ya está cerrado | `test: horariosLocal.test.js` |
| A-21 | Turnos cada 30 minutos | El cierre es el último turno más 30 minutos | `test: horariosLocal.test.js` |
| A-22 | Horario inactivo, hora inválida o día desconocido en la base | Se ignoran | `test: horariosLocal.test.js` |
| A-23 | Un barbero con horarios propios atiende fuera del horario del local | El bloque muestra el del local (los `Horario` sin barbero). La agenda de ese barbero sí muestra sus turnos | `manual` |
| A-24 | Horario partido (09 a 12 y 15 a 20) | Se muestra de 09:00 a 20:00: el modelo guarda horas de inicio, no franjas. Si el local cierra al mediodía, "abierto" a las 13:00 es falso. Mejora posible: detectar huecos mayores al intervalo | `manual` |
| A-25 | Teléfono en otra zona horaria | "Abierto" se calcula en hora de Asunción | revisado en código (`useAhora` usa `ParaguayDateUtil`) |
