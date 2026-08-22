const HorarioModel = require("../models/horario.model");
const AgendaGeneratorService = require("../services/agendaGenerator.service");

/**
 * Regenera la agenda tras un cambio en los horarios del local.
 *
 * Antes esto hacía `axios.post` al propio endpoint
 * `/api/agenda/regenerar-por-horarios` SIN mandar la cookie de sesión. Cuando
 * esa ruta pasó a exigir `authenticate` (commit daf5c87), empezó a devolver
 * 401 y el error se tragaba en este mismo catch: durante un mes, crear o
 * editar un horario no regeneró nada, aunque el panel dijera que sí.
 *
 * Ahora llama al servicio directamente: sin HTTP, sin autenticación de por
 * medio, y los errores se propagan al que llama.
 */
const regenerarAgenda = async () => {
  try {
    const resultado = await AgendaGeneratorService.regenerarAgendaCompleta();
    console.log(
      `✅ Agenda regenerada tras cambio de horario: ` +
        `${resultado.turnosCreados} creados, ${resultado.turnosEliminados} eliminados`
    );
    return resultado;
  } catch (error) {
    // No se re-lanza: el horario ya se guardó y el fallo de regeneración no
    // debe hacer fallar la request. Pero sí se informa al que llama para que
    // la respuesta no mienta.
    console.error("❌ Error al regenerar agenda:", error.message);
    return { error: error.message };
  }
};

const horarioController = {
  // Obtener todos los horarios
  getAllHorarios: async (req, res) => {
    try {
      const { estado } = req.query;
      // Solo los horarios del LOCAL. Los propios de cada barbero se consultan
      // por /api/barberos/:id/horarios; si se colaran acá, la landing y el
      // panel global los mostrarían mezclados como si fueran del negocio.
      const filter = { barbero: null };
      if (estado && typeof estado === "string") filter.estado = estado;
      const horarios = await HorarioModel.find(filter).sort({ hora: 1 });
      res.status(200).json({ horarios });
    } catch (error) {
      console.error("Error al obtener horarios:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Obtener horario por ID
  getHorario: async (req, res) => {
    try {
      const { id } = req.params;
      const horario = await HorarioModel.findById(id);

      if (!horario) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }

      res.status(200).json({ horario });
    } catch (error) {
      console.error("Error al obtener horario:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Crear nuevo horario
  createHorario: async (req, res) => {
    try {
      const { hora, dias, estado } = req.body;

      // La unicidad de la hora es por barbero: este controller maneja los
      // horarios del LOCAL (barbero: null), así que solo choca contra otros
      // globales. Los propios de un barbero pueden repetir la misma hora.
      const horarioExistente = await HorarioModel.findOne({
        hora,
        barbero: null,
      });
      if (horarioExistente) {
        return res.status(400).json({
          message: "Ya existe un horario para esta hora",
        });
      }

      const nuevoHorario = new HorarioModel({
        hora,
        dias: dias || [],
        estado: estado || "activo",
      });

      const horarioGuardado = await nuevoHorario.save();

      // Regenerar agenda basada en los nuevos horarios
      const regeneracion = await regenerarAgenda();

      res.status(201).json({
        // El mensaje refleja lo que pasó de verdad: antes decía siempre "y
        // agenda regenerada" aunque la regeneración hubiese fallado.
        message: regeneracion.error
          ? "Horario creado, pero falló la regeneración de la agenda"
          : "Horario creado exitosamente y agenda regenerada",
        horario: horarioGuardado,
        regeneracion,
      });
    } catch (error) {
      console.error("Error al crear horario:", error);
      res.status(500).json({
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  },

  // Actualizar horario
  updateHorario: async (req, res) => {
    try {
      const { id } = req.params;
      const { hora, dias, estado } = req.body;

      const horario = await HorarioModel.findById(id);
      if (!horario) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }

      // Si se está cambiando la hora, validar que no choque con otro horario
      // DEL MISMO ámbito (los del local entre sí, los de un barbero entre sí).
      if (hora && hora !== horario.hora) {
        const horarioExistente = await HorarioModel.findOne({
          hora,
          barbero: horario.barbero ?? null,
          _id: { $ne: id },
        });
        if (horarioExistente) {
          return res.status(400).json({
            message: "Ya existe un horario para esta hora",
          });
        }
      }

      const horarioActualizado = await HorarioModel.findByIdAndUpdate(
        id,
        {
          ...(hora && { hora }),
          ...(dias && { dias }),
          ...(estado && { estado }),
        },
        { new: true, runValidators: true }
      );

      // Regenerar agenda basada en los horarios actualizados
      await regenerarAgenda();

      res.status(200).json({
        message: "Horario actualizado exitosamente y agenda regenerada",
        horario: horarioActualizado,
      });
    } catch (error) {
      console.error("Error al actualizar horario:", error);
      res.status(500).json({
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  },

  // Eliminar horario
  deleteHorario: async (req, res) => {
    try {
      const { id } = req.params;

      const horario = await HorarioModel.findById(id);
      if (!horario) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }

      await HorarioModel.findByIdAndDelete(id);

      res.status(200).json({
        message: "Horario eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error al eliminar horario:", error);
      res.status(500).json({
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  },

  // Cambiar estado de horario
  toggleEstado: async (req, res) => {
    try {
      const { id } = req.params;

      const horario = await HorarioModel.findById(id);
      if (!horario) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }

      const nuevoEstado = horario.estado === "activo" ? "inactivo" : "activo";

      const horarioActualizado = await HorarioModel.findByIdAndUpdate(
        id,
        { estado: nuevoEstado },
        { new: true }
      );

      // Regenerar agenda basada en el cambio de estado
      await regenerarAgenda();

      res.status(200).json({
        message: `Horario ${
          nuevoEstado === "activo" ? "activado" : "desactivado"
        } exitosamente y agenda regenerada`,
        horario: horarioActualizado,
      });
    } catch (error) {
      console.error("Error al cambiar estado del horario:", error);
      res.status(500).json({
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  },
};

module.exports = horarioController;
