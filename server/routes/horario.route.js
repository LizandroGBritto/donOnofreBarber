const express = require("express");
const horarioController = require("../controllers/horario.controller");

const HorarioRouter = express.Router();

// Rutas para horarios
HorarioRouter.get("/", horarioController.getAllHorarios);
HorarioRouter.get("/:id", horarioController.getHorario);
HorarioRouter.post("/", horarioController.createHorario);
HorarioRouter.put("/:id", horarioController.updateHorario);
HorarioRouter.delete("/:id", horarioController.deleteHorario);
HorarioRouter.patch("/:id/estado", horarioController.toggleEstado);

module.exports = HorarioRouter;
