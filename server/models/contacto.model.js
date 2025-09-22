const mongoose = require("mongoose");

const ContactoSchema = new mongoose.Schema(
  {
    whatsapp: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[+]?[0-9\s-()]+$/.test(v);
        },
        message: "Formato de número de WhatsApp inválido",
      },
    },
    instagram: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^@?[A-Za-z0-9_.]+$/.test(v);
        },
        message: "Formato de Instagram inválido",
      },
    },
    instagramUrl: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Campo opcional
          return /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?$/.test(
            v
          );
        },
        message: "Formato de URL de Instagram inválido",
      },
    },
    correo: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Formato de correo electrónico inválido",
      },
    },
    estado: {
      type: String,
      enum: ["activo", "inactivo"],
      default: "activo",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Contacto", ContactoSchema);
