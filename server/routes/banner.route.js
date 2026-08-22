const express = require("express");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/auth.middleware");
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

// Rutas administrativas (los banners son del negocio, no de un barbero)
router.get("/", authenticate, requireAdmin, obtenerBanners);
router.get("/estadisticas", authenticate, requireAdmin, obtenerEstadisticas);
router.get("/:id", authenticate, requireAdmin, obtenerBannerPorId);
router.post("/", authenticate, requireAdmin, upload, crearBanner);
router.put("/:id", authenticate, requireAdmin, upload, actualizarBanner);
router.patch("/:id/estado", authenticate, requireAdmin, cambiarEstadoBanner);
router.delete("/:id", authenticate, requireAdmin, eliminarBanner);

module.exports = router;
