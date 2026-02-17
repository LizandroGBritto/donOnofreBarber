const axios = require("axios");

class WhatsappService {
  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || "http://localhost:8081";
    this.apiKey =
      process.env.EVOLUTION_API_KEY || "B6D711FCDE4D4FD5936544120E713976";
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || "donOnofre";
  }

  // Helper para headers
  getHeaders() {
    return {
      "Content-Type": "application/json",
      apikey: this.apiKey,
    };
  }

  // Eliminar instancia existente
  async deleteInstance() {
    try {
      console.log(`🗑️ Eliminando instancia "${this.instanceName}"...`);
      const response = await axios.delete(
        `${this.baseUrl}/instance/delete/${this.instanceName}`,
        { headers: this.getHeaders() },
      );
      console.log("✅ Instancia eliminada");
      return response.data;
    } catch (error) {
      console.log(
        "⚠️ No se pudo eliminar instancia:",
        error.response?.data?.response?.message || error.message,
      );
      return null;
    }
  }

  // Crear instancia nueva
  async createInstance() {
    try {
      console.log(`📝 Creando instancia "${this.instanceName}"...`);
      const response = await axios.post(
        `${this.baseUrl}/instance/create`,
        {
          instanceName: this.instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        },
        { headers: this.getHeaders() },
      );
      console.log(
        "✅ Instancia creada. Status:",
        response.data?.instance?.status,
      );
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      if (status === 403 || status === 409) {
        return { exists: true };
      }
      console.error(
        "❌ Error creando instancia:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Obtener QR con reintentos (la API lo genera de forma asíncrona)
  async fetchQrWithRetries(maxRetries = 5, delayMs = 2000) {
    for (let i = 0; i < maxRetries; i++) {
      console.log(`📱 Intento ${i + 1}/${maxRetries} de obtener QR...`);

      try {
        const response = await axios.get(
          `${this.baseUrl}/instance/connect/${this.instanceName}`,
          { headers: this.getHeaders() },
        );

        const data = response.data;

        // Buscar QR en la respuesta
        if (data?.base64) {
          console.log("✅ QR obtenido (campo base64)");
          return { base64: data.base64 };
        }
        if (data?.qrcode?.base64) {
          console.log("✅ QR obtenido (campo qrcode.base64)");
          return { base64: data.qrcode.base64 };
        }
        if (typeof data?.code === "string" && data.code.length > 20) {
          console.log("✅ QR code string obtenido");
          return { code: data.code };
        }

        console.log(
          `⏳ QR no listo aún (respuesta: ${JSON.stringify(data)}). Esperando ${delayMs}ms...`,
        );
      } catch (error) {
        console.log(
          `⚠️ Error en intento ${i + 1}:`,
          error.response?.data || error.message,
        );
      }

      // Esperar antes del siguiente intento
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    console.log("❌ No se pudo obtener el QR después de todos los intentos");
    return null;
  }

  // Conectar / Obtener QR - Flujo principal
  async connectInstance() {
    try {
      console.log(`🔄 connectInstance: Iniciando para "${this.instanceName}"`);

      // Paso 1: Intentar crear
      let createResponse = await this.createInstance();

      // Paso 2: Si ya existe (posiblemente stale), eliminar y recrear
      if (createResponse?.exists) {
        console.log("♻️ Instancia existe. Eliminando y recreando...");
        await this.deleteInstance();
        await new Promise((resolve) => setTimeout(resolve, 1500));
        createResponse = await this.createInstance();
      }

      // Paso 3: Esperar un momento para que la API genere el QR
      console.log("⏳ Esperando a que la API genere el QR...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Paso 4: Intentar obtener el QR con reintentos
      const qrResult = await this.fetchQrWithRetries(5, 2000);

      if (qrResult) {
        return qrResult;
      }

      // Si no se obtuvo QR, devolver lo que tengamos
      return { error: "QR no disponible", count: 0 };
    } catch (error) {
      console.error(
        "❌ connectInstance error:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // Verificar estado de conexión
  async getConnectionStatus() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/instance/connectionState/${this.instanceName}`,
        { headers: this.getHeaders() },
      );
      return response.data;
    } catch (error) {
      return { instance: { state: "close" } };
    }
  }

  // Enviar mensaje de texto
  async sendMessage(phone, text) {
    try {
      let formattedPhone = phone.replace(/\D/g, "");
      if (!formattedPhone.startsWith("595")) {
        if (formattedPhone.startsWith("09")) {
          formattedPhone = "595" + formattedPhone.substring(1);
        } else if (formattedPhone.length === 9) {
          formattedPhone = "595" + formattedPhone;
        }
      }

      const response = await axios.post(
        `${this.baseUrl}/message/sendText/${this.instanceName}`,
        {
          number: formattedPhone,
          text: text,
          delay: 1200,
          linkPreview: false,
        },
        { headers: this.getHeaders() },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error enviando mensaje WhatsApp:",
        error.response?.data || error.message,
      );
      return null;
    }
  }
}

module.exports = new WhatsappService();
