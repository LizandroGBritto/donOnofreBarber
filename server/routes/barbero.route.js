const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const BarberoController = require("../controllers/barbero.controller");

const BarberoRouter = express.Router();

// Rutas para barberos

// Obtener todos los barberos
BarberoRouter.get("/", BarberoController.getAllBarberos);

// Obtener barberos activos
BarberoRouter.get("/activos", BarberoController.getBarberosActivos);

// Obtener barberos incluidos en agenda
BarberoRouter.get("/agenda", BarberoController.getBarberosParaAgenda);

// Obtener un barbero por ID (administrativo)
BarberoRouter.get("/:id", authenticate, BarberoController.getOneBarbero);

// Crear nuevo barbero (con multer para imágenes)
BarberoRouter.post(
  "/",
  authenticate,
  BarberoController.upload.fields([
    { name: "foto", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  BarberoController.createBarbero
);

// Actualizar barbero (con multer para imágenes)
BarberoRouter.put(
  "/:id",
  authenticate,
  BarberoController.upload.fields([
    { name: "foto", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  BarberoController.updateBarbero
);

// Eliminar barbero
BarberoRouter.delete("/:id", authenticate, BarberoController.deleteBarbero);

// Cambiar estado activo/inactivo
BarberoRouter.patch(
  "/:id/estado",
  authenticate,
  BarberoController.toggleEstadoBarbero
);

module.exports = BarberoRouter;
