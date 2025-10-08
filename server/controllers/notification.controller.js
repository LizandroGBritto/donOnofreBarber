const Suscripcion = require("../models/suscripcion.model");
const { vapidKeys } = require("../config/webpush.config");
const NotificationService = require("../services/notificationService");

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
const suscribirse = async (req, res) => {
  try {


    const { subscription, userId } = req.body;

    if (!subscription || !subscription.endpoint) {
      console.log("❌ [NOTIFICATION] Datos de suscripción inválidos");
      return res.status(400).json({ error: "Datos de suscripción inválidos" });
    }

    // Usar un userId por defecto si no se proporciona
    const finalUserId = userId || "admin";

    // Verificar si ya existe la suscripción
    const suscripcionExistente = await Suscripcion.findOne({
      endpoint: subscription.endpoint,
    });


    if (suscripcionExistente) {
      // Actualizar suscripción existente
      suscripcionExistente.keys = subscription.keys;
      suscripcionExistente.activa = true;
      suscripcionExistente.userId = finalUserId;
      suscripcionExistente.userAgent = req.headers["user-agent"];
      await suscripcionExistente.save();


      return res.json({
        message: "Suscripción actualizada exitosamente",
        suscripcionId: suscripcionExistente._id,
      });
    }

    // Crear nueva suscripción
    const nuevaSuscripcion = new Suscripcion({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userId: finalUserId,
      dispositivo: req.headers["user-agent"]?.includes("Mobile")
        ? "Móvil"
        : "Escritorio",
      userAgent: req.headers["user-agent"],
    });

    await nuevaSuscripcion.save();

    res.status(201).json({
      message: "Suscripción creada exitosamente",
      suscripcionId: nuevaSuscripcion._id,
    });
  } catch (error) {
    console.error("❌ [NOTIFICATION] Error al crear suscripción:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Desuscribirse de notificaciones
const desuscribirse = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint requerido" });
    }

    const resultado = await Suscripcion.findOneAndUpdate(
      { endpoint: endpoint },
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
      icon: "/logoCenter.webp",
      badge: "/logoCenter.webp",
      data: {
        type: "test",
        url: "/admin",
      },
    };

    await NotificationService.enviarNotificacionATodos(payload);

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
