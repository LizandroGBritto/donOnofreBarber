# 08 · Ubicación y mapa oscuro

El bloque "Ubicación" muestra un mapa oscuro (Leaflet con teselas de CARTO sobre
OpenStreetMap) con un marcador en el local, la dirección y "Ver en Google Maps", que sigue
yendo a `enlaceMaps`. Ya no está el "Esquema ilustrativo, sin escala.".

El mapa necesita coordenadas, y `enlaceMaps` en producción es un enlace corto sin ellas. Por
eso `Ubicacion` ganó el campo opcional `coordenadas: { lat, lng }`, que se carga en el panel
como texto "lat, lng" (por ejemplo, copiado de Google Maps). **Sin coordenadas no se dibuja
un mapa aproximado**: se muestran la dirección y el botón.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| U-01 | Ubicación con coordenadas | Mapa oscuro centrado en el punto, cargado recién cuando el bloque está cerca | `test: SeccionInfo.test.jsx` |
| U-02 | Ubicación sin coordenadas | Dirección y botón, sin mapa | `test: SeccionInfo.test.jsx` |
| U-03 | "Ver en Google Maps" | Abre `enlaceMaps` en otra pestaña | `test: SeccionInfo.test.jsx` |
| U-04 | Panel: se pegan "-25.2865, -57.6470" | Se guardan como números y la landing los lee | `test: coordenadas.test.js`, `server/tests/ubicacion.test.js` |
| U-05 | Panel: se borra el campo | Se quitan las coordenadas (`$unset`) | `test: server/tests/ubicacion.test.js` |
| U-06 | Panel: se edita otra cosa sin tocar coordenadas | Se conservan | `test: server/tests/ubicacion.test.js` |
| U-07 | En el teléfono | El mapa no captura el arrastre: la página se sigue desplazando | `manual` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| U-10 | No hay ubicación cargada (404) | El bloque no aparece | `test: SeccionInfo.test.jsx` |
| U-11 | Mientras carga | Esqueleto del bloque; el mapa tiene su propio esqueleto | `test: SeccionInfo.test.jsx` |
| U-12 | Las teselas no cargan (sin red, CARTO caído) | Se ve el fondo oscuro con el marcador; la dirección y el botón siguen | `manual` |
| U-13 | Panel: "-25.28" sin longitud, o texto | El panel no guarda y avisa; el servidor responde 400 | `test: coordenadas.test.js`, `server/tests/ubicacion.test.js` |
| U-14 | Panel: latitud 95 | 400, fuera de rango | `test: server/tests/ubicacion.test.js` |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| U-20 | Coordenadas a medias en la base (`lng: null`) | No se dibuja un mapa en 0,0 | `test: SeccionInfo.test.jsx`, `coordenadas.test.js` |
| U-21 | Se crea una ubicación inválida desde el panel | Antes dejaba el sitio sin ninguna ubicación activa; ahora se valida antes de desactivar las demás (corregido) | `test: server/tests/ubicacion.test.js` |
| U-22 | `enlaceMaps` con `javascript:` | El botón no se publica | `test: SeccionInfo.test.jsx` |
| U-23 | Coordenadas cargadas en el orden equivocado (lng, lat) | El mapa cae en otro lugar del mundo. Para Paraguay, la latitud es negativa entre -19 y -28; el panel podría advertirlo | `manual` (mejora posible) |
| U-24 | Atribución de OSM y CARTO | Visible en el mapa, como exigen sus licencias | `manual` |
