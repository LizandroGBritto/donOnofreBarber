const request = require("supertest");
const sharp = require("sharp");
const app = require("../app");
const BarberoModel = require("../models/barbero.model");
const ServicioModel = require("../models/servicio.model");
const PrecioBarberoModel = require("../models/precioBarbero.model");
const PreciosService = require("../services/precios.service");
const { usuarioConSesion } = require("./helpers/auth");

const crearBarbero = (nombre) =>
  BarberoModel.create({
    nombre,
    descripcion: "Barbero de prueba",
    foto: "foto.webp",
  });

const crearServicio = (nombre, precio, imagenes = []) =>
  ServicioModel.create({ nombre, precio, activo: true, imagenes });

/** Un PNG mínimo real: multer/sharp lo rechazarían si fuera un buffer cualquiera. */
const imagenDePrueba = () =>
  sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 120, g: 60, b: 200 },
    },
  })
    .png()
    .toBuffer();

describe("imágenes propias del barbero por servicio", () => {
  describe("resolución del catálogo", () => {
    it("sin fotos propias muestra las del local", async () => {
      const barbero = await crearBarbero("Usa Local");
      await crearServicio("Corte", 50000, ["local-1.webp"]);

      const [servicio] = await PreciosService.listarServiciosDeBarbero(
        barbero._id
      );

      expect(servicio.imagenes).toEqual(["local-1.webp"]);
      expect(servicio.imagenesPropias).toBe(false);
    });

    it("con fotos propias REEMPLAZA las del local, no las mezcla", async () => {
      const barbero = await crearBarbero("Tiene Propias");
      const servicio = await crearServicio("Corte", 50000, ["local-1.webp"]);

      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 50000,
        imagenes: ["mia-1.webp", "mia-2.webp"],
      });

      const [resuelto] = await PreciosService.listarServiciosDeBarbero(
        barbero._id
      );

      // Lo central: la del local NO aparece. Mezclarlas haría imposible
      // distinguir un corte del barbero de una foto de referencia.
      expect(resuelto.imagenes).toEqual(["mia-1.webp", "mia-2.webp"]);
      expect(resuelto.imagenes).not.toContain("local-1.webp");
      expect(resuelto.imagenesPropias).toBe(true);
    });

    it("un override sin fotos cae a las del local", async () => {
      const barbero = await crearBarbero("Solo Precio");
      const servicio = await crearServicio("Corte", 50000, ["local-1.webp"]);

      // Personalizó el precio pero no subió fotos.
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 70000,
      });

      const [resuelto] = await PreciosService.listarServiciosDeBarbero(
        barbero._id
      );

      expect(resuelto.precio).toBe(70000);
      expect(resuelto.imagenes).toEqual(["local-1.webp"]);
      expect(resuelto.imagenesPropias).toBe(false);
    });

    it("dos barberos ven fotos distintas para el mismo servicio", async () => {
      const uno = await crearBarbero("Foto A");
      const dos = await crearBarbero("Foto B");
      const servicio = await crearServicio("Corte", 50000, ["local.webp"]);

      await PrecioBarberoModel.create({
        barbero: uno._id,
        servicio: servicio._id,
        precio: 50000,
        imagenes: ["de-uno.webp"],
      });

      const [deUno] = await PreciosService.listarServiciosDeBarbero(uno._id);
      const [deDos] = await PreciosService.listarServiciosDeBarbero(dos._id);

      expect(deUno.imagenes).toEqual(["de-uno.webp"]);
      expect(deDos.imagenes).toEqual(["local.webp"]);
    });

    it("el panel ve por separado las propias y las del local", async () => {
      const barbero = await crearBarbero("Panel");
      const servicio = await crearServicio("Corte", 50000, ["local.webp"]);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 50000,
        imagenes: ["mia.webp"],
      });

      const [fila] = await PreciosService.listarPreciosDeBarbero(barbero._id);

      expect(fila.imagenes).toEqual(["mia.webp"]);
      expect(fila.imagenesLocal).toEqual(["local.webp"]);
    });
  });

  describe("subida", () => {
    it("el barbero sube una foto para un servicio", async () => {
      const barbero = await crearBarbero("Sube");
      const servicio = await crearServicio("Corte", 50000);
      const { cookie } = await usuarioConSesion({
        userName: "sube-fotos",
        rol: "barbero",
        barbero: barbero._id,
      });

      const respuesta = await request(app)
        .post(`/api/barberos/${barbero._id}/servicios/${servicio._id}/imagenes`)
        .set("Cookie", cookie)
        .attach("imagenes", await imagenDePrueba(), "corte.png");

      expect(respuesta.status).toBe(201);
      expect(respuesta.body.imagenes).toHaveLength(1);
      expect(respuesta.body.imagenes[0]).toMatch(/\.webp$/);
    });

    it("subir una foto NO le cambia el precio", async () => {
      const barbero = await crearBarbero("Solo Foto");
      const servicio = await crearServicio("Corte", 50000);
      const { cookie } = await usuarioConSesion({
        userName: "solo-foto",
        rol: "barbero",
        barbero: barbero._id,
      });

      await request(app)
        .post(`/api/barberos/${barbero._id}/servicios/${servicio._id}/imagenes`)
        .set("Cookie", cookie)
        .attach("imagenes", await imagenDePrueba(), "corte.png");

      const override = await PrecioBarberoModel.findOne({
        barbero: barbero._id,
      });
      // Hereda el precio del local: subir una foto no es cambiar el precio.
      expect(override.precio).toBe(50000);

      const [resuelto] = await PreciosService.listarServiciosDeBarbero(
        barbero._id
      );
      expect(resuelto.precio).toBe(50000);
    });

    it("rechaza si no se manda ninguna imagen", async () => {
      const barbero = await crearBarbero("Sin Archivo");
      const servicio = await crearServicio("Corte", 50000);
      const { cookie } = await usuarioConSesion({
        userName: "sin-archivo",
        rol: "barbero",
        barbero: barbero._id,
      });

      const respuesta = await request(app)
        .post(`/api/barberos/${barbero._id}/servicios/${servicio._id}/imagenes`)
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(400);
    });

    it("rechaza un servicio inexistente", async () => {
      const barbero = await crearBarbero("Servicio Fantasma");
      const { cookie } = await usuarioConSesion({
        userName: "fantasma",
        rol: "barbero",
        barbero: barbero._id,
      });

      const respuesta = await request(app)
        .post(
          `/api/barberos/${barbero._id}/servicios/000000000000000000000000/imagenes`
        )
        .set("Cookie", cookie)
        .attach("imagenes", await imagenDePrueba(), "corte.png");

      expect(respuesta.status).toBe(400);
    });
  });

  describe("permisos", () => {
    it("un barbero NO puede subir fotos al servicio de otro", async () => {
      const propio = await crearBarbero("Propio Img");
      const ajeno = await crearBarbero("Ajeno Img");
      const servicio = await crearServicio("Corte", 50000);
      const { cookie } = await usuarioConSesion({
        userName: "invasor-img",
        rol: "barbero",
        barbero: propio._id,
      });

      const respuesta = await request(app)
        .post(`/api/barberos/${ajeno._id}/servicios/${servicio._id}/imagenes`)
        .set("Cookie", cookie)
        .attach("imagenes", await imagenDePrueba(), "corte.png");

      expect(respuesta.status).toBe(403);
      expect(await PrecioBarberoModel.countDocuments()).toBe(0);
    });

    it("un anónimo no puede subir fotos", async () => {
      const barbero = await crearBarbero("Anon Img");
      const servicio = await crearServicio("Corte", 50000);

      const respuesta = await request(app)
        .post(`/api/barberos/${barbero._id}/servicios/${servicio._id}/imagenes`)
        .attach("imagenes", await imagenDePrueba(), "corte.png");

      expect(respuesta.status).toBe(401);
    });

    it("el admin puede subir fotos para cualquier barbero", async () => {
      const barbero = await crearBarbero("Del Admin Img");
      const servicio = await crearServicio("Corte", 50000);
      const { cookie } = await usuarioConSesion({
        userName: "jefe-img",
        rol: "admin",
      });

      const respuesta = await request(app)
        .post(`/api/barberos/${barbero._id}/servicios/${servicio._id}/imagenes`)
        .set("Cookie", cookie)
        .attach("imagenes", await imagenDePrueba(), "corte.png");

      expect(respuesta.status).toBe(201);
    });
  });

  describe("limpieza de huérfanos", () => {
    it("borrar un barbero se lleva sus precios y fotos propias", async () => {
      const barbero = await crearBarbero("Se Va");
      const otro = await crearBarbero("Se Queda");
      const servicio = await crearServicio("Corte", 50000);

      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 70000,
        imagenes: ["suya.webp"],
      });
      await PrecioBarberoModel.create({
        barbero: otro._id,
        servicio: servicio._id,
        precio: 60000,
        imagenes: ["del-otro.webp"],
      });

      const { cookie } = await usuarioConSesion({
        userName: "jefe-borra-barbero",
        rol: "admin",
      });

      const respuesta = await request(app)
        .delete(`/api/barberos/${barbero._id}`)
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(200);
      // Se fue el suyo...
      expect(
        await PrecioBarberoModel.countDocuments({ barbero: barbero._id })
      ).toBe(0);
      // ...y el del otro barbero quedó intacto.
      expect(
        await PrecioBarberoModel.countDocuments({ barbero: otro._id })
      ).toBe(1);
    });

    it("desactivar un servicio se lleva los overrides de todos los barberos", async () => {
      const uno = await crearBarbero("Uno Limpia");
      const dos = await crearBarbero("Dos Limpia");
      const servicio = await crearServicio("A Discontinuar", 40000);
      const otroServicio = await crearServicio("Sigue", 30000);

      await PrecioBarberoModel.create({
        barbero: uno._id,
        servicio: servicio._id,
        precio: 45000,
        imagenes: ["a.webp"],
      });
      await PrecioBarberoModel.create({
        barbero: dos._id,
        servicio: servicio._id,
        precio: 50000,
        imagenes: ["b.webp"],
      });
      await PrecioBarberoModel.create({
        barbero: uno._id,
        servicio: otroServicio._id,
        precio: 35000,
      });

      const { cookie } = await usuarioConSesion({
        userName: "jefe-borra-servicio",
        rol: "admin",
      });

      await request(app)
        .delete(`/api/servicios/${servicio._id}`)
        .set("Cookie", cookie);

      expect(
        await PrecioBarberoModel.countDocuments({ servicio: servicio._id })
      ).toBe(0);
      // El override del otro servicio no se toca.
      expect(
        await PrecioBarberoModel.countDocuments({ servicio: otroServicio._id })
      ).toBe(1);
    });
  });

  describe("borrado", () => {
    it("quita una foto propia", async () => {
      const barbero = await crearBarbero("Borra");
      const servicio = await crearServicio("Corte", 50000);
      await PrecioBarberoModel.create({
        barbero: barbero._id,
        servicio: servicio._id,
        precio: 50000,
        imagenes: ["una.webp", "otra.webp"],
      });
      const { cookie } = await usuarioConSesion({
        userName: "borra-img",
        rol: "barbero",
        barbero: barbero._id,
      });

      const respuesta = await request(app)
        .delete(
          `/api/barberos/${barbero._id}/servicios/${servicio._id}/imagenes/una.webp`
        )
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(200);
      const override = await PrecioBarberoModel.findOne({ barbero: barbero._id });
      expect(override.imagenes).toEqual(["otra.webp"]);
    });

    it("no deja borrar una foto que no es de ese barbero", async () => {
      const propio = await crearBarbero("Mio Borra");
      const ajeno = await crearBarbero("Suyo Borra");
      const servicio = await crearServicio("Corte", 50000);

      await PrecioBarberoModel.create({
        barbero: propio._id,
        servicio: servicio._id,
        precio: 50000,
        imagenes: ["mia.webp"],
      });
      await PrecioBarberoModel.create({
        barbero: ajeno._id,
        servicio: servicio._id,
        precio: 50000,
        imagenes: ["ajena.webp"],
      });

      const { cookie } = await usuarioConSesion({
        userName: "borra-ajena",
        rol: "barbero",
        barbero: propio._id,
      });

      // Su propio id en la URL, pero el nombre de archivo del otro.
      const respuesta = await request(app)
        .delete(
          `/api/barberos/${propio._id}/servicios/${servicio._id}/imagenes/ajena.webp`
        )
        .set("Cookie", cookie);

      expect(respuesta.status).toBe(404);
      const delOtro = await PrecioBarberoModel.findOne({ barbero: ajeno._id });
      expect(delOtro.imagenes).toEqual(["ajena.webp"]);
    });
  });
});
