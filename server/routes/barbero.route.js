const express = require("express");
const BarberoController = require("../controllers/barbero.controller");

const BarberoRouter = express.Router();

// Rutas para barberos

// Obtener todos los barberos
BarberoRouter.get("/", BarberoController.getAllBarberos);

// Obtener barberos activos
BarberoRouter.get("/activos", BarberoController.getBarberosActivos);

// Obtener un barbero por ID
BarberoRouter.get("/:id", BarberoController.getOneBarbero);

// Crear nuevo barbero (con multer para imágenes)
BarberoRouter.post(
  "/",
  BarberoController.upload.fields([
    { name: "foto", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  BarberoController.createBarbero
);

// Actualizar barbero (con multer para imágenes)
BarberoRouter.put(
  "/:id",
  BarberoController.upload.fields([
    { name: "foto", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  BarberoController.updateBarbero
);

// Eliminar barbero
BarberoRouter.delete("/:id", BarberoController.deleteBarbero);

// Cambiar estado activo/inactivo
BarberoRouter.patch("/:id/estado", BarberoController.toggleEstadoBarbero);

module.exports = BarberoRouter;
