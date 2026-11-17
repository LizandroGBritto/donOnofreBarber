/**
 * Copia diaria del feed de Instagram de la landing.
 *
 * El widget de Elfsight cuenta una vista cada vez que se carga, y el plan
 * gratuito tiene un cupo por mes. En vez de cargarlo en cada visita:
 *
 * 1. La landing pide `GET /api/instagram`. Si la copia tiene menos de 24 h, la
 *    dibuja y no carga el widget.
 * 2. Si está vencida (o no hay), carga el widget, le lee las últimas 8
 *    publicaciones y las manda con `POST /api/instagram`.
 * 3. El servidor baja las fotos, las guarda como webp en uploads/instagram/ y
 *    renueva la copia. Hasta que vuelva a vencer, otro POST recibe 409.
 *
 * Las fotos se bajan porque las URLs del CDN de Instagram están firmadas y
 * vencen (las que trae Elfsight suelen estar vencidas ya; ver fuentesDeFoto).
 *
 * Límite conocido: el POST es público (lo hace el navegador de una visita).
 * Se valida que todo venga de Instagram, pero no se puede comprobar que sea
 * de esta cuenta. Ver docs/casos-de-uso/07-instagram.md, I-30.
 */
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const InstagramFeed = require("../models/instagramFeed.model");
const { descargarImagen } = require("../utils/descargarImagen");

const VIGENCIA_MS = 24 * 60 * 60 * 1000;
const MAX_PUBLICACIONES = 8;
const ANCHO_FOTO = 640;

const ENLACE_INSTAGRAM = /^https:\/\/(www\.)?instagram\.com\/[\w./-]*$/i;
const ENLACE_PUBLICACION = /^https:\/\/(www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/[\w-]+\/?/i;
const NUMERO_VISIBLE = /^\d[\d.,]*\s?[KkMm]?$/;
const CDN_INSTAGRAM = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;
const PROXY_ELFSIGHT = "phosphor.utils.elfsightcdn.com";

// En los tests apunta a una carpeta temporal.
const carpeta = () =>
  process.env.INSTAGRAM_CACHE_DIR || path.join(__dirname, "..", "uploads", "instagram");

class FeedInvalido extends Error {}
class FeedVigente extends Error {}

const vigente = (feed, ahora = Date.now()) =>
  Boolean(feed?.publicaciones?.length) && ahora - new Date(feed.actualizadoEn).getTime() < VIGENCIA_MS;

/**
 * URL de la foto en el CDN de Instagram. Elfsight la sirve por su proxy
 * (`phosphor…?url=<cdn de instagram>`): se baja directo del CDN.
 * null si no es https ni de Instagram.
 */
const urlDeFoto = (valor) => {
  let url;
  try {
    url = new URL(String(valor));
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.hostname === PROXY_ELFSIGHT) return urlDeFoto(url.searchParams.get("url"));
  return CDN_INSTAGRAM.test(url.hostname) ? url.href : null;
};

/** Valida y normaliza lo que mandó la landing. Lanza FeedInvalido. */
const normalizar = (publicaciones) => {
  if (!Array.isArray(publicaciones) || !publicaciones.length) {
    throw new FeedInvalido("No hay publicaciones");
  }
  const vistas = new Set();
  const resultado = [];
  for (const p of publicaciones.slice(0, MAX_PUBLICACIONES)) {
    const foto = urlDeFoto(p?.imagen);
    const enlace = typeof p?.enlace === "string" && p.enlace.length <= 300 ? p.enlace : "";
    if (!foto || !ENLACE_INSTAGRAM.test(enlace) || vistas.has(foto)) continue;
    vistas.add(foto);
    const contador = (v) => (typeof v === "string" && NUMERO_VISIBLE.test(v.trim()) ? v.trim() : null);
    resultado.push({
      foto,
      enlace,
      esReel: ENLACE_PUBLICACION.test(enlace) && /\/(reel|reels|tv)\//i.test(enlace),
      likes: contador(p.likes),
      comentarios: contador(p.comentarios),
    });
  }
  if (!resultado.length) throw new FeedInvalido("Ninguna publicación es de Instagram");
  return resultado;
};

/**
 * De dónde bajar la foto, en orden. Primero el proxy de Elfsight: las URLs del
 * CDN de Instagram están firmadas (`oe=`) y Elfsight suele tenerlas ya
 * vencidas (403 directo), pero su proxy guarda la imagen. La URL del proxy se
 * arma acá con la de Instagram ya validada, no se usa la que mandó la landing.
 */
const fuentesDeFoto = (urlInstagram) => [
  `https://${PROXY_ELFSIGHT}/?url=${encodeURIComponent(urlInstagram)}`,
  urlInstagram,
];

const bajarDeAlgunaFuente = async (urlInstagram) => {
  let ultimoError;
  for (const fuente of fuentesDeFoto(urlInstagram)) {
    try {
      return await descargarImagen(fuente);
    } catch (error) {
      ultimoError = error;
    }
  }
  throw ultimoError;
};

/** Baja la foto y la guarda como webp. El nombre es el hash del contenido. */
const guardarFoto = async (url) => {
  const original = await bajarDeAlgunaFuente(url);
  const webp = await sharp(original)
    .rotate()
    .resize({ width: ANCHO_FOTO, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  const nombre = `${crypto.createHash("sha256").update(webp).digest("hex").slice(0, 32)}.webp`;
  await fs.mkdir(carpeta(), { recursive: true });
  await fs.writeFile(path.join(carpeta(), nombre), webp);
  return `instagram/${nombre}`;
};

/** Borra las fotos que ya no usa la copia vigente. */
const limpiarFotos = async (enUso) => {
  const usados = new Set(enUso.map((archivo) => path.basename(archivo)));
  let archivos = [];
  try {
    archivos = await fs.readdir(carpeta());
  } catch {
    return;
  }
  await Promise.all(
    archivos
      .filter((nombre) => nombre.endsWith(".webp") && !usados.has(nombre))
      .map((nombre) => fs.unlink(path.join(carpeta(), nombre)).catch(() => {}))
  );
};

/** La copia para la landing: `{ publicaciones, actualizadoEn, vigente }`. */
const obtener = async (ahora = Date.now()) => {
  const feed = await InstagramFeed.findOne({ clave: "principal" }).lean();
  if (!feed) return { publicaciones: [], actualizadoEn: null, vigente: false };
  return {
    publicaciones: feed.publicaciones,
    actualizadoEn: feed.actualizadoEn,
    vigente: vigente(feed, ahora),
  };
};

/**
 * Renueva la copia con lo que leyó la landing. FeedVigente si la actual
 * todavía no venció; FeedInvalido si nada es válido o no se pudo bajar
 * ninguna foto.
 */
const renovar = async (publicaciones, ahora = Date.now()) => {
  const actual = await InstagramFeed.findOne({ clave: "principal" }).lean();
  if (vigente(actual, ahora)) throw new FeedVigente();

  const validas = normalizar(publicaciones);
  const guardadas = [];
  for (const p of validas) {
    try {
      const archivo = await guardarFoto(p.foto);
      guardadas.push({ archivo, enlace: p.enlace, esReel: p.esReel, likes: p.likes, comentarios: p.comentarios });
    } catch (error) {
      console.warn("Instagram: no se pudo bajar una foto:", error.message);
    }
  }
  if (!guardadas.length) throw new FeedInvalido("No se pudo bajar ninguna foto");

  const feed = await InstagramFeed.findOneAndUpdate(
    { clave: "principal" },
    { $set: { publicaciones: guardadas, actualizadoEn: new Date(ahora) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  await limpiarFotos(feed.publicaciones.map((p) => p.archivo));
  return { publicaciones: feed.publicaciones, actualizadoEn: feed.actualizadoEn, vigente: true };
};

module.exports = {
  VIGENCIA_MS,
  MAX_PUBLICACIONES,
  FeedInvalido,
  FeedVigente,
  urlDeFoto,
  fuentesDeFoto,
  normalizar,
  obtener,
  renovar,
};
