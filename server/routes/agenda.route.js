const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");

const AgendaController = require("../controllers/agenda.controller");
const AgendaRouter = express.Router();

AgendaRouter.get("/", authenticate, AgendaController.getAllAgendas);
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

// Ruta para verificar si un cliente ya tiene un turno abierto
AgendaRouter.get(
  "/verificar-turno/:numeroCliente",
  AgendaController.verificarTurnoExistente
);

// Nuevas rutas para estadísticas y generación de turnos (administrativas)
AgendaRouter.delete(
  "/limpiar-duplicados",
  authenticate,
  AgendaController.limpiarTurnosDuplicados
);
AgendaRouter.delete(
  "/limpiar-barberos-excluidos",
  authenticate,
  AgendaController.limpiarTurnosBarberosExcluidos
);
AgendaRouter.delete(
  "/eliminar-hoy",
  authenticate,
  AgendaController.eliminarTurnosHoy
);
AgendaRouter.post(
  "/regenerar-fecha",
  authenticate,
  AgendaController.regenerarTurnosFecha
);
AgendaRouter.post(
  "/regenerar-por-horarios",
  authenticate,
  AgendaController.regenerarAgendaPorHorarios
);
AgendaRouter.post(
  "/limpiar-duplicados-nuevos",
  authenticate,
  AgendaController.limpiarDuplicados
);
AgendaRouter.get(
  "/dashboard/estadisticas",
  authenticate,
  AgendaController.getEstadisticas
);
AgendaRouter.post(
  "/generar-turnos",
  authenticate,
  AgendaController.generarTurnosMes
);

// Nueva ruta para migración multi-barbero (administrativa)
AgendaRouter.post(
  "/migrar-multi-barbero",
  authenticate,
  AgendaController.migrarAgendaMultiBarbero
);

// Ruta para reservar con barbero específico
AgendaRouter.post(
  "/reservar-con-barbero",
  AgendaController.reservarTurnoConBarbero
);

// Públicas y restringidas por token (no requieren login, pero sí el
// editToken del turno): permiten a un cliente editar/liberar su propio
// turno desde el link que recibió por WhatsApp.
AgendaRouter.put(
  "/editar-mi-turno/:id",
  AgendaController.editarMiTurno
);
AgendaRouter.post(
  "/liberar-mi-turno/:id",
  AgendaController.liberarMiTurno
);

// Admin: (re)generar el token de edición de un turno (turnos viejos sin
// token, o para invalidar un link ya compartido).
AgendaRouter.post(
  "/:id/generar-token",
  authenticate,
  AgendaController.generarTokenEdicion
);

// Pública: la necesita la página de edición de turno sin login (/editar-turno/:id)
AgendaRouter.get("/:id", AgendaController.getOneAgenda);

AgendaRouter.post("/new", authenticate, AgendaController.createAgenda);

// PUT /:id genérico: solo admin. La edición pública de turnos ahora pasa
// por /editar-mi-turno/:id (restringido por token), no por esta ruta.
AgendaRouter.put("/:id", authenticate, AgendaController.updateOneAgendaById);

AgendaRouter.delete("/:id", authenticate, AgendaController.deleteOneAgendaById);

// Nueva ruta para eliminar una agenda y crear una nueva con los mismos datos de día y hora
AgendaRouter.post(
  "/delete-and-create/:id",
  authenticate,
  AgendaController.deleteAndCreateNewAgenda
);

module.exports = AgendaRouter;
