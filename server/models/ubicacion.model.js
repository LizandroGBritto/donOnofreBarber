const mongoose = require("mongoose");

const UbicacionSchema = new mongoose.Schema(
  {
    direccion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    enlaceMaps: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Debe ser una URL válida",
      },
    },
    // Punto exacto del local para el mapa de la landing. Es opcional: sin
    // coordenadas la landing muestra la dirección y el botón a Google Maps,
    // sin mapa. No se deducen de `enlaceMaps` porque el que se carga suele ser
    // un link corto (maps.app.goo.gl) que no las trae.
    coordenadas: {
      lat: {
        type: Number,
        min: [-90, "La latitud debe estar entre -90 y 90"],
        max: [90, "La latitud debe estar entre -90 y 90"],
      },
      lng: {
        type: Number,
        min: [-180, "La longitud debe estar entre -180 y 180"],
        max: [180, "La longitud debe estar entre -180 y 180"],
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

module.exports = mongoose.model("Ubicacion", UbicacionSchema);
