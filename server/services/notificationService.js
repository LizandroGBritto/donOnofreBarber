const { webpush } = require("../config/webpush.config");
const Suscripcion = require("../models/suscripcion.model");

class NotificationService {
  // Enviar notificación a todas las suscripciones activas
  static async enviarNotificacionATodos(payload) {
    try {
      console.log(
        "🔔 [NOTIFICATION SERVICE] Buscando suscripciones activas..."
      );
      const suscripciones = await Suscripcion.find({ activa: true });

      if (suscripciones.length === 0) {
        console.log(
          "❌ [NOTIFICATION SERVICE] No hay suscripciones activas para enviar notificaciones"
        );
        return;
      }

      const promesas = suscripciones.map(async (suscripcion) => {
        try {
          const pushSubscription = {
            endpoint: suscripcion.endpoint,
            keys: {
              p256dh: suscripcion.keys.p256dh,
              auth: suscripcion.keys.auth,
            },
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );
          console.log(
            `Notificación enviada exitosamente a: ${suscripcion.endpoint.substring(
              0,
              50
            )}...`
          );
        } catch (error) {
          console.error(
            `Error al enviar notificación a ${suscripcion.endpoint.substring(
              0,
              50
            )}:`,
            error.message
          );

          // Si la suscripción no es válida, marcarla como inactiva
          if (error.statusCode === 410 || error.statusCode === 404) {
            await Suscripcion.findByIdAndUpdate(suscripcion._id, {
              activa: false,
            });
            console.log(
              `Suscripción marcada como inactiva: ${suscripcion._id}`
            );
          }
        }
      });

      await Promise.all(promesas);
      console.log(
        `Proceso de notificaciones completado. Total suscripciones: ${suscripciones.length}`
      );
    } catch (error) {
      console.error("Error en el servicio de notificaciones:", error);
      throw error;
    }
  }

  // Enviar notificación específica para nuevas reservas
  static async notificarNuevaReserva(turno) {
    const payload = {
      title: "🆕 Nueva Reserva",
      body: `${turno.nombreCliente} reservó una cita para ${turno.fecha} a las ${turno.hora}`,
      icon: "/logoCenter.webp",
      badge: "/logoCenter.webp",
      data: {
        type: "nueva_reserva",
        turnoId: turno._id,
        url: "/admin",
      },
      actions: [
        {
          action: "view",
          title: "Ver Agenda",
        },
        {
          action: "close",
          title: "Cerrar",
        },
      ],
      requireInteraction: true,
    };

    await this.enviarNotificacionATodos(payload);
  }

  // Enviar notificación para turnos editados
  static async notificarTurnoEditado(turno) {
    const payload = {
      title: "✏️ Turno Modificado",
      body: `${turno.nombreCliente} modificó su cita del ${turno.fecha} a las ${turno.hora}`,
      icon: "/logoCenter.webp",
      badge: "/logoCenter.webp",
      data: {
        type: "turno_editado",
        turnoId: turno._id,
        url: "/admin",
      },
      actions: [
        {
          action: "view",
          title: "Ver Cambios",
        },
      ],
    };

    await this.enviarNotificacionATodos(payload);
  }

  // Enviar notificación para turnos cancelados/liberados
  static async notificarTurnoLiberado(turno) {
    const payload = {
      title: "🚫 Turno Liberado",
      body: `El turno del ${turno.fecha} a las ${turno.hora} ha sido liberado`,
      icon: "/logoCenter.webp",
      badge: "/logoCenter.webp",
      data: {
        type: "turno_liberado",
        turnoId: turno._id,
        url: "/admin",
      },
      actions: [
        {
          action: "view",
          title: "Ver Agenda",
        },
      ],
    };

    await this.enviarNotificacionATodos(payload);
  }

  // Enviar recordatorio de próximas citas
  static async notificarProximasCitas(citas) {
    const payload = {
      title: "⏰ Próximas Citas",
      body: `Tienes ${citas.length} cita(s) próxima(s) en las próximas 2 horas`,
      icon: "/logoCenter.webp",
      badge: "/logoCenter.webp",
      data: {
        type: "recordatorio_citas",
        citasCount: citas.length,
        url: "/admin",
      },
      actions: [
        {
          action: "view",
          title: "Ver Agenda",
        },
      ],
    };

    await this.enviarNotificacionATodos(payload);
  }
}

module.exports = NotificationService;
