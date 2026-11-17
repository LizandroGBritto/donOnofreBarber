const express = require("express");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/auth.middleware");
const { requireTurnoPropio } = require("../middleware/turnoPropio.middleware");

const AgendaController = require("../controllers/agenda.controller");
const AgendaRouter = express.Router();

// Accesible para cualquier usuario logueado a propósito: un barbero necesita
// ver sus turnos. El filtrado por barbero se hace del lado del servidor en el
// Sprint 5 — hasta entonces un barbero ve todos.
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

// Operaciones destructivas y de generación masiva: solo admin.
// Borran o recrean turnos de TODOS los barberos, así que no puede dispararlas
// un barbero desde su panel.
AgendaRouter.delete(
  "/limpiar-duplicados",
  authenticate,
  requireAdmin,
  AgendaController.limpiarTurnosDuplicados
);
AgendaRouter.delete(
  "/limpiar-barberos-excluidos",
  authenticate,
  requireAdmin,
  AgendaController.limpiarTurnosBarberosExcluidos
);
AgendaRouter.delete(
  "/eliminar-hoy",
  authenticate,
  requireAdmin,
  AgendaController.eliminarTurnosHoy
);
AgendaRouter.post(
  "/regenerar-fecha",
  authenticate,
  requireAdmin,
  AgendaController.regenerarTurnosFecha
);
AgendaRouter.post(
  "/regenerar-por-horarios",
  authenticate,
  requireAdmin,
  AgendaController.regenerarAgendaPorHorarios
);
AgendaRouter.post(
  "/limpiar-duplicados-nuevos",
  authenticate,
  requireAdmin,
  AgendaController.limpiarDuplicados
);
// Métricas. El controller acota el alcance según el rol: un barbero ve las
// suyas, el admin las del negocio completo. Por eso NO lleva requireAdmin.
AgendaRouter.get(
  "/dashboard/metricas",
  authenticate,
  AgendaController.getMetricas
);
AgendaRouter.post(
  "/generar-turnos",
  authenticate,
  requireAdmin,
  AgendaController.generarTurnosMes
);

// Nueva ruta para migración multi-barbero (administrativa)
AgendaRouter.post(
  "/migrar-multi-barbero",
  authenticate,
  requireAdmin,
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
// El cliente pide un aviso push antes de su turno (mismo token).
AgendaRouter.post(
  "/:id/recordatorio-push",
  AgendaController.registrarRecordatorioPush
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

// Crear turnos sueltos es tarea de scheduling: los genera el generador a
// partir de los horarios. Solo admin.
AgendaRouter.post(
  "/new",
  authenticate,
  requireAdmin,
  AgendaController.createAgenda
);

// PUT /:id genérico: solo admin. La edición pública de turnos ahora pasa
// por /editar-mi-turno/:id (restringido por token), no por esta ruta.
// Un barbero puede operar sobre SUS turnos (marcarlos pagados, completados,
// liberarlos); el admin sobre cualquiera.
AgendaRouter.put(
  "/:id",
  authenticate,
  requireTurnoPropio,
  AgendaController.updateOneAgendaById
);

// Borrar un turno es destructivo (se pierde el histórico): solo admin. Un
// barbero que quiere liberar un turno usa PUT con estado "disponible".
AgendaRouter.delete(
  "/:id",
  authenticate,
  requireAdmin,
  AgendaController.deleteOneAgendaById
);

// Nueva ruta para eliminar una agenda y crear una nueva con los mismos datos de día y hora
AgendaRouter.post(
  "/delete-and-create/:id",
  authenticate,
  AgendaController.deleteAndCreateNewAgenda
);

module.exports = AgendaRouter;
