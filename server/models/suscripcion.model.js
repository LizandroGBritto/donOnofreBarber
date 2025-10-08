const mongoose = require("mongoose");

const SuscripcionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    userId: {
      type: String, // Cambiar a String para permitir identificadores simples como "admin"
      required: true,
    },
    activa: {
      type: Boolean,
      default: true,
    },
    dispositivo: {
      type: String,
      default: "Desconocido",
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Suscripcion", SuscripcionSchema);
