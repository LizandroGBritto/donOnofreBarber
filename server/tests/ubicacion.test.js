const request = require("supertest");
const app = require("../app");
const Ubicacion = require("../models/ubicacion.model");
const { usuarioConSesion } = require("./helpers/auth");

const BASE = {
  direccion: "Gral. Artigas c/ Padre Kreusser",
  enlaceMaps: "https://maps.app.goo.gl/abc",
};

describe("ubicación: coordenadas para el mapa de la landing", () => {
  let cookie;

  beforeEach(async () => {
    ({ cookie } = await usuarioConSesion({ userName: "admin", rol: "admin" }));
  });

  it("guarda las coordenadas y la ruta pública las devuelve", async () => {
    const creada = await request(app)
      .post("/api/ubicacion")
      .set("Cookie", cookie)
      .send({ ...BASE, coordenadas: { lat: "-27.33", lng: "-55.87" } });

    expect(creada.status).toBe(201);

    const publica = await request(app).get("/api/ubicacion");
    expect(publica.status).toBe(200);
    expect(publica.body.ubicacion.coordenadas).toEqual({
      lat: -27.33,
      lng: -55.87,
    });
  });

  it("rechaza media coordenada", async () => {
    const res = await request(app)
      .post("/api/ubicacion")
      .set("Cookie", cookie)
      .send({ ...BASE, coordenadas: { lat: "-27.33", lng: "" } });

    expect(res.status).toBe(400);
  });

  it("rechaza coordenadas fuera de rango", async () => {
    const res = await request(app)
      .post("/api/ubicacion")
      .set("Cookie", cookie)
      .send({ ...BASE, coordenadas: { lat: 120, lng: -55 } });

    expect(res.status).toBe(400);
  });

  it("una ubicación nueva inválida no deja el sitio sin ubicación activa", async () => {
    await Ubicacion.create({ ...BASE, estado: "activo" });

    const res = await request(app)
      .post("/api/ubicacion")
      .set("Cookie", cookie)
      .send({ direccion: "", enlaceMaps: "no-es-url" });

    expect(res.status).toBe(400);
    const publica = await request(app).get("/api/ubicacion");
    expect(publica.status).toBe(200);
    expect(publica.body.ubicacion.direccion).toBe(BASE.direccion);
  });

  it("vaciar las coordenadas al editar las borra; no mandarlas las conserva", async () => {
    const existente = await Ubicacion.create({
      ...BASE,
      coordenadas: { lat: -27.33, lng: -55.87 },
    });

    const sinTocar = await request(app)
      .put(`/api/ubicacion/${existente._id}`)
      .set("Cookie", cookie)
      .send({ ...BASE, direccion: "Otra dirección" });
    expect(sinTocar.status).toBe(200);
    expect(sinTocar.body.ubicacion.coordenadas).toEqual({
      lat: -27.33,
      lng: -55.87,
    });

    const vaciadas = await request(app)
      .put(`/api/ubicacion/${existente._id}`)
      .set("Cookie", cookie)
      .send({ ...BASE, coordenadas: { lat: "", lng: "" } });
    expect(vaciadas.status).toBe(200);
    expect(vaciadas.body.ubicacion.coordenadas?.lat).toBeUndefined();
  });
});
