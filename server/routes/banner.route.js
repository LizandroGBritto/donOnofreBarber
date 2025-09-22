const express = require("express");
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
router.get("/", obtenerBanners);
router.get("/estadisticas", obtenerEstadisticas);
router.get("/:id", obtenerBannerPorId);
router.post("/", upload, crearBanner);
router.put("/:id", upload, actualizarBanner);
router.patch("/:id/estado", cambiarEstadoBanner);
router.delete("/:id", eliminarBanner);

module.exports = router;
