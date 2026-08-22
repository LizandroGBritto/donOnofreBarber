const mongoose = require("mongoose");

const HorarioSchema = new mongoose.Schema(
  {
    // null = horario del LOCAL (el default que usan todos los barberos que no
    // personalizaron). Con un ObjectId, es un horario propio de ese barbero.
    //
    // La resolución "propios vs. del local" no se hace leyendo este campo
    // directamente: va por services/horarios.service.js, que además mira el
    // flag `usaHorariosPropios` del barbero.
    barbero: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barbero",
      default: null,
      index: true,
    },
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

// La unicidad de `hora` es POR BARBERO, no global: dos barberos pueden tener
// ambos las 09:00. Antes createHorario validaba globalmente y con horarios
// propios eso habría impedido que un segundo barbero usara una hora ya tomada.
HorarioSchema.index({ barbero: 1, hora: 1 }, { unique: true });

module.exports = mongoose.model("Horario", HorarioSchema);
