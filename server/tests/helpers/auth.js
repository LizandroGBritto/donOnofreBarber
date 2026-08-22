const request = require("supertest");
const app = require("../../app");
const { UserModel } = require("../../models/user.model");

const PASSWORD_POR_DEFECTO = "password123";

/**
 * Crea un usuario directamente en la base (pasa por el hash del pre-save).
 * `extra` permite setear campos que todavía no existen en el modelo (rol,
 * barbero) sin tener que tocar este helper en cada sprint.
 */
async function crearUsuario({
  userName = "tester",
  password = PASSWORD_POR_DEFECTO,
  ...extra
} = {}) {
  const usuario = new UserModel({
    userName,
    password,
    confirmPassword: password,
    ...extra,
  });
  await usuario.save();
  return usuario;
}

/** Hace login y devuelve la cookie `usertoken` lista para usar con `.set("Cookie", ...)`. */
async function obtenerCookie({
  userName = "tester",
  password = PASSWORD_POR_DEFECTO,
} = {}) {
  const respuesta = await request(app)
    .post("/api/auth/login")
    .send({ userName, password });

  if (respuesta.status !== 200) {
    throw new Error(
      `Login fallido para "${userName}": ${respuesta.status} ${JSON.stringify(
        respuesta.body
      )}`
    );
  }

  const cookies = respuesta.headers["set-cookie"] || [];
  const token = cookies.find((c) => c.startsWith("usertoken="));

  if (!token) {
    throw new Error(`El login de "${userName}" no devolvió cookie usertoken`);
  }

  return token;
}

/** Atajo: crea el usuario y devuelve `{ usuario, cookie }`. */
async function usuarioConSesion(opciones = {}) {
  const usuario = await crearUsuario(opciones);
  const cookie = await obtenerCookie(opciones);
  return { usuario, cookie };
}

module.exports = {
  PASSWORD_POR_DEFECTO,
  crearUsuario,
  obtenerCookie,
  usuarioConSesion,
};
