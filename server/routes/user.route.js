const express = require("express");
const UserController = require("../controllers/user.controller");
const { authenticate } = require("../middleware/auth.middleware");

const UserRouter = express.Router();

// Rutas públicas
UserRouter.post("/login", UserController.login);
UserRouter.post("/logout", UserController.logout);

// Rutas protegidas (requieren autenticación)
UserRouter.post("/register", authenticate, UserController.register);
UserRouter.get("/", authenticate, UserController.getAllUsers);
UserRouter.get("/:id", authenticate, UserController.getOneUser);
UserRouter.put("/:id", authenticate, UserController.updateUser);
UserRouter.delete("/:id", authenticate, UserController.deleteUser);

module.exports = UserRouter;
