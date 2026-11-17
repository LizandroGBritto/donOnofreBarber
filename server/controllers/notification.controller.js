const Suscripcion = require("../models/suscripcion.model");
const { vapidKeys } = require("../config/webpush.config");
const NotificationService = require("../services/notificationService");
const { endpointPushValido } = require("../services/recordatorios.service");

// Obtener clave pública VAPID
const getVapidPublicKey = (req, res) => {
  try {
    res.json({ publicKey: vapidKeys.publicKey });
  } catch (error) {
    console.error("Error al obtener clave VAPID:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Suscribirse a notificaciones
const claveValida = (v) => typeof v === "string" && v.length > 0 && v.length <= 200;

// La suscripción queda a nombre del usuario logueado: el aviso de cada reserva
// le llega solo a quien la puede ver (NotificationService.destinatarios).
const suscribirse = async (req, res) => {
  try {
    const { subscription } = req.body;
    const keys = subscription?.keys || {};

    // El servidor hace un POST al endpoint: solo servicios de push (SSRF).
    if (
      !endpointPushValido(subscription?.endpoint) ||
      !claveValida(keys.p256dh) ||
      !claveValida(keys.auth)
    ) {
      return res.status(400).json({ error: "Datos de suscripción inválidos" });
    }

    const userAgent = String(req.headers["user-agent"] || "").slice(0, 300);
    const suscripcion = await Suscripcion.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          userId: String(req.user._id),
          activa: true,
          dispositivo: userAgent.includes("Mobile") ? "Móvil" : "Escritorio",
          userAgent,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      message: "Suscripción guardada",
      suscripcionId: suscripcion._id,
    });
  } catch (error) {
    console.error("❌ [NOTIFICATION] Error al crear suscripción:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Desuscribirse de notificaciones: cada uno las suyas; el admin, cualquiera.
const desuscribirse = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (typeof endpoint !== "string" || !endpoint) {
      return res.status(400).json({ error: "Endpoint requerido" });
    }

    const filtro = { endpoint };
    if (req.user.rol !== "admin") filtro.userId = String(req.user._id);
    const resultado = await Suscripcion.findOneAndUpdate(
      filtro,
      { activa: false },
      { new: true }
    );

    if (!resultado) {
      return res.status(404).json({ error: "Suscripción no encontrada" });
    }

    res.json({ message: "Desuscripción exitosa" });
  } catch (error) {
    console.error("Error al desuscribirse:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Enviar notificación de prueba
const enviarNotificacionPrueba = async (req, res) => {
  try {
    const payload = {
      title: "🧪 Notificación de Prueba",
      body: "Las notificaciones están funcionando correctamente",
      icon: "/AlonzoStylev2.webp",
      badge: "/AlonzoStylev2.webp",
      data: {
        type: "test",
        url: "/admin",
      },
    };

    // Solo a los dispositivos de quien la pide.
    await NotificationService.enviarNotificacionATodos(payload, { usuarioId: req.user._id });

    res.json({ message: "Notificación de prueba enviada" });
  } catch (error) {
    console.error("Error al enviar notificación de prueba:", error);
    res.status(500).json({ error: "Error al enviar notificación" });
  }
};

// Obtener todas las suscripciones activas
const obtenerSuscripciones = async (req, res) => {
  try {
    const suscripciones = await Suscripcion.find({ activa: true })
      .select("dispositivo createdAt userId")
      .sort({ createdAt: -1 });

    res.json({
      total: suscripciones.length,
      suscripciones: suscripciones,
    });
  } catch (error) {
    console.error("Error al obtener suscripciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = {
  getVapidPublicKey,
  suscribirse,
  desuscribirse,
  enviarNotificacionPrueba,
  obtenerSuscripciones,
};
