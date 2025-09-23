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
    duracion: {
      type: Number, // Duración en minutos
      required: [true, "La duración es requerida"],
      min: [5, "La duración mínima es 5 minutos"],
    },
    activo: {
      type: Boolean,
      default: true,
    },
    categoria: {
      type: String,
      enum: ["corte", "barba", "combo", "especial", "otros"],
      default: "corte",
    },
    color: {
      type: String, // Para mostrar en la interfaz
      default: "#3B82F6",
    },
  },
  { timestamps: true }
);

// Índices para optimizar consultas
ServicioSchema.index({ activo: 1, categoria: 1 });

module.exports = mongoose.model("Servicio", ServicioSchema);
