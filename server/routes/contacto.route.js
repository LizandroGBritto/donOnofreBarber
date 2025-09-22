const express = require("express");
const router = express.Router();
const {
  obtenerContacto,
  obtenerTodosContactos,
  crearContacto,
  actualizarContacto,
  eliminarContacto,
} = require("../controllers/contacto.controller");

// Rutas públicas
router.get("/", obtenerContacto);

// Rutas de administración
router.get("/admin", obtenerTodosContactos);
router.post("/", crearContacto);
router.put("/:id", actualizarContacto);
router.delete("/:id", eliminarContacto);

module.exports = router;
