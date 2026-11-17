/**
 * Notificaciones del panel (docs/casos-de-uso/11-aviso-push.md, P-30).
 * Hasta 2026-11-17 /subscribe era pública y cada reserva se mandaba a todas
 * las suscripciones, con nombre, fecha y hora del cliente.
 */
const request = require("supertest");
const app = require("../app");
const Suscripcion = require("../models/suscripcion.model");
const BarberoModel = require("../models/barbero.model");
const NotificationService = require("../services/notificationService");
const { webpush } = require("../config/webpush.config");
const { usuarioConSesion } = require("./helpers/auth");

const ENDPOINT = (n) => `https://fcm.googleapis.com/fcm/send/disp-${n}`;
const suscripcion = (n) => ({ endpoint: ENDPOINT(n), keys: { p256dh: `p256-${n}`, auth: `auth-${n}` } });
const suscribir = (cookie, n) => {
  const pedido = request(app).post("/api/notifications/subscribe");
  if (cookie) pedido.set("Cookie", cookie);
  return pedido.send({ subscription: suscripcion(n), userId: "admin" });
};
const crearBarbero = (nombre) => BarberoModel.create({ nombre, descripcion: "Barbero", foto: "foto.webp" });

let envio;
beforeEach(() => {
  envio = jest.spyOn(webpush, "sendNotification").mockResolvedValue({});
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("POST /api/notifications/subscribe", () => {
  it("sin sesión: 401 y no guarda nada", async () => {
    const respuesta = await suscribir(null, 1);

    expect(respuesta.status).toBe(401);
    expect(await Suscripcion.countDocuments()).toBe(0);
  });

  it("con sesión: queda a nombre del usuario, no del userId que mande el cliente", async () => {
    const { usuario, cookie } = await usuarioConSesion({ userName: "dueno", rol: "admin" });

    const respuesta = await suscribir(cookie, 1);

    expect(respuesta.status).toBe(201);
    const guardada = await Suscripcion.findOne({ endpoint: ENDPOINT(1) });
    expect(guardada.userId).toBe(String(usuario._id));
  });

  it("rechaza un endpoint que no es de un servicio de push (SSRF)", async () => {
    const { cookie } = await usuarioConSesion({ userName: "dueno", rol: "admin" });

    const respuesta = await request(app)
      .post("/api/notifications/subscribe")
      .set("Cookie", cookie)
      .send({ subscription: { endpoint: "https://127.0.0.1:8081/x", keys: { p256dh: "a", auth: "b" } } });

    expect(respuesta.status).toBe(400);
  });

  it("el mismo dispositivo con otro usuario pasa a ser del último que inició sesión", async () => {
    const primero = await usuarioConSesion({ userName: "uno", rol: "admin" });
    const segundo = await usuarioConSesion({ userName: "dos", rol: "admin" });

    await suscribir(primero.cookie, 1);
    await suscribir(segundo.cookie, 1);

    expect(await Suscripcion.countDocuments()).toBe(1);
    expect((await Suscripcion.findOne()).userId).toBe(String(segundo.usuario._id));
  });
});

describe("POST /api/notifications/unsubscribe", () => {
  it("sin sesión: 401", async () => {
    const respuesta = await request(app).post("/api/notifications/unsubscribe").send({ endpoint: ENDPOINT(1) });

    expect(respuesta.status).toBe(401);
  });

  it("un barbero no puede dar de baja el dispositivo de otro", async () => {
    const admin = await usuarioConSesion({ userName: "dueno", rol: "admin" });
    await suscribir(admin.cookie, 1);
    const barbero = await usuarioConSesion({ userName: "pablo", rol: "barbero", barbero: (await crearBarbero("Pablo"))._id });

    const respuesta = await request(app)
      .post("/api/notifications/unsubscribe")
      .set("Cookie", barbero.cookie)
      .send({ endpoint: ENDPOINT(1) });

    expect(respuesta.status).toBe(404);
    expect((await Suscripcion.findOne()).activa).toBe(true);
  });
});

describe("a quién le llega el aviso de un turno", () => {
  const preparar = async () => {
    const pablo = await crearBarbero("Pablo");
    const elias = await crearBarbero("Elias");
    const admin = await usuarioConSesion({ userName: "dueno", rol: "admin" });
    const dePablo = await usuarioConSesion({ userName: "pablo", rol: "barbero", barbero: pablo._id });
    const deElias = await usuarioConSesion({ userName: "elias", rol: "barbero", barbero: elias._id });
    await suscribir(admin.cookie, 1);
    await suscribir(dePablo.cookie, 2);
    await suscribir(deElias.cookie, 3);
    // Una vieja, anónima, de cuando /subscribe era pública.
    await Suscripcion.create({ ...suscripcion(4), userId: "admin" });
    return { pablo };
  };
  const endpointsAvisados = () => envio.mock.calls.map(([sub]) => sub.endpoint).sort();

  it("nueva reserva: a los admin y al barbero del turno; ni a otro barbero ni a las anónimas", async () => {
    const { pablo } = await preparar();

    await NotificationService.notificarNuevaReserva({
      _id: "t1",
      barbero: pablo._id,
      nombreCliente: "Cliente Prueba",
      fecha: "2026-11-20",
      hora: "10:00",
    });

    expect(endpointsAvisados()).toEqual([ENDPOINT(1), ENDPOINT(2)]);
  });

  it("con el barbero populado también lo encuentra", async () => {
    const { pablo } = await preparar();

    await NotificationService.notificarTurnoLiberado({ _id: "t1", barbero: pablo, fecha: "x", hora: "10:00" });

    expect(endpointsAvisados()).toEqual([ENDPOINT(1), ENDPOINT(2)]);
  });

  it("la notificación de prueba le llega solo a quien la pide", async () => {
    await preparar();
    const otroAdmin = await usuarioConSesion({ userName: "socio", rol: "admin" });
    await suscribir(otroAdmin.cookie, 5);

    const respuesta = await request(app).post("/api/notifications/test").set("Cookie", otroAdmin.cookie);

    expect(respuesta.status).toBe(200);
    expect(endpointsAvisados()).toEqual([ENDPOINT(5)]);
  });

  it("un barbero también se suscribe y prueba: la de prueba le llega solo a él", async () => {
    const admin = await usuarioConSesion({ userName: "dueno", rol: "admin" });
    await suscribir(admin.cookie, 1);
    const barbero = await usuarioConSesion({ userName: "pablo", rol: "barbero", barbero: (await crearBarbero("Pablo"))._id });

    expect((await suscribir(barbero.cookie, 7)).status).toBe(201);
    const respuesta = await request(app).post("/api/notifications/test").set("Cookie", barbero.cookie);

    expect(respuesta.status).toBe(200);
    expect(endpointsAvisados()).toEqual([ENDPOINT(7)]);
  });
});

describe("detrás de Nginx", () => {
  it("confía en un solo proxy para la IP del cliente (rate limits por IP)", () => {
    expect(app.get("trust proxy")).toBe(1);
  });
});
