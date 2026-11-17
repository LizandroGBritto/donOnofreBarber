/**
 * Recordatorios y regla de un turno abierto por celular
 * (docs/casos-de-uso/04-datos-y-confirmacion.md y 06-aviso-push.md).
 *
 * El momento de un turno es fecha (inicio del día) + hora. Antes se comparaba
 * solo `fecha` y por eso la regla de 12 horas no veía los turnos de hoy y los
 * recordatorios salían cerca de las 23:00 de la noche anterior.
 */
const request = require("supertest");
const app = require("../app");
const AgendaModel = require("../models/agenda.model");
const BarberoModel = require("../models/barbero.model");
const ServicioModel = require("../models/servicio.model");
const RecordatorioPush = require("../models/recordatorioPush.model");
const ParaguayDateUtil = require("../utils/paraguayDate");
const R = require("../services/recordatorios.service");

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123";
const SUSCRIPCION = { endpoint: ENDPOINT, keys: { p256dh: "clave-p256dh", auth: "clave-auth" } };

// Un momento fijo para los servicios: 15/01/2030 a las 10:00 en Asunción.
const AHORA = ParaguayDateUtil.createDate(2030, 1, 15, 10, 0);

const crearBarbero = () =>
  BarberoModel.create({ nombre: "Pablo", descripcion: "Barbero de prueba", foto: "foto.webp" });

/** Turno cuyo momento es `momento` (moment en Asunción). */
const turnoEn = (barbero, momento, extra = {}) =>
  AgendaModel.create({
    fecha: momento.clone().startOf("day").toDate(),
    hora: momento.format("HH:mm"),
    diaSemana: "martes",
    barbero: barbero._id,
    nombreBarbero: barbero.nombre,
    estado: "reservado",
    nombreCliente: "Cliente Prueba",
    numeroCliente: "0981123456",
    editToken: "token-de-prueba",
    ...extra,
  });

describe("minutosDeAviso: la mayor anticipación que todavía queda", () => {
  it.each([
    [180, 60],
    [61, 60],
    [60, 40],
    [45, 40],
    [40, 20],
    [21, 20],
    [20, 5],
    [6, 5],
    [5, null],
    [2, null],
    [-10, null],
  ])("con %s minutos por delante avisa %s antes", (restantes, esperado) => {
    expect(R.minutosDeAviso(restantes)).toBe(esperado);
  });
});

describe("endpointPushValido: solo servicios de push de navegadores", () => {
  it.each([
    [ENDPOINT, true],
    ["https://updates.push.services.mozilla.com/wpush/v2/x", true],
    ["https://web.push.apple.com/abc", true],
    ["https://wns2-bl2p.notify.windows.com/w/?token=x", true],
    ["http://fcm.googleapis.com/fcm/send/x", false],
    ["https://127.0.0.1:8081/instance", false],
    ["https://fcm.googleapis.com.atacante.com/x", false],
    ["no es una url", false],
    [undefined, false],
  ])("%s → %s", (endpoint, esperado) => {
    expect(R.endpointPushValido(endpoint)).toBe(esperado);
  });
});

describe("regla de un turno abierto por celular (12 horas, fecha + hora)", () => {
  it("ve un turno de HOY más tarde (antes no lo veía)", async () => {
    const barbero = await crearBarbero();
    await turnoEn(barbero, AHORA.clone().add(3, "hours"));

    const abierto = await R.turnoAbiertoDelCelular("0981 123 456", AHORA);

    expect(abierto).not.toBeNull();
    expect(abierto.hora).toBe("13:00");
  });

  it("ve un turno de mañana temprano dentro de las 12 horas", async () => {
    const barbero = await crearBarbero();
    const ahora = ParaguayDateUtil.createDate(2030, 1, 15, 21, 0);
    await turnoEn(barbero, ParaguayDateUtil.createDate(2030, 1, 16, 8, 0));

    expect(await R.turnoAbiertoDelCelular("0981123456", ahora)).not.toBeNull();
  });

  it("no cuenta un turno que ya pasó ni uno a más de 12 horas", async () => {
    const barbero = await crearBarbero();
    await turnoEn(barbero, AHORA.clone().subtract(1, "hour"));
    await turnoEn(barbero, AHORA.clone().add(13, "hours"), { hora: "23:00" });

    expect(await R.turnoAbiertoDelCelular("0981123456", AHORA)).toBeNull();
  });

  it("no cuenta un turno liberado", async () => {
    const barbero = await crearBarbero();
    await turnoEn(barbero, AHORA.clone().add(2, "hours"), { estado: "disponible" });

    expect(await R.turnoAbiertoDelCelular("0981123456", AHORA)).toBeNull();
  });
});

