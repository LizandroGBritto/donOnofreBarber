const express = require("express");
const router = express.Router();
const {
  getVapidPublicKey,
  suscribirse,
  desuscribirse,
  enviarNotificacionPrueba,
  obtenerSuscripciones,
} = require("../controllers/notification.controller");

// Obtener clave pública VAPID
router.get("/vapid-public-key", getVapidPublicKey);

// Suscribirse a notificaciones
router.post("/subscribe", suscribirse);

// Desuscribirse de notificaciones
router.post("/unsubscribe", desuscribirse);

// Enviar notificación de prueba
router.post("/test", enviarNotificacionPrueba);

// Obtener suscripciones activas (para admin)
router.get("/subscriptions", obtenerSuscripciones);

module.exports = router;
