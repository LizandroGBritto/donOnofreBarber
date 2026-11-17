const request = require("supertest");
const app = require("../app");
const AgendaModel = require("../models/agenda.model");
const BarberoModel = require("../models/barbero.model");

/**
 * GET /api/agenda/landing?barberoId= es público: lo consume la landing para
 * dibujar los días y horarios de un barbero. Nunca puede devolver datos de
 * quien reservó.
 */
describe("GET /api/agenda/landing?barberoId=", () => {
  const manana = () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(3, 0, 0, 0); // 00:00 en Asunción
    return d;
  };

  const crearBarbero = () =>
    BarberoModel.create({
      nombre: "Lisandro Alonzo",
      descripcion: "Barbero de prueba",
      foto: "foto.webp",
    });

  it("devuelve solo los campos públicos del turno", async () => {
    const barbero = await crearBarbero();
    await AgendaModel.create({
      fecha: manana(),
      hora: "10:00",
      diaSemana: "martes",
      barbero: barbero._id,
      estado: "reservado",
      nombreCliente: "Cliente Secreto",
      numeroCliente: "0981000000",
      editToken: "token-secreto",
      servicios: [{ nombre: "Corte", precio: 70000 }],
      costoTotal: 70000,
    });

    const res = await request(app)
      .get("/api/agenda/landing")
      .query({ barberoId: String(barbero._id) });

    expect(res.status).toBe(200);
    expect(res.body.agendas).toHaveLength(1);

    const [turno] = res.body.agendas;
    expect(Object.keys(turno).sort()).toEqual(
      ["_id", "barbero", "diaSemana", "estado", "fecha", "hora"].sort()
    );
    expect(turno.estado).toBe("reservado");
    expect(turno.barbero).toEqual({
      _id: String(barbero._id),
      nombre: "Lisandro Alonzo",
    });

    const crudo = JSON.stringify(res.body);
    for (const secreto of [
      "Cliente Secreto",
      "0981000000",
      "token-secreto",
      "70000",
    ]) {
      expect(crudo).not.toContain(secreto);
    }
  });

  it("no mezcla turnos de otro barbero", async () => {
    const uno = await crearBarbero();
    const otro = await BarberoModel.create({
      nombre: "Elias Lugo",
      descripcion: "Otro",
      foto: "otro.webp",
    });
    await AgendaModel.create({
      fecha: manana(),
      hora: "11:00",
      diaSemana: "martes",
      barbero: otro._id,
      estado: "disponible",
    });

    const res = await request(app)
      .get("/api/agenda/landing")
      .query({ barberoId: String(uno._id) });

    expect(res.status).toBe(200);
    expect(res.body.agendas).toEqual([]);
  });
});
