import { describe, expect, it } from "vitest";
import { celularValido, limpiarCelular } from "./celular";

// La misma tabla está en server/tests/celular.test.js: las reglas son las mismas.
const CASOS = [
  // [escrito, normalizado, válido]
  ["0981123456", "0981123456", true],
  ["0981 123 456", "0981123456", true],
  ["0981-123-456", "0981123456", true],
  ["981 123 456", "0981123456", true],
  ["+595 981 123 456", "0981123456", true],
  ["595981123456", "0981123456", true],
  ["+595 0981 123456", "0981123456", true],
  ["0961 234 567", "0961234567", true],
  ["+54 9 11 2345-6789", "+5491123456789", true],
  ["0054 9 376 412-3456", "+5493764123456", true],
  ["+55 11 91234 5678", "+5511912345678", true],
  ["+1 202 555 0143", "+12025550143", true],
  ["+34 612 345 678", "+34612345678", true],
  // Inválidos
  ["021 123 456", "021123456", false], // fijo de Asunción
  ["0981 12345", "098112345", false], // corto
  ["09811234567", "09811234567", false], // largo
  ["0941 123 456", "0941123456", false], // no es prefijo de celular
  ["0981 111 111", "0981111111", false], // relleno
  ["+54 11 2345 6789", "+541123456789", false], // Argentina sin el 9 de móvil
  ["+1 202 555", "+1202555", false],
  ["0021123456", "+21123456", false], // demasiado corto para internacional
  ["+595 1234", "01234", false],
  ["", "", false],
  ["abc", "", false],
];

describe("celular", () => {
  it.each(CASOS)("%s → %s (válido: %s)", (escrito, normalizado, valido) => {
    expect(limpiarCelular(escrito)).toBe(normalizado);
    expect(celularValido(escrito)).toBe(valido);
  });
});
