/**
 * Lee las publicaciones que dibuja el widget de Elfsight para volver a
 * dibujarlas con el estilo de la landing (tarjetas verticales tipo reel).
 *
 * El HTML del widget no es una API: Elfsight lo puede cambiar sin aviso. Por
 * eso la lectura es tolerante (enlaces a publicaciones, y si no hay, imágenes
 * del CDN de Instagram) y el componente tiene un plan B si no encuentra nada.
 */

export const MAX_PUBLICACIONES = 8;

const ENLACE_PUBLICACION = /^https:\/\/(www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/[\w-]+/i;
const CDN_IMAGEN = /(cdninstagram\.com|fbcdn\.net|elfsight)/i;
const PISTA_AVATAR = /avatar|profile|logo|header/i;

/** Solo https: nada de `javascript:` ni `data:` que pueda venir del DOM ajeno. */
const urlSegura = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url, "https://www.instagram.com");
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
};

const primeraDeSrcset = (srcset = "") => srcset.split(",")[0]?.trim().split(/\s+/)[0];

const urlDeFondo = (el) => {
  const estilo = el.getAttribute?.("style") || "";
  const m = estilo.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
  return m ? m[2] : null;
};

/** URL de la imagen de un nodo, mirando lo que usan los lazy loaders. */
const imagenDe = (raiz) => {
  const img = raiz.matches?.("img") ? raiz : raiz.querySelector?.("img");
  if (img) {
    const candidata =
      img.currentSrc ||
      img.getAttribute("src") ||
      img.getAttribute("data-src") ||
      primeraDeSrcset(img.getAttribute("srcset") || img.getAttribute("data-srcset") || "");
    const segura = urlSegura(candidata);
    if (segura) return { url: segura, alt: img.getAttribute("alt") || "" };
  }
  const conFondo = [raiz, ...(raiz.querySelectorAll?.("[style*='background']") || [])];
  for (const el of conFondo) {
    const segura = urlSegura(urlDeFondo(el));
    if (segura) return { url: segura, alt: "" };
  }
  return null;
};

// Contadores que dibuja Elfsight en cada publicación ("48", "1,2K"). Primero
// las clases que usa hoy; después cualquier clase que las nombre.
const SELECTORES_CONTADOR = {
  likes: [".eapps-instagram-feed-posts-item-likes-count-label", "[class*='likes-count']", "[class*='likes']"],
  comentarios: [
    ".eapps-instagram-feed-posts-item-comments-count-label",
    "[class*='comments-count']",
    "[class*='comments']",
  ],
};
const CONTENEDOR_PUBLICACION = ".es-post, .eapps-instagram-feed-posts-item";
const NUMERO_VISIBLE = /^\d[\d.,]*\s?[KkMm]?$/;

/** El primer texto con forma de número (como lo muestra Instagram) o null. */
const contador = (item, selectores) => {
  for (const selector of selectores) {
    for (const el of item.querySelectorAll(selector)) {
      const texto = el.textContent.replace(/\s+/g, " ").trim();
      if (NUMERO_VISIBLE.test(texto)) return texto;
    }
  }
  return null;
};

const esEnlaceAPublicacion = (a) => ENLACE_PUBLICACION.test(urlSegura(a.getAttribute("href")) || "");

/**
 * El bloque de una publicación: los contadores no están dentro del enlace
 * sino al lado. Se sube desde el enlace hasta el contenedor de Elfsight o,
 * si cambió de clases, hasta el último ancestro con un solo enlace a
 * publicación.
 */
const itemDe = (enlace) => {
  const conocido = enlace.closest(CONTENEDOR_PUBLICACION);
  if (conocido) return conocido;
  let item = enlace;
  let padre = enlace.parentElement;
  for (let i = 0; padre && i < 4; i += 1) {
    if ([...padre.querySelectorAll("a[href]")].filter(esEnlaceAPublicacion).length > 1) break;
    item = padre;
    padre = padre.parentElement;
  }
  return item;
};

const contadoresDe = (item) => ({
  likes: item ? contador(item, SELECTORES_CONTADOR.likes) : null,
  comentarios: item ? contador(item, SELECTORES_CONTADOR.comentarios) : null,
});

/** Raíz y shadow roots anidados, por si el widget dibuja en uno. */
const raicesDe = (raiz) => {
  const raices = [raiz];
  raiz.querySelectorAll?.("*").forEach((el) => {
    if (el.shadowRoot) raices.push(...raicesDe(el.shadowRoot));
  });
  return raices;
};

/**
 * `[{ id, imagen, enlace, esReel, likes, comentarios }]`, sin repetidos y como
 * mucho `MAX_PUBLICACIONES`. La descripción no se toma: la tarjeta lleva solo
 * la foto y los contadores. `likes` y `comentarios` son el texto que muestra
 * Instagram ("1,2K"), o null si el widget no los dibujó. `perfil` es el enlace al que se manda cuando la
 * publicación no trae el suyo.
 */
export const extraerPublicaciones = (raiz, perfil) => {
  if (!raiz) return [];
  const vistas = new Set();
  const resultado = [];

  const agregar = ({ imagen, enlace, item }) => {
    if (!imagen || vistas.has(imagen.url) || resultado.length >= MAX_PUBLICACIONES) return;
    vistas.add(imagen.url);
    const destino = enlace && ENLACE_PUBLICACION.test(enlace) ? enlace : perfil;
    resultado.push({
      id: imagen.url,
      imagen: imagen.url,
      enlace: destino,
      esReel: /\/(reel|reels|tv)\//i.test(destino || ""),
      ...contadoresDe(item),
    });
  };

  const raices = raicesDe(raiz);

  // 1) Enlaces a publicaciones con su imagen adentro.
  for (const r of raices) {
    r.querySelectorAll("a[href]").forEach((a) => {
      const enlace = urlSegura(a.getAttribute("href"));
      if (!enlace || !ENLACE_PUBLICACION.test(enlace)) return;
      agregar({ imagen: imagenDe(a), enlace, item: itemDe(a) });
    });
  }
  if (resultado.length) return resultado;

  // 2) Sin enlaces (el widget abre las publicaciones en un popup): imágenes
  //    del CDN de Instagram que no sean el avatar del perfil.
  for (const r of raices) {
    r.querySelectorAll("img").forEach((img) => {
      const pistas = `${img.className} ${img.getAttribute("alt") || ""} ${img.parentElement?.className || ""}`;
      if (PISTA_AVATAR.test(pistas)) return;
      const ancho = Number(img.getAttribute("width"));
      if (ancho && ancho < 100) return;
      const imagen = imagenDe(img);
      if (!imagen || !CDN_IMAGEN.test(imagen.url)) return;
      agregar({ imagen, enlace: null, item: img.closest(CONTENEDOR_PUBLICACION) });
    });
  }
  return resultado;
};

/** Nombre accesible de la tarjeta: "Reel de Instagram, 48 me gusta, 2 comentarios". */
export const etiquetaPublicacion = ({ esReel, likes, comentarios }) =>
  [
    esReel ? "Reel de Instagram" : "Publicación de Instagram",
    likes && `${likes} me gusta`,
    comentarios && `${comentarios} ${comentarios === "1" ? "comentario" : "comentarios"}`,
  ]
    .filter(Boolean)
    .join(", ");
