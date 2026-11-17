const express = require("express");
const router = express.Router();
const {
  authenticate,
  requireAdmin,
} = require("../middleware/auth.middleware");
const {
  getVapidPublicKey,
  suscribirse,
  desuscribirse,
  enviarNotificacionPrueba,
  obtenerSuscripciones,
} = require("../controllers/notification.controller");

// Obtener clave pública VAPID (usada por el Service Worker sin sesión)
router.get("/vapid-public-key", getVapidPublicKey);

// Suscribirse y desuscribirse: solo usuarios del panel. Hasta 2026-11-17 eran
// públicas y cualquiera recibía el aviso de cada reserva con los datos del
// cliente. Los avisos de turno de los clientes van por
// /api/agenda/:id/recordatorio-push, no por acá.
router.post("/subscribe", authenticate, suscribirse);

router.post("/unsubscribe", authenticate, desuscribirse);

// Enviar notificación de prueba (solo admin, se usa desde el panel)
router.post("/test", authenticate, requireAdmin, enviarNotificacionPrueba);

// Obtener suscripciones activas (para admin)
router.get(
  "/subscriptions",
  authenticate,
  requireAdmin,
  obtenerSuscripciones
);

module.exports = router;