describe("recordatorio por WhatsApp", () => {
  const enviar = () => jest.fn().mockResolvedValue({});

  it("se manda cuando falta una hora o menos, una sola vez", async () => {
    const barbero = await crearBarbero();
    const turno = await turnoEn(barbero, AHORA.clone().add(50, "minutes"), {
      fechaReserva: AHORA.clone().subtract(1, "day").toDate(),
    });
    const espia = enviar();

    expect(await R.enviarRecordatoriosWhatsapp({ ahora: AHORA, enviar: espia })).toBe(1);
    expect(espia).toHaveBeenCalledWith("0981123456", expect.stringContaining("10:50"));
    expect((await AgendaModel.findById(turno._id)).recordatorioEnviado).toBe(true);

    // El minuto siguiente no lo repite: la marca ahora queda guardada.
    expect(await R.enviarRecordatoriosWhatsapp({ ahora: AHORA.clone().add(1, "minute"), enviar: espia })).toBe(0);
    expect(espia).toHaveBeenCalledTimes(1);
  });

  it("no se manda a las 23:00 de la noche anterior (el bug de comparar solo la fecha)", async () => {
    const barbero = await crearBarbero();
    await turnoEn(barbero, ParaguayDateUtil.createDate(2030, 1, 16, 15, 0), {
      fechaReserva: AHORA.toDate(),
    });
    const espia = enviar();

    const nocheAnterior = ParaguayDateUtil.createDate(2030, 1, 15, 23, 0);
    expect(await R.enviarRecordatoriosWhatsapp({ ahora: nocheAnterior, enviar: espia })).toBe(0);
    expect(espia).not.toHaveBeenCalled();
  });

  it("no se manda a quien reservó con menos de una hora de anticipación", async () => {
    const barbero = await crearBarbero();
    await turnoEn(barbero, AHORA.clone().add(30, "minutes"), {
      fechaReserva: AHORA.clone().subtract(10, "minutes").toDate(),
    });
    const espia = enviar();

    expect(await R.enviarRecordatoriosWhatsapp({ ahora: AHORA, enviar: espia })).toBe(0);
  });

  it("si WhatsApp falla, lo marca igual para no mandarlo tarde", async () => {
    const barbero = await crearBarbero();
    const turno = await turnoEn(barbero, AHORA.clone().add(55, "minutes"), {
      fechaReserva: AHORA.clone().subtract(1, "day").toDate(),
    });
    const espia = jest.fn().mockRejectedValue(new Error("Evolution caído"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await R.enviarRecordatoriosWhatsapp({ ahora: AHORA, enviar: espia });

    expect((await AgendaModel.findById(turno._id)).recordatorioEnviado).toBe(true);
    console.error.mockRestore();
  });
});

describe("POST /api/agenda/:id/recordatorio-push", () => {
  // Contra el reloj real: el endpoint calcula cuánto falta desde "ahora".
  const enMinutos = (minutos) => ParaguayDateUtil.now().add(minutos, "minutes");
  const pedirAviso = (turno, cuerpo = { suscripcion: SUSCRIPCION }, token = "token-de-prueba") =>
    request(app).post(`/api/agenda/${turno._id}/recordatorio-push?t=${token}`).send(cuerpo);

  it("con tres horas por delante avisa una hora antes", async () => {
    const turno = await turnoEn(await crearBarbero(), enMinutos(180));

    const respuesta = await pedirAviso(turno);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.minutosAntes).toBe(60);
    const aviso = await RecordatorioPush.findOne({ turno: turno._id });
    expect(aviso.estado).toBe("pendiente");
    expect(aviso.reserva).toBe(R.huellaDeReserva("token-de-prueba"));
    // No guarda el token en claro.
    expect(JSON.stringify(aviso.toObject())).not.toContain("token-de-prueba");
  });

  it("con media hora por delante recorta a 20 minutos", async () => {
    const turno = await turnoEn(await crearBarbero(), enMinutos(30));

    const respuesta = await pedirAviso(turno);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.minutosAntes).toBe(20);
  });

  it("con 5 minutos o menos ya no lo registra", async () => {
    const turno = await turnoEn(await crearBarbero(), enMinutos(4));

    const respuesta = await pedirAviso(turno);

    expect(respuesta.status).toBe(409);
    expect(await RecordatorioPush.countDocuments()).toBe(0);
  });

  it("rechaza sin token o con un token ajeno", async () => {
    const turno = await turnoEn(await crearBarbero(), enMinutos(180));

    expect((await pedirAviso(turno, { suscripcion: SUSCRIPCION }, "")).status).toBe(403);
    expect((await pedirAviso(turno, { suscripcion: SUSCRIPCION }, "otro")).status).toBe(403);
    expect(await RecordatorioPush.countDocuments()).toBe(0);
  });

  it("rechaza un endpoint que no es de un servicio de push (SSRF)", async () => {
    const turno = await turnoEn(await crearBarbero(), enMinutos(180));
    const interna = { ...SUSCRIPCION, endpoint: "https://127.0.0.1:8081/instance/delete" };

    const respuesta = await pedirAviso(turno, { suscripcion: interna });

    expect(respuesta.status).toBe(400);
  });

  it("rechaza un turno liberado", async () => {
    const turno = await turnoEn(await crearBarbero(), enMinutos(180), { estado: "disponible" });

    expect((await pedirAviso(turno)).status).toBe(409);
  });

  it("el mismo dispositivo dos veces no duplica el aviso", async () => {
    const turno = await turnoEn(await crearBarbero(), enMinutos(180));

    await pedirAviso(turno);
    const segunda = await pedirAviso(turno);

    expect(segunda.status).toBe(201);
    expect(await RecordatorioPush.countDocuments({ turno: turno._id })).toBe(1);
  });

  it("no acepta más de tres dispositivos por turno", async () => {
    const turno = await turnoEn(await crearBarbero(), enMinutos(180));
    for (const n of [1, 2, 3]) {
      const sub = { ...SUSCRIPCION, endpoint: `${ENDPOINT}-${n}` };
      expect((await pedirAviso(turno, { suscripcion: sub })).status).toBe(201);
    }

    const cuarta = await pedirAviso(turno, { suscripcion: { ...SUSCRIPCION, endpoint: `${ENDPOINT}-4` } });

    expect(cuarta.status).toBe(409);
  });
});

