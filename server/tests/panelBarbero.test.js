const request = require("supertest");
const app = require("../app");
const { UserModel } = require("../models/user.model");
const BarberoModel = require("../models/barbero.model");
const ServicioModel = require("../models/servicio.model");
const PrecioBarberoModel = require("../models/precioBarbero.model");
const { usuarioConSesion } = require("./helpers/auth");

const crearBarbero = (nombre) =>
  BarberoModel.create({
    nombre,
    descripcion: "Barbero de prueba",
    foto: "foto.webp",
  });

const crearServicio = (nombre, precio) =>
  ServicioModel.create({ nombre, precio, activo: true });

/**
 * Recorre lo que un usuario con rol "barbero" tiene que poder hacer en el
 * panel, de punta a punta. Existe porque el panel decidía qué mostrar leyendo
 * localStorage, y era fácil que la UI y el servidor no coincidieran.
 */
describe("panel del barbero, de punta a punta", () => {
  const armarBarbero = async (nombre = "Barbero Panel") => {
    const barbero = await crearBarbero(nombre);
    const sesion = await usuarioConSesion({
      userName: `user-${nombre.replace(/\s/g, "")}`,
      rol: "barbero",
      barbero: barbero._id,
    });
    return { barbero, ...sesion };
  };

  describe("/api/user/me — de acá saca el panel quién es", () => {
    it("devuelve el rol y el barbero desde la BASE, no desde el cliente", async () => {
      const { barbero, cookie } = await armarBarbero("Identidad");

      const respuesta = await request(app)
        .get("/api/user/me")
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.user.rol).toBe("barbero");
      expect(String(respuesta.body.user.barbero)).toBe(String(barbero._id));
    });

    it("refleja un cambio de rol sin necesidad de re-loguearse", async () => {
      const { usuario, cookie } = await armarBarbero("Asciende Panel");

      await UserModel.updateOne(
        { _id: usuario._id },
        { $set: { rol: "admin", barbero: null } }
      );

      const respuesta = await request(app)
        .get("/api/user/me")
        .set("Cookie", cookie);

      expect(respuesta.body.user.rol).toBe("admin");
      expect(respuesta.body.user.barbero).toBeNull();
    });

    it("nunca devuelve el hash de la contraseña", async () => {
      const { cookie } = await armarBarbero("Sin Hash");

      const respuesta = await request(app)
        .get("/api/user/me")
        .set("Cookie", cookie);

      expect(respuesta.body.user.password).toBeUndefined();
      expect(JSON.stringify(respuesta.body)).not.toContain("$2");
    });

    it("un anónimo recibe 401", async () => {
      const respuesta = await request(app).get("/api/user/me");
      expect(respuesta.status).toBe(401);
    });
  });

  describe("lo que SÍ puede hacer", () => {
    it("ver sus precios", async () => {
      const { barbero, cookie } = await armarBarbero("Ve Precios");
      await crearServicio("Corte", 50000);

      const respuesta = await request(app)
        .get(`/api/barberos/${barbero._id}/precios`)
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.precios).toHaveLength(1);
    });

    it("cambiar el precio de un servicio", async () => {
      const { barbero, cookie } = await armarBarbero("Cambia Precio");
      const servicio = await crearServicio("Corte", 50000);

      const respuesta = await request(app)
        .put(`/api/barberos/${barbero._id}/precios`)
        .set("Cookie", cookie)
        .send([{ servicioId: String(servicio._id), precio: 75000 }]);

      expect(respuesta.status).toBe(200);
    });

    it("dejar de ofrecer un servicio", async () => {
      const { barbero, cookie } = await armarBarbero("No Ofrece");
      const servicio = await crearServicio("Ceja", 20000);

      await request(app)
        .put(`/api/barberos/${barbero._id}/precios`)
        .set("Cookie", cookie)
        .send([
          { servicioId: String(servicio._id), precio: 20000, activo: false },
        ]);

      const override = await PrecioBarberoModel.findOne({
        barbero: barbero._id,
      });
      expect(override.activo).toBe(false);
    });

    it("ver y personalizar sus horarios", async () => {
      const { barbero, cookie } = await armarBarbero("Horarios Panel");

      const ver = await request(app)
        .get(`/api/barberos/${barbero._id}/horarios`)
        .set("Cookie", cookie);
      expect(ver.status).toBe(200);

      const clonar = await request(app)
        .post(`/api/barberos/${barbero._id}/horarios/clonar-globales`)
        .set("Cookie", cookie);
      expect(clonar.status).toBe(200);
    });

    it("ver sus turnos y sus métricas", async () => {
      const { cookie } = await armarBarbero("Turnos Panel");

      const turnos = await request(app).get("/api/agenda").set("Cookie", cookie);
      expect(turnos.status).toBe(200);

      const metricas = await request(app)
        .get("/api/agenda/dashboard/metricas")
        .set("Cookie", cookie);
      expect(metricas.status).toBe(200);
    });

    it("cambiar su propia contraseña", async () => {
      const { usuario, cookie } = await armarBarbero("Su Password");

      const respuesta = await request(app)
        .put(`/api/user/${usuario._id}`)
        .set("Cookie", cookie)
        .send({ password: "password-nueva-123" });

      expect(respuesta.status).toBe(200);
    });
  });

  describe("lo que NO puede hacer", () => {
    it("no puede tocar el catálogo global de servicios", async () => {
      const { cookie } = await armarBarbero("No Catalogo");
      const servicio = await crearServicio("Corte", 50000);

      // Crear, editar y borrar del catálogo son del admin: el barbero solo
      // personaliza su precio y sus fotos sobre lo que ya existe.
      const crear = await request(app)
        .post("/api/servicios")
        .set("Cookie", cookie)
        .send({ nombre: "Inventado", precio: 1 });
      expect(crear.status).toBe(403);

      const editar = await request(app)
        .put(`/api/servicios/${servicio._id}`)
        .set("Cookie", cookie)
        .send({ precio: 1 });
      expect(editar.status).toBe(403);

      const borrar = await request(app)
        .delete(`/api/servicios/${servicio._id}`)
        .set("Cookie", cookie);
      expect(borrar.status).toBe(403);

      // Y el servicio quedó intacto.
      const sigue = await ServicioModel.findById(servicio._id);
      expect(sigue.precio).toBe(50000);
      expect(sigue.activo).toBe(true);
    });

    it("no puede gestionar barberos ni usuarios", async () => {
      const { cookie } = await armarBarbero("No Gestiona");

      const barberos = await request(app)
        .post("/api/barberos")
        .set("Cookie", cookie);
      expect(barberos.status).toBe(403);

      const usuarios = await request(app)
        .get("/api/user/")
        .set("Cookie", cookie);
      expect(usuarios.status).toBe(403);
    });

    it("no puede tocar los horarios DEL LOCAL", async () => {
      const { cookie } = await armarBarbero("No Horarios Local");

      const respuesta = await request(app)
        .post("/api/horarios")
        .set("Cookie", cookie)
        .send({ hora: "23:00", dias: ["lunes"] });

      expect(respuesta.status).toBe(403);
    });
  });

  describe("un barbero sin barbero asignado", () => {
    it("no rompe: ve el panel vacío en vez de un error", async () => {
      const { cookie } = await usuarioConSesion({
        userName: "huerfano-panel",
        rol: "barbero",
      });

      const me = await request(app).get("/api/user/me").set("Cookie", cookie);
      expect(me.status).toBe(200);
      expect(me.body.user.barbero).toBeNull();

      const turnos = await request(app).get("/api/agenda").set("Cookie", cookie);
      expect(turnos.status).toBe(200);
      expect(turnos.body.agendas).toEqual([]);
    });
  });
});
