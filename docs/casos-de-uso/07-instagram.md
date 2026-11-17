# 07 · Feed de Instagram

**Copia diaria.** El widget de Elfsight cuenta una vista cada vez que se carga y el plan
gratuito tiene cupo mensual. La landing pide primero `GET /api/instagram`: si la copia del
servidor tiene menos de 24 h, dibuja esa y **no carga el widget**. Si está vencida, muestra la
vieja, carga el widget, le lee las últimas 8 publicaciones y, cuando dejan de cambiar (3 s),
las manda con `POST /api/instagram`. El servidor baja las fotos (por el proxy de Elfsight: las
URLs del CDN de Instagram que trae el widget suelen estar vencidas), las guarda como webp en
`uploads/instagram/` y renueva la copia. Resultado: unas 30 vistas por mes en vez de una por
visita.

Lo de abajo describe la lectura del widget, que ahora corre solo cuando la copia venció.

Se monta el widget de Elfsight (el principal y uno de respaldo) en un contenedor invisible.
Un `MutationObserver` espera a que dibuje, le lee las publicaciones (enlace, imagen, me gusta y comentarios; la descripción no)
y la sección las vuelve a dibujar como reels verticales, como en la demo. El widget se pide
recién cuando la sección está cerca de la pantalla.

Verificado en `localhost` contra el widget de respaldo: dibuja después de unos 10 a 15 s y
cada publicación es un `.es-post` con el enlace y, al lado (no adentro), los contadores
`…-likes-count-label` y `…-comments-count-label`.

## Normal

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| I-01 | El widget dibuja publicaciones con enlaces | Reels propios con la foto, el ícono y un pie con corazón + me gusta y globo + comentarios, sin la descripción; cada uno abre la publicación. Nombre accesible: "Reel de Instagram, 48 me gusta, 2 comentarios" | `test: SeccionInstagram.test.jsx`, `instagram.test.js` |
| I-02 | El widget no usa enlaces (abre un popup) | Se toman las imágenes del CDN de Instagram, sin el avatar; todas llevan al perfil | `test: instagram.test.js` |
| I-03 | Fotos con carga diferida (`data-src`, `srcset`, `background-image`) | Se leen igual | `test: instagram.test.js` |
| I-04 | Al final del carril | Tarjeta "Ver más en Instagram" hacia el perfil de `Contacto` | `test: SeccionInstagram.test.jsx` |
| I-05 | Arrastrar el carril con el mouse | Se desplaza; al soltar no se abre la publicación. Un clic sin mover sí la abre. Con el dedo, el desplazamiento nativo | `test: useArrastreHorizontal.test.jsx` |
| I-06 | Publicación sin contadores, o con texto que no es un número | Sin pie: solo la foto | `test: instagram.test.js` |
| I-07 | Copia del servidor con menos de 24 h | Se dibuja esa (fotos servidas por el servidor); no se pide el script ni se monta el widget | `test: SeccionInstagram.test.jsx`, `server/tests/instagramFeed.test.js` |
| I-08 | Copia vencida | Se ve la vieja mientras el widget carga; lo leído reemplaza a la vieja y renueva la copia una sola vez | `test: SeccionInstagram.test.jsx` |
| I-09 | Las últimas 8 | El widget se monta en un contenedor fijo de 1280 px de ancho para que dibuje su grilla de 4x2 (en el ancho de la sección dibujaba 2x2: 4). El servidor guarda como mucho 8 | `test: server/tests/instagramFeed.test.js`; ancho: `manual` |

## Errores

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| I-10 | Mientras carga | Tres esqueletos y "Cargando publicaciones…" para lectores | `test: SeccionInstagram.test.jsx` |
| I-11 | El widget principal no dibuja en 12 s (cupo de vistas agotado) | Se prueba el de respaldo | `test: SeccionInstagram.test.jsx` |
| I-12 | Ninguno dibuja (sin red, bloqueador de anuncios, dominio no autorizado) | Sin esqueletos; queda "Ver más en Instagram" | `test: SeccionInstagram.test.jsx` |
| I-13 | El script de Elfsight no carga | Mismo resultado que I-12, sin esperar | revisado en código |
| I-14 | Copia vencida y el widget no dibuja (cupo agotado, sin red) | Queda la copia vieja; no se manda nada | `test: SeccionInstagram.test.jsx` |
| I-15 | El servidor no responde la copia | Se carga el widget como antes | `test: SeccionInstagram.test.jsx` |
| I-16 | Una foto no baja | Se saltea; si no baja ninguna, 400 y la copia anterior queda | `test: server/tests/instagramFeed.test.js` |

## Casos raros e integridad

| ID | Escenario | Resultado esperado | Cobertura |
|---|---|---|---|
| I-20 | Elfsight cambia su HTML y no se puede leer nada | Se muestra el widget tal cual, con estilo oscuro, antes que nada | `test: SeccionInstagram.test.jsx` |
| I-21 | El HTML ajeno trae `javascript:` o `data:` | Solo se aceptan URLs https | `test: instagram.test.js` |
| I-22 | El widget repite imágenes o trae decenas | Sin repetidos, máximo 8 | `test: instagram.test.js` |
| I-23 | El widget dibuja dentro de un shadow root | Se lee igual | `test: instagram.test.js` |
| I-24 | `instagramUrl` del panel con `javascript:` | Se ignora y se arma el enlace con el usuario | `test: SeccionInfo.test.jsx` |
| I-25 | El widget original visible para lectores de pantalla | No: queda `aria-hidden` mientras se usan los reels propios | `test: SeccionInstagram.test.jsx` |
| I-26 | Elfsight cambia las clases de los contadores | Se buscan en el bloque de cada publicación (el ancestro con un solo enlace), sin mezclar los de una con otra | `test: instagram.test.js` |
| I-27 | Dos visitas renuevan a la vez | La primera renueva; con la copia vigente, la otra recibe 409 sin bajar nada | `test: server/tests/instagramFeed.test.js` |
| I-28 | El `POST` trae fotos o enlaces de otro sitio (`atacante.com`, `http:`, `127.0.0.1` dentro del proxy, `javascript:`) | Se descartan; si no queda nada, 400. Solo se baja de `phosphor.utils.elfsightcdn.com` con una URL armada en el servidor o del CDN de Instagram, sin redirecciones, hasta 5 MB y solo `image/*` (SSRF) | `test: server/tests/instagramFeed.test.js` |
| I-29 | Muchos `POST` | 10 por hora por IP. Por IP real desde el 2026-11-17 (`trust proxy`); antes era un cupo compartido por todos | `test: server/tests/notificacionesPanel.test.js` (trust proxy) |
| I-30 | Alguien manda fotos de Instagram de **otra cuenta** justo cuando la copia vence | **BRECHA** (límite conocido): el `POST` es público porque lo hace el navegador de una visita, y se valida que todo sea de Instagram pero no de qué cuenta. Quedaría hasta 24 h. Lo resuelve la API de Instagram con un token propio (el servidor lee el feed solo) | **BRECHA** |
