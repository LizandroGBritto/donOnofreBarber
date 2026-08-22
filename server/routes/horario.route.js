const express = require("express");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/auth.middleware");
const horarioController = require("../controllers/horario.controller");

const HorarioRouter = express.Router();

// Estos son los horarios del LOCAL (los que en el modelo tienen barbero: null).
// Solo el admin los toca. Los horarios propios de cada barbero viven en
// /api/barberos/:id/horarios (ver Sprint 3 del plan).

// Pública: la landing arma la grilla con esto.
HorarioRouter.get("/", horarioController.getAllHorarios);

// Administrativas
HorarioRouter.get(
  "/:id",
  authenticate,
  requireAdmin,
  horarioController.getHorario
);
HorarioRouter.post(
  "/",
  authenticate,
  requireAdmin,
  horarioController.createHorario
);
HorarioRouter.put(
  "/:id",
  authenticate,
  requireAdmin,
  horarioController.updateHorario
);
HorarioRouter.delete(
  "/:id",
  authenticate,
  requireAdmin,
  horarioController.deleteHorario
);
HorarioRouter.patch(
  "/:id/estado",
  authenticate,
  requireAdmin,
  horarioController.toggleEstado
);

module.exports = HorarioRouter;
