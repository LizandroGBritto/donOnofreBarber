const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, "El título es obligatorio"],
      maxlength: [100, "El título no puede tener más de 100 caracteres"],
    },
    descripcion: {
      type: String,
      maxlength: [500, "La descripción no puede tener más de 500 caracteres"],
    },
    imagen: {
      type: String,
      required: [true, "La imagen es obligatoria"],
    },
    estado: {
      type: String,
      enum: ["activo", "inactivo"],
      default: "activo",
      required: true,
    },
    tipo: {
      type: String,
      enum: ["principal", "secundario"],
      default: "secundario",
      required: true,
    },
    version: {
      type: String,
      enum: ["mobile", "escritorio", "ambos"],
      default: "ambos",
      required: true,
    },
    orden: {
      type: Number,
      default: 0,
      min: 0,
    },
    enlace: {
      type: String,
      validate: {
        validator: function (v) {
          // Validar URL si se proporciona
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message: "El enlace debe ser una URL válida",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Índices para mejorar las consultas
bannerSchema.index({ estado: 1, tipo: 1, version: 1 });
bannerSchema.index({ orden: 1 });

// Método estático para obtener banners activos
bannerSchema.statics.getBannersActivos = function (
  tipo = null,
  version = null
) {
  let query = { estado: "activo" };

  if (tipo) {
    query.tipo = tipo;
  }

  if (version && version !== "ambos") {
    query.$or = [{ version: version }, { version: "ambos" }];
  }

  return this.find(query).sort({ tipo: 1, orden: 1, createdAt: -1 });
};

// Método estático para obtener estadísticas
bannerSchema.statics.getEstadisticas = function () {
  return this.aggregate([
    {
      $group: {
        _id: {
          estado: "$estado",
          tipo: "$tipo",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.estado",
        tipos: {
          $push: {
            tipo: "$_id.tipo",
            count: "$count",
          },
        },
        total: { $sum: "$count" },
      },
    },
  ]);
};

module.exports = mongoose.model("Banner", bannerSchema);
