const Ubicacion = require("../models/ubicacion.model");

// Obtener ubicación activa
const obtenerUbicacion = async (req, res) => {
  try {
    const ubicacion = await Ubicacion.findOne({ estado: "activo" }).sort({
      createdAt: -1,
    });

    if (!ubicacion) {
      return res.status(404).json({
        success: false,
        message: "No se encontró información de ubicación",
      });
    }

    res.status(200).json({
      success: true,
      ubicacion,
    });
  } catch (error) {
    console.error("Error al obtener ubicación:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Obtener todas las ubicaciones (para admin)
const obtenerTodasUbicaciones = async (req, res) => {
  try {
    const ubicaciones = await Ubicacion.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      ubicaciones,
    });
  } catch (error) {
    console.error("Error al obtener ubicaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Crear nueva ubicación
const crearUbicacion = async (req, res) => {
  try {
    const { direccion, ciudad, pais, enlaceMaps, coordenadas } = req.body;

    // Desactivar ubicaciones anteriores
    await Ubicacion.updateMany({}, { estado: "inactivo" });

    const nuevaUbicacion = new Ubicacion({
      direccion,
      ciudad,
      pais: pais || "Paraguay",
      enlaceMaps,
      coordenadas,
      estado: "activo",
    });

    const ubicacionGuardada = await nuevaUbicacion.save();

    res.status(201).json({
      success: true,
      message: "Ubicación creada exitosamente",
      ubicacion: ubicacionGuardada,
    });
  } catch (error) {
    console.error("Error al crear ubicación:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Error de validación",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Actualizar ubicación
const actualizarUbicacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { direccion, ciudad, pais, enlaceMaps, coordenadas, estado } =
      req.body;

    const ubicacionActualizada = await Ubicacion.findByIdAndUpdate(
      id,
      { direccion, ciudad, pais, enlaceMaps, coordenadas, estado },
      { new: true, runValidators: true }
    );

    if (!ubicacionActualizada) {
      return res.status(404).json({
        success: false,
        message: "Ubicación no encontrada",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ubicación actualizada exitosamente",
      ubicacion: ubicacionActualizada,
    });
  } catch (error) {
    console.error("Error al actualizar ubicación:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Error de validación",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// Eliminar ubicación
const eliminarUbicacion = async (req, res) => {
  try {
    const { id } = req.params;

    const ubicacionEliminada = await Ubicacion.findByIdAndDelete(id);

    if (!ubicacionEliminada) {
      return res.status(404).json({
        success: false,
        message: "Ubicación no encontrada",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ubicación eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar ubicación:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

module.exports = {
  obtenerUbicacion,
  obtenerTodasUbicaciones,
  crearUbicacion,
  actualizarUbicacion,
  eliminarUbicacion,
};
