const axios = require("axios");

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Baja una imagen ya validada (host permitido). Sin redirecciones: una
 * redirección podría llevar a una dirección interna (SSRF).
 * Va en un módulo aparte para poder reemplazarlo en los tests.
 */
const descargarImagen = async (url) => {
  const respuesta = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 10_000,
    maxRedirects: 0,
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
  });
  const tipo = String(respuesta.headers["content-type"] || "");
  if (!tipo.startsWith("image/")) throw new Error(`No es una imagen (${tipo})`);
  return Buffer.from(respuesta.data);
};

module.exports = { descargarImagen };
