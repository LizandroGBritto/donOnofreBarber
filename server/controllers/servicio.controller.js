const ServicioModel = require("../models/servicio.model");

const servicioController = {
  // Obtener todos los servicios
  getAllServicios: async (req, res) => {
    try {
      const servicios = await ServicioModel.find({ activo: true }).sort({
        categoria: 1,
        nombre: 1,
      });
      res.status(200).json({ servicios });
    } catch (error) {
      console.error("Error al obtener servicios:", error);
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

  // Crear un nuevo servicio
  createServicio: async (req, res) => {
    try {
      const nuevoServicio = await ServicioModel.create(req.body);
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

  // Actualizar un servicio
  updateServicio: async (req, res) => {
    try {
      const servicioActualizado = await ServicioModel.findByIdAndUpdate(
        req.params.id,
        req.body,
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
};

module.exports = servicioController;
