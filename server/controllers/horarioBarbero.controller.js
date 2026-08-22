const BarberoModel = require("../models/barbero.model");
const HorarioModel = require("../models/horario.model");
const HorariosService = require("../services/horarios.service");
const AgendaGeneratorService = require("../services/agendaGenerator.service");

async function buscarBarbero(id) {
  try {
    return await BarberoModel.findById(id);
  } catch (error) {
    return null; // id con formato inválido
  }
}

/**
 * Tras cualquier cambio de horarios propios hay que rehacer los turnos libres
 * de ESE barbero, a futuro. Se usa la regeneración acotada y no la completa:
 * la completa borra y recrea los turnos disponibles de todos los barberos en
 * 3 meses, que es lento y arriesga agenda ajena sin motivo.
 */
async function regenerar(barberoId) {
  try {
    return await AgendaGeneratorService.regenerarAgendaDeBarbero(barberoId);
  } catch (error) {
    console.error("❌ Error regenerando agenda del barbero:", error.message);
    return { error: error.message };
  }
}

module.exports = {
  /** PÚBLICO: los horarios que rigen para este barbero (propios o del local). */
  getHorariosDeBarbero: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      const horarios = await HorariosService.resolverHorariosDeBarbero(
        barbero.toObject()
      );

      res.status(200).json({
        barbero: barbero._id,
        usaHorariosPropios: barbero.usaHorariosPropios,
        horarios,
      });
    } catch (error) {
      console.error("Error al obtener horarios del barbero:", error);
      res.status(500).json({
        message: "Error al obtener los horarios",
        error: error.message,
      });
    }
  },

  /**
   * Arranca la personalización: copia los horarios del local como propios y
   * prende el flag. Idempotente.
   */
  clonarGlobales: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      const resultado = await HorariosService.clonarHorariosGlobales(
        barbero._id
      );
      const regeneracion = await regenerar(barbero._id);

      res.status(200).json({
        message: resultado.yaTenia
          ? "Ya tenía horarios propios; se activaron sin duplicarlos"
          : `Se copiaron ${resultado.clonados} horarios del local`,
        ...resultado,
        regeneracion,
      });
    } catch (error) {
      console.error("Error al clonar horarios globales:", error);
      res.status(500).json({
        message: "Error al copiar los horarios del local",
        error: error.message,
      });
    }
  },

  /** Vuelve a usar los horarios del local (conserva los propios guardados). */
  usarGlobales: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      await HorariosService.volverAHorariosGlobales(barbero._id);
      const regeneracion = await regenerar(barbero._id);

      res.status(200).json({
        message: "Ahora usa los horarios del local",
        usaHorariosPropios: false,
        regeneracion,
      });
    } catch (error) {
      console.error("Error al volver a horarios globales:", error);
      res.status(500).json({
        message: "Error al volver a los horarios del local",
        error: error.message,
      });
    }
  },

  crearHorario: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      const { hora, dias, estado } = req.body;
      if (!hora) {
        return res.status(400).json({ message: "La hora es requerida" });
      }

      const yaExiste = await HorarioModel.findOne({
        barbero: barbero._id,
        hora,
      });
      if (yaExiste) {
        return res
          .status(400)
          .json({ message: "Ya tenés un horario para esa hora" });
      }

      const horario = await HorarioModel.create({
        barbero: barbero._id,
        hora,
        dias: dias || [],
        estado: estado || "activo",
      });

      // Crear un horario propio implica que el barbero deja de usar los del
      // local: si no, la hora nueva no aparecería en ningún lado.
      if (!barbero.usaHorariosPropios) {
        barbero.usaHorariosPropios = true;
        await barbero.save();
      }

      const regeneracion = await regenerar(barbero._id);

      res.status(201).json({ message: "Horario creado", horario, regeneracion });
    } catch (error) {
      console.error("Error al crear horario del barbero:", error);
      res.status(500).json({
        message: "Error al crear el horario",
        error: error.message,
      });
    }
  },

  actualizarHorario: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      // El horario tiene que ser de ESTE barbero: sin este filtro se podría
      // editar el de otro (o uno del local) pasando su id en la URL.
      const horario = await HorarioModel.findOne({
        _id: req.params.horarioId,
        barbero: barbero._id,
      });
      if (!horario) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }

      const { hora, dias, estado } = req.body;

      if (hora && hora !== horario.hora) {
        const choca = await HorarioModel.findOne({
          barbero: barbero._id,
          hora,
          _id: { $ne: horario._id },
        });
        if (choca) {
          return res
            .status(400)
            .json({ message: "Ya tenés un horario para esa hora" });
        }
        horario.hora = hora;
      }

      if (dias !== undefined) horario.dias = dias;
      if (estado !== undefined) horario.estado = estado;

      await horario.save();
      const regeneracion = await regenerar(barbero._id);

      res.status(200).json({
        message: "Horario actualizado",
        horario,
        regeneracion,
      });
    } catch (error) {
      console.error("Error al actualizar horario del barbero:", error);
      res.status(500).json({
        message: "Error al actualizar el horario",
        error: error.message,
      });
    }
  },

  eliminarHorario: async (req, res) => {
    try {
      const barbero = await buscarBarbero(req.params.id);
      if (!barbero) {
        return res.status(404).json({ message: "Barbero no encontrado" });
      }

      const borrado = await HorarioModel.findOneAndDelete({
        _id: req.params.horarioId,
        barbero: barbero._id,
      });
      if (!borrado) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }

      const regeneracion = await regenerar(barbero._id);

      res.status(200).json({ message: "Horario eliminado", regeneracion });
    } catch (error) {
      console.error("Error al eliminar horario del barbero:", error);
      res.status(500).json({
        message: "Error al eliminar el horario",
        error: error.message,
      });
    }
  },
};
