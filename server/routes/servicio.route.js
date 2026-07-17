const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const {
  uploadImages,
  ...servicioController
} = require("../controllers/servicio.controller");

const ServicioRouter = express.Router();

// Rutas para servicios
ServicioRouter.get("/", servicioController.getAllServicios);
ServicioRouter.get(
  "/admin/all",
  authenticate,
  servicioController.getAllServiciosAdmin
);
ServicioRouter.get("/:id", servicioController.getOneServicio);
ServicioRouter.post(
  "/",
  authenticate,
  uploadImages,
  servicioController.createServicio
);
ServicioRouter.put(
  "/:id",
  authenticate,
  uploadImages,
  servicioController.updateServicio
);
ServicioRouter.delete("/:id", authenticate, servicioController.deleteServicio);
ServicioRouter.patch(
  "/:id/toggle",
  authenticate,
  servicioController.toggleServicio
);
ServicioRouter.delete(
  "/:servicioId/imagen/:imagenNombre",
  authenticate,
  servicioController.deleteImagenServicio
);

module.exports = ServicioRouter;
