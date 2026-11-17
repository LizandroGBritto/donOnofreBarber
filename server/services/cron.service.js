const cron = require("node-cron");
const WhatsappService = require("./whatsapp.service");
const Recordatorios = require("./recordatorios.service");

/**
 * Cada minuto: recordatorio por WhatsApp una hora antes del turno y los avisos
 * push que pidieron los clientes desde la landing. La lógica (qué turno toca,
 * cuándo, qué se descarta) vive en recordatorios.service.js, que tiene tests.
 */
class CronService {
  init() {
    console.log("⏰ Iniciando servicio de Cron Jobs...");
    cron.schedule("* * * * *", async () => {
      await this.enviarRecordatorios();
    });
  }

  async enviarRecordatorios() {
    try {
      const enviados = await Recordatorios.enviarRecordatoriosWhatsapp({
        enviar: (numero, mensaje) => WhatsappService.sendMessage(numero, mensaje),
      });
      if (enviados) console.log(`🔔 ${enviados} recordatorio(s) de WhatsApp`);
    } catch (error) {
      console.error("Error en cron de recordatorios de WhatsApp:", error);
    }

    try {
      // Se carga acá: webpush.config valida las claves VAPID al importarse.
      const { webpush } = require("../config/webpush.config");
      const enviados = await Recordatorios.enviarRecordatoriosPush({
        enviar: (suscripcion, payload) => webpush.sendNotification(suscripcion, payload),
      });
      if (enviados) console.log(`🔔 ${enviados} aviso(s) push de turno`);
    } catch (error) {
      console.error("Error en cron de avisos push:", error);
    }
  }
}

module.exports = new CronService();
