const request = require("supertest");
const app = require("../app");
const AgendaModel = require("../models/agenda.model");
const BarberoModel = require("../models/barbero.model");
const { usuarioConSesion } = require("./helpers/auth");

const crearBarbero = (nombre) =>
  BarberoModel.create({
    nombre,
    descripcion: "Barbero de prueba",
    foto: "foto.webp",
  });

const crearTurno = (barbero, extra = {}) =>
  AgendaModel.create({
    fecha: new Date("2026-09-15T03:00:00.000Z"),
    hora: extra.hora || "10:00",
    diaSemana: "martes",
    barbero: barbero._id,
    nombreBarbero: barbero.nombre,
    estado: "disponible",
    ...extra,
  });

/**
 * Un barbero no debe poder ver ni tocar nada de otro. El aislamiento se
 * verifica contra el SERVIDOR: que el panel oculte cosas es comodidad, no
 * seguridad.
 */
describe("aislamiento entre barberos", () => {
  describe("ver turnos", () => {
    it("un barbero solo recibe sus propios turnos", async () => {
      const propio = await crearBarbero("Mio");
      const ajeno = await crearBarbero("Suyo");
      await crearTurno(propio, { hora: "09:00" });
      await crearTurno(ajeno, { hora: "10:00" });

      const { cookie } = await usuarioConSesion({
        userName: "barbero-ve",
        rol: "barbero",
        barbero: propio._id,
      });

      const respuesta = await request(app).get("/api/agenda").set("Cookie", cookie);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.agendas).toHaveLength(1);
      expect(respuesta.body.agendas[0].hora).toBe("09:00");
    });

    it("los datos del otro barbero no viajan en la respuesta", async () => {
      const propio = await crearBarbero("Mio2");
      const ajeno = await crearBarbero("Suyo2");
      await crearTurno(ajeno, {
        estado: "reservado",
        nombreCliente: "Cliente Secreto",
        numeroCliente: "0981555444",
      });

      const { cookie } = await usuarioConSesion({
        userName: "barbero-curioso",
        rol: "barbero",
        barbero: propio._id,
      });

      const respuesta = await request(app).get("/api/agenda").set("Cookie", cookie);

      // Si el filtro estuviera en el cliente, esta PII igual habría viajado.
      const cuerpo = JSON.stringify(respuesta.body);
      expect(cuerpo).not.toContain("Cliente Secreto");
      expect(cuerpo).not.toContain("0981555444");
    });

    it("el admin sigue viendo todos", async () => {
      const uno = await crearBarbero("A");
      const dos = await crearBarbero("B");
      await crearTurno(uno, { hora: "09:00" });
      await crearTurno(dos, { hora: "10:00" });

      const { cookie } = await usuarioConSesion({
        userName: "jefe-ve-todo",
        rol: "admin",
      });

      const respuesta = await request(app).get("/api/agenda").set("Cookie", cookie);

      expect(respuesta.body.agendas).toHaveLength(2);
    });

    it("un barbero sin barbero asignado no ve ningún turno", async () => {
      const alguien = await crearBarbero("Alguien");
      await crearTurno(alguien);

      const { cookie } = await usuarioConSesion({
        userName: "huerfano",
        rol: "barbero",
      });

      const respuesta = await request(app).get("/api/agenda").set("Cookie", cookie);

      expect(respuesta.body.agendas).toEqual([]);
    });
  });

  describe("modificar turnos", () => {
    it("puede cambiar el estado de un turno suyo", async () => {
      const propio = await crearBarbero("Opera");
      const turno = await crearTurno(propio, {
        estado: "reservado",
        nombreCliente: "Cliente",
      });
      const { cookie } = await usuarioConSesion({
        userName: "barbero-opera",
        rol: "barbero",
        barbero: propio._id,
      });

      const respuesta = await request(app)
        .put(`/api/agenda/${turno._id}`)
        .set("Cookie", cookie)
        .send({ estado: "pagado" });

      expect(respuesta.status).toBe(200);
      expect((await AgendaModel.findById(turno._id)).estado).toBe("pagado");
    });

    it("NO puede tocar el turno de otro barbero", async () => {
      const propio = await crearBarbero("Propio T");
      const ajeno = await crearBarbero("Ajeno T");
      const turnoAjeno = await crearTurno(ajeno, {
        estado: "reservado",
        nombreCliente: "Cliente Ajeno",
      });
      const { cookie } = await usuarioConSesion({
        userName: "barbero-invasor",
        rol: "barbero",
        barbero: propio._id,
      });

      const respuesta = await request(app)
        .put(`/api/agenda/${turnoAjeno._id}`)
        .set("Cookie", cookie)
        .send({ estado: "no_show" });

      expect(respuesta.status).toBe(403);
      expect((await AgendaModel.findById(turnoAjeno._id)).estado).toBe("reservado");
    });

    it("NO puede borrar turnos, ni los suyos", async () => {
      const propio = await crearBarbero("No Borra");
      const turno = await crearTurno(propio);
      const { cookie } = await usuarioConSesion({
        userName: "barbero-borra",
        rol: "barbero",
        barbero: propio._id,
      });

      const respuesta = await request(app)
        .delete(`/api/agenda/${turno._id}`)
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(403);
      expect(await AgendaModel.findById(turno._id)).not.toBeNull();
    });

    it("NO puede crear turnos sueltos", async () => {
      const propio = await crearBarbero("No Crea");
      const { cookie } = await usuarioConSesion({
        userName: "barbero-crea",
        rol: "barbero",
        barbero: propio._id,
      });

      const respuesta = await request(app)
        .post("/api/agenda/new")
        .set("Cookie", cookie)
        .send({ fecha: "2026-09-20", hora: "09:00", diaSemana: "domingo" });

      expect(respuesta.status).toBe(403);
    });
  });

  describe("métricas", () => {
    it("las del barbero cuentan solo sus turnos", async () => {
      const propio = await crearBarbero("Mide");
      const ajeno = await crearBarbero("No Mide");

      await crearTurno(propio, {
        hora: "09:00",
        estado: "pagado",
        nombreCliente: "C1",
      });
      await crearTurno(ajeno, {
        hora: "10:00",
        estado: "pagado",
        nombreCliente: "C2",
      });
      await crearTurno(ajeno, {
        hora: "11:00",
        estado: "pagado",
        nombreCliente: "C3",
      });

      const { cookie } = await usuarioConSesion({
        userName: "barbero-metricas",
        rol: "barbero",
        barbero: propio._id,
      });

      const respuesta = await request(app)
        .get("/api/agenda/dashboard/metricas")
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.metricas.totalSolicitados).toBe(1);
    });

    it("las del admin cuentan las de todos", async () => {
      const uno = await crearBarbero("M1");
      const dos = await crearBarbero("M2");
      await crearTurno(uno, { hora: "09:00", estado: "pagado", nombreCliente: "C1" });
      await crearTurno(dos, { hora: "10:00", estado: "pagado", nombreCliente: "C2" });

      const { cookie } = await usuarioConSesion({
        userName: "jefe-metricas",
        rol: "admin",
      });

      const respuesta = await request(app)
        .get("/api/agenda/dashboard/metricas")
        .set("Cookie", cookie);

      expect(respuesta.body.metricas.totalSolicitados).toBe(2);
    });
  });
});
