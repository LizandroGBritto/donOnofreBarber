const express = require("express");
const { authenticate } = require("../config/jwt.config");

const AgendaController = require("../controllers/agenda.controller");
const AgendaRouter = express.Router();

AgendaRouter.get("/", AgendaController.getAllAgendas);

// Nuevas rutas para estadísticas y generación de turnos
AgendaRouter.get("/diagnostico", AgendaController.diagnosticoHorarios);
AgendaRouter.delete(
  "/limpiar-duplicados",
  AgendaController.limpiarTurnosDuplicados
);
AgendaRouter.delete("/eliminar-hoy", AgendaController.eliminarTurnosHoy);
AgendaRouter.post("/regenerar-fecha", AgendaController.regenerarTurnosFecha);
AgendaRouter.post(
  "/regenerar-por-horarios",
  AgendaController.regenerarAgendaPorHorarios
);
AgendaRouter.get("/dashboard/estadisticas", AgendaController.getEstadisticas);
AgendaRouter.post("/generar-turnos", AgendaController.generarTurnosMes);

// Nuevas rutas para manejo de barberos
AgendaRouter.get(
  "/disponibilidad/:fecha",
  AgendaController.getDisponibilidadPorBarbero
);
AgendaRouter.post(
  "/reservar-con-barbero",
  AgendaController.reservarTurnoConBarbero
);

AgendaRouter.get("/:id", AgendaController.getOneAgenda);

AgendaRouter.post("/new", AgendaController.createAgenda);

AgendaRouter.put("/:id", AgendaController.updateOneAgendaById);

AgendaRouter.delete("/:id", AgendaController.deleteOneAgendaById);

// Nueva ruta para eliminar una agenda y crear una nueva con los mismos datos de día y hora
AgendaRouter.post(
  "/delete-and-create/:id",
  AgendaController.deleteAndCreateNewAgenda
);

module.exports = AgendaRouter;
