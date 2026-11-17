import { describe, expect, it } from "vitest";
import ParaguayDateUtil from "../../utils/paraguayDate";
import { estadoApertura, jornadas, resumirHorarios } from "./horariosLocal";

const SEMANA = ["martes", "miercoles", "jueves", "viernes", "sabado"];
// Turnos cada hora de 09:00 a 19:00 de martes a sábado: el local abre de 09 a 20.
const horariosTipicos = ["09:00", "10:00", "11:00", "15:00", "19:00"].map((hora) => ({
  hora,
  dias: SEMANA,
  estado: "activo",
}));
const en = (iso) => ParaguayDateUtil.toParaguayTime(iso);

describe("jornadas", () => {
  it("calcula apertura y cierre (último turno más el intervalo)", () => {
    const porDia = jornadas(horariosTipicos);
    expect(porDia[2]).toEqual({ dia: 2, abre: 9 * 60, cierra: 20 * 60 });
    expect(porDia[0]).toEqual({ dia: 0, cerrado: true });
    expect(porDia[1]).toEqual({ dia: 1, cerrado: true });
  });

  it("toma el menor intervalo entre turnos (media hora)", () => {
    const porDia = jornadas([
      { hora: "09:00", dias: ["lunes"] },
      { hora: "09:30", dias: ["lunes"] },
      { hora: "12:00", dias: ["lunes"] },
    ]);
    expect(porDia[1].cierra).toBe(12 * 60 + 30);
  });

  it("con un solo turno por día usa una hora de intervalo", () => {
    expect(jornadas([{ hora: "14:00", dias: ["lunes"] }])[1].cierra).toBe(15 * 60);
  });

  it("ignora los horarios inactivos, las horas inválidas y los días desconocidos", () => {
    const porDia = jornadas([
      { hora: "09:00", dias: ["lunes"], estado: "inactivo" },
      { hora: "nada", dias: ["lunes"] },
      { hora: "10:00", dias: ["feriado"] },
    ]);
    expect(porDia.every((j) => j.cerrado)).toBe(true);
  });
});

describe("resumirHorarios", () => {
  it("agrupa días seguidos con el mismo horario, empezando el lunes", () => {
    expect(resumirHorarios(horariosTipicos).map(({ etiqueta, rango }) => [etiqueta, rango])).toEqual([
      ["Lunes", "Cerrado"],
      ["Martes a sábado", "09:00 a 20:00"],
      ["Domingo", "Cerrado"],
    ]);
  });

  it("usa 'y' para dos días y deja claves únicas", () => {
    const filas = resumirHorarios([{ hora: "10:00", dias: ["sabado", "domingo"] }]);
    const ultima = filas[filas.length - 1];
    expect(ultima.etiqueta).toBe("Sábado y domingo");
    expect(new Set(filas.map((f) => f.clave)).size).toBe(filas.length);
  });

  it("sin horarios cargados no muestra nada", () => {
    expect(resumirHorarios([])).toEqual([]);
  });
});

describe("estadoApertura", () => {
  it("abierto dentro del horario", () => {
    expect(estadoApertura(horariosTipicos, en("2026-11-17T10:30:00-03:00"))).toEqual({
      abierto: true,
      texto: "Abierto hasta las 20:00",
    });
  });

  it("antes de abrir, avisa a qué hora abre hoy", () => {
    expect(estadoApertura(horariosTipicos, en("2026-11-17T07:00:00-03:00")).texto).toBe("Abre hoy a las 09:00");
  });

  it("justo a la hora de cierre ya está cerrado", () => {
    const estado = estadoApertura(horariosTipicos, en("2026-11-17T20:00:00-03:00"));
    expect(estado.abierto).toBe(false);
    expect(estado.texto).toBe("Abre mañana a las 09:00");
  });

  it("el sábado a la noche salta el domingo y el lunes cerrados", () => {
    expect(estadoApertura(horariosTipicos, en("2026-11-21T21:00:00-03:00")).texto).toBe(
      "Abre el martes a las 09:00"
    );
  });

  it("sin ningún día abierto dice 'Cerrado'", () => {
    expect(estadoApertura([], en("2026-11-17T10:00:00-03:00"))).toEqual({ abierto: false, texto: "Cerrado" });
  });
});
