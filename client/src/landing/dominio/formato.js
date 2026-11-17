/** Guaraníes enteros, con punto de miles: 70000 → "Gs. 70.000". */
export const guaranies = (monto) => {
  const entero = Math.round(Number(monto) || 0);
  return `Gs. ${String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

/** "Lisandro Alonzo" → "Lisandro". */
export const primerNombre = (nombre = "") => String(nombre).trim().split(/\s+/)[0] || "";

/** "Lisandro Alonzo" → "LA"; "Elias" → "EL". */
export const iniciales = (nombre = "") => {
  const partes = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

/** Plural simple: (1, "servicio") → "1 servicio"; (3, ...) → "3 servicios". */
export const contar = (n, singular, plural = `${singular}s`) =>
  `${n} ${n === 1 ? singular : plural}`;

/** "+595 983 974 440" → "595983974440", para wa.me. */
export const soloDigitos = (texto = "") => String(texto).replace(/\D/g, "");

/** Usuario de Instagram sin arroba: "@alonzo_style" → "alonzo_style". */
export const usuarioInstagram = (texto = "") =>
  String(texto).trim().replace(/^@/, "");

/**
 * Enlace cargado en el panel (Maps, Instagram) listo para un `href`, o null.
 * Solo http(s): un `javascript:` pegado por error o a propósito no llega a la
 * landing pública.
 */
export const urlExterna = (texto) => {
  const limpio = String(texto ?? "").trim();
  if (!limpio) return null;
  try {
    const url = new URL(limpio);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
};
