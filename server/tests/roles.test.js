const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const { UserModel } = require("../models/user.model");
const BarberoModel = require("../models/barbero.model");
const { usuarioConSesion, crearUsuario, obtenerCookie } = require("./helpers/auth");

const crearBarbero = (nombre) =>
  BarberoModel.create({
    nombre,
    descripcion: "Barbero de prueba",
    foto: "foto.webp",
  });

describe("roles y vínculo usuario ↔ barbero", () => {
  describe("modelo", () => {
    it("un usuario nuevo sin rol explícito queda como barbero", async () => {
      const usuario = await crearUsuario({ userName: "nuevo" });
      expect(usuario.rol).toBe("barbero");
      expect(usuario.barbero).toBeNull();
    });

    it("no permite vincular dos usuarios al mismo barbero", async () => {
      const barbero = await crearBarbero("Compartido");
      await UserModel.init(); // asegura que el índice único exista

      await crearUsuario({ userName: "primero", barbero: barbero._id });

      await expect(
        crearUsuario({ userName: "segundo", barbero: barbero._id })
      ).rejects.toThrow();
    });

    it("sí permite varios usuarios sin barbero (varios admin)", async () => {
      await UserModel.init();
      await crearUsuario({ userName: "admin1", rol: "admin" });
      await crearUsuario({ userName: "admin2", rol: "admin" });

      expect(await UserModel.countDocuments({ barbero: null })).toBe(2);
    });

    it("no permite dos usuarios con el mismo userName", async () => {
      await UserModel.init();
      await crearUsuario({ userName: "repetido" });

      // Sin este índice, login hacía findOne({userName}) y se quedaba con
      // cualquiera de los dos homónimos.
      await expect(crearUsuario({ userName: "repetido" })).rejects.toThrow();
    });
  });

  describe("alta de usuarios desde el panel", () => {
    it("un nombre repetido da un mensaje legible, no un error crudo de Mongo", async () => {
      await UserModel.init();
      const { cookie } = await usuarioConSesion({
        userName: "jefe-alta",
        rol: "admin",
      });
      await crearUsuario({ userName: "ocupado" });

      const respuesta = await request(app)
        .post("/api/user/register")
        .set("Cookie", cookie)
        .send({
          userName: "ocupado",
          password: "password123",
          confirmPassword: "password123",
        });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.msg).toMatch(/ya existe un usuario/i);
    });

    it("asignar un barbero que ya tiene usuario da un mensaje legible", async () => {
      await UserModel.init();
      const barbero = await crearBarbero("Ya Tomado");
      const { cookie } = await usuarioConSesion({
        userName: "jefe-alta2",
        rol: "admin",
      });
      await crearUsuario({ userName: "dueño-previo", barbero: barbero._id });

      const respuesta = await request(app)
        .post("/api/user/register")
        .set("Cookie", cookie)
        .send({
          userName: "aspirante",
          password: "password123",
          confirmPassword: "password123",
          rol: "barbero",
          barbero: String(barbero._id),
        });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.msg).toMatch(/ya tiene un usuario/i);
    });

    it("nunca devuelve el hash de la contraseña", async () => {
      const { cookie } = await usuarioConSesion({
        userName: "jefe-alta3",
        rol: "admin",
      });

      const respuesta = await request(app)
        .post("/api/user/register")
        .set("Cookie", cookie)
        .send({
          userName: "recien-creado",
          password: "password123",
          confirmPassword: "password123",
        });

      expect(respuesta.status).toBe(201);
      expect(respuesta.body.user.password).toBeUndefined();
    });
  });

  describe("solo el admin cambia rol y barbero", () => {
    it("el admin puede asignarle un barbero a un usuario", async () => {
      const barbero = await crearBarbero("Asignable");
      const objetivo = await crearUsuario({ userName: "objetivo" });
      const { cookie } = await usuarioConSesion({
        userName: "jefe-asigna",
        rol: "admin",
      });

      const respuesta = await request(app)
        .put(`/api/user/${objetivo._id}`)
        .set("Cookie", cookie)
        .send({ rol: "barbero", barbero: String(barbero._id) });

      expect(respuesta.status).toBe(200);

      const despues = await UserModel.findById(objetivo._id);
      expect(despues.rol).toBe("barbero");
      expect(String(despues.barbero)).toBe(String(barbero._id));
    });

    it("un barbero no puede auto-asignarse otro barbero", async () => {
      const otroBarbero = await crearBarbero("Ajeno");
      const { usuario, cookie } = await usuarioConSesion({
        userName: "colado",
        rol: "barbero",
      });

      await request(app)
        .put(`/api/user/${usuario._id}`)
        .set("Cookie", cookie)
        .send({ barbero: String(otroBarbero._id) });

      const despues = await UserModel.findById(usuario._id);
      expect(despues.barbero).toBeNull();
    });
  });

  describe("login", () => {
    it("devuelve rol y barbero para que el panel sepa qué mostrar", async () => {
      const barbero = await crearBarbero("Con Usuario");
      await crearUsuario({
        userName: "barberito",
        rol: "barbero",
        barbero: barbero._id,
      });

      const respuesta = await request(app)
        .post("/api/auth/login")
        .send({ userName: "barberito", password: "password123" });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.user.rol).toBe("barbero");
      expect(String(respuesta.body.user.barbero)).toBe(String(barbero._id));
    });
  });

  describe("authenticate relee el rol de la base", () => {
    it("un cambio de rol surte efecto sin re-loguear", async () => {
      const { usuario, cookie } = await usuarioConSesion({
        userName: "asciende",
        rol: "barbero",
      });

      // Con la MISMA cookie, antes del cambio: rechazado.
      const antes = await request(app).get("/api/user/").set("Cookie", cookie);
      expect(antes.status).toBe(403);

      await UserModel.updateOne({ _id: usuario._id }, { $set: { rol: "admin" } });

      // Misma cookie, ahora aceptado: el rol no vive en el token.
      const despues = await request(app).get("/api/user/").set("Cookie", cookie);
      expect(despues.status).toBe(200);
    });

    it("un usuario borrado no puede seguir usando su cookie", async () => {
      const { usuario, cookie } = await usuarioConSesion({
        userName: "efimero",
        rol: "admin",
      });

      await UserModel.deleteOne({ _id: usuario._id });

      const respuesta = await request(app).get("/api/user/").set("Cookie", cookie);
      expect(respuesta.status).toBe(401);
    });

    it("un usuario legacy SIN campo rol se trata como admin (no queda afuera)", async () => {
      // Se inserta con el driver crudo para esquivar el default de Mongoose y
      // reproducir un documento anterior a la migración.
      const usuario = await crearUsuario({ userName: "legacy", rol: "admin" });
      await mongoose.connection
        .collection("users")
        .updateOne({ _id: usuario._id }, { $unset: { rol: "", barbero: "" } });

      const crudo = await mongoose.connection
        .collection("users")
        .findOne({ _id: usuario._id });
      expect(crudo.rol).toBeUndefined();

      const cookie = await obtenerCookie({ userName: "legacy" });
      const respuesta = await request(app).get("/api/user/").set("Cookie", cookie);

      expect(respuesta.status).toBe(200);
    });
  });

  describe("matriz de permisos", () => {
    const rutasSoloAdmin = [
      ["post", "/api/barberos"],
      ["delete", "/api/agenda/eliminar-hoy"],
      ["post", "/api/agenda/regenerar-fecha"],
      // Ojo: /dashboard/metricas NO está acá. Es accesible para un barbero,
      // pero el controller acota el resultado a lo suyo (ver aislamiento.test.js).
      ["post", "/api/user/register"],
      ["get", "/api/user/"],
      ["post", "/api/servicios"],
      ["post", "/api/horarios"],
      ["get", "/api/banners"],
      ["post", "/api/contacto"],
      ["put", "/api/ubicacion/000000000000000000000000"],
      ["post", "/api/migracion/crear-servicios-defecto"],
      ["get", "/api/whatsapp/status"],
      ["get", "/api/notifications/subscriptions"],
    ];

    it.each(rutasSoloAdmin)(
      "un barbero recibe 403 en %s %s",
      async (metodo, ruta) => {
        const { cookie } = await usuarioConSesion({
          userName: "barbero-sin-permisos",
          rol: "barbero",
        });

        const respuesta = await request(app)[metodo](ruta).set("Cookie", cookie);
        expect(respuesta.status).toBe(403);
      }
    );

    it.each(rutasSoloAdmin)(
      "un anónimo recibe 401 en %s %s",
      async (metodo, ruta) => {
        const respuesta = await request(app)[metodo](ruta);
        expect(respuesta.status).toBe(401);
      }
    );

    it("un admin NO recibe 403 en esas mismas rutas", async () => {
      const { cookie } = await usuarioConSesion({
        userName: "jefe",
        rol: "admin",
      });

      for (const [metodo, ruta] of rutasSoloAdmin) {
        const respuesta = await request(app)[metodo](ruta).set("Cookie", cookie);
        // Puede fallar por datos faltantes (400/404/500), pero nunca por permisos.
        expect(respuesta.status).not.toBe(403);
        expect(respuesta.status).not.toBe(401);
      }
    });
  });

  describe("un barbero puede gestionar su propio usuario", () => {
    it("puede editarse a sí mismo", async () => {
      const { usuario, cookie } = await usuarioConSesion({
        userName: "propio",
        rol: "barbero",
      });

      const respuesta = await request(app)
        .put(`/api/user/${usuario._id}`)
        .set("Cookie", cookie)
        .send({ userName: "propio-renombrado" });

      expect(respuesta.status).toBe(200);
    });

    it("NO puede editar a otro usuario", async () => {
      const otro = await crearUsuario({ userName: "ajeno", rol: "admin" });
      const { cookie } = await usuarioConSesion({
        userName: "entrometido",
        rol: "barbero",
      });

      const respuesta = await request(app)
        .put(`/api/user/${otro._id}`)
        .set("Cookie", cookie)
        .send({ userName: "hackeado" });

      expect(respuesta.status).toBe(403);
    });

    it("NO puede escalar su propio rol a admin", async () => {
      const { usuario, cookie } = await usuarioConSesion({
        userName: "ambicioso",
        rol: "barbero",
      });

      await request(app)
        .put(`/api/user/${usuario._id}`)
        .set("Cookie", cookie)
        .send({ userName: "ambicioso", rol: "admin" });

      const despues = await UserModel.findById(usuario._id);
      expect(despues.rol).toBe("barbero");
    });
  });
});
