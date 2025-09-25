const mongoose = require("mongoose");

const HorarioSchema = new mongoose.Schema(
  {
    hora: {
      type: String, // Formato "08:00"
      required: [true, "La hora es requerida"],
    },
    dias: [
      {
        type: String,
        enum: [
          "lunes",
          "martes",
          "miercoles",
          "jueves",
          "viernes",
          "sabado",
          "domingo",
        ],
      },
    ],
    estado: {
      type: String,
      enum: ["activo", "inactivo"],
      default: "activo",
    },
  },
  { timestamps: true }
);

// Índices
HorarioSchema.index({ hora: 1, estado: 1 });

module.exports = mongoose.model("Horario", HorarioSchema);
