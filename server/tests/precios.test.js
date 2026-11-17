const request = require("supertest");
const app = require("../app");
const AgendaModel = require("../models/agenda.model");
const BarberoModel = require("../models/barbero.model");
const ServicioModel = require("../models/servicio.model");
const PrecioBarberoModel = require("../models/precioBarbero.model");
const PreciosService = require("../services/precios.service");
const { usuarioConSesion } = require("./helpers/auth");
const ParaguayDateUtil = require("../utils/paraguayDate");

// La reserva rechaza turnos pasados: las pruebas reservan dentro de un mes.
const FECHA_FUTURA = ParaguayDateUtil.now().add(30, "days").format("YYYY-MM-DD");

const crearBarbero = (nombre) =>
  BarberoModel.create({
    nombre,
    descripcion: "Barbero de prueba",
    foto: "foto.webp",
  });

const crearServicio = (nombre, precio) =>
  ServicioModel.create({ nombre, precio, activo: true });

/** Turno disponible listo para reservar. */
const crearTurno = (barbero, { fecha = FECHA_FUTURA, hora = "10:00" } = {}) =>
  AgendaModel.create({
    fecha: new Date(`${fecha}T03:00:00.000Z`),
    hora,
    diaSemana: "martes",
    barbero: barbero._id,
    nombreBarbero: barbero.nombre,
    estado: "disponible",
  });

