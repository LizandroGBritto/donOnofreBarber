const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const {
  crearBanner,
  obtenerBanners,
  obtenerBannersActivos,
  obtenerBannerPorId,
  actualizarBanner,
  eliminarBanner,
  cambiarEstadoBanner,
  obtenerEstadisticas,
  upload,
} = require("../controllers/banner.controller");

const router = express.Router();

// Rutas públicas
router.get("/activos", obtenerBannersActivos);

// Rutas administrativas
router.get("/", authenticate, obtenerBanners);
router.get("/estadisticas", authenticate, obtenerEstadisticas);
router.get("/:id", authenticate, obtenerBannerPorId);
router.post("/", authenticate, upload, crearBanner);
router.put("/:id", authenticate, upload, actualizarBanner);
router.patch("/:id/estado", authenticate, cambiarEstadoBanner);
router.delete("/:id", authenticate, eliminarBanner);

module.exports = router;
