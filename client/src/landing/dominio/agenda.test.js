import { describe, expect, it } from "vitest";
import ParaguayDateUtil from "../../utils/paraguayDate";
import {
  DIAS_VISIBLES,
  ESTADO,
  armarDias,
  estadoDelTurno,
  etiquetaCorta,
  etiquetaEnOracion,
  fechaLarga,
  primerDiaConLibres,
  proximoLibre,
  proximoLibreEntre,
  siguienteDiaConLibres,
} from "./agenda";

// El servidor guarda `fecha` como el inicio del día en Asunción (03:00 UTC).
const fecha = (dia) => `2026-11-${String(dia).padStart(2, "0")}T03:00:00.000Z`;
const turno = (id, dia, hora, estado = "disponible") => ({ _id: id, fecha: fecha(dia), hora, estado });
// Martes 17 de noviembre de 2026, 10:30 en Asunción.
const ahora = ParaguayDateUtil.toParaguayTime("2026-11-17T10:30:00-03:00");

describe("estadoDelTurno", () => {
  it("marca como pasado el turno que ya empezó, aunque siga disponible", () => {
    expect(estadoDelTurno(turno("a", 17, "10:00"), ahora)).toBe(ESTADO.PASADO);
    expect(estadoDelTurno(turno("a", 17, "10:30"), ahora)).toBe(ESTADO.PASADO);
  });

  it("distingue libre, ocupado y propio", () => {
    const propios = new Set(["c"]);
    expect(estadoDelTurno(turno("a", 17, "11:00"), ahora, propios)).toBe(ESTADO.LIBRE);
    expect(estadoDelTurno(turno("b", 17, "11:00", "reservado"), ahora, propios)).toBe(ESTADO.OCUPADO);
    expect(estadoDelTurno(turno("c", 17, "11:00", "reservado"), ahora, propios)).toBe(ESTADO.PROPIO);
  });

  it("un turno libre nunca es propio, aunque el id esté guardado", () => {
    expect(estadoDelTurno(turno("c", 17, "11:00"), ahora, new Set(["c"]))).toBe(ESTADO.LIBRE);
  });

  it("no depende de la zona horaria del dispositivo: la fecha se lee en Asunción", () => {
    // 23:30 del 17 en Asunción ya es 18 en UTC; sigue siendo un turno del 17.
    const noche = ParaguayDateUtil.toParaguayTime("2026-11-17T23:30:00-03:00");
    expect(estadoDelTurno(turno("a", 17, "23:00"), noche)).toBe(ESTADO.PASADO);
    expect(estadoDelTurno(turno("a", 18, "09:00"), noche)).toBe(ESTADO.LIBRE);
  });
});

describe("armarDias", () => {
  it("agrupa por día, ordena por hora y cuenta los libres", () => {
    const dias = armarDias(
      [turno("1", 18, "15:00"), turno("2", 18, "09:00", "reservado"), turno("3", 17, "11:00")],
      ahora
    );
    expect(dias.map((d) => d.clave)).toEqual(["2026-11-17", "2026-11-18"]);
    expect(dias[1].turnos.map((t) => t.hora)).toEqual(["09:00", "15:00"]);
    expect(dias[1].libres).toBe(1);
  });

  it("descarta los turnos pasados y los días que se quedan sin turnos", () => {
    const dias = armarDias([turno("1", 17, "09:00"), turno("2", 16, "18:00"), turno("3", 19, "09:00")], ahora);
    expect(dias.map((d) => d.clave)).toEqual(["2026-11-19"]);
  });

  it("si hay dos turnos a la misma hora muestra uno solo y gana el libre", () => {
    const [dia] = armarDias([turno("ocupado", 18, "10:00", "reservado"), turno("libre", 18, "10:00")], ahora);
    expect(dia.turnos).toHaveLength(1);
    expect(dia.turnos[0]._id).toBe("libre");
    expect(dia.libres).toBe(1);
  });

  it(`muestra como mucho ${DIAS_VISIBLES} días`, () => {
    const turnos = Array.from({ length: 20 }, (_, i) => turno(String(i), 18 + (i % 13), "10:00"));
    // 13 días distintos de noviembre más 7 en diciembre.
    const diciembre = Array.from({ length: 7 }, (_, i) => ({
      _id: `d${i}`,
      fecha: `2026-12-0${i + 1}T03:00:00.000Z`,
      hora: "10:00",
      estado: "disponible",
    }));
    expect(armarDias([...turnos, ...diciembre], ahora)).toHaveLength(DIAS_VISIBLES);
  });

  it("sin turnos devuelve una lista vacía", () => {
    expect(armarDias([], ahora)).toEqual([]);
    expect(armarDias(undefined, ahora)).toEqual([]);
  });
});

describe("búsqueda de libres", () => {
  const dias = armarDias(
    [turno("1", 18, "10:00", "reservado"), turno("2", 19, "11:00"), turno("3", 20, "09:00")],
    ahora
  );

  it("proximoLibre salta los días llenos", () => {
    expect(proximoLibre(dias).turno._id).toBe("2");
    expect(proximoLibre([])).toBeNull();
  });

  it("primerDiaConLibres cae al primer día si ninguno tiene libres", () => {
    expect(primerDiaConLibres(dias)).toBe("2026-11-19");
    const llenos = armarDias([turno("1", 18, "10:00", "reservado")], ahora);
    expect(primerDiaConLibres(llenos)).toBe("2026-11-18");
    expect(primerDiaConLibres([])).toBeNull();
  });

  it("siguienteDiaConLibres ofrece una alternativa posterior", () => {
    expect(siguienteDiaConLibres(dias, "2026-11-18").clave).toBe("2026-11-19");
    expect(siguienteDiaConLibres(dias, "2026-11-20")).toBeNull();
  });

  it("proximoLibreEntre elige el turno más cercano entre barberos", () => {
    const deAna = armarDias([turno("a", 19, "09:00")], ahora);
    const deBeto = armarDias([turno("b", 18, "16:00")], ahora);
    const sinLibres = armarDias([turno("c", 18, "11:00", "reservado")], ahora);
    const libre = proximoLibreEntre([
      { barbero: { nombre: "Ana" }, dias: deAna },
      { barbero: { nombre: "Beto" }, dias: deBeto },
      { barbero: { nombre: "Ciro" }, dias: sinLibres },
    ]);
    expect(libre.barbero.nombre).toBe("Beto");
    expect(libre.turno._id).toBe("b");
    expect(proximoLibreEntre([])).toBeNull();
  });
});

describe("etiquetas", () => {
  it("dice hoy, mañana o el día de la semana", () => {
    expect(etiquetaCorta(fecha(17), ahora)).toBe("Hoy");
    expect(etiquetaCorta(fecha(18), ahora)).toBe("Mañana");
    expect(etiquetaCorta(fecha(21), ahora)).toBe("Sáb 21");
    expect(etiquetaEnOracion(fecha(17), ahora)).toBe("hoy");
    expect(etiquetaEnOracion(fecha(18), ahora)).toBe("mañana");
    expect(etiquetaEnOracion(fecha(22), ahora)).toBe("el domingo 22");
  });

  it("arma la fecha larga en castellano", () => {
    expect(fechaLarga(fecha(17))).toBe("Martes 17 de noviembre");
  });
});
