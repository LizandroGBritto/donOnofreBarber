const Ubicacion = require("../models/ubicacion.model");

/**
 * Normaliza las coordenadas que manda el panel.
 *
 * Devuelve `{ lat, lng }` si vienen las dos y son números, `null` si vienen
 * vacías (se borran) y `undefined` si el campo no vino (no se toca). Lanza si
 * viene una sola o alguna no es un número: guardar media coordenada dejaría
 * el mapa de la landing apuntando a cualquier lado.
 */
const normalizarCoordenadas = (coordenadas) => {
  if (coordenadas === undefined) return undefined;
  if (coordenadas === null) return null;

  const vacio = (v) => v === undefined || v === null || v === "";
  const { lat, lng } = coordenadas;
  if (vacio(lat) && vacio(lng)) return null;

  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (
    vacio(lat) ||
    vacio(lng) ||
    !Number.isFinite(latNum) ||
    !Number.isFinite(lngNum)
  ) {
    const error = new Error(
      "Las coordenadas llevan latitud y longitud, las dos numéricas"
    );
    error.name = "CoordenadasInvalidas";
    throw error;
  }
  return { lat: latNum, lng: lngNum };
};

const responderCoordenadasInvalidas = (res, error) =>
  res.status(400).json({
    success: false,
    message: "Error de validación",
    errors: [error.message],
  });

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
    const { direccion, ciudad, pais, enlaceMaps } = req.body;
    const coordenadas = normalizarCoordenadas(req.body.coordenadas) || undefined;

    const nuevaUbicacion = new Ubicacion({
      direccion,
      ciudad,
      pais: pais || "Paraguay",
      enlaceMaps,
      coordenadas,
      estado: "activo",
    });

    // Validar ANTES de desactivar las anteriores. Al revés, una ubicación
    // nueva inválida dejaba el sitio sin ninguna activa: la landing se quedaba
    // sin dirección hasta que alguien cargara una válida.
    await nuevaUbicacion.validate();
    await Ubicacion.updateMany(
      { _id: { $ne: nuevaUbicacion._id } },
      { estado: "inactivo" }
    );

    const ubicacionGuardada = await nuevaUbicacion.save();

    res.status(201).json({
      success: true,
      message: "Ubicación creada exitosamente",
      ubicacion: ubicacionGuardada,
    });
  } catch (error) {
    console.error("Error al crear ubicación:", error);

    if (error.name === "CoordenadasInvalidas") {
      return responderCoordenadasInvalidas(res, error);
    }

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
    const { direccion, ciudad, pais, enlaceMaps, estado } = req.body;
    const coordenadas = normalizarCoordenadas(req.body.coordenadas);

    const cambios = { direccion, ciudad, pais, enlaceMaps, estado };
    if (coordenadas) cambios.coordenadas = coordenadas;
    // `null` = el panel las vació a propósito: se borran. `undefined` = no
    // vinieron en el pedido: quedan como estaban.
    const operacion =
      coordenadas === null
        ? { $set: cambios, $unset: { coordenadas: 1 } }
        : { $set: cambios };

    const ubicacionActualizada = await Ubicacion.findByIdAndUpdate(
      id,
      operacion,
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

    if (error.name === "CoordenadasInvalidas") {
      return responderCoordenadasInvalidas(res, error);
    }

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
