import { describe, expect, it } from "vitest";
import { nombreValido } from "./celular";
import { contar, guaranies, iniciales, primerNombre, soloDigitos, urlExterna, usuarioInstagram } from "./formato";
import { codigoDeTurno } from "./ticket";

describe("guaranies", () => {
  it("formatea enteros con punto de miles", () => {
    expect(guaranies(70000)).toBe("Gs. 70.000");
    expect(guaranies(1500000)).toBe("Gs. 1.500.000");
    expect(guaranies(0)).toBe("Gs. 0");
  });

  it("nunca muestra decimales ni NaN", () => {
    expect(guaranies(69999.6)).toBe("Gs. 70.000");
    expect(guaranies(undefined)).toBe("Gs. 0");
    expect(guaranies("abc")).toBe("Gs. 0");
  });
});

describe("textos", () => {
  it("primerNombre e iniciales toleran espacios y nombres de una palabra", () => {
    expect(primerNombre("  Lisandro   Alonzo ")).toBe("Lisandro");
    expect(iniciales("Lisandro Alonzo")).toBe("LA");
    expect(iniciales("Elias")).toBe("EL");
    expect(iniciales("")).toBe("");
    expect(iniciales(undefined)).toBe("");
  });

  it("contar usa singular y plural", () => {
    expect(contar(1, "servicio")).toBe("1 servicio");
    expect(contar(0, "servicio")).toBe("0 servicios");
    expect(contar(2, "día libre", "días libres")).toBe("2 días libres");
  });

  it("soloDigitos y usuarioInstagram limpian lo que se carga en el panel", () => {
    expect(soloDigitos("+595 983 974-440")).toBe("595983974440");
    expect(usuarioInstagram(" @alonzo_style ")).toBe("alonzo_style");
  });
});

describe("nombre", () => {
  it("acepta tildes y ñ", () => {
    expect(nombreValido("José Peña")).toBe(true);
  });

  it("rechaza nombres cortos, con números, con símbolos o demasiado largos", () => {
    expect(nombreValido("  Al ")).toBe(false);
    expect(nombreValido("Juan 2")).toBe(false);
    expect(nombreValido("<script>")).toBe(false);
    expect(nombreValido("a".repeat(61))).toBe(false);
  });
});

describe("codigoDeTurno", () => {
  it("combina día, mes, hora e iniciales del barbero", () => {
    const turno = { fecha: "2026-11-18T03:00:00.000Z", hora: "10:00" };
    expect(codigoDeTurno(turno, { nombre: "Lisandro Alonzo" })).toBe("AS-1811-10LA");
  });

  it("sin barbero no falla", () => {
    expect(codigoDeTurno({ fecha: "2026-11-18T03:00:00.000Z", hora: "09:30" }, null)).toBe("AS-1811-09");
  });
});

describe("urlExterna", () => {
  it("deja pasar enlaces http(s) cargados en el panel", () => {
    expect(urlExterna(" https://maps.app.goo.gl/abc ")).toBe("https://maps.app.goo.gl/abc");
    expect(urlExterna("http://instagram.com/alonzo_style")).toBe("http://instagram.com/alonzo_style");
  });

  it("descarta javascript:, data:, rutas relativas y vacíos", () => {
    expect(urlExterna("javascript:alert(1)")).toBeNull();
    expect(urlExterna(" JaVaScRiPt:alert(1)")).toBeNull();
    expect(urlExterna("data:text/html,<script>")).toBeNull();
    expect(urlExterna("maps.google.com")).toBeNull();
    expect(urlExterna("")).toBeNull();
    expect(urlExterna(null)).toBeNull();
  });
});
