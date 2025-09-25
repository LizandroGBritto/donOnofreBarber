const ServicioModel = require("../models/servicio.model");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  processMultipleImages,
  deleteImage,
} = require("../utils/imageProcessor");

// Configuración de multer para upload de archivos
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Permitir solo imágenes
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos de imagen"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo por archivo
  },
});

// Crear directorio uploads si no existe
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const servicioController = {
  // Obtener todos los servicios (solo activos para frontend)
  getAllServicios: async (req, res) => {
    try {
      const servicios = await ServicioModel.find({ activo: true }).sort({
        categoria: 1,
        nombre: 1,
      });
      res.status(200).json(servicios);
    } catch (error) {
      console.error("Error al obtener servicios:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Obtener todos los servicios para admin (activos e inactivos)
  getAllServiciosAdmin: async (req, res) => {
    try {
      const servicios = await ServicioModel.find({}).sort({
        categoria: 1,
        nombre: 1,
      });
      res.status(200).json(servicios);
    } catch (error) {
      console.error("Error al obtener servicios para admin:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Obtener un servicio por ID
  getOneServicio: async (req, res) => {
    try {
      const servicio = await ServicioModel.findById(req.params.id);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }
      res.status(200).json({ servicio });
    } catch (error) {
      console.error("Error al obtener servicio:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Crear un nuevo servicio con imágenes
  createServicio: async (req, res) => {
    try {
      let imagenesUrls = [];

      // Procesar imágenes si las hay
      if (req.files && req.files.length > 0) {
        imagenesUrls = await processMultipleImages(
          req.files,
          uploadsDir,
          "servicio-",
          { quality: 80, width: 800, height: 800 }
        );
      }

      const servicioData = {
        ...req.body,
        imagenes: imagenesUrls,
      };

      const nuevoServicio = await ServicioModel.create(servicioData);
      res.status(201).json({
        message: "Servicio creado exitosamente",
        servicio: nuevoServicio,
      });
    } catch (error) {
      console.error("Error al crear servicio:", error);
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Error de validación",
          errors: Object.values(error.errors).map((err) => err.message),
        });
      }
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Actualizar un servicio con imágenes
  updateServicio: async (req, res) => {
    try {
      let servicioData = { ...req.body };

      // Procesar nuevas imágenes si las hay
      if (req.files && req.files.length > 0) {
        const imagenesUrls = await processMultipleImages(
          req.files,
          uploadsDir,
          "servicio-",
          { quality: 80, width: 800, height: 800 }
        );

        // Si hay imágenes existentes y se quieren mantener, combinarlas
        const servicioExistente = await ServicioModel.findById(req.params.id);
        if (servicioExistente && req.body.mantenerImagenes === "true") {
          servicioData.imagenes = [
            ...(servicioExistente.imagenes || []),
            ...imagenesUrls,
          ];
        } else {
          servicioData.imagenes = imagenesUrls;
        }
      }

      const servicioActualizado = await ServicioModel.findByIdAndUpdate(
        req.params.id,
        servicioData,
        { new: true, runValidators: true }
      );

      if (!servicioActualizado) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      res.status(200).json({
        message: "Servicio actualizado exitosamente",
        servicio: servicioActualizado,
      });
    } catch (error) {
      console.error("Error al actualizar servicio:", error);
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Error de validación",
          errors: Object.values(error.errors).map((err) => err.message),
        });
      }
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Eliminar (desactivar) un servicio
  deleteServicio: async (req, res) => {
    try {
      const servicioEliminado = await ServicioModel.findByIdAndUpdate(
        req.params.id,
        { activo: false },
        { new: true }
      );

      if (!servicioEliminado) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      res.status(200).json({
        message: "Servicio desactivado exitosamente",
        servicio: servicioEliminado,
      });
    } catch (error) {
      console.error("Error al eliminar servicio:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Obtener servicios por categoría
  getServiciosByCategoria: async (req, res) => {
    try {
      const { categoria } = req.params;
      const servicios = await ServicioModel.find({
        categoria,
        activo: true,
      }).sort({ nombre: 1 });

      res.status(200).json({ servicios });
    } catch (error) {
      console.error("Error al obtener servicios por categoría:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Activar/desactivar servicio
  toggleServicio: async (req, res) => {
    try {
      const servicio = await ServicioModel.findById(req.params.id);

      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      servicio.activo = !servicio.activo;
      await servicio.save();

      res.status(200).json({
        message: `Servicio ${
          servicio.activo ? "activado" : "desactivado"
        } exitosamente`,
        servicio,
      });
    } catch (error) {
      console.error("Error al cambiar estado del servicio:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Eliminar imagen específica de un servicio
  deleteImagenServicio: async (req, res) => {
    try {
      const { servicioId, imagenNombre } = req.params;

      const servicio = await ServicioModel.findById(servicioId);
      if (!servicio) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }

      // Eliminar la imagen del array
      servicio.imagenes = servicio.imagenes.filter(
        (img) => img !== imagenNombre
      );
      await servicio.save();

      // Eliminar el archivo físico usando el helper
      await deleteImage(imagenNombre, uploadsDir);

      res.status(200).json({
        message: "Imagen eliminada exitosamente",
        servicio,
      });
    } catch (error) {
      console.error("Error al eliminar imagen:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },
};

// Exportar el controlador y la configuración de multer
module.exports = {
  ...servicioController,
  uploadImages: upload.array("imagenes", 5), // Máximo 5 imágenes
};
