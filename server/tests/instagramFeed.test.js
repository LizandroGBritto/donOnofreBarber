/**
 * Copia diaria del feed de Instagram (docs/casos-de-uso/07-instagram.md, I-30 en adelante).
 * La descarga de fotos se reemplaza por una imagen generada: los tests no salen a internet.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");

jest.mock("../utils/descargarImagen", () => ({ descargarImagen: jest.fn() }));

const request = require("supertest");
const app = require("../app");
const InstagramFeed = require("../models/instagramFeed.model");
const Feed = require("../services/instagramFeed.service");
const { descargarImagen } = require("../utils/descargarImagen");

const CARPETA = fs.mkdtempSync(path.join(os.tmpdir(), "ig-feed-"));
const CDN = (n) => `https://scontent-dus1-1.cdninstagram.com/v/t51/foto-${n}.jpg?oe=ABC`;
const PROXY = (n) => `https://phosphor.utils.elfsightcdn.com/?url=${encodeURIComponent(CDN(n))}`;
const publicacion = (n, extra = {}) => ({
  imagen: PROXY(n),
  enlace: `https://www.instagram.com/p/POST${n}/`,
  likes: "48",
  comentarios: "2",
  ...extra,
});
const ocho = () => Array.from({ length: 8 }, (_, i) => publicacion(i + 1));

/** Una imagen distinta por URL, para que cada foto tenga su propio archivo. */
const imagenPara = (url) =>
  sharp({ create: { width: 900, height: 1600, channels: 3, background: { r: Number(url.match(/foto-(\d+)/)?.[1] || 0) * 9, g: 40, b: 90 } } })
    .png()
    .toBuffer();

const renovar = (publicaciones) => request(app).post("/api/instagram").send({ publicaciones });

beforeAll(() => {
  process.env.INSTAGRAM_CACHE_DIR = CARPETA;
});

beforeEach(() => {
  descargarImagen.mockReset();
  descargarImagen.mockImplementation(imagenPara);
  for (const nombre of fs.readdirSync(CARPETA)) fs.unlinkSync(path.join(CARPETA, nombre));
});

afterAll(() => {
  fs.rmSync(CARPETA, { recursive: true, force: true });
  delete process.env.INSTAGRAM_CACHE_DIR;
});

describe("GET /api/instagram", () => {
  it("sin copia devuelve una lista vacía y vencida (la landing carga el widget)", async () => {
    const respuesta = await request(app).get("/api/instagram");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ publicaciones: [], actualizadoEn: null, vigente: false });
  });
});

