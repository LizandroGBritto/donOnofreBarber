import { describe, expect, it } from "vitest";
import { avisoParaError } from "./avisos";
import { estadoInicial, puedeAvanzar, reservaReducer } from "./reserva";

const aplicar = (acciones, estado = estadoInicial) => acciones.reduce(reservaReducer, estado);

// Estado típico en el paso 4: barbero, un servicio, día y turno elegidos.
const enDatos = aplicar([
  { type: "elegirBarbero", barberoId: "b1" },
  { type: "alternarServicio", servicioId: "s1" },
  { type: "avanzar" },
  { type: "elegirDia", diaClave: "2026-11-18" },
  { type: "elegirTurno", turnoId: "t1" },
  { type: "avanzar" },
]);

describe("reservaReducer: recorrido normal", () => {
  it("llega al paso 4 con todo elegido", () => {
    expect(enDatos).toMatchObject({ paso: 4, barberoId: "b1", servicioIds: ["s1"], diaClave: "2026-11-18", turnoId: "t1" });
  });

  it("no avanza si falta lo que pide cada paso", () => {
    expect(reservaReducer(estadoInicial, { type: "avanzar" }).paso).toBe(1);
    const sinServicios = aplicar([{ type: "elegirBarbero", barberoId: "b1" }, { type: "avanzar" }]);
    expect(sinServicios.paso).toBe(2);
    expect(puedeAvanzar({ ...enDatos, paso: 3, turnoId: null })).toBe(false);
    expect(puedeAvanzar(enDatos)).toBe(false); // del 4 se sale confirmando
  });

  it("alternarServicio agrega y quita", () => {
    const estado = aplicar([
      { type: "alternarServicio", servicioId: "s1" },
      { type: "alternarServicio", servicioId: "s2" },
      { type: "alternarServicio", servicioId: "s1" },
    ]);
    expect(estado.servicioIds).toEqual(["s2"]);
  });

  it("confirmar guarda el turno del servidor y reiniciar vuelve al principio", () => {
    const turno = { _id: "t1", editToken: "x" };
    const confirmado = aplicar([{ type: "enviar" }, { type: "confirmar", turno }], enDatos);
    expect(confirmado).toMatchObject({ enviando: false, confirmado: turno });
    expect(reservaReducer(confirmado, { type: "reiniciar" })).toBe(estadoInicial);
  });
});

describe("reservaReducer: cambios que invalidan lo elegido", () => {
  it("cambiar de barbero suelta día y turno pero conserva los servicios", () => {
    const estado = reservaReducer(enDatos, { type: "elegirBarbero", barberoId: "b2" });
    expect(estado).toMatchObject({ barberoId: "b2", diaClave: null, turnoId: null, servicioIds: ["s1"], paso: 2 });
  });

  it("volver a elegir el mismo barbero no pierde el turno", () => {
    expect(reservaReducer(enDatos, { type: "elegirBarbero", barberoId: "b1" }).turnoId).toBe("t1");
  });

  it("podarServicios quita los que el barbero no ofrece y no cambia el estado si no hace falta", () => {
    const conDos = aplicar([{ type: "alternarServicio", servicioId: "s2" }], enDatos);
    expect(reservaReducer(conDos, { type: "podarServicios", disponibles: ["s2"] }).servicioIds).toEqual(["s2"]);
    expect(reservaReducer(conDos, { type: "podarServicios", disponibles: ["s1", "s2"] })).toBe(conDos);
  });

  it("cambiar de día suelta el turno; el mismo día no", () => {
    expect(reservaReducer(enDatos, { type: "elegirDia", diaClave: "2026-11-19" }).turnoId).toBeNull();
    expect(reservaReducer(enDatos, { type: "elegirDia", diaClave: "2026-11-18" })).toBe(enDatos);
  });

  it("perderTurno en el paso 4 vuelve al 3 con un aviso", () => {
    const estado = reservaReducer(enDatos, { type: "perderTurno" });
    expect(estado.paso).toBe(3);
    expect(estado.turnoId).toBeNull();
    expect(estado.aviso.titulo).toBe("Atención");
  });

  it("perderTurno antes del paso 4 no avisa, y sin turno no hace nada", () => {
    const enHorario = { ...enDatos, paso: 3 };
    expect(reservaReducer(enHorario, { type: "perderTurno" }).aviso).toBeNull();
    const sinTurno = { ...enDatos, turnoId: null };
    expect(reservaReducer(sinTurno, { type: "perderTurno" })).toBe(sinTurno);
  });

  it("tomarProximo arma la reserva desde el escenario y descarta un ticket anterior", () => {
    const estado = reservaReducer(
      { ...estadoInicial, confirmado: { _id: "viejo" } },
      { type: "tomarProximo", barberoId: "b9", diaClave: "2026-11-20", turnoId: "t9" }
    );
    expect(estado).toMatchObject({ paso: 2, barberoId: "b9", diaClave: "2026-11-20", turnoId: "t9", confirmado: null });
  });
});

