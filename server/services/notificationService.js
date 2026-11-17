const { webpush } = require("../config/webpush.config");
const Suscripcion = require("../models/suscripcion.model");
const { UserModel } = require("../models/user.model");

class NotificationService {
  /**
   * Ids (string) de los usuarios del panel que reciben un aviso: los admin y,
   * si el aviso es de un turno, el usuario de ese barbero. Un barbero no ve los
   * turnos de otro en el panel, así que tampoco recibe sus avisos.
   * `usuarioId` limita a un solo usuario (notificación de prueba).
   */
  static async destinatarios({ barberoId, usuarioId } = {}) {
    if (usuarioId) return [String(usuarioId)];
    // Sin `rol` cuenta como admin, igual que en authenticate (pendiente S-19).
    const condiciones = [{ rol: "admin" }, { rol: { $exists: false } }];
    if (barberoId) condiciones.push({ barbero: barberoId });
    const usuarios = await UserModel.find({ $or: condiciones }).select("_id").lean();
    return usuarios.map((u) => String(u._id));
  }

  // Enviar la notificación a las suscripciones activas de los destinatarios.
  // Las suscripciones sin un usuario actual (las viejas a nombre de "admin",
  // de cuando /subscribe era pública) ya no reciben nada.
  static async enviarNotificacionATodos(payload, filtro = {}) {
    try {
      console.log(
        "🔔 [NOTIFICATION SERVICE] Buscando suscripciones activas...",
      );
      const usuarios = await this.destinatarios(filtro);
      const suscripciones = await Suscripcion.find({
        activa: true,
        userId: { $in: usuarios },
      });

      if (suscripciones.length === 0) {
        console.log(
          "❌ [NOTIFICATION SERVICE] No hay suscripciones activas para enviar notificaciones",
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
            JSON.stringify(payload),
          );
          console.log(
            `Notificación enviada exitosamente a: ${suscripcion.endpoint.substring(
              0,
              50,
            )}...`,
          );
        } catch (error) {
          console.error(
            `Error al enviar notificación a ${suscripcion.endpoint.substring(
              0,
              50,
            )}:`,
            error.message,
          );

          // Si la suscripción no es válida, marcarla como inactiva
          if (error.statusCode === 410 || error.statusCode === 404) {
            await Suscripcion.findByIdAndUpdate(suscripcion._id, {
              activa: false,
            });
            console.log(
              `Suscripción marcada como inactiva: ${suscripcion._id}`,
            );
          }
        }
      });

      await Promise.all(promesas);
      console.log(
        `Proceso de notificaciones completado. Total suscripciones: ${suscripciones.length}`,
      );
    } catch (error) {
      console.error("Error en el servicio de notificaciones:", error);
      throw error;
    }
  }

  // Enviar notificación específica para nuevas reservas
  static async notificarNuevaReserva(turno) {
    const nombreBarbero =
      turno.barbero?.nombre || turno.nombreBarbero || "General";
    const payload = {
      title: `🆕 Nueva Reserva - ${nombreBarbero}`,
      body: `${turno.nombreCliente} reservó una cita para ${turno.fecha} a las ${turno.hora}`,
      icon: "/AlonzoStylev2.webp",
      badge: "/AlonzoStylev2.webp",
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

    await this.enviarNotificacionATodos(payload, { barberoId: turno.barbero?._id || turno.barbero });
  }

  // Enviar notificación para turnos editados
  static async notificarTurnoEditado(turno) {
    const payload = {
      title: "✏️ Turno Modificado",
      body: `${turno.nombreCliente} modificó su cita del ${turno.fecha} a las ${turno.hora}`,
      icon: "/AlonzoStylev2.webp",
      badge: "/AlonzoStylev2.webp",
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

    await this.enviarNotificacionATodos(payload, { barberoId: turno.barbero?._id || turno.barbero });
  }

  // Enviar notificación para turnos cancelados/liberados
  static async notificarTurnoLiberado(turno) {
    const payload = {
      title: "🚫 Turno Liberado",
      body: `El turno del ${turno.fecha} a las ${turno.hora} ha sido liberado`,
      icon: "/AlonzoStylev2.webp",
      badge: "/AlonzoStylev2.webp",
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

    await this.enviarNotificacionATodos(payload, { barberoId: turno.barbero?._id || turno.barbero });
  }

  // Enviar recordatorio de próximas citas
  static async notificarProximasCitas(citas) {
    const payload = {
      title: "⏰ Próximas Citas",
      body: `Tienes ${citas.length} cita(s) próxima(s) en las próximas 2 horas`,
      icon: "/AlonzoStylev2.webp",
      badge: "/AlonzoStylev2.webp",
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
