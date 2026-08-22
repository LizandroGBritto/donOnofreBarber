const express = require("express");
const router = express.Router();
const {
  obtenerContacto,
  obtenerTodosContactos,
  crearContacto,
  actualizarContacto,
  eliminarContacto,
} = require("../controllers/contacto.controller");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/auth.middleware");

// Rutas públicas
router.get("/", obtenerContacto);

// Rutas de administración.
// Hasta 2026-08-22 estas cuatro estaban SIN autenticación: cualquiera en
// internet podía cambiar el WhatsApp o el Instagram del negocio y desviar a
// los clientes.
router.get("/admin", authenticate, requireAdmin, obtenerTodosContactos);
router.post("/", authenticate, requireAdmin, crearContacto);
router.put("/:id", authenticate, requireAdmin, actualizarContacto);
router.delete("/:id", authenticate, requireAdmin, eliminarContacto);

module.exports = router;
