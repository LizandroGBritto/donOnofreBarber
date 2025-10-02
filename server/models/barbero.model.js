const mongoose = require("mongoose");

const BarberoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del barbero es requerido"],
      trim: true,
      maxlength: [100, "El nombre no puede exceder 100 caracteres"],
    },
    descripcion: {
      type: String,
      required: [true, "La descripción del barbero es requerida"],
      trim: true,
      maxlength: [500, "La descripción no puede exceder 500 caracteres"],
    },
    foto: {
      type: String,
      required: [true, "La foto del barbero es requerida"],
    },
    logo: {
      type: String,
      required: false, // No es obligatorio
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Índice para mejorar las consultas
BarberoSchema.index({ activo: 1, createdAt: 1 });

module.exports = mongoose.model("Barbero", BarberoSchema);