describe("precios por barbero", () => {
  describe("resolución", () => {
    it("sin override, cobra el precio del local", async () => {
      const barbero = await crearBarbero("Sin Override");
      const servicio = await crearServicio("Corte", 50000);

      const { servicios, costoTotal } =
        await PreciosService.resolverServiciosParaReserva(barbero._id, [
          String(servicio._id),
        ]);

      expect(servicios[0].precio).toBe(50000);
      expect(costoTotal).toBe(50000);
    });

    it("con override, cobra el precio del barbero", async () => {
      const barbero = await crearBarbero("Con Override");
      const servicio = await crearServicio("Corte", 50000);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 65000,
      });

      const { costoTotal } = await PreciosService.resolverServiciosParaReserva(
        barbero._id,
        [String(servicio._id)]
      );

      expect(costoTotal).toBe(65000);
    });

    it("dos barberos con precios distintos para el mismo servicio", async () => {
      const caro = await crearBarbero("Caro");
      const barato = await crearBarbero("Barato");
      const servicio = await crearServicio("Corte", 50000);

      await PrecioBarberoModel.create({
        barbero: caro._id,
        servicio: servicio._id,
        precio: 90000,
      });

      const conCaro = await PreciosService.resolverServiciosParaReserva(
        caro._id,
        [String(servicio._id)]
      );
      const conBarato = await PreciosService.resolverServiciosParaReserva(
        barato._id,
        [String(servicio._id)]
      );

      expect(conCaro.costoTotal).toBe(90000);
      expect(conBarato.costoTotal).toBe(50000); // cae al global
    });

    it("un servicio desactivado por el barbero no se puede reservar", async () => {
      const barbero = await crearBarbero("No Ofrece");
      const servicio = await crearServicio("Ceja", 20000);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 20000,
        activo: false,
      });

      await expect(
        PreciosService.resolverServiciosParaReserva(barbero._id, [
          String(servicio._id),
        ])
      ).rejects.toThrow(/no ofrece/i);
    });

    it("un servicio inactivo en el catálogo global tampoco", async () => {
      const barbero = await crearBarbero("Cualquiera");
      const servicio = await ServicioModel.create({
        nombre: "Discontinuado",
        precio: 10000,
        activo: false,
      });

      await expect(
        PreciosService.resolverServiciosParaReserva(barbero._id, [
          String(servicio._id),
        ])
      ).rejects.toThrow(/no existe o está inactivo/i);
    });

    it("suma varios servicios respetando el override de cada uno", async () => {
      const barbero = await crearBarbero("Mixto");
      const corte = await crearServicio("Corte", 50000);
      const barba = await crearServicio("Barba", 30000);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: corte._id,
        precio: 60000,
      });

      const { costoTotal } = await PreciosService.resolverServiciosParaReserva(
        barbero._id,
        [String(corte._id), String(barba._id)]
      );

      expect(costoTotal).toBe(90000); // 60000 (override) + 30000 (global)
    });

    it("no duplica si mandan el mismo servicio dos veces", async () => {
      const barbero = await crearBarbero("Duplicador");
      const servicio = await crearServicio("Corte", 50000);

      const { servicios, costoTotal } =
        await PreciosService.resolverServiciosParaReserva(barbero._id, [
          String(servicio._id),
          String(servicio._id),
        ]);

      expect(servicios).toHaveLength(1);
      expect(costoTotal).toBe(50000);
    });
  });

  describe("catálogo público del barbero", () => {
    it("muestra el precio del barbero y oculta lo que no ofrece", async () => {
      const barbero = await crearBarbero("Publico");
      const corte = await crearServicio("Corte", 50000);
      const ceja = await crearServicio("Ceja", 20000);

      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: corte._id,
        precio: 70000,
      });
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: ceja._id,
        precio: 20000,
        activo: false,
      });

      const respuesta = await request(app).get(
        `/api/barberos/${barbero._id}/servicios`
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toHaveLength(1);
      expect(respuesta.body[0].nombre).toBe("Corte");
      expect(respuesta.body[0].precio).toBe(70000);
      expect(respuesta.body[0].precioGlobal).toBe(50000);
      expect(respuesta.body[0].personalizado).toBe(true);
    });

    it("es pública: no requiere sesión", async () => {
      const barbero = await crearBarbero("Anonimo");
      await crearServicio("Corte", 50000);

      const respuesta = await request(app).get(
        `/api/barberos/${barbero._id}/servicios`
      );

      expect(respuesta.status).toBe(200);
    });

    it("404 si el barbero no existe", async () => {
      const respuesta = await request(app).get(
        "/api/barberos/000000000000000000000000/servicios"
      );
      expect(respuesta.status).toBe(404);
    });

    // Regresión: el resolver usa .lean(), que NO aplica los defaults del
    // schema. Un servicio guardado sin el campo `imagenes` salía como
    // undefined y hacía explotar el carrusel de la landing.
    it("devuelve imagenes: [] aunque el documento no tenga el campo", async () => {
      const barbero = await crearBarbero("Sin Fotos");
      const servicio = await crearServicio("Corte Infantil", 12000);

      // Se quita el campo con el driver crudo, como los documentos viejos.
      await ServicioModel.collection.updateOne(
        { _id: servicio._id },
        { $unset: { imagenes: "" } }
      );
      const crudo = await ServicioModel.collection.findOne({
        _id: servicio._id,
      });
      expect(crudo.imagenes).toBeUndefined();

      const respuesta = await request(app).get(
        `/api/barberos/${barbero._id}/servicios`
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body[0].imagenes).toEqual([]);
    });
  });

  describe("edición de precios", () => {
    it("el barbero puede guardar sus propios precios", async () => {
      const barbero = await crearBarbero("Editor");
      const servicio = await crearServicio("Corte", 50000);
      const { cookie } = await usuarioConSesion({
        userName: "editor",
        rol: "barbero",
        barbero: barbero._id,
      });

      const respuesta = await request(app)
        .put(`/api/barberos/${barbero._id}/precios`)
        .set("Cookie", cookie)
        .send([{ servicioId: String(servicio._id), precio: 75000 }]);

      expect(respuesta.status).toBe(200);

      const guardado = await PrecioBarberoModel.findOne({
        barbero: barbero._id,
      });
      expect(guardado.precio).toBe(75000);
    });

    it("un barbero NO puede tocar los precios de otro", async () => {
      const propio = await crearBarbero("Propio");
      const ajeno = await crearBarbero("Ajeno");
      const servicio = await crearServicio("Corte", 50000);
      const { cookie } = await usuarioConSesion({
        userName: "entrometido",
        rol: "barbero",
        barbero: propio._id,
      });

      const respuesta = await request(app)
        .put(`/api/barberos/${ajeno._id}/precios`)
        .set("Cookie", cookie)
        .send([{ servicioId: String(servicio._id), precio: 1 }]);

      expect(respuesta.status).toBe(403);
      expect(await PrecioBarberoModel.countDocuments()).toBe(0);
    });

    it("el admin puede editar los precios de cualquiera", async () => {
      const barbero = await crearBarbero("Ajeno Para Admin");
      const servicio = await crearServicio("Corte", 50000);
      const { cookie } = await usuarioConSesion({
        userName: "jefe-precios",
        rol: "admin",
      });

      const respuesta = await request(app)
        .put(`/api/barberos/${barbero._id}/precios`)
        .set("Cookie", cookie)
        .send([{ servicioId: String(servicio._id), precio: 55000 }]);

      expect(respuesta.status).toBe(200);
    });

    it("un anónimo no puede editar precios", async () => {
      const barbero = await crearBarbero("Protegido");
      const respuesta = await request(app)
        .put(`/api/barberos/${barbero._id}/precios`)
        .send([]);
      expect(respuesta.status).toBe(401);
    });

    it("precio null borra el override y vuelve al precio del local", async () => {
      const barbero = await crearBarbero("Vuelve");
      const servicio = await crearServicio("Corte", 50000);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 99000,
      });
      const { cookie } = await usuarioConSesion({
        userName: "revierte",
        rol: "barbero",
        barbero: barbero._id,
      });

      await request(app)
        .put(`/api/barberos/${barbero._id}/precios`)
        .set("Cookie", cookie)
        .send([{ servicioId: String(servicio._id), precio: null }]);

      expect(await PrecioBarberoModel.countDocuments()).toBe(0);

      const { costoTotal } = await PreciosService.resolverServiciosParaReserva(
        barbero._id,
        [String(servicio._id)]
      );
      expect(costoTotal).toBe(50000);
    });

    it("rechaza un precio negativo", async () => {
      const barbero = await crearBarbero("Negativo");
      const servicio = await crearServicio("Corte", 50000);
      const { cookie } = await usuarioConSesion({
        userName: "tramposo",
        rol: "barbero",
        barbero: barbero._id,
      });

      const respuesta = await request(app)
        .put(`/api/barberos/${barbero._id}/precios`)
        .set("Cookie", cookie)
        .send([{ servicioId: String(servicio._id), precio: -1000 }]);

      expect(respuesta.status).toBe(400);
    });
  });

  describe("la reserva ignora los precios del cliente", () => {
    it("guarda el precio del servidor, no el manipulado", async () => {
      const barbero = await crearBarbero("Victima");
      const servicio = await crearServicio("Corte", 50000);
      const turno = await crearTurno(barbero);

      const respuesta = await request(app)
        .post("/api/agenda/reservar-con-barbero")
        .send({
          fecha: FECHA_FUTURA,
          hora: "10:00",
          barberoId: String(barbero._id),
          nombreCliente: "Cliente Tramposo",
          numeroCliente: "0981123456",
          // Formato viejo con precio manipulado a 0.
          servicios: [
            {
              servicioId: String(servicio._id),
              nombre: "Corte",
              precio: 0,
              duracion: 30,
            },
          ],
        });

      expect(respuesta.status).toBe(200);

      const guardado = await AgendaModel.findById(turno._id);
      expect(guardado.servicios[0].precio).toBe(50000);
      expect(guardado.costoTotal).toBe(50000);
    });

    it("aplica el precio del barbero, no el global, al reservar", async () => {
      const barbero = await crearBarbero("Premium");
      const servicio = await crearServicio("Corte", 50000);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 80000,
      });
      const turno = await crearTurno(barbero);

      await request(app)
        .post("/api/agenda/reservar-con-barbero")
        .send({
          fecha: FECHA_FUTURA,
          hora: "10:00",
          barberoId: String(barbero._id),
          nombreCliente: "Cliente",
          numeroCliente: "0981123456",
          servicioIds: [String(servicio._id)],
        });

      const guardado = await AgendaModel.findById(turno._id);
      expect(guardado.servicios[0].precio).toBe(80000);
      expect(guardado.costoTotal).toBe(80000);
    });

    it("rechaza reservar un servicio que el barbero no ofrece", async () => {
      const barbero = await crearBarbero("Limitado");
      const servicio = await crearServicio("Ceja", 20000);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 20000,
        activo: false,
      });
      await crearTurno(barbero);

      const respuesta = await request(app)
        .post("/api/agenda/reservar-con-barbero")
        .send({
          fecha: FECHA_FUTURA,
          hora: "10:00",
          barberoId: String(barbero._id),
          nombreCliente: "Cliente",
          numeroCliente: "0981123456",
          servicioIds: [String(servicio._id)],
        });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.message).toMatch(/no ofrece/i);
    });

    it("acepta el formato nuevo con solo ids", async () => {
      const barbero = await crearBarbero("Formato Nuevo");
      const servicio = await crearServicio("Corte", 50000);
      const turno = await crearTurno(barbero);

      const respuesta = await request(app)
        .post("/api/agenda/reservar-con-barbero")
        .send({
          fecha: FECHA_FUTURA,
          hora: "10:00",
          barberoId: String(barbero._id),
          nombreCliente: "Cliente",
          numeroCliente: "0981123456",
          servicioIds: [String(servicio._id)],
        });

      expect(respuesta.status).toBe(200);
      const guardado = await AgendaModel.findById(turno._id);
      expect(guardado.servicios[0].nombre).toBe("Corte");
    });
  });

  describe("edición pública del turno (link de WhatsApp)", () => {
    it("recalcula con el precio del barbero del turno", async () => {
      const barbero = await crearBarbero("Editable");
      const servicio = await crearServicio("Corte", 50000);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 70000,
      });

      const turno = await crearTurno(barbero);
      turno.estado = "reservado";
      turno.editToken = "token-de-prueba";
      await turno.save();

      const respuesta = await request(app)
        .put(`/api/agenda/editar-mi-turno/${turno._id}?t=token-de-prueba`)
        .send({
          nombreCliente: "Cliente Editado",
          numeroCliente: "0981123456",
          servicios: [{ servicioId: String(servicio._id), precio: 1 }],
        });

      expect(respuesta.status).toBe(200);

      const guardado = await AgendaModel.findById(turno._id);
      // Ni el 1 del cliente ni el 50000 global: el 70000 de este barbero.
      expect(guardado.servicios[0].precio).toBe(70000);
      expect(guardado.costoTotal).toBe(70000);
    });
  });

  describe("histórico", () => {
    it("cambiar un precio NO altera turnos ya reservados", async () => {
      const barbero = await crearBarbero("Historico");
      const servicio = await crearServicio("Corte", 50000);
      const turno = await crearTurno(barbero);

      await request(app)
        .post("/api/agenda/reservar-con-barbero")
        .send({
          fecha: FECHA_FUTURA,
          hora: "10:00",
          barberoId: String(barbero._id),
          nombreCliente: "Cliente",
          numeroCliente: "0981123456",
          servicioIds: [String(servicio._id)],
        });

      // El barbero sube el precio después de la reserva.
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 120000,
      });

      const guardado = await AgendaModel.findById(turno._id);
      expect(guardado.servicios[0].precio).toBe(50000);
      expect(guardado.costoTotal).toBe(50000);
    });
  });

  describe("edición del turno desde el panel admin", () => {
    it("recalcula el precio en el servidor aunque el admin mande otro", async () => {
      const barbero = await crearBarbero("Panel");
      const servicio = await crearServicio("Corte", 50000);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 65000,
      });
      const turno = await crearTurno(barbero);
      const { cookie } = await usuarioConSesion({
        userName: "jefe-turnos",
        rol: "admin",
      });

      const respuesta = await request(app)
        .put(`/api/agenda/${turno._id}`)
        .set("Cookie", cookie)
        .send({
          nombreCliente: "Cliente Panel",
          estado: "reservado",
          servicios: [{ servicioId: String(servicio._id), precio: 1 }],
          costoTotal: 1,
        });

      expect(respuesta.status).toBe(200);

      const guardado = await AgendaModel.findById(turno._id);
      expect(guardado.servicios[0].precio).toBe(65000);
      expect(guardado.costoTotal).toBe(65000);
    });

    it("no toca los servicios si el body no los incluye", async () => {
      const barbero = await crearBarbero("Solo Estado");
      const servicio = await crearServicio("Corte", 50000);
      const turno = await crearTurno(barbero);
      turno.servicios = [
        { servicioId: servicio._id, nombre: "Corte", precio: 50000, duracion: 30 },
      ];
      turno.estado = "reservado";
      await turno.save();

      const { cookie } = await usuarioConSesion({
        userName: "jefe-estado",
        rol: "admin",
      });

      await request(app)
        .put(`/api/agenda/${turno._id}`)
        .set("Cookie", cookie)
        .send({ estado: "pagado" });

      const guardado = await AgendaModel.findById(turno._id);
      expect(guardado.estado).toBe("pagado");
      expect(guardado.servicios).toHaveLength(1);
      expect(guardado.servicios[0].precio).toBe(50000);
    });
  });

  describe("limpieza de overrides huérfanos", () => {
    it("desactivar un servicio global borra los precios propios", async () => {
      const barbero = await crearBarbero("Con Precio");
      const servicio = await crearServicio("A Discontinuar", 40000);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 45000,
      });
      const { cookie } = await usuarioConSesion({
        userName: "jefe-limpia",
        rol: "admin",
      });

      const respuesta = await request(app)
        .delete(`/api/servicios/${servicio._id}`)
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(200);
      expect(await PrecioBarberoModel.countDocuments()).toBe(0);
    });
  });
});
