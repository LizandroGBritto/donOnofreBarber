const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const config = require("../config/app.config");
const { crearUsuario, PASSWORD_POR_DEFECTO } = require("./helpers/auth");

const leerCookieToken = (respuesta) => {
  const cookies = respuesta.headers["set-cookie"] || [];
  return cookies.find((c) => c.startsWith("usertoken=")) || null;
};

describe("seguridad del login", () => {
  describe("no permite enumerar usuarios", () => {
    it("responde igual con usuario inexistente que con contraseña incorrecta", async () => {
      await crearUsuario({ userName: "existe" });

      const usuarioInexistente = await request(app)
        .post("/api/auth/login")
        .send({ userName: "no-existe", password: PASSWORD_POR_DEFECTO });

      const passwordIncorrecta = await request(app)
        .post("/api/auth/login")
        .send({ userName: "existe", password: "otra-password-cualquiera" });

      // Mismo status y mismo cuerpo: desde afuera los dos casos son
      // indistinguibles, que es justamente el punto.
      expect(usuarioInexistente.status).toBe(passwordIncorrecta.status);
      expect(usuarioInexistente.body).toEqual(passwordIncorrecta.body);

      // Y el mensaje no nombra cuál de los dos falló.
      const msg = usuarioInexistente.body.msg.toLowerCase();
      expect(msg).not.toMatch(/no encontrado|inexistente/);
      expect(msg).not.toMatch(/contraseña incorrecta|password incorrect/);
    });

    it("ninguna respuesta de login fallido filtra si el usuario existe", async () => {
      await crearUsuario({ userName: "existe" });

      const respuesta = await request(app)
        .post("/api/auth/login")
        .send({ userName: "existe", password: "mal" });

      expect(respuesta.body).not.toHaveProperty("user");
      expect(JSON.stringify(respuesta.body)).not.toContain("existe");
      expect(leerCookieToken(respuesta)).toBeNull();
    });
  });

  describe("expiración de la sesión", () => {
    // 250h es una decisión de producto deliberada (panel de 3 personas desde
    // el celular, que no quieren re-loguearse). El test fija el valor para que
    // un cambio accidental se note.
    it("la config declara 250 horas y el valor coincide", () => {
      expect(config.security.sessionExpiry).toBe(250 * 60 * 60 * 1000);
    });

    it("el JWT se firma CON expiración", async () => {
      await crearUsuario({ userName: "conexp" });

      const respuesta = await request(app)
        .post("/api/auth/login")
        .send({ userName: "conexp", password: PASSWORD_POR_DEFECTO });

      expect(respuesta.status).toBe(200);

      const cookie = leerCookieToken(respuesta);
      const token = cookie.split(";")[0].replace("usertoken=", "");
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      // Antes se firmaba sin expiresIn: el token no vencía nunca.
      expect(payload.exp).toBeDefined();

      const duracionSegundos = payload.exp - payload.iat;
      expect(duracionSegundos).toBe(config.security.sessionExpiry / 1000);
    });

    it("la cookie vence junto con el token, no en otro momento", async () => {
      await crearUsuario({ userName: "cookieexp" });

      const respuesta = await request(app)
        .post("/api/auth/login")
        .send({ userName: "cookieexp", password: PASSWORD_POR_DEFECTO });

      const cookie = leerCookieToken(respuesta);
      const expiresStr = /expires=([^;]+)/i.exec(cookie)[1];
      const horasHastaVencer =
        (new Date(expiresStr).getTime() - Date.now()) / (60 * 60 * 1000);
      const horasEsperadas = config.security.sessionExpiry / (60 * 60 * 1000);

      // Lo que importa no es el número absoluto sino que la cookie salga de la
      // config y no de un literal suelto en el controller, como antes.
      expect(horasHastaVencer).toBeGreaterThan(horasEsperadas - 0.5);
      expect(horasHastaVencer).toBeLessThan(horasEsperadas + 0.5);
    });

    it("un token vencido no sirve para entrar", async () => {
      const usuario = await crearUsuario({ userName: "vencido" });

      const tokenVencido = jwt.sign(
        { _id: usuario._id.toString(), userName: usuario.userName },
        process.env.JWT_SECRET,
        { expiresIn: -10 } // ya venció
      );

      const respuesta = await request(app)
        .get("/api/user/")
        .set("Cookie", `usertoken=${tokenVencido}`);

      expect(respuesta.status).toBe(401);
    });
  });

  describe("rate limiting a nivel app", () => {
    // El limiter se saltea en tests salvo que se pida explícitamente, para no
    // tener que contar requests en el resto de la suite.
    beforeEach(() => {
      process.env.TEST_RATE_LIMIT = "1";
    });
    afterEach(() => {
      delete process.env.TEST_RATE_LIMIT;
    });

    it("corta después de suficientes intentos fallidos desde la misma IP", async () => {
      await crearUsuario({ userName: "victima" });

      let bloqueado = null;
      for (let intento = 0; intento < 25; intento++) {
        const respuesta = await request(app)
          .post("/api/auth/login")
          .send({ userName: "victima", password: "mal" });

        if (respuesta.status === 429) {
          bloqueado = intento + 1;
          break;
        }
      }

      expect(bloqueado).not.toBeNull();
      expect(bloqueado).toBeLessThanOrEqual(21);
    });
  });
});
