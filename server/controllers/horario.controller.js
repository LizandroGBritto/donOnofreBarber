const HorarioModel = require("../models/horario.model");
const axios = require("axios");

// Función auxiliar para regenerar agenda
const regenerarAgenda = async () => {
  try {
    await axios.post(
      `${
        process.env.SERVER_URL || "http://localhost:8000"
      }/api/agenda/regenerar-por-horarios`,
      {}
    );
    console.log("Agenda regenerada exitosamente tras cambio de horario");
  } catch (error) {
    console.error("Error al regenerar agenda:", error.message);
  }
};

const horarioController = {
  // Obtener todos los horarios
  getAllHorarios: async (req, res) => {
    try {
      const { estado } = req.query;
      const filter = estado ? { estado } : {};
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

      // Validar que no existe un horario con la misma hora
      const horarioExistente = await HorarioModel.findOne({ hora });
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
      await regenerarAgenda();

      res.status(201).json({
        message: "Horario creado exitosamente y agenda regenerada",
        horario: horarioGuardado,
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

      // Si se está cambiando la hora, validar que no exista otra con la misma hora
      if (hora && hora !== horario.hora) {
        const horarioExistente = await HorarioModel.findOne({
          hora,
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
