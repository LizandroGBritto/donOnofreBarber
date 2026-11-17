# 10 · Contacto

Sale de `GET /api/contacto`. Muestra celular, Instagram y correo con botón para copiar, y
enlaces a WhatsApp (`wa.me`) e Instagram. Un dato que no está cargado no se muestra.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| C-01 | Contacto completo | Filas de celular, Instagram y correo; botones WhatsApp e Instagram | `test: SeccionInfo.test.jsx` |
| C-02 | "Copiar celular" | Se copia y aparece la píldora "Copiado" (anunciada por `role="status"`) | `test: SeccionInfo.test.jsx` |
| C-03 | WhatsApp cargado como "+595 983 974 440" | Enlace `https://wa.me/595983974440` | `test: SeccionInfo.test.jsx` |
| C-04 | Instagram cargado como "@alonzo_style" | Se muestra con arroba; el enlace va a `instagram.com/alonzo_style/` | `test: SeccionInfo.test.jsx` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| C-10 | No hay contacto cargado (404) | El bloque no aparece | `test: SeccionInfo.test.jsx` |
| C-11 | El navegador no deja copiar (http, permisos, WebView) | Se selecciona el texto y se pide "Seleccioná y copiá el texto" | `test: SeccionInfo.test.jsx` |
| C-12 | Solo hay Instagram | Sin fila ni botón de WhatsApp | `manual` |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| C-20 | `instagramUrl` con `javascript:` o sin protocolo | Se ignora y se arma con el usuario | `test: SeccionInfo.test.jsx`, `formato.test.js` |
| C-21 | WhatsApp cargado con letras o un número local sin 595 | `wa.me` necesita el código de país: "0983…" abriría un número equivocado. Mejora posible: normalizar a 595 en el panel | `manual` (mejora posible) |
| C-22 | Se copian muchos datos seguidos | Una sola píldora a la vez; la nueva reemplaza a la anterior | revisado en código |
