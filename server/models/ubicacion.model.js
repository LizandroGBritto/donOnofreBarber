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
