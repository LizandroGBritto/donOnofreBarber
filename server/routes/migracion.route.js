const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const migracionController = require("../controllers/migracion.controller");

const MigracionRouter = express.Router();

// Rutas temporales para migración
MigracionRouter.post(
  "/migrar-datos",
  authenticate,
  migracionController.migrarDatosAntiguos
);
MigracionRouter.post(
  "/crear-servicios-defecto",
  authenticate,
  migracionController.crearServiciosDefecto
);

module.exports = MigracionRouter;