describe("envío de los avisos push", () => {
  const avisoPara = (turno, extra = {}) =>
    RecordatorioPush.create({
      turno: turno._id,
      reserva: R.huellaDeReserva(turno.editToken),
      endpoint: ENDPOINT,
      keys: SUSCRIPCION.keys,
      minutosAntes: 60,
      ...extra,
    });

  it("no manda antes de tiempo y manda al entrar en la ventana", async () => {
    const turno = await turnoEn(await crearBarbero(), AHORA.clone().add(90, "minutes"));
    const aviso = await avisoPara(turno);
    const enviar = jest.fn().mockResolvedValue({});

    expect(await R.enviarRecordatoriosPush({ ahora: AHORA, enviar })).toBe(0);
    expect(await R.enviarRecordatoriosPush({ ahora: AHORA.clone().add(30, "minutes"), enviar })).toBe(1);

    const [suscripcion, payload] = enviar.mock.calls[0];
    expect(suscripcion.endpoint).toBe(ENDPOINT);
    expect(JSON.parse(payload)).toMatchObject({
      title: "Tu turno es en 1 hora",
      body: "A las 11:30 con Pablo en Alonzo Style.",
      data: { url: `/editar-turno/${turno._id}` },
    });
    expect((await RecordatorioPush.findById(aviso._id)).estado).toBe("enviado");

    // Ya enviado: no se repite.
    expect(await R.enviarRecordatoriosPush({ ahora: AHORA.clone().add(31, "minutes"), enviar })).toBe(0);
  });

  it("descarta el aviso si el turno se liberó", async () => {
    const turno = await turnoEn(await crearBarbero(), AHORA.clone().add(30, "minutes"));
    const aviso = await avisoPara(turno);
    await AgendaModel.updateOne({ _id: turno._id }, { estado: "disponible", editToken: null });
    const enviar = jest.fn();

    await R.enviarRecordatoriosPush({ ahora: AHORA, enviar });

    expect(enviar).not.toHaveBeenCalled();
    expect((await RecordatorioPush.findById(aviso._id)).estado).toBe("descartado");
  });

  it("no le avisa a la primera persona del turno que reservó otra", async () => {
    const turno = await turnoEn(await crearBarbero(), AHORA.clone().add(30, "minutes"));
    const aviso = await avisoPara(turno);
    // Se liberó y lo reservó otra persona: el token es otro.
    await AgendaModel.updateOne({ _id: turno._id }, { editToken: "token-de-otra-reserva" });
    const enviar = jest.fn();

    await R.enviarRecordatoriosPush({ ahora: AHORA, enviar });

    expect(enviar).not.toHaveBeenCalled();
    expect((await RecordatorioPush.findById(aviso._id)).motivo).toBe("turno de otra reserva");
  });

  it("descarta la suscripción vencida (410) y reintenta los demás errores", async () => {
    const barbero = await crearBarbero();
    const vencido = await avisoPara(await turnoEn(barbero, AHORA.clone().add(30, "minutes")), {
      endpoint: `${ENDPOINT}-vencido`,
    });
    const caido = await avisoPara(await turnoEn(barbero, AHORA.clone().add(40, "minutes")), {
      endpoint: `${ENDPOINT}-caido`,
    });
    const enviar = jest.fn(({ endpoint }) =>
      Promise.reject(Object.assign(new Error("falla"), { statusCode: endpoint.endsWith("vencido") ? 410 : 500 })),
    );

    await R.enviarRecordatoriosPush({ ahora: AHORA, enviar });

    const vencidoGuardado = await RecordatorioPush.findById(vencido._id);
    expect(vencidoGuardado.estado).toBe("descartado");
    expect(vencidoGuardado.motivo).toBe("suscripción vencida");
    const caidoGuardado = await RecordatorioPush.findById(caido._id);
    expect(caidoGuardado.estado).toBe("pendiente");
    expect(caidoGuardado.intentos).toBe(1);
  });
});

