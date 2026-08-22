const mongoose = require("mongoose");
const { UserModel } = require("../models/user.model");
const BarberoModel = require("../models/barbero.model");
const { migrar, normalizar } = require("../scripts/migrarRolesUsuarios");
const { crearUsuario } = require("./helpers/auth");

/** Inserta un usuario y le saca `rol`/`barbero` con el driver crudo, para
 *  reproducir un documento anterior a la migración (Mongoose no deja crear uno
 *  sin el campo porque el schema tiene default). */
const crearUsuarioLegacy = async (userName) => {
  const usuario = await crearUsuario({ userName });
  await mongoose.connection
    .collection("users")
    .updateOne({ _id: usuario._id }, { $unset: { rol: "", barbero: "" } });
  return usuario;
};

const leerCrudo = (id) =>
  mongoose.connection.collection("users").findOne({ _id: id });

const crearBarbero = (nombre) =>
  BarberoModel.create({
    nombre,
    descripcion: "Barbero de prueba",
    foto: "foto.webp",
  });

// Silencia el ruido del script durante los tests.
beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("migración de roles", () => {
  describe("normalización de nombres", () => {
    it("hace coincidir el userName con el nombre del barbero", () => {
      expect(normalizar("LisandroAlonzo")).toBe(normalizar("Lisandro Alonzo"));
      expect(normalizar("EliasLugo")).toBe(normalizar("Elias Lugo"));
    });

    it("ignora tildes y mayúsculas", () => {
      expect(normalizar("JoseMaria")).toBe(normalizar("José María"));
    });

    it("no confunde barberos distintos", () => {
      expect(normalizar("Juan Perez")).not.toBe(normalizar("Juan Gomez"));
    });
  });

  it("los usuarios legacy quedan como admin, no como barbero", async () => {
    const usuario = await crearUsuarioLegacy("viejo");

    // Precondición: el documento realmente no tiene el campo.
    expect((await leerCrudo(usuario._id)).rol).toBeUndefined();

    await migrar({ ejecutar: true });

    expect((await leerCrudo(usuario._id)).rol).toBe("admin");
  });

  it("vincula por nombre normalizado", async () => {
    const barbero = await crearBarbero("Lisandro Alonzo");
    const usuario = await crearUsuarioLegacy("LisandroAlonzo");

    await migrar({ ejecutar: true });

    const despues = await leerCrudo(usuario._id);
    expect(String(despues.barbero)).toBe(String(barbero._id));
  });

  it("no vincula si ningún barbero coincide", async () => {
    await crearBarbero("Lisandro Alonzo");
    const usuario = await crearUsuarioLegacy("ContadorExterno");

    await migrar({ ejecutar: true });

    expect((await leerCrudo(usuario._id)).barbero ?? null).toBeNull();
  });

  it("no le roba el barbero a un usuario que ya lo tiene", async () => {
    const barbero = await crearBarbero("Lisandro Alonzo");
    const primero = await crearUsuario({
      userName: "dueño",
      rol: "barbero",
      barbero: barbero._id,
    });
    const segundo = await crearUsuarioLegacy("LisandroAlonzo");

    await migrar({ ejecutar: true });

    expect(String((await leerCrudo(primero._id)).barbero)).toBe(
      String(barbero._id)
    );
    expect((await leerCrudo(segundo._id)).barbero ?? null).toBeNull();
  });

  it("en simulacro no escribe nada", async () => {
    const usuario = await crearUsuarioLegacy("intacto");

    await migrar({ ejecutar: false });

    expect((await leerCrudo(usuario._id)).rol).toBeUndefined();
  });

  it("es idempotente", async () => {
    await crearBarbero("Lisandro Alonzo");
    const usuario = await crearUsuarioLegacy("LisandroAlonzo");

    await migrar({ ejecutar: true });
    const primera = await leerCrudo(usuario._id);

    await migrar({ ejecutar: true });
    const segunda = await leerCrudo(usuario._id);

    expect(segunda.rol).toBe(primera.rol);
    expect(String(segunda.barbero)).toBe(String(primera.barbero));
  });

  describe("--degradar-vinculados", () => {
    it("baja a barbero solo a los que quedaron vinculados", async () => {
      await crearBarbero("Lisandro Alonzo");
      const barberoUser = await crearUsuarioLegacy("LisandroAlonzo");
      const adminUser = await crearUsuarioLegacy("admin");

      await migrar({ ejecutar: true, degradarVinculados: true });

      expect((await leerCrudo(barberoUser._id)).rol).toBe("barbero");
      // El admin no tiene barbero vinculado: se queda como admin.
      expect((await leerCrudo(adminUser._id)).rol).toBe("admin");
    });

    it("sin el flag, nadie se degrada", async () => {
      await crearBarbero("Lisandro Alonzo");
      const usuario = await crearUsuarioLegacy("LisandroAlonzo");

      await migrar({ ejecutar: true });

      expect((await leerCrudo(usuario._id)).rol).toBe("admin");
    });
  });
});