describe("POST /api/instagram: renovar la copia", () => {
  it("guarda las 8 publicaciones con las fotos como webp locales", async () => {
    const respuesta = await renovar(ocho());

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.vigente).toBe(true);
    expect(respuesta.body.publicaciones).toHaveLength(8);
    const [primera] = respuesta.body.publicaciones;
    expect(primera).toMatchObject({ enlace: "https://www.instagram.com/p/POST1/", likes: "48", comentarios: "2" });
    expect(primera.archivo).toMatch(/^instagram\/[0-9a-f]{32}\.webp$/);
    expect(fs.readdirSync(CARPETA)).toHaveLength(8);

    // Por el proxy de Elfsight, armado en el servidor (las del CDN suelen venir vencidas).
    expect(descargarImagen).toHaveBeenCalledWith(PROXY(1));
    // Se achica a 640 de ancho.
    // Desde un buffer: por ruta, libvips deja el archivo abierto y Windows no deja borrarlo.
    const meta = await sharp(fs.readFileSync(path.join(CARPETA, path.basename(primera.archivo)))).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 640 });
  });

  it("con la copia vigente no hace nada: 409 y no baja fotos", async () => {
    await renovar(ocho());
    descargarImagen.mockClear();

    const segunda = await renovar([publicacion(99)]);

    expect(segunda.status).toBe(409);
    expect(descargarImagen).not.toHaveBeenCalled();
    expect((await request(app).get("/api/instagram")).body.publicaciones).toHaveLength(8);
  });

  it("vencida (más de 24 h) se renueva y borra las fotos que ya no se usan", async () => {
    await renovar(ocho());
    await InstagramFeed.updateOne({ clave: "principal" }, { actualizadoEn: new Date(Date.now() - Feed.VIGENCIA_MS - 1000) });
    expect((await request(app).get("/api/instagram")).body.vigente).toBe(false);

    const respuesta = await renovar([publicacion(20), publicacion(21)]);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.publicaciones).toHaveLength(2);
    expect(fs.readdirSync(CARPETA)).toHaveLength(2);
  });

  it("toma como mucho 8", async () => {
    const doce = Array.from({ length: 12 }, (_, i) => publicacion(i + 1));

    const respuesta = await renovar(doce);

    expect(respuesta.body.publicaciones).toHaveLength(8);
  });

  it("descarta lo que no es de Instagram y rechaza si no queda nada", async () => {
    const ajenas = [
      publicacion(1, { imagen: "https://atacante.com/foto.jpg" }),
      publicacion(2, { imagen: "http://scontent.cdninstagram.com/x.jpg" }),
      publicacion(3, { imagen: "https://phosphor.utils.elfsightcdn.com/?url=https%3A%2F%2F127.0.0.1%2Fx" }),
      publicacion(4, { enlace: "javascript:alert(1)" }),
      publicacion(5, { enlace: "https://instagram.com.atacante.com/p/X/" }),
    ];

    const respuesta = await renovar(ajenas);

    expect(respuesta.status).toBe(400);
    expect(descargarImagen).not.toHaveBeenCalled();
    expect(await InstagramFeed.countDocuments()).toBe(0);
  });

  it("los contadores que no son números quedan en null", async () => {
    const respuesta = await renovar([publicacion(1, { likes: "<img src=x>", comentarios: "1,2K" })]);

    expect(respuesta.body.publicaciones[0]).toMatchObject({ likes: null, comentarios: "1,2K" });
  });

  it("si una foto no baja se saltea; si no baja ninguna, no pisa la copia", async () => {
    descargarImagen.mockImplementation((url) =>
      url.includes("foto-2") ? Promise.reject(new Error("timeout")) : imagenPara(url)
    );
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const parcial = await renovar([publicacion(1), publicacion(2)]);
    expect(parcial.status).toBe(201);
    expect(parcial.body.publicaciones).toHaveLength(1);

    await InstagramFeed.updateOne({ clave: "principal" }, { actualizadoEn: new Date(0) });
    descargarImagen.mockRejectedValue(new Error("sin red"));
    const nada = await renovar([publicacion(3)]);
    expect(nada.status).toBe(400);
    expect((await InstagramFeed.findOne()).publicaciones).toHaveLength(1);
    console.warn.mockRestore();
  });

  it("sin publicaciones o con basura: 400", async () => {
    expect((await renovar(undefined)).status).toBe(400);
    expect((await renovar("hola")).status).toBe(400);
    expect((await renovar([])).status).toBe(400);
  });
});

it("si el proxy falla, prueba directo al CDN de Instagram", async () => {
  descargarImagen.mockImplementation((url) =>
    url.startsWith("https://phosphor.") ? Promise.reject(new Error("502")) : imagenPara(url)
  );

  const respuesta = await renovar([publicacion(1)]);

  expect(respuesta.status).toBe(201);
  expect(descargarImagen.mock.calls.map(([url]) => url)).toEqual([PROXY(1), CDN(1)]);
});

it("arma la URL del proxy con la de Instagram validada, sin otros parámetros", () => {
  expect(Feed.fuentesDeFoto(CDN(1))).toEqual([PROXY(1), CDN(1)]);
});

describe("urlDeFoto", () => {
  it.each([
    [CDN(1), CDN(1)],
    [PROXY(1), CDN(1)],
    ["https://scontent.xx.fbcdn.net/v/foto.jpg", "https://scontent.xx.fbcdn.net/v/foto.jpg"],
    ["https://cdninstagram.com.atacante.com/x.jpg", null],
    ["https://phosphor.utils.elfsightcdn.com/?url=https%3A%2F%2Fphosphor.utils.elfsightcdn.com%2F%3Furl%3Dhttp%3A%2F%2Flocalhost", null],
    ["file:///etc/passwd", null],
    [undefined, null],
  ])("%s → %s", (entrada, esperado) => {
    expect(Feed.urlDeFoto(entrada)).toBe(esperado);
  });
});
