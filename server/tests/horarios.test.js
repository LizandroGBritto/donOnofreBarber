const request = require("supertest");
const app = require("../app");
const AgendaModel = require("../models/agenda.model");
const BarberoModel = require("../models/barbero.model");
const HorarioModel = require("../models/horario.model");
const HorariosService = require("../services/horarios.service");
const AgendaGenerator = require("../services/agendaGenerator.service");
const { usuarioConSesion } = require("./helpers/auth");

const TODOS_LOS_DIAS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

const crearBarbero = (nombre) =>
  BarberoModel.create({
    nombre,
    descripcion: "Barbero de prueba",
    foto: "foto.webp",
    activo: true,
    incluirEnAgenda: true,
  });

/** Horario del local (barbero: null). */
const crearHorarioGlobal = (hora, dias = TODOS_LOS_DIAS) =>
  HorarioModel.create({ hora, dias, estado: "activo", barbero: null });

/** Una fecha futura fija y su día de semana, para no depender de "hoy". */
const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000);

describe("horarios por barbero", () => {
  describe("resolución", () => {
    it("sin personalizar, usa los horarios del local", async () => {
      const barbero = await crearBarbero("Estandar");
      await crearHorarioGlobal("09:00");
      await crearHorarioGlobal("10:00");

      const horarios = await HorariosService.resolverHorariosDeBarbero(
        barbero._id
      );

      expect(horarios.map((h) => h.hora)).toEqual(["09:00", "10:00"]);
    });

    it("con horarios propios, usa SOLO los suyos (reemplazo, no suma)", async () => {
      const barbero = await crearBarbero("Personalizado");
      await crearHorarioGlobal("09:00");
      await crearHorarioGlobal("10:00");

      await HorarioModel.create({
        barbero: barbero._id,
        hora: "15:00",
        dias: TODOS_LOS_DIAS,
        estado: "activo",
      });
      await BarberoModel.updateOne(
        { _id: barbero._id },
        { usaHorariosPropios: true }
      );

      const horarios = await HorariosService.resolverHorariosDeBarbero(
        barbero._id
      );

      // Esto es lo central del diseño: las 09:00 y 10:00 del local NO aparecen.
      expect(horarios.map((h) => h.hora)).toEqual(["15:00"]);
    });

    it("dos barberos pueden tener la misma hora sin chocar", async () => {
      const uno = await crearBarbero("Uno");
      const dos = await crearBarbero("Dos");
      await HorarioModel.init();

      await HorarioModel.create({
        barbero: uno._id,
        hora: "09:00",
        dias: TODOS_LOS_DIAS,
      });

      await expect(
        HorarioModel.create({
          barbero: dos._id,
          hora: "09:00",
          dias: TODOS_LOS_DIAS,
        })
      ).resolves.toBeDefined();
    });

    it("un mismo barbero no puede repetir la hora", async () => {
      const barbero = await crearBarbero("Repetidor");
      await HorarioModel.init();

      await HorarioModel.create({
        barbero: barbero._id,
        hora: "09:00",
        dias: TODOS_LOS_DIAS,
      });

      await expect(
        HorarioModel.create({
          barbero: barbero._id,
          hora: "09:00",
          dias: TODOS_LOS_DIAS,
        })
      ).rejects.toThrow();
    });

    it("la unión de todos incluye las horas propias de cada uno", async () => {
      const estandar = await crearBarbero("Usa Global");
      const propio = await crearBarbero("Usa Propio");
      await crearHorarioGlobal("09:00");

      await HorarioModel.create({
        barbero: propio._id,
        hora: "20:00",
        dias: TODOS_LOS_DIAS,
      });
      await BarberoModel.updateOne(
        { _id: propio._id },
        { usaHorariosPropios: true }
      );

      const union = await HorariosService.resolverHorariosDeTodos();

      expect(union.map((h) => h.hora)).toEqual(["09:00", "20:00"]);
      expect(estandar).toBeDefined();
    });
  });

  describe("clonar los horarios del local", () => {
    it("copia los globales y prende el flag", async () => {
      const barbero = await crearBarbero("Clonador");
      await crearHorarioGlobal("09:00");
      await crearHorarioGlobal("10:00");
      const { cookie } = await usuarioConSesion({
        userName: "clonador",
        rol: "barbero",
        barbero: barbero._id,
      });

      const respuesta = await request(app)
        .post(`/api/barberos/${barbero._id}/horarios/clonar-globales`)
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(200);

      const propios = await HorarioModel.find({ barbero: barbero._id });
      expect(propios.map((h) => h.hora).sort()).toEqual(["09:00", "10:00"]);

      const actualizado = await BarberoModel.findById(barbero._id);
      expect(actualizado.usaHorariosPropios).toBe(true);
    });

    it("es idempotente: no duplica al correrlo dos veces", async () => {
      const barbero = await crearBarbero("Doble Clon");
      await crearHorarioGlobal("09:00");
      const { cookie } = await usuarioConSesion({
        userName: "doble",
        rol: "barbero",
        barbero: barbero._id,
      });

      const url = `/api/barberos/${barbero._id}/horarios/clonar-globales`;
      await request(app).post(url).set("Cookie", cookie);
      await request(app).post(url).set("Cookie", cookie);

      expect(await HorarioModel.countDocuments({ barbero: barbero._id })).toBe(1);
    });

    it("volver a los globales conserva los propios guardados", async () => {
      const barbero = await crearBarbero("Va Y Vuelve");
      await crearHorarioGlobal("09:00");
      const { cookie } = await usuarioConSesion({
        userName: "vuelve",
        rol: "barbero",
        barbero: barbero._id,
      });

      await request(app)
        .post(`/api/barberos/${barbero._id}/horarios/clonar-globales`)
        .set("Cookie", cookie);
      await request(app)
        .patch(`/api/barberos/${barbero._id}/horarios/usar-globales`)
        .set("Cookie", cookie);

      const actualizado = await BarberoModel.findById(barbero._id);
      expect(actualizado.usaHorariosPropios).toBe(false);
      // No se borraron: puede retomarlos.
      expect(await HorarioModel.countDocuments({ barbero: barbero._id })).toBe(1);
    });
  });

  describe("permisos", () => {
    it("un barbero no puede crear horarios de otro", async () => {
      const propio = await crearBarbero("Propio H");
      const ajeno = await crearBarbero("Ajeno H");
      const { cookie } = await usuarioConSesion({
        userName: "invasor",
        rol: "barbero",
        barbero: propio._id,
      });

      const respuesta = await request(app)
        .post(`/api/barberos/${ajeno._id}/horarios`)
        .set("Cookie", cookie)
        .send({ hora: "23:00", dias: ["lunes"] });

      expect(respuesta.status).toBe(403);
      expect(await HorarioModel.countDocuments({ barbero: ajeno._id })).toBe(0);
    });

    it("un barbero no puede borrar un horario de otro pasando su id", async () => {
      const propio = await crearBarbero("Propio D");
      const ajeno = await crearBarbero("Ajeno D");
      const delAjeno = await HorarioModel.create({
        barbero: ajeno._id,
        hora: "09:00",
        dias: TODOS_LOS_DIAS,
      });
      const { cookie } = await usuarioConSesion({
        userName: "borrador",
        rol: "barbero",
        barbero: propio._id,
      });

      // Su propio id en la ruta, pero el horarioId del otro.
      const respuesta = await request(app)
        .delete(`/api/barberos/${propio._id}/horarios/${delAjeno._id}`)
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(404);
      expect(await HorarioModel.findById(delAjeno._id)).not.toBeNull();
    });

    it("el admin puede gestionar los horarios de cualquiera", async () => {
      const barbero = await crearBarbero("Del Admin");
      const { cookie } = await usuarioConSesion({
        userName: "jefe-horarios",
        rol: "admin",
      });

      const respuesta = await request(app)
        .post(`/api/barberos/${barbero._id}/horarios`)
        .set("Cookie", cookie)
        .send({ hora: "08:00", dias: ["lunes"] });

      expect(respuesta.status).toBe(201);
    });

    it("consultar los horarios de un barbero es público", async () => {
      const barbero = await crearBarbero("Consultable");
      await crearHorarioGlobal("09:00");

      const respuesta = await request(app).get(
        `/api/barberos/${barbero._id}/horarios`
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.usaHorariosPropios).toBe(false);
      expect(respuesta.body.horarios).toHaveLength(1);
    });
  });

  describe("generación de turnos", () => {
    it("genera según los horarios de cada barbero, no un set único", async () => {
      const estandar = await crearBarbero("Gen Global");
      const propio = await crearBarbero("Gen Propio");
      await crearHorarioGlobal("09:00");
      await crearHorarioGlobal("10:00");

      await HorarioModel.create({
        barbero: propio._id,
        hora: "18:00",
        dias: TODOS_LOS_DIAS,
      });
      await BarberoModel.updateOne(
        { _id: propio._id },
        { usaHorariosPropios: true }
      );

      await AgendaGenerator.generarTurnosPorFecha(MANANA);

      const deEstandar = await AgendaModel.find({ barbero: estandar._id });
      const dePropio = await AgendaModel.find({ barbero: propio._id });

      expect(deEstandar.map((t) => t.hora).sort()).toEqual(["09:00", "10:00"]);
      expect(dePropio.map((t) => t.hora)).toEqual(["18:00"]);
    });

    it("no duplica si se corre dos veces", async () => {
      await crearBarbero("Idempotente");
      await crearHorarioGlobal("09:00");

      await AgendaGenerator.generarTurnosPorFecha(MANANA);
      await AgendaGenerator.generarTurnosPorFecha(MANANA);

      expect(await AgendaModel.countDocuments()).toBe(1);
    });

    it("soloBarberoId acota la generación a ese barbero", async () => {
      const uno = await crearBarbero("Solo Uno");
      const dos = await crearBarbero("Solo Dos");
      await crearHorarioGlobal("09:00");

      await AgendaGenerator.generarTurnosPorFecha(MANANA, {
        soloBarberoId: uno._id,
      });

      expect(await AgendaModel.countDocuments({ barbero: uno._id })).toBe(1);
      expect(await AgendaModel.countDocuments({ barbero: dos._id })).toBe(0);
    });
  });

  describe("regeneración acotada por barbero", () => {
    it("no toca los turnos de otro barbero", async () => {
      const objetivo = await crearBarbero("Regenerado");
      const otro = await crearBarbero("Intocable");
      await crearHorarioGlobal("09:00");
      await AgendaGenerator.generarTurnosPorFecha(MANANA);

      const turnoDelOtro = await AgendaModel.findOne({ barbero: otro._id });

      await AgendaGenerator.regenerarAgendaDeBarbero(objetivo._id);

      const sigueVivo = await AgendaModel.findById(turnoDelOtro._id);
      expect(sigueVivo).not.toBeNull();
      // Mismo documento, no borrado y recreado.
      expect(String(sigueVivo._id)).toBe(String(turnoDelOtro._id));
    });

    it("no borra turnos con cliente", async () => {
      const barbero = await crearBarbero("Con Reserva");
      await crearHorarioGlobal("09:00");
      await AgendaGenerator.generarTurnosPorFecha(MANANA);

      const turno = await AgendaModel.findOne({ barbero: barbero._id });
      turno.estado = "reservado";
      turno.nombreCliente = "Cliente Real";
      await turno.save();

      await AgendaGenerator.regenerarAgendaDeBarbero(barbero._id);

      const despues = await AgendaModel.findById(turno._id);
      expect(despues).not.toBeNull();
      expect(despues.nombreCliente).toBe("Cliente Real");
    });

    it("no toca fechas pasadas", async () => {
      const barbero = await crearBarbero("Historico H");
      const ayer = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const turnoViejo = await AgendaModel.create({
        fecha: ayer,
        hora: "09:00",
        diaSemana: "lunes",
        barbero: barbero._id,
        estado: "disponible",
        creadoAutomaticamente: true,
      });

      await AgendaGenerator.regenerarAgendaDeBarbero(barbero._id);

      expect(await AgendaModel.findById(turnoViejo._id)).not.toBeNull();
    });

    it("un barbero inactivo no recupera sus turnos", async () => {
      const barbero = await crearBarbero("Inactivo");
      await crearHorarioGlobal("09:00");
      await AgendaGenerator.generarTurnosPorFecha(MANANA);
      expect(await AgendaModel.countDocuments({ barbero: barbero._id })).toBe(1);

      await BarberoModel.updateOne({ _id: barbero._id }, { activo: false });
      await AgendaGenerator.regenerarAgendaDeBarbero(barbero._id);

      expect(await AgendaModel.countDocuments({ barbero: barbero._id })).toBe(0);
    });
  });

  describe("el bug de la regeneración silenciosa", () => {
    it("crear un horario del local SÍ genera turnos (antes daba 401 y no hacía nada)", async () => {
      await crearBarbero("Beneficiado");
      const { cookie } = await usuarioConSesion({
        userName: "jefe-crea-horario",
        rol: "admin",
      });

      const respuesta = await request(app)
        .post("/api/horarios")
        .set("Cookie", cookie)
        .send({ hora: "11:00", dias: TODOS_LOS_DIAS, estado: "activo" });

      expect(respuesta.status).toBe(201);
      // La respuesta ya no miente: informa el resultado real.
      expect(respuesta.body.regeneracion.error).toBeUndefined();
      expect(respuesta.body.regeneracion.turnosCreados).toBeGreaterThan(0);
      expect(await AgendaModel.countDocuments({ hora: "11:00" })).toBeGreaterThan(0);
    });

    it("los horarios del local no incluyen los propios de un barbero", async () => {
      const barbero = await crearBarbero("Oculto");
      await crearHorarioGlobal("09:00");
      await HorarioModel.create({
        barbero: barbero._id,
        hora: "23:00",
        dias: TODOS_LOS_DIAS,
      });

      const respuesta = await request(app).get("/api/horarios");

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.horarios.map((h) => h.hora)).toEqual(["09:00"]);
    });
  });
});
