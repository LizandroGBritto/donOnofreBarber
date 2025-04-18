const express = require("express");
const { authenticate } = require("../config/jwt.config");

const AgendaController = require("../controllers/agenda.controller");
const AgendaRouter = express.Router();

AgendaRouter.get("/", AgendaController.getAllAgendas);

AgendaRouter.get("/:id", AgendaController.getOneAgenda);

AgendaRouter.post("/new", AgendaController.createAgenda);

AgendaRouter.put("/:id", AgendaController.updateOneAgendaById);

AgendaRouter.delete("/:id", AgendaController.deleteOneAgendaById);

// Nueva ruta para eliminar una agenda y crear una nueva con los mismos datos de día y hora
AgendaRouter.post("/delete-and-create/:id", AgendaController.deleteAndCreateNewAgenda);

module.exports = AgendaRouter;