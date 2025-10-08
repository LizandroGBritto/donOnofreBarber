const BarberoModel = require("../models/barbero.model");
const {
  processMultipleImages,
  deleteImage,
} = require("../utils/imageProcessor");
const multer = require("multer");

// Configuración de multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB por archivo
  },
  fileFilter: (req, file, cb) => {
    // Permitir solo imágenes
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de imagen"), false);
    }
  },
});

module.exports = {
  // Configuración de multer para exportar
  upload,

  // Obtener todos los barberos
  getAllBarberos: async (req, res) => {
    try {
      const barberos = await BarberoModel.find({}).sort({
        createdAt: 1,
      });
      res.status(200).json(barberos);
    } catch (error) {
      console.error("Error al obtener barberos:", error);
      res.status(500).json({
        message: "Error al obtener barberos",
        error: error.message,
      });
    }
  },

  // Obtener barberos activos
  getBarberosActivos: async (req, res) => {
    try {
      const barberos = await BarberoModel.find({ activo: true }).sort({
        createdAt: 1,
      });
      res.status(200).json(barberos);
    } catch (error) {
      console.error("Error al obtener barberos activos:", error);
      res.status(500).json({
        message: "Error al obtener barberos activos",
        error: error.message,
      });
    }
  },

  // Obtener barberos incluidos en agenda
  getBarberosParaAgenda: async (req, res) => {
    try {
      const barberos = await BarberoModel.find({
        activo: true,
        incluirEnAgenda: true,
      }).sort({
        createdAt: 1,
      });
      res.status(200).json(barberos);
    } catch (error) {
      console.error("Error al obtener barberos para agenda:", error);
      res.status(500).json({
        message: "Error al obtener barberos para agenda",
        error: error.message,
      });
    }
  },

  // Obtener un barbero por ID
  getOneBarbero: async (req, res) => {
    try {
      const barbero = await BarberoModel.findById(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }
      res.status(200).json(barbero);
    } catch (error) {
      console.error("Error al obtener barbero:", error);
      res.status(500).json({
        message: "Error al obtener barbero",
        error: error.message,
      });
    }
  },

  // Crear nuevo barbero
  createBarbero: async (req, res) => {
    try {
      const {
        nombre,
        descripcion,
        activo = true,
        incluirEnAgenda = true,
      } = req.body;

      // Procesar las imágenes subidas
      const imagenes = [];

      if (req.files) {
        // Procesar foto (requerida)
        if (req.files.foto && req.files.foto[0]) {
          const fotoProcessada = await processMultipleImages(
            [req.files.foto[0]],
            "./uploads",
            "barbero-foto-",
            { quality: 85, width: 800, height: 800 }
          );
          imagenes.push(...fotoProcessada);
        }

        // Procesar logo (opcional)
        if (req.files.logo && req.files.logo[0]) {
          const logoProcessado = await processMultipleImages(
            [req.files.logo[0]],
            "./uploads",
            "barbero-logo-",
            { quality: 90, width: 400, height: 400 }
          );
          imagenes.push(...logoProcessado);
        }
      }

      // Verificar que se subió al menos la foto
      if (!req.files || !req.files.foto || !req.files.foto[0]) {
        return res.status(400).json({
          message: "La foto del barbero es requerida",
        });
      }

      const nuevoBarbero = {
        nombre,
        descripcion,
        foto: imagenes[0], // Primera imagen procesada (foto)
        logo: imagenes[1] || null, // Segunda imagen si existe (logo)
        activo,
        incluirEnAgenda,
      };

      const barberoCreado = await BarberoModel.create(nuevoBarbero);
      res.status(201).json(barberoCreado);
    } catch (error) {
      console.error("Error al crear barbero:", error);
      res.status(500).json({
        message: "Error al crear barbero",
        error: error.message,
      });
    }
  },

  // Actualizar barbero
  updateBarbero: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion, activo, incluirEnAgenda } = req.body;

      const barbero = await BarberoModel.findById(id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      const updateData = {
        nombre,
        descripcion,
        activo,
        incluirEnAgenda,
      };

      // Procesar nuevas imágenes si se subieron
      if (req.files) {
        // Procesar nueva foto
        if (req.files.foto && req.files.foto[0]) {
          // Eliminar foto anterior
          if (barbero.foto) {
            await deleteImage(barbero.foto);
          }

          const fotoProcessada = await processMultipleImages(
            [req.files.foto[0]],
            "./uploads",
            "barbero-foto-",
            { quality: 85, width: 800, height: 800 }
          );
          updateData.foto = fotoProcessada[0];
        }

        // Procesar nuevo logo
        if (req.files.logo && req.files.logo[0]) {
          // Eliminar logo anterior si existe
          if (barbero.logo) {
            await deleteImage(barbero.logo);
          }

          const logoProcessado = await processMultipleImages(
            [req.files.logo[0]],
            "./uploads",
            "barbero-logo-",
            { quality: 90, width: 400, height: 400 }
          );
          updateData.logo = logoProcessado[0];
        }
      }

      const barberoActualizado = await BarberoModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      res.status(200).json(barberoActualizado);
    } catch (error) {
      console.error("Error al actualizar barbero:", error);
      res.status(500).json({
        message: "Error al actualizar barbero",
        error: error.message,
      });
    }
  },

  // Eliminar barbero
  deleteBarbero: async (req, res) => {
    try {
      const { id } = req.params;

      const barbero = await BarberoModel.findById(id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      // Eliminar imágenes físicas
      if (barbero.foto) {
        await deleteImage(barbero.foto);
      }
      if (barbero.logo) {
        await deleteImage(barbero.logo);
      }

      await BarberoModel.findByIdAndDelete(id);

      res.status(200).json({ message: "Barbero eliminado exitosamente" });
    } catch (error) {
      console.error("Error al eliminar barbero:", error);
      res.status(500).json({
        message: "Error al eliminar barbero",
        error: error.message,
      });
    }
  },

  // Cambiar estado activo/inactivo
  toggleEstadoBarbero: async (req, res) => {
    try {
      const { id } = req.params;
      const { activo } = req.body;

      const barbero = await BarberoModel.findByIdAndUpdate(
        id,
        { activo },
        { new: true }
      );

      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      res.status(200).json(barbero);
    } catch (error) {
      console.error("Error al cambiar estado del barbero:", error);
      res.status(500).json({
        message: "Error al cambiar estado del barbero",
        error: error.message,
      });
    }
  },
};
