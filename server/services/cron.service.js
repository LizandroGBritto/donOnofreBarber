const cron = require("node-cron");
const AgendaModel = require("../models/agenda.model");
const WhatsappService = require("./whatsapp.service");
const ParaguayDateUtil = require("../utils/paraguayDate");

class CronService {
  init() {
    console.log("⏰ Iniciando servicio de Cron Jobs...");

    // Ejecutar cada minuto
    cron.schedule("* * * * *", async () => {
      await this.enviarRecordatorios();
    });
  }

  async enviarRecordatorios() {
    try {
      const ahora = ParaguayDateUtil.now();

      // Buscar turnos que sean en exactamente 1 hora (con un margen de ventana)
      // Ejemplo: Si ahora son 10:00, buscamos turnos a las 11:00
      // Ventana: entre 59 y 61 minutos desde ahora
      const inicioVentana = ahora.clone().add(59, "minutes").toDate();
      const finVentana = ahora.clone().add(61, "minutes").toDate();

      // Buscar turnos CONFIRMADOS o RESERVADOS que NO hayan sido recordados
      const turnosParaRecordar = await AgendaModel.find({
        fecha: {
          $gte: inicioVentana,
          $lte: finVentana,
        },
        estado: { $in: ["reservado", "confirmado"] },
        // Asumimos que agregaremos un campo 'recordatorioEnviado' al modelo,
        // o verificamos si ya pasó para no reenviar (aunque la ventana de tiempo ya evita duplicados en gran medida)
        $or: [
          { recordatorioEnviado: false },
          { recordatorioEnviado: { $exists: false } },
        ],
        numeroCliente: { $exists: true, $ne: "" }, // Debe tener número
      }).populate("barbero", "nombre");

      if (turnosParaRecordar.length > 0) {
        console.log(
          `🔔 Enviando ${turnosParaRecordar.length} recordatorios de WhatsApp...`,
        );

        for (const turno of turnosParaRecordar) {
          const nombreCliente = turno.nombreCliente || "Cliente";
          const nombreBarbero =
            turno.barbero?.nombre || turno.nombreBarbero || "Don Onofre";
          const hora = turno.hora;

          const mensaje = `Hola ${nombreCliente}! 👋\n\nTe recordamos que tienes un turno hoy a las *${hora}* con *${nombreBarbero}* en Don Onofre Barbería.\n\nTe esperamos! 💈`;

          // Enviar mensaje
          await WhatsappService.sendMessage(turno.numeroCliente, mensaje);

          // Marcar como enviado para no repetir
          turno.recordatorioEnviado = true;
          await turno.save();
        }
      }
    } catch (error) {
      console.error("Error en cron de recordatorios:", error);
    }
  }
}

module.exports = new CronService();
