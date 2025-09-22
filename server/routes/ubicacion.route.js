const express = require("express");
const router = express.Router();
const {
  obtenerUbicacion,
  obtenerTodasUbicaciones,
  crearUbicacion,
  actualizarUbicacion,
  eliminarUbicacion,
} = require("../controllers/ubicacion.controller");

// Rutas públicas
router.get("/", obtenerUbicacion);

// Rutas de administración
router.get("/admin", obtenerTodasUbicaciones);
router.post("/", crearUbicacion);
router.put("/:id", actualizarUbicacion);
router.delete("/:id", eliminarUbicacion);

module.exports = router;
