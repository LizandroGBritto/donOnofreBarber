import { describe, expect, it } from "vitest";
import { MAX_PUBLICACIONES, etiquetaPublicacion, extraerPublicaciones } from "./instagram";

const PERFIL = "https://www.instagram.com/alonzo_style/";
const raiz = (html) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
};
const IMG = (n) => `https://scontent.cdninstagram.com/v/foto-${n}.jpg`;

describe("extraerPublicaciones", () => {
  it("lee los enlaces a publicaciones con su imagen, sin la descripción", () => {
    const publicaciones = extraerPublicaciones(
      raiz(`
        <a href="https://www.instagram.com/p/ABC123/" aria-label="Fade clásico"><img src="${IMG(1)}"></a>
        <a href="https://www.instagram.com/reel/XYZ789/"><img src="${IMG(2)}" alt="Degradé"></a>
      `),
      PERFIL
    );
    expect(publicaciones).toHaveLength(2);
    expect(publicaciones[0]).toMatchObject({ imagen: IMG(1), enlace: "https://www.instagram.com/p/ABC123/", esReel: false });
    expect(publicaciones[1]).toMatchObject({ esReel: true });
    expect(publicaciones[0]).not.toHaveProperty("texto");
  });

  it("usa data-src, srcset y background-image de los lazy loaders", () => {
    const publicaciones = extraerPublicaciones(
      raiz(`
        <a href="https://www.instagram.com/p/A1/"><img data-src="${IMG(1)}"></a>
        <a href="https://www.instagram.com/p/A2/"><img srcset="${IMG(2)} 320w, ${IMG(3)} 640w"></a>
        <a href="https://www.instagram.com/p/A3/"><div style="background-image: url('${IMG(4)}')"></div></a>
      `),
      PERFIL
    );
    expect(publicaciones.map((p) => p.imagen)).toEqual([IMG(1), IMG(2), IMG(4)]);
  });

  it("sin enlaces toma imágenes del CDN y descarta el avatar", () => {
    const publicaciones = extraerPublicaciones(
      raiz(`
        <img class="profile-avatar" src="${IMG("avatar")}">
        <img src="${IMG(1)}" alt="Corte">
        <img src="https://otro-sitio.com/x.jpg">
        <img src="${IMG(2)}" width="40">
      `),
      PERFIL
    );
    expect(publicaciones).toHaveLength(1);
    expect(publicaciones[0]).toMatchObject({ imagen: IMG(1), enlace: PERFIL });
  });

  it("no deja pasar enlaces ni imágenes que no sean https", () => {
    const publicaciones = extraerPublicaciones(
      raiz(`
        <a href="javascript:alert(1)"><img src="${IMG(1)}"></a>
        <a href="https://www.instagram.com/p/OK/"><img src="data:image/png;base64,AAAA"></a>
        <a href="https://www.instagram.com/p/OK2/"><img src="http://scontent.cdninstagram.com/x.jpg"></a>
      `),
      PERFIL
    );
    // Ninguna publicación válida por enlace; el paso 2 tampoco acepta http ni data:.
    expect(publicaciones.every((p) => p.imagen.startsWith("https://"))).toBe(true);
    expect(publicaciones.some((p) => p.enlace.startsWith("javascript"))).toBe(false);
  });

  it("no repite imágenes y corta en el máximo", () => {
    const enlaces = Array.from(
      { length: MAX_PUBLICACIONES + 4 },
      (_, i) => `<a href="https://www.instagram.com/p/P${i}/"><img src="${IMG(i)}"></a>`
    ).join("");
    const repetida = `<a href="https://www.instagram.com/p/OTRA/"><img src="${IMG(0)}"></a>`;
    const publicaciones = extraerPublicaciones(raiz(repetida + enlaces), PERFIL);
    expect(publicaciones).toHaveLength(MAX_PUBLICACIONES);
    expect(new Set(publicaciones.map((p) => p.imagen)).size).toBe(MAX_PUBLICACIONES);
  });

  it("lee los me gusta y comentarios que Elfsight dibuja al lado del enlace", () => {
    // Estructura real del widget: los contadores son hermanos del enlace.
    const item = (n, likes, comentarios) => `
      <div class="es-post eapps-instagram-feed-posts-item">
        <a class="eapps-instagram-feed-posts-item-link" href="https://www.instagram.com/p/C${n}/"><img src="${IMG(n)}"></a>
        <div class="eapps-instagram-feed-posts-item-counters">
          <span class="eapps-instagram-feed-posts-item-likes-count"><span class="eapps-instagram-feed-posts-item-likes-count-label">${likes}</span></span>
          <span class="eapps-instagram-feed-posts-item-comments-count"><span class="eapps-instagram-feed-posts-item-comments-count-label">${comentarios}</span></span>
        </div>
      </div>`;
    const publicaciones = extraerPublicaciones(raiz(item(1, "48", "2") + item(2, "1,2K", "0")), PERFIL);
    expect(publicaciones[0]).toMatchObject({ likes: "48", comentarios: "2" });
    expect(publicaciones[1]).toMatchObject({ likes: "1,2K", comentarios: "0" });
  });

  it("si cambian las clases, busca los contadores en el bloque de cada publicación sin mezclarlos", () => {
    const publicaciones = extraerPublicaciones(
      raiz(`
        <ul>
          <li><a href="https://www.instagram.com/p/X1/"><img src="${IMG(1)}"></a><i class="post-likes-count">7</i></li>
          <li><a href="https://www.instagram.com/p/X2/"><img src="${IMG(2)}"></a><i class="post-likes-count">9</i></li>
        </ul>`),
      PERFIL
    );
    expect(publicaciones.map((p) => p.likes)).toEqual(["7", "9"]);
  });

  it("sin contadores (o con texto que no es un número) quedan en null", () => {
    const [p] = extraerPublicaciones(
      raiz(`<div class="es-post"><a href="https://www.instagram.com/p/N/"><img src="${IMG(1)}"></a><span class="likes">Me gusta</span></div>`),
      PERFIL
    );
    expect(p).toMatchObject({ likes: null, comentarios: null });
  });

  it("busca también dentro de shadow roots", () => {
    const host = document.createElement("div");
    const sombra = host.attachShadow({ mode: "open" });
    sombra.innerHTML = `<a href="https://www.instagram.com/p/S1/"><img src="${IMG(1)}"></a>`;
    const contenedor = document.createElement("div");
    contenedor.appendChild(host);
    expect(extraerPublicaciones(contenedor, PERFIL)).toHaveLength(1);
  });

  it("sin raíz o sin nada reconocible devuelve una lista vacía", () => {
    expect(extraerPublicaciones(null, PERFIL)).toEqual([]);
    expect(extraerPublicaciones(raiz("<p>Cargando…</p>"), PERFIL)).toEqual([]);
  });
});

describe("etiquetaPublicacion", () => {
  it("nombra el tipo y los contadores que haya", () => {
    expect(etiquetaPublicacion({ esReel: true, likes: "48", comentarios: "2" })).toBe(
      "Reel de Instagram, 48 me gusta, 2 comentarios"
    );
    expect(etiquetaPublicacion({ esReel: false, likes: "1", comentarios: "1" })).toBe(
      "Publicación de Instagram, 1 me gusta, 1 comentario"
    );
    expect(etiquetaPublicacion({ esReel: false, likes: null, comentarios: null })).toBe("Publicación de Instagram");
  });
});
