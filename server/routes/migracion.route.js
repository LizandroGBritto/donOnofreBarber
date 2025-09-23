const express = require("express");
const migracionController = require("../controllers/migracion.controller");

const MigracionRouter = express.Router();

// Rutas temporales para migración
MigracionRouter.post("/migrar-datos", migracionController.migrarDatosAntiguos);
MigracionRouter.post(
  "/crear-servicios-defecto",
  migracionController.crearServiciosDefecto
);
MigracionRouter.post(
  "/crear-horarios-defecto",
  migracionController.crearHorariosDefecto
);

module.exports = MigracionRouter;
