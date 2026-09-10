const path = require("path");
const multer = require("multer");
const BarberoModel = require("../models/barbero.model");
const PreciosService = require("../services/precios.service");
const {
  processMultipleImages,
  deleteImage,
} = require("../utils/imageProcessor");

const uploadsDir = path.join(__dirname, "..", "uploads");

// Mismos límites y filtro que el resto de las subidas del proyecto.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Solo se permiten archivos de imagen"), false);
  },
});

/** 404 si el barbero no existe; devuelve el doc si existe. */
async function buscarBarbero(id) {
  try {
    return await BarberoModel.findById(id).lean();
  } catch (error) {
    // id con formato inválido: se trata como "no existe".
    return null;
  }
}

module.exports = {
  // Middleware de multer para las fotos propias del barbero.
  subirImagenes: upload.array("imagenes", 5),

  /**
   * Sube fotos propias de este barbero para un servicio. Reemplazan a las del
   * catálogo en la landing cuando ese barbero está seleccionado.
   */
  agregarImagenes: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No se recibió ninguna imagen" });
      }

      const nombres = await processMultipleImages(
        req.files,
        uploadsDir,
        `barbero-${barbero._id}-servicio-`,
        { quality: 80, width: 800, height: 800 }
      );

      const imagenes = await PreciosService.guardarImagenesDeBarbero(
        barbero._id,
        req.params.servicioId,
        nombres
      );

      res.status(201).json({ message: "Imágenes agregadas", imagenes });
    } catch (error) {
      if (error.name === "ErrorServicioInvalido") {
        return res
          .status(400)
          .json({ message: error.message, ...error.detalles });
      }
      console.error("Error al subir imágenes del barbero:", error);
      res.status(500).json({
        message: "Error al subir las imágenes",
        error: error.message,
      });
    }
  },

  /** Quita una foto propia del barbero para un servicio. */
  quitarImagen: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      // El servicio valida que la foto sea realmente de este barbero: el
      // nombre llega por la URL y no se puede confiar en él.
      const quitada = await PreciosService.quitarImagenDeBarbero(
        barbero._id,
        req.params.servicioId,
        req.params.imagen
      );

      if (!quitada) {
        return res.status(404).json({ message: "Imagen no encontrada" });
      }

      await deleteImage(quitada, uploadsDir);

      res.status(200).json({ message: "Imagen eliminada" });
    } catch (error) {
      console.error("Error al quitar imagen del barbero:", error);
      res.status(500).json({
        message: "Error al eliminar la imagen",
        error: error.message,
      });
    }
  },

  /**
   * Catálogo resuelto de un barbero. PÚBLICO: lo consume la landing cuando el
   * cliente selecciona un barbero, para mostrar sus precios.
   */
  getServiciosDeBarbero: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      const servicios = await PreciosService.listarServiciosDeBarbero(
        barbero._id
      );

      res.status(200).json(servicios);
    } catch (error) {
      console.error("Error al obtener servicios del barbero:", error);
      res.status(500).json({
        message: "Error al obtener los servicios del barbero",
        error: error.message,
      });
    }
  },

  /**
   * Vista de edición: todos los servicios del catálogo con el precio que aplica
   * y si está personalizado. Admin o el propio barbero.
   */
  getPreciosDeBarbero: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      const precios = await PreciosService.listarPreciosDeBarbero(barbero._id);

      res.status(200).json({ barbero: barbero._id, precios });
    } catch (error) {
      console.error("Error al obtener precios del barbero:", error);
      res.status(500).json({
        message: "Error al obtener los precios",
        error: error.message,
      });
    }
  },

  /** Guarda los precios propios. Admin o el propio barbero. */
  guardarPreciosDeBarbero: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      const cambios = Array.isArray(req.body) ? req.body : req.body?.precios;

      const resultado = await PreciosService.guardarPreciosDeBarbero(
        barbero._id,
        cambios || []
      );

      const precios = await PreciosService.listarPreciosDeBarbero(barbero._id);

      res.status(200).json({
        message: "Precios actualizados",
        ...resultado,
        precios,
      });
    } catch (error) {
      if (error.name === "ErrorServicioInvalido") {
        return res
          .status(400)
          .json({ message: error.message, ...error.detalles });
      }
      console.error("Error al guardar precios del barbero:", error);
      res.status(500).json({
        message: "Error al guardar los precios",
        error: error.message,
      });
    }
  },
};
