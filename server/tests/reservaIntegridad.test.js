/**
 * Integridad de la reserva pública (docs/casos-de-uso/04-datos-y-confirmacion.md,
 * D-20 y D-21): solo se reserva un turno que la agenda ofrece, por delante de
 * "ahora", y un barbero nunca queda con dos turnos el mismo día a la misma hora.
 */
const request = require("supertest");
const app = require("../app");
const AgendaModel = require("../models/agenda.model");
const BarberoModel = require("../models/barbero.model");
const ServicioModel = require("../models/servicio.model");
const ParaguayDateUtil = require("../utils/paraguayDate");
const { usuarioConSesion } = require("./helpers/auth");

const FUTURA = ParaguayDateUtil.now().add(7, "days").format("YYYY-MM-DD");
const AYER = ParaguayDateUtil.now().subtract(1, "day").format("YYYY-MM-DD");
// `fecha` se guarda como el inicio del día en Asunción (-03:00 fijo).
const inicioDia = (dia) => new Date(`${dia}T03:00:00.000Z`);

const crearBarbero = (nombre = "Barbero Test") =>
  BarberoModel.create({ nombre, descripcion: "Barbero de prueba", foto: "foto.webp" });
const crearServicio = () => ServicioModel.create({ nombre: "Corte", precio: 50000, activo: true });
const crearTurno = (barbero, { dia = FUTURA, hora = "10:00", estado = "disponible", ...extra } = {}) =>
  AgendaModel.create({
    fecha: inicioDia(dia),
    hora,
    diaSemana: "martes",
    barbero: barbero._id,
    nombreBarbero: barbero.nombre,
    estado,
    ...extra,
  });

const reservar = (cuerpo) => request(app).post("/api/agenda/reservar-con-barbero").send(cuerpo);
const pedido = (barbero, servicio, extra = {}) => ({
  fecha: FUTURA,
  hora: "10:00",
  barberoId: String(barbero._id),
  nombreCliente: "Cliente Prueba",
  numeroCliente: "0981123456",
  servicioIds: [String(servicio._id)],
  ...extra,
});

beforeAll(async () => {
  // Que el índice único exista antes de probar contra él.
  await AgendaModel.init();
});

