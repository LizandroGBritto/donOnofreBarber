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
    incluirEnAgenda: {
      type: Boolean,
      default: true,
      required: false,
    },
    // false = usa los horarios del local. true = usa exclusivamente los suyos
    // (los que tienen `barbero: <este id>` en la colección Horario).
    //
    // Es un flag explícito y no "¿tiene filas propias?" a propósito: sin él,
    // un barbero que borra su última hora personalizada volvería en silencio a
    // los horarios del local, cuando lo que quiso decir es "ese día no trabajo".
    usaHorariosPropios: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Índice para mejorar las consultas
BarberoSchema.index({ activo: 1, createdAt: 1 });

module.exports = mongoose.model("Barbero", BarberoSchema);
