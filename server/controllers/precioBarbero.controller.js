const BarberoModel = require("../models/barbero.model");
const PreciosService = require("../services/precios.service");

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