describe("reserva pública: celular, nombre y turno abierto", () => {
  const reservar = (cuerpo) => request(app).post("/api/agenda/reservar-con-barbero").send(cuerpo);

  const preparar = async () => {
    const barbero = await crearBarbero();
    const servicio = await ServicioModel.create({ nombre: "Corte", precio: 50000, activo: true });
    const momento = ParaguayDateUtil.now().add(3, "hours").startOf("hour");
    const libre = await turnoEn(barbero, momento, {
      estado: "disponible",
      nombreCliente: "",
      numeroCliente: "",
      editToken: null,
    });
    const pedido = (extra = {}) => ({
      fecha: momento.format("YYYY-MM-DD"),
      hora: momento.format("HH:mm"),
      barberoId: String(barbero._id),
      nombreCliente: "Cliente Prueba",
      numeroCliente: "0981 123 456",
      servicioIds: [String(servicio._id)],
      ...extra,
    });
    return { barbero, momento, libre, pedido };
  };

  it("guarda el celular normalizado", async () => {
    const { libre, pedido } = await preparar();

    const respuesta = await reservar(pedido({ numeroCliente: "+595 981 123456" }));

    expect(respuesta.status).toBe(200);
    expect((await AgendaModel.findById(libre._id)).numeroCliente).toBe("0981123456");
  });

  it.each(["123", "0981111111", "+54 11 1234 5678"])("rechaza el celular %s", async (numero) => {
    const { pedido } = await preparar();

    expect((await reservar(pedido({ numeroCliente: numero }))).status).toBe(400);
  });

  it("rechaza un nombre con números o muy corto", async () => {
    const { pedido } = await preparar();

    expect((await reservar(pedido({ nombreCliente: "Ab" }))).status).toBe(400);
    expect((await reservar(pedido({ nombreCliente: "Juan123" }))).status).toBe(400);
  });

  it("con un turno de hoy abierto responde 409 turno_abierto", async () => {
    const { barbero, momento, pedido } = await preparar();
    // Ya tiene un turno hoy, una hora antes del que quiere reservar.
    await turnoEn(barbero, momento.clone().subtract(1, "hour"));

    const respuesta = await reservar(pedido());

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.motivo).toBe("turno_abierto");
    expect(respuesta.body.turno.barbero).toBe("Pablo");
  });
});