describe("reservaReducer: navegación y casos raros", () => {
  it("irAPaso solo va hacia atrás", () => {
    expect(reservaReducer(enDatos, { type: "irAPaso", paso: 2 }).paso).toBe(2);
    const enDos = { ...enDatos, paso: 2 };
    expect(reservaReducer(enDos, { type: "irAPaso", paso: 4 })).toBe(enDos);
    expect(reservaReducer(enDos, { type: "irAPaso", paso: 0 })).toBe(enDos);
  });

  it("retroceder no baja del paso 1", () => {
    expect(reservaReducer(estadoInicial, { type: "retroceder" })).toBe(estadoInicial);
  });

  it("una acción desconocida no cambia nada", () => {
    expect(reservaReducer(enDatos, { type: "inventada" })).toBe(enDatos);
  });

  it("fallar aplica lo que indica el aviso", () => {
    const estado = reservaReducer(
      { ...enDatos, enviando: true },
      { type: "fallar", aviso: { texto: "x" }, volverAPaso: 1, soltarTurno: true, soltarBarbero: true }
    );
    expect(estado).toMatchObject({ enviando: false, paso: 1, turnoId: null, barberoId: null, aviso: { texto: "x" } });
  });
});

describe("avisoParaError", () => {
  const error = (status, message) => ({ response: { status, data: { message } } });

  it("409: el horario ya no está disponible (ocupado, pasado o fuera de agenda), vuelve a elegir horario", () => {
    const r = avisoParaError(error(409));
    expect(r).toMatchObject({ volverAPaso: 3, soltarTurno: true, refrescarTurnos: true });
    expect(r.aviso.titulo).toBe("Atención");
  });

  it("409 turno_abierto: avisa del turno que ya tiene y no suelta lo elegido", () => {
    const r = avisoParaError({
      response: {
        status: 409,
        data: { motivo: "turno_abierto", turno: { fecha: "17/11/2026", hora: "15:00", barbero: "Pablo" } },
      },
    });
    expect(r.aviso.titulo).toBe("Ya tenés un turno");
    expect(r.aviso.texto).toBe(
      "Tenés un turno el 17/11/2026 a las 15:00 con Pablo. Para reservar otro, primero cancelá o completá ese."
    );
    expect(r.soltarTurno).toBeUndefined();
    expect(r.volverAPaso).toBeUndefined();
  });

  it("404: el barbero dejó de atender, vuelve al paso 1", () => {
    expect(avisoParaError(error(404))).toMatchObject({ volverAPaso: 1, soltarBarbero: true });
  });

  it("400 con servicios inválidos vuelve a elegir servicios", () => {
    expect(avisoParaError(error(400, "Algún servicio no está disponible"))).toMatchObject({
      volverAPaso: 2,
      refrescarServicios: true,
    });
  });

  it("400 genérico muestra el mensaje del servidor sin moverse de paso", () => {
    const r = avisoParaError(error(400, "Número inválido"));
    expect(r.volverAPaso).toBeUndefined();
    expect(r.aviso.texto).toBe("Número inválido");
  });

  it("sin respuesta (red caída) pide revisar la conexión", () => {
    const r = avisoParaError(new Error("Network Error"));
    expect(r.aviso.titulo).toBe("Atención");
    expect(r.aviso.texto).toMatch(/conexión/);
  });
});
