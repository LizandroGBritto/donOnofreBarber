const request = require("supertest");
const app = require("../app");
const { usuarioConSesion } = require("./helpers/auth");

// Smoke del arnés: verifica que la app se puede montar sin arrancar el
// servidor, que la base en memoria responde, y que el helper de sesión sirve
// (de eso dependen todos los tests de los sprints siguientes).
describe("arnés de tests", () => {
  it("monta la app y responde una ruta pública", async () => {
    const respuesta = await request(app).get("/api/servicios");

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([]);
  });

  it("rechaza una ruta protegida sin cookie de sesión", async () => {
    const respuesta = await request(app).get("/api/user/");

    expect(respuesta.status).toBe(401);
  });

  it("permite entrar a una ruta protegida con el helper de sesión", async () => {
    // Rol explícito: /api/user/ pasó a ser solo-admin en el Sprint 1, y el
    // default del modelo es "barbero".
    const { cookie } = await usuarioConSesion({
      userName: "admin-smoke",
      rol: "admin",
    });

    const respuesta = await request(app).get("/api/user/").set("Cookie", cookie);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toHaveLength(1);
    expect(respuesta.body[0].userName).toBe("admin-smoke");
    // El hash de la contraseña nunca sale en la respuesta.
    expect(respuesta.body[0].password).toBeUndefined();
  });

  it("limpia la base entre tests", async () => {
    const respuesta = await request(app).get("/api/servicios");

    // Si el afterEach no limpiara, el usuario del test anterior seguiría acá.
    const { UserModel } = require("../models/user.model");
    expect(await UserModel.countDocuments()).toBe(0);
    expect(respuesta.body).toEqual([]);
  });
});
