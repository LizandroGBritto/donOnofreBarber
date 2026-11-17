import { describe, it, expect } from "vitest";
import {
  parsearCoordenadas,
  formatearCoordenadas,
  coordenadasDeUbicacion,
} from "./coordenadas";

describe("parsearCoordenadas", () => {
  it("lee el formato que copia Google Maps", () => {
    expect(parsearCoordenadas("-27.3301, -55.8662")).toEqual({
      lat: -27.3301,
      lng: -55.8662,
    });
  });

  it("acepta espacios o punto y coma como separador", () => {
    expect(parsearCoordenadas("-27.33 -55.86")).toEqual({ lat: -27.33, lng: -55.86 });
    expect(parsearCoordenadas("-27.33;-55.86")).toEqual({ lat: -27.33, lng: -55.86 });
  });

  it("vacío significa borrar", () => {
    expect(parsearCoordenadas("   ")).toEqual({ lat: "", lng: "" });
    expect(parsearCoordenadas(undefined)).toEqual({ lat: "", lng: "" });
  });

  it("rechaza lo ilegible, lo incompleto y lo fuera de rango", () => {
    expect(parsearCoordenadas("-27.33")).toBeNull();
    expect(parsearCoordenadas("hola, mundo")).toBeNull();
    expect(parsearCoordenadas("-27,33, -55,86")).toBeNull(); // coma decimal
    expect(parsearCoordenadas("95, 10")).toBeNull();
    expect(parsearCoordenadas("10, 190")).toBeNull();
  });
});

describe("formatearCoordenadas", () => {
  it("vuelve al texto del campo", () => {
    expect(formatearCoordenadas({ lat: -27.33, lng: -55.86 })).toBe("-27.33, -55.86");
    expect(formatearCoordenadas(undefined)).toBe("");
  });
});

describe("coordenadasDeUbicacion", () => {
  it("devuelve las coordenadas válidas", () => {
    expect(
      coordenadasDeUbicacion({ coordenadas: { lat: -27.33, lng: -55.86 } })
    ).toEqual({ lat: -27.33, lng: -55.86 });
  });

  it("sin coordenadas o con una nula no hay mapa (nunca 0,0)", () => {
    expect(coordenadasDeUbicacion({ direccion: "x" })).toBeNull();
    expect(coordenadasDeUbicacion({ coordenadas: { lat: null, lng: -55 } })).toBeNull();
    expect(coordenadasDeUbicacion({ coordenadas: {} })).toBeNull();
    expect(coordenadasDeUbicacion(null)).toBeNull();
  });
});
