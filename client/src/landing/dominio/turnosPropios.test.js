import { afterEach, describe, expect, it, vi } from "vitest";
import { idsDeTurnosPropios, recordarTurnoPropio } from "./turnosPropios";

afterEach(() => vi.restoreAllMocks());

describe("turnos propios", () => {
  it("recuerda el token con la clave que lee /editar-turno/:id", () => {
    expect(recordarTurnoPropio({ _id: "t1", editToken: "tok" }, "0981123456")).toBe(true);
    expect(localStorage.getItem("editToken:t1")).toBe("tok");
    expect(localStorage.getItem("numeroCliente")).toBe("0981123456");
    expect([...idsDeTurnosPropios()]).toEqual(["t1"]);
  });

  it("ignora otras claves y tokens vacíos", () => {
    localStorage.setItem("user", "{}");
    localStorage.setItem("editToken:vacio", "");
    localStorage.setItem("editToken:t2", "tok");
    expect([...idsDeTurnosPropios()]).toEqual(["t2"]);
  });

  it("sin id no guarda nada", () => {
    expect(recordarTurnoPropio({ editToken: "tok" }, "0981123456")).toBe(false);
    expect(localStorage.length).toBe(0);
  });

  it("si el almacenamiento está lleno o bloqueado no rompe la reserva", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(recordarTurnoPropio({ _id: "t1", editToken: "tok" }, "0981123456")).toBe(false);

    vi.spyOn(Storage.prototype, "key").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(idsDeTurnosPropios().size).toBe(0);
  });
});
