const mongoose = require("mongoose");

const ServicioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del servicio es requerido"],
      trim: true,
    },
    descripcion: {
      type: String,
      trim: true,
    },
    precio: {
      type: Number,
      required: [true, "El precio es requerido"],
      min: [0, "El precio no puede ser negativo"],
    },
    imagenes: [
      {
        type: String, // URLs de las imágenes
      },
    ],
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Índices para optimizar consultas
ServicioSchema.index({ activo: 1 });

module.exports = mongoose.model("Servicio", ServicioSchema);
