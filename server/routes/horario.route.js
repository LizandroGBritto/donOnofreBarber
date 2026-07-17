const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const horarioController = require("../controllers/horario.controller");

const HorarioRouter = express.Router();

// Rutas para horarios
HorarioRouter.get("/", horarioController.getAllHorarios);
HorarioRouter.get("/:id", authenticate, horarioController.getHorario);
HorarioRouter.post("/", authenticate, horarioController.createHorario);
HorarioRouter.put("/:id", authenticate, horarioController.updateHorario);
HorarioRouter.delete("/:id", authenticate, horarioController.deleteHorario);
HorarioRouter.patch(
  "/:id/estado",
  authenticate,
  horarioController.toggleEstado
);

module.exports = HorarioRouter;
