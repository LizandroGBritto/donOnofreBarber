const mongoose = require("mongoose");

/**
 * Copia del feed de Instagram que dibuja la landing. Hay un solo documento
 * (`clave: "principal"`). Se renueva una vez al día para no gastar las vistas
 * del widget de Elfsight en cada visita (ver services/instagramFeed.service.js).
 */
const PublicacionSchema = new mongoose.Schema(
  {
    archivo: { type: String, required: true }, // "instagram/<hash>.webp" dentro de uploads/
    enlace: { type: String, required: true },
    esReel: { type: Boolean, default: false },
    likes: { type: String, default: null },
    comentarios: { type: String, default: null },
  },
  { _id: false }
);

const InstagramFeedSchema = new mongoose.Schema(
  {
    clave: { type: String, required: true, unique: true, default: "principal" },
    publicaciones: { type: [PublicacionSchema], default: [] },
    actualizadoEn: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InstagramFeed", InstagramFeedSchema);
