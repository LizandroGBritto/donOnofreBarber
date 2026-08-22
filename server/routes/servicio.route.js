const express = require("express");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/auth.middleware");
const {
  uploadImages,
  ...servicioController
} = require("../controllers/servicio.controller");

const ServicioRouter = express.Router();

// El catálogo de servicios es global y lo define el admin. Un barbero no crea
// ni borra servicios: solo fija su propio precio sobre este catálogo (eso vive
// en /api/barberos/:id/precios, ver Sprint 2 del plan).

// Públicas
ServicioRouter.get("/", servicioController.getAllServicios);
ServicioRouter.get("/:id", servicioController.getOneServicio);

// Administrativas
ServicioRouter.get(
  "/admin/all",
  authenticate,
  requireAdmin,
  servicioController.getAllServiciosAdmin
);
ServicioRouter.post(
  "/",
  authenticate,
  requireAdmin,
  uploadImages,
  servicioController.createServicio
);
ServicioRouter.put(
  "/:id",
  authenticate,
  requireAdmin,
  uploadImages,
  servicioController.updateServicio
);
ServicioRouter.delete(
  "/:id",
  authenticate,
  requireAdmin,
  servicioController.deleteServicio
);
ServicioRouter.patch(
  "/:id/toggle",
  authenticate,
  requireAdmin,
  servicioController.toggleServicio
);
ServicioRouter.delete(
  "/:servicioId/imagen/:imagenNombre",
  authenticate,
  requireAdmin,
  servicioController.deleteImagenServicio
);

module.exports = ServicioRouter;
