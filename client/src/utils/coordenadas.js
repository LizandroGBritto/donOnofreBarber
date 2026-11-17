/**
 * Coordenadas del local, compartidas entre el panel (donde se cargan) y la
 * landing (donde se dibuja el mapa).
 *
 * En el panel se pegan como texto, tal como las copia Google Maps al hacer
 * clic derecho sobre el punto: "-27.3301, -55.8662".
 */

const enRango = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

/**
 * Convierte el texto del panel en `{ lat, lng }`.
 *
 * - Texto vacío → `{ lat: "", lng: "" }`: el servidor lo interpreta como
 *   "borrar las coordenadas".
 * - Texto que no se puede leer → `null`: el panel no guarda y avisa.
 */
export const parsearCoordenadas = (texto) => {
  const limpio = String(texto ?? "").trim();
  if (!limpio) return { lat: "", lng: "" };

  const partes = limpio.split(/[\s,;]+/).filter(Boolean);
  if (partes.length !== 2) return null;

  const [lat, lng] = partes.map(Number);
  return enRango(lat, lng) ? { lat, lng } : null;
};

/** Texto para el campo del panel a partir de lo guardado. */
export const formatearCoordenadas = (coordenadas) =>
  coordenadas && enRango(coordenadas.lat, coordenadas.lng)
    ? `${coordenadas.lat}, ${coordenadas.lng}`
    : "";

/** `{ lat, lng }` listo para el mapa, o `null` si la ubicación no tiene. */
export const coordenadasDeUbicacion = (ubicacion) => {
  const c = ubicacion?.coordenadas;
  if (!c) return null;
  const lat = Number(c.lat);
  const lng = Number(c.lng);
  // `Number(null)` es 0: sin este chequeo, una coordenada ausente ubicaría el
  // local frente a las costas de África.
  if (c.lat == null || c.lng == null) return null;
  return enRango(lat, lng) ? { lat, lng } : null;
};
