const WhatsappService = require("../services/whatsapp.service");

module.exports = {
  // Obtener estado de conexión
  getConnectionStatus: async (req, res) => {
    try {
      const status = await WhatsappService.getConnectionStatus();
      res.status(200).json(status);
    } catch (error) {
      res.status(500).json({
        message: "Error obteniendo estado de WhatsApp",
        error: error.message,
      });
    }
  },

  // Conectar instancia (Obtener QR)
  connectInstance: async (req, res) => {
    try {
      const data = await WhatsappService.connectInstance();

      // Log para debug: ver la estructura real de la respuesta
      console.log(
        "📋 Respuesta completa de connectInstance:",
        JSON.stringify(data, null, 2),
      );

      // Normalizar la respuesta: buscar el QR en diferentes campos posibles
      let qrBase64 = null;

      if (data?.base64) {
        qrBase64 = data.base64;
      } else if (data?.qrcode?.base64) {
        qrBase64 = data.qrcode.base64;
      } else if (data?.qrcode?.pairingCode) {
        qrBase64 = data.qrcode.pairingCode;
      } else if (typeof data?.qrcode === "string") {
        qrBase64 = data.qrcode;
      }

      // Devolver respuesta normalizada
      res.status(200).json({
        ...data,
        base64: qrBase64, // Siempre incluir campo base64 normalizado
      });
    } catch (error) {
      console.error("❌ Error en connectInstance controller:", error.message);
      res.status(500).json({
        message: "Error conectando instancia de WhatsApp",
        error: error.message,
      });
    }
  },

  // Enviar mensaje de prueba (Opcional, para debug)
  sendMessage: async (req, res) => {
    try {
      const { phone, message } = req.body;
      const result = await WhatsappService.sendMessage(phone, message);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        message: "Error enviando mensaje",
        error: error.message,
      });
    }
  },
};
