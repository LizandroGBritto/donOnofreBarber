const jwt = require("jsonwebtoken");
const { UserModel } = require("../models/user.model");

/**
 * Verifica la cookie de sesión y deja en `req.user` el usuario actual leído de
 * la base: `{ _id, userName, rol, barbero }`.
 *
 * Se relee de la base en cada request (y no se confía en el payload del JWT)
 * por dos motivos:
 *   1. Las cookies vigentes duran ~10 días y se firmaron con {_id, userName}.
 *      Si el rol viviera en el token, un usuario ya logueado no tendría rol
 *      hasta re-loguearse.
 *   2. Cambiarle el rol o los permisos a alguien surte efecto en el próximo
 *      request, no cuando le venza la cookie.
 * El costo es una query por request, despreciable a esta escala.
 *
 * Se usa `.lean()` a propósito: con un documento hidratado, Mongoose rellena
 * el default del schema (`rol: "barbero"`) para los usuarios viejos que no
 * tienen el campo, y el fallback de compatibilidad de abajo nunca se
 * dispararía — dejaría a los admin existentes sin panel.
 */
const authenticate = async (req, res, next) => {
  const token = req.cookies.usertoken;

  if (!token) {
    return res.status(401).json({ msg: "Token no proporcionado" });
  }

  let decoded;
  try {
    const secret = process.env.JWT_SECRET || "secretKey";
    decoded = jwt.verify(token, secret);
  } catch (error) {
    return res.status(401).json({ msg: "Token inválido" });
  }

  try {
    const usuario = await UserModel.findById(decoded._id)
      .select("_id userName rol barbero")
      .lean();

    if (!usuario) {
      // El usuario fue borrado pero su cookie sigue viva.
      return res.status(401).json({ msg: "Sesión inválida" });
    }

    req.user = {
      _id: usuario._id,
      userName: usuario.userName,
      // Compatibilidad: un usuario anterior a la migración no tiene `rol`.
      // Se lo trata como admin para no dejar a nadie afuera del panel.
      // Quitar este fallback una vez corrida la migración en producción.
      rol: usuario.rol || "admin",
      barbero: usuario.barbero || null,
    };

    if (!usuario.rol) {
      console.warn(
        `[auth] Usuario "${usuario.userName}" sin campo "rol": tratado como admin. ` +
          `Corré scripts/migrarRolesUsuarios.js.`
      );
    }

    next();
  } catch (error) {
    console.error("Error verificando la sesión:", error);
    return res.status(500).json({ msg: "Error verificando la sesión" });
  }
};

/** Solo admin. Usar siempre después de `authenticate`. */
const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== "admin") {
    return res
      .status(403)
      .json({ msg: "Requiere permisos de administrador" });
  }
  next();
};

/**
 * Permite pasar si es admin, o si es el barbero dueño del recurso.
 *
 * `obtenerBarberoId(req)` devuelve el id del barbero al que pertenece lo que se
 * está tocando (normalmente `req.params.id`).
 */
const requireBarberoPropio =
  (obtenerBarberoId = (req) => req.params.id) =>
  (req, res, next) => {
    if (req.user?.rol === "admin") return next();

    const idRecurso = String(obtenerBarberoId(req) || "");
    const idPropio = String(req.user?.barbero || "");

    if (!idPropio || idRecurso !== idPropio) {
      return res
        .status(403)
        .json({ msg: "Solo podés gestionar tu propio perfil de barbero" });
    }

    next();
  };

module.exports = { authenticate, requireAdmin, requireBarberoPropio };
