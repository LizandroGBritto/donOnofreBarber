const express = require("express");
const router = express.Router();
const {
  obtenerUbicacion,
  obtenerTodasUbicaciones,
  crearUbicacion,
  actualizarUbicacion,
  eliminarUbicacion,
} = require("../controllers/ubicacion.controller");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/auth.middleware");

// Rutas públicas
router.get("/", obtenerUbicacion);

// Rutas de administración.
// Mismo caso que contacto: hasta 2026-08-22 estaban sin autenticación y
// cualquiera podía cambiar la dirección del local.
router.get("/admin", authenticate, requireAdmin, obtenerTodasUbicaciones);
router.post("/", authenticate, requireAdmin, crearUbicacion);
router.put("/:id", authenticate, requireAdmin, actualizarUbicacion);
router.delete("/:id", authenticate, requireAdmin, eliminarUbicacion);

module.exports = router;
