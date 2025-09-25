const express = require("express");
const {
  uploadImages,
  ...servicioController
} = require("../controllers/servicio.controller");

const ServicioRouter = express.Router();

// Rutas para servicios
ServicioRouter.get("/", servicioController.getAllServicios);
ServicioRouter.get("/admin/all", servicioController.getAllServiciosAdmin);
ServicioRouter.get(
  "/categoria/:categoria",
  servicioController.getServiciosByCategoria
);
ServicioRouter.get("/:id", servicioController.getOneServicio);
ServicioRouter.post("/", uploadImages, servicioController.createServicio);
ServicioRouter.put("/:id", uploadImages, servicioController.updateServicio);
ServicioRouter.delete("/:id", servicioController.deleteServicio);
ServicioRouter.patch("/:id/toggle", servicioController.toggleServicio);
ServicioRouter.delete(
  "/:servicioId/imagen/:imagenNombre",
  servicioController.deleteImagenServicio
);

module.exports = ServicioRouter;
