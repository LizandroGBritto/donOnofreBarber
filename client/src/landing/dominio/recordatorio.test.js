import { describe, expect, it } from "vitest";
import moment from "moment-timezone";
import { avisoParaTurno, minutosDeAviso, textoAnticipacion } from "./recordatorio";

const ZONA = "America/Asuncion";
const AHORA = moment.tz("2030-01-15 10:00", ZONA);
const turnoA = (hora, dia = "2030-01-15") => ({
  fecha: moment.tz(dia, ZONA).startOf("day").toISOString(),
  hora,
});

describe("minutosDeAviso", () => {
  it.each([
    [180, 60],
    [61, 60],
    [60, 40],
    [41, 40],
    [40, 20],
    [21, 20],
    [20, 5],
    [6, 5],
    [5, null],
    [1, null],
    [-30, null],
  ])("con %s minutos por delante avisa %s antes", (restantes, esperado) => {
    expect(minutosDeAviso(restantes)).toBe(esperado);
  });
});

describe("avisoParaTurno", () => {
  it("usa fecha + hora del turno", () => {
    expect(avisoParaTurno(turnoA("13:00"), AHORA)).toBe(60);
    expect(avisoParaTurno(turnoA("10:45"), AHORA)).toBe(40);
    expect(avisoParaTurno(turnoA("10:30"), AHORA)).toBe(20);
    expect(avisoParaTurno(turnoA("10:15"), AHORA)).toBe(5);
    expect(avisoParaTurno(turnoA("10:05"), AHORA)).toBeNull();
  });

  it("un turno de otro día avisa una hora antes", () => {
    expect(avisoParaTurno(turnoA("09:00", "2030-01-16"), AHORA)).toBe(60);
  });

  it("sin datos no ofrece nada", () => {
    expect(avisoParaTurno(null, AHORA)).toBeNull();
    expect(avisoParaTurno({ hora: "10:00" }, AHORA)).toBeNull();
  });
});

describe("textoAnticipacion", () => {
  it("dice una hora o los minutos", () => {
    expect(textoAnticipacion(60)).toBe("una hora");
    expect(textoAnticipacion(40)).toBe("40 minutos");
    expect(textoAnticipacion(5)).toBe("5 minutos");
  });
});
