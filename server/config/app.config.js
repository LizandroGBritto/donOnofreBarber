// =================================
// CONFIGURACIÓN CENTRALIZADA
// =================================

require("dotenv").config();

const config = {
  // Servidor
  port: process.env.PORT || 8000,
  nodeEnv: process.env.NODE_ENV || "development",

  // URLs
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  serverUrl: process.env.SERVER_URL || "http://localhost:8000",

  // Base de datos
  database: {
    name: process.env.DB_NAME || "OnofreDb",
    uri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/OnofreDb",
  },

  // Seguridad
  security: {
    jwtSecret: process.env.JWT_SECRET || process.env.SECRET || "defaultSecret",
    sessionExpiry: 900000000, // 25 horas
  },

  // VAPID para notificaciones push
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    email: process.env.VAPID_EMAIL || "donOnofre.barberia@gmail.com",
  },

  // Adam's Pay
  payment: {
    apiKey: process.env.ADAM_API_KEY,
    apiSecret: process.env.ADAM_API_SECRET,
    apiUrl: process.env.ADAM_API_URL || "https://staging.adamspay.com/api/v1",
  },

  // Archivos
  files: {
    uploadDir: process.env.UPLOAD_DIR || "uploads",
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  },

  // CORS
  cors: {
    origin: function (origin, callback) {
      // Lista de orígenes permitidos
      const allowedOrigins = [
        process.env.CLIENT_URL || "http://localhost:5173",
        process.env.CLIENT_URL_WWW ||
          `https://www.${(process.env.CLIENT_URL || "").replace(
            /^https?:\/\//,
            ""
          )}`,
        "http://localhost:5173",
        "http://localhost:3000",
        "https://alonzostyle.com",
        "https://www.alonzostyle.com",
      ].filter(Boolean); // Remover valores undefined/null

      // Permitir requests sin origin (aplicaciones móviles, Postman, etc.)
      if (!origin) return callback(null, true);

      // Verificar si el origin está en la lista permitida
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`❌ CORS bloqueado para origin: ${origin}`);
        console.log(`✅ Orígenes permitidos:`, allowedOrigins);
        callback(new Error("No permitido por política CORS"));
      }
    },
    credentials: true,
    methods: "GET, POST, PUT, DELETE",
  },

  // Validaciones de producción
  isProduction: process.env.NODE_ENV === "production",

  // Función para validar configuración crítica
  validate() {
    const required = [];

    if (this.isProduction) {
      if (
        !this.security.jwtSecret ||
        this.security.jwtSecret === "defaultSecret"
      ) {
        required.push("JWT_SECRET");
      }
      if (!this.vapid.publicKey || !this.vapid.privateKey) {
        required.push("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY");
      }
      if (!this.database.uri.includes("mongodb+srv")) {
        console.warn("⚠️  Usando base de datos local en producción");
      }
    }

    if (required.length > 0) {
      throw new Error(
        `Variables de entorno requeridas: ${required.join(", ")}`
      );
    }

    console.log("✅ Configuración validada correctamente");
    if (this.isProduction) {
      console.log("🚀 Ejecutando en modo PRODUCCIÓN");
    } else {
      console.log("🛠️  Ejecutando en modo DESARROLLO");
    }
  },
};

module.exports = config;
