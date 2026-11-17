/**
 * Celular del cliente.
 *
 * - Paraguay: se guarda como 09XXXXXXXX. Se acepta como lo escribe la gente
 *   ("0981 123 456", "+595 981 123456", "595981123456").
 * - Otro país: con código de país (+54…, 0054…), se guarda en formato E.164
 *   ("+5491123456789"). WhatsApp lo usa tal cual.
 *
 * El servidor aplica las mismas reglas (server/utils/celular.js): si se cambia
 * algo acá, cambiarlo allá.
 */

// Celulares paraguayos: 09 + operadora (5 a 9) + 7 dígitos.
const CELULAR_PY = /^09[5-9]\d{7}$/;

// Largo exacto (sin el +) de un celular en los países de donde más llegan
// clientes. El resto se valida solo por el rango E.164.
const MOVIL_POR_PAIS = [
  { codigo: "54", largo: 13, prefijo: "549" }, // Argentina: +54 9 + 10 dígitos
  { codigo: "55", largo: 13 }, // Brasil: +55 + área + 9 dígitos
  { codigo: "1", largo: 11 }, // EE. UU. y Canadá
];

const todosIguales = (digitos) => /^(\d)\1+$/.test(digitos);

/**
 * Normaliza lo escrito. Devuelve "09XXXXXXXX", "+<código><número>" o los
 * dígitos tal cual (que después no van a validar).
 */
export const limpiarCelular = (valor = "") => {
  const texto = String(valor).trim();
  let digitos = texto.replace(/\D/g, "");
  const internacional = texto.startsWith("+") || digitos.startsWith("00");
  if (digitos.startsWith("00")) digitos = digitos.slice(2);

  // Paraguay con código de país: vuelve al formato local ("+595 0981…" también).
  if (digitos.startsWith("595") && (internacional || digitos.length >= 12)) {
    return `0${digitos.slice(3).replace(/^0/, "")}`;
  }
  // "981 123 456": el celular paraguayo sin el 0.
  if (!internacional && /^9[5-9]\d{7}$/.test(digitos)) return `0${digitos}`;
  return internacional ? `+${digitos}` : digitos;
};

/**
 * true si es un celular paraguayo o un número internacional plausible (10 a 15
 * dígitos con el código de país). Sin la base de numeración de cada país no se
 * puede saber si existe; se controla el largo de los países más frecuentes.
 */
export const celularValido = (valor) => {
  const limpio = limpiarCelular(valor);
  if (CELULAR_PY.test(limpio)) return !todosIguales(limpio.slice(3));
  if (!limpio.startsWith("+")) return false;

  const digitos = limpio.slice(1);
  if (!/^[1-9]\d{9,14}$/.test(digitos) || todosIguales(digitos.slice(-7))) return false;
  const pais = MOVIL_POR_PAIS.find((p) => digitos.startsWith(p.codigo));
  if (!pais) return true;
  return digitos.length === pais.largo && (!pais.prefijo || digitos.startsWith(pais.prefijo));
};

/**
 * Mismo criterio que tenía el formulario anterior: letras (con tildes y ñ) y
 * espacios, al menos 3 caracteres útiles.
 */
export const nombreValido = (valor = "") => {
  const limpio = String(valor).trim();
  return (
    limpio.length >= 3 &&
    limpio.length <= 60 &&
    /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(limpio)
  );
};
