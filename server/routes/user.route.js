const express = require("express");
const UserController = require("../controllers/user.controller");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/auth.middleware");
const { loginLimiter } = require("../middleware/rateLimit.middleware");

const UserRouter = express.Router();

/**
 * Admin, o el propio usuario sobre sí mismo.
 *
 * Existe para que un barbero pueda cambiarse la contraseña sin necesitar al
 * admin, pero sin poder tocar la cuenta de nadie más. Ojo: updateUser también
 * acepta `userName`, así que un barbero puede renombrarse; eso es aceptable
 * (no escala privilegios). Lo que NO puede es cambiarse el `rol` ni el
 * `barbero`, porque updateUser no los toma del body.
 */
const adminOPropio = (req, res, next) => {
  if (req.user?.rol === "admin") return next();
  if (String(req.user?._id) === String(req.params.id)) return next();
  return res
    .status(403)
    .json({ msg: "Solo podés modificar tu propio usuario" });
};

// Rutas públicas.
// Este router se monta en /api/auth y en /api/user, así que el limiter cubre
// las dos rutas de login que quedan expuestas.
UserRouter.post("/login", loginLimiter, UserController.login);
UserRouter.post("/logout", UserController.logout);

// Quién es el usuario de la sesión. Cualquier usuario logueado puede pedir lo
// suyo; el panel lo usa para saber qué secciones mostrar sin depender de lo
// que tenga guardado el navegador.
UserRouter.get("/me", authenticate, UserController.me);

// Alta y baja de usuarios: solo admin.
UserRouter.post("/register", authenticate, requireAdmin, UserController.register);
UserRouter.get("/", authenticate, requireAdmin, UserController.getAllUsers);
UserRouter.delete("/:id", authenticate, requireAdmin, UserController.deleteUser);

// Ver y editar: admin sobre cualquiera, barbero solo sobre sí mismo.
UserRouter.get("/:id", authenticate, adminOPropio, UserController.getOneUser);
UserRouter.put("/:id", authenticate, adminOPropio, UserController.updateUser);

module.exports = UserRouter;
