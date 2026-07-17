const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const {
  getVapidPublicKey,
  suscribirse,
  desuscribirse,
  enviarNotificacionPrueba,
  obtenerSuscripciones,
} = require("../controllers/notification.controller");

// Obtener clave pública VAPID (usada por el Service Worker sin sesión)
router.get("/vapid-public-key", getVapidPublicKey);

// Suscribirse a notificaciones (usada por el Service Worker sin sesión)
router.post("/subscribe", suscribirse);

// Desuscribirse de notificaciones (usada por el Service Worker sin sesión)
router.post("/unsubscribe", desuscribirse);

// Enviar notificación de prueba (solo admin, se usa desde el panel)
router.post("/test", authenticate, enviarNotificacionPrueba);

// Obtener suscripciones activas (para admin)
router.get("/subscriptions", authenticate, obtenerSuscripciones);

module.exports = router;