describe("reserva pública: solo lo que ofrece la agenda", () => {
  it("reserva un turno disponible generado", async () => {
    const barbero = await crearBarbero();
    const servicio = await crearServicio();
    const turno = await crearTurno(barbero);

    const respuesta = await reservar(pedido(barbero, servicio));

    expect(respuesta.status).toBe(200);
    const guardado = await AgendaModel.findById(turno._id);
    expect(guardado.estado).toBe("reservado");
    expect(guardado.nombreCliente).toBe("Cliente Prueba");
  });

  it("no crea un turno en una hora que no está en la agenda", async () => {
    const barbero = await crearBarbero();
    const servicio = await crearServicio();
    await crearTurno(barbero, { hora: "10:00" });

    const respuesta = await reservar(pedido(barbero, servicio, { hora: "03:00" }));

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.message).toMatch(/no está en la agenda/);
    expect(await AgendaModel.countDocuments({ hora: "03:00" })).toBe(0);
  });

  it("no crea un turno en un día sin agenda (local cerrado)", async () => {
    const barbero = await crearBarbero();
    const servicio = await crearServicio();
    const otroDia = ParaguayDateUtil.now().add(8, "days").format("YYYY-MM-DD");

    const respuesta = await reservar(pedido(barbero, servicio, { fecha: otroDia }));

    expect(respuesta.status).toBe(409);
    expect(await AgendaModel.countDocuments({})).toBe(0);
  });

  it("no reserva un turno que ya pasó, aunque siga disponible", async () => {
    const barbero = await crearBarbero();
    const servicio = await crearServicio();
    const turno = await crearTurno(barbero, { dia: AYER });

    const respuesta = await reservar(pedido(barbero, servicio, { fecha: AYER }));

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.message).toMatch(/ya pasó/);
    expect((await AgendaModel.findById(turno._id)).estado).toBe("disponible");
  });

  it("no pisa un turno ocupado", async () => {
    const barbero = await crearBarbero();
    const servicio = await crearServicio();
    const turno = await crearTurno(barbero, { estado: "reservado", nombreCliente: "Primera Persona" });

    const respuesta = await reservar(pedido(barbero, servicio));

    expect(respuesta.status).toBe(409);
    expect((await AgendaModel.findById(turno._id)).nombreCliente).toBe("Primera Persona");
  });

  it("tampoco reabre un turno cerrado (no_show)", async () => {
    const barbero = await crearBarbero();
    const servicio = await crearServicio();
    await crearTurno(barbero, { estado: "no_show" });

    const respuesta = await reservar(pedido(barbero, servicio));

    expect(respuesta.status).toBe(409);
    expect(await AgendaModel.countDocuments({})).toBe(1);
  });

  it.each([
    ["una hora fuera de rango", { hora: "25:00" }, /hora/],
    ["una hora con basura", { hora: "10:00; drop" }, /hora/],
    ["un barbero que no es un id", { barberoId: "no-es-un-id" }, /barbero/],
    ["una fecha ilegible", { fecha: "pasado mañana" }, /fecha/],
  ])("rechaza %s con 400, no con 500", async (_, cambio, mensaje) => {
    const barbero = await crearBarbero();
    const servicio = await crearServicio();
    await crearTurno(barbero);

    const respuesta = await reservar(pedido(barbero, servicio, cambio));

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.message).toMatch(mensaje);
  });
});

describe("un barbero, un turno por hora", () => {
  it("dos reservas simultáneas del mismo turno: una sola gana", async () => {
    const barbero = await crearBarbero();
    const servicio = await crearServicio();
    await crearTurno(barbero);

    const respuestas = await Promise.all([
      reservar(pedido(barbero, servicio, { nombreCliente: "Persona Uno" })),
      reservar(pedido(barbero, servicio, { nombreCliente: "Persona Dos" })),
      reservar(pedido(barbero, servicio, { nombreCliente: "Persona Tres" })),
    ]);

    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409, 409]);
    const turnos = await AgendaModel.find({ barbero: barbero._id });
    expect(turnos).toHaveLength(1);
    expect(turnos[0].estado).toBe("reservado");
  });

  it("la base rechaza un segundo turno del mismo barbero a la misma hora", async () => {
    const barbero = await crearBarbero();
    await crearTurno(barbero);

    await expect(crearTurno(barbero)).rejects.toMatchObject({ code: 11000 });
  });

  it("dos barberos sí pueden tener turno a la misma hora", async () => {
    await crearTurno(await crearBarbero("Uno"));
    await expect(crearTurno(await crearBarbero("Dos"))).resolves.toBeDefined();
  });

  it("los turnos viejos sin barbero quedan fuera del índice", async () => {
    const sinBarbero = { fecha: inicioDia(FUTURA), hora: "10:00", diaSemana: "martes", estado: "disponible" };
    await AgendaModel.create(sinBarbero);
    await expect(AgendaModel.create(sinBarbero)).resolves.toBeDefined();
  });

  it("el admin recibe 409, no 400, si crea un turno repetido", async () => {
    const barbero = await crearBarbero();
    await crearTurno(barbero);
    const { cookie } = await usuarioConSesion({ userName: "admin-turnos", rol: "admin" });

    const respuesta = await request(app)
      .post("/api/agenda/new")
      .set("Cookie", cookie)
      .send({
        fecha: inicioDia(FUTURA),
        hora: "10:00",
        diaSemana: "martes",
        barbero: String(barbero._id),
        estado: "disponible",
      });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.message).toMatch(/ya tiene un turno/);
  });
});
