const express = require("express");
const {
  authenticate,
  requireAdmin,
  requireBarberoPropio,
} = require("../middleware/auth.middleware");
const BarberoController = require("../controllers/barbero.controller");
const PrecioBarberoController = require("../controllers/precioBarbero.controller");
const HorarioBarberoController = require("../controllers/horarioBarbero.controller");

const BarberoRouter = express.Router();

// Alta, baja y modificación de barberos son del admin. Lo que un barbero sí
// gestiona de sí mismo (precios y horarios) cuelga de /api/barberos/:id/... y
// se agrega en los Sprints 2 y 3 con requireBarberoPropio.

// Públicas: las consume la landing.
BarberoRouter.get("/", BarberoController.getAllBarberos);
BarberoRouter.get("/activos", BarberoController.getBarberosActivos);
BarberoRouter.get("/agenda", BarberoController.getBarberosParaAgenda);

// ── Precios propios del barbero ───────────────────────────────────────────
// Van ANTES de "/:id" para que Express no matchee "precios" como un id.

// Pública: la landing la usa para mostrar los precios del barbero elegido.
BarberoRouter.get(
  "/:id/servicios",
  PrecioBarberoController.getServiciosDeBarbero
);

// El propio barbero o un admin.
BarberoRouter.get(
  "/:id/precios",
  authenticate,
  requireBarberoPropio(),
  PrecioBarberoController.getPreciosDeBarbero
);
BarberoRouter.put(
  "/:id/precios",
  authenticate,
  requireBarberoPropio(),
  PrecioBarberoController.guardarPreciosDeBarbero
);

// ── Horarios propios del barbero ──────────────────────────────────────────

// Pública: la landing arma la grilla del barbero elegido con esto.
BarberoRouter.get(
  "/:id/horarios",
  HorarioBarberoController.getHorariosDeBarbero
);

// El propio barbero o un admin.
BarberoRouter.post(
  "/:id/horarios/clonar-globales",
  authenticate,
  requireBarberoPropio(),
  HorarioBarberoController.clonarGlobales
);
BarberoRouter.patch(
  "/:id/horarios/usar-globales",
  authenticate,
  requireBarberoPropio(),
  HorarioBarberoController.usarGlobales
);
BarberoRouter.post(
  "/:id/horarios",
  authenticate,
  requireBarberoPropio(),
  HorarioBarberoController.crearHorario
);
BarberoRouter.put(
  "/:id/horarios/:horarioId",
  authenticate,
  requireBarberoPropio(),
  HorarioBarberoController.actualizarHorario
);
BarberoRouter.delete(
  "/:id/horarios/:horarioId",
  authenticate,
  requireBarberoPropio(),
  HorarioBarberoController.eliminarHorario
);

// Administrativas
BarberoRouter.get(
  "/:id",
  authenticate,
  requireAdmin,
  BarberoController.getOneBarbero
);

BarberoRouter.post(
  "/",
  authenticate,
  requireAdmin,
  BarberoController.upload.fields([
    { name: "foto", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  BarberoController.createBarbero
);

BarberoRouter.put(
  "/:id",
  authenticate,
  requireAdmin,
  BarberoController.upload.fields([
    { name: "foto", maxCount: 1 },
    { name: "logo", maxCount: 1 },
  ]),
  BarberoController.updateBarbero
);

BarberoRouter.delete(
  "/:id",
  authenticate,
  requireAdmin,
  BarberoController.deleteBarbero
);

BarberoRouter.patch(
  "/:id/estado",
  authenticate,
  requireAdmin,
  BarberoController.toggleEstadoBarbero
);

module.exports = BarberoRouter;
