const express = require("express");
const horarioController = require("../controllers/horario.controller");

const HorarioRouter = express.Router();

// Rutas para horarios
HorarioRouter.get("/", horarioController.getAllHorarios);
HorarioRouter.get("/dia/:dia", horarioController.getHorarioPorDia);
HorarioRouter.get("/slots", horarioController.generateSlots); // ?fecha=YYYY-MM-DD
HorarioRouter.post("/", horarioController.createOrUpdateHorario);
HorarioRouter.post("/excepcion", horarioController.addExcepcion);
HorarioRouter.delete(
  "/excepcion/:diaSemana/:fecha",
  horarioController.removeExcepcion
);
HorarioRouter.patch("/:diaSemana/toggle", horarioController.toggleDia);

module.exports = HorarioRouter;
