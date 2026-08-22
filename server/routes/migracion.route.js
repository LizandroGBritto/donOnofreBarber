const express = require("express");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/auth.middleware");
const migracionController = require("../controllers/migracion.controller");

const MigracionRouter = express.Router();

// Rutas temporales para migración. Reescriben documentos en masa: solo admin.
MigracionRouter.post(
  "/migrar-datos",
  authenticate,
  requireAdmin,
  migracionController.migrarDatosAntiguos
);
MigracionRouter.post(
  "/crear-servicios-defecto",
  authenticate,
  requireAdmin,
  migracionController.crearServiciosDefecto
);

module.exports = MigracionRouter;
