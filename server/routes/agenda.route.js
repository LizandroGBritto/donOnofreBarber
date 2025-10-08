const express = require("express");
const { authenticate } = require("../config/jwt.config");

const AgendaController = require("../controllers/agenda.controller");
const AgendaRouter = express.Router();

AgendaRouter.get("/", AgendaController.getAllAgendas);
AgendaRouter.get(
  "/disponibilidad",
  AgendaController.getTurnosConDisponibilidad
);

// ✅ RUTA PARA DISPONIBILIDAD GENERAL (sin barberos específicos)
AgendaRouter.get(
  "/disponibilidad/:fecha",
  AgendaController.getDisponibilidadPorFecha
);

// ✅ NUEVA RUTA ESPECÍFICA PARA DISPONIBILIDAD POR BARBERO
AgendaRouter.get(
  "/disponibilidad-barberos/:fecha",
  AgendaController.getDisponibilidadPorBarbero
);

AgendaRouter.get("/landing", AgendaController.getTurnosLanding);
AgendaRouter.get("/horarios-semanas", AgendaController.getHorariosYSemanas);

// Nuevas rutas para estadísticas y generación de turnos
AgendaRouter.get("/diagnostico", AgendaController.diagnosticoHorarios);
AgendaRouter.delete(
  "/limpiar-duplicados",
  AgendaController.limpiarTurnosDuplicados
);
AgendaRouter.delete(
  "/limpiar-barberos-excluidos",
  AgendaController.limpiarTurnosBarberosExcluidos
);
AgendaRouter.delete("/eliminar-hoy", AgendaController.eliminarTurnosHoy);
AgendaRouter.post("/regenerar-fecha", AgendaController.regenerarTurnosFecha);
AgendaRouter.post(
  "/regenerar-por-horarios",
  AgendaController.regenerarAgendaPorHorarios
);
AgendaRouter.get("/dashboard/estadisticas", AgendaController.getEstadisticas);
AgendaRouter.post("/generar-turnos", AgendaController.generarTurnosMes);

// Nueva ruta para migración multi-barbero
AgendaRouter.post(
  "/migrar-multi-barbero",
  AgendaController.migrarAgendaMultiBarbero
);

// Ruta para reservar con barbero específico
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
