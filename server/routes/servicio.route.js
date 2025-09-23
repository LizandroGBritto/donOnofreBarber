const express = require("express");
const servicioController = require("../controllers/servicio.controller");

const ServicioRouter = express.Router();

// Rutas para servicios
ServicioRouter.get("/", servicioController.getAllServicios);
ServicioRouter.get(
  "/categoria/:categoria",
  servicioController.getServiciosByCategoria
);
ServicioRouter.get("/:id", servicioController.getOneServicio);
ServicioRouter.post("/", servicioController.createServicio);
ServicioRouter.put("/:id", servicioController.updateServicio);
ServicioRouter.delete("/:id", servicioController.deleteServicio);
ServicioRouter.patch("/:id/toggle", servicioController.toggleServicio);

module.exports = ServicioRouter;
