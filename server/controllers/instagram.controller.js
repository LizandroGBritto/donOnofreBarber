const Feed = require("../services/instagramFeed.service");

const obtenerFeed = async (req, res) => {
  try {
    res.json(await Feed.obtener());
  } catch (error) {
    console.error("Error al leer el feed de Instagram:", error);
    res.status(500).json({ message: "No se pudo leer el feed" });
  }
};

// Público: lo manda el navegador de la visita que cargó el widget porque la
// copia estaba vencida. Ver services/instagramFeed.service.js.
const renovarFeed = async (req, res) => {
  try {
    res.status(201).json(await Feed.renovar(req.body?.publicaciones));
  } catch (error) {
    if (error instanceof Feed.FeedVigente) {
      return res.status(409).json({ message: "El feed está al día" });
    }
    if (error instanceof Feed.FeedInvalido) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Error al renovar el feed de Instagram:", error);
    res.status(500).json({ message: "No se pudo renovar el feed" });
  }
};

module.exports = { obtenerFeed, renovarFeed };
