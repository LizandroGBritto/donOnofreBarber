const HorarioModel = require("../models/horario.model");

const horarioController = {
  // Obtener todos los horarios
  getAllHorarios: async (req, res) => {
    try {
      const horarios = await HorarioModel.find().sort({ diaSemana: 1 });
      res.status(200).json({ horarios });
    } catch (error) {
      console.error("Error al obtener horarios:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Obtener horario por día de la semana
  getHorarioPorDia: async (req, res) => {
    try {
      const { dia } = req.params;
      const horario = await HorarioModel.findOne({
        diaSemana: dia.toLowerCase(),
      });

      if (!horario) {
        return res
          .status(404)
          .json({ message: "Horario no encontrado para este día" });
      }

      res.status(200).json({ horario });
    } catch (error) {
      console.error("Error al obtener horario:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Crear o actualizar horario para un día
  createOrUpdateHorario: async (req, res) => {
    try {
      const { diaSemana } = req.body;

      let horario = await HorarioModel.findOne({
        diaSemana: diaSemana.toLowerCase(),
      });

      if (horario) {
        // Actualizar horario existente
        horario = await HorarioModel.findByIdAndUpdate(horario._id, req.body, {
          new: true,
          runValidators: true,
        });
        res.status(200).json({
          message: "Horario actualizado exitosamente",
          horario,
        });
      } else {
        // Crear nuevo horario
        horario = await HorarioModel.create({
          ...req.body,
          diaSemana: diaSemana.toLowerCase(),
        });
        res.status(201).json({
          message: "Horario creado exitosamente",
          horario,
        });
      }
    } catch (error) {
      console.error("Error al crear/actualizar horario:", error);
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

  // Generar slots de tiempo para una fecha específica
  generateSlots: async (req, res) => {
    try {
      const { fecha } = req.query;

      if (!fecha) {
        return res.status(400).json({ message: "La fecha es requerida" });
      }

      const fechaObj = new Date(fecha);
      const diasSemana = [
        "domingo",
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
      ];
      const diaSemana = diasSemana[fechaObj.getDay()];

      const horario = await HorarioModel.findOne({ diaSemana, activo: true });

      if (!horario) {
        return res.status(404).json({
          message: "No hay horarios configurados para este día",
          slots: [],
        });
      }

      const slots = horario.generarSlots(fechaObj);

      res.status(200).json({
        fecha,
        diaSemana,
        slots,
        total: slots.length,
      });
    } catch (error) {
      console.error("Error al generar slots:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Añadir excepción para una fecha específica
  addExcepcion: async (req, res) => {
    try {
      const { diaSemana, fecha, cerrado, horariosEspeciales } = req.body;

      const horario = await HorarioModel.findOne({
        diaSemana: diaSemana.toLowerCase(),
      });

      if (!horario) {
        return res
          .status(404)
          .json({ message: "Horario no encontrado para este día" });
      }

      // Verificar si ya existe una excepción para esta fecha
      const fechaObj = new Date(fecha);
      const excepcionExistente = horario.excepciones.find(
        (exc) => exc.fecha.toDateString() === fechaObj.toDateString()
      );

      if (excepcionExistente) {
        // Actualizar excepción existente
        excepcionExistente.cerrado = cerrado;
        excepcionExistente.horariosEspeciales = horariosEspeciales || [];
      } else {
        // Añadir nueva excepción
        horario.excepciones.push({
          fecha: fechaObj,
          cerrado,
          horariosEspeciales: horariosEspeciales || [],
        });
      }

      await horario.save();

      res.status(200).json({
        message: "Excepción añadida exitosamente",
        horario,
      });
    } catch (error) {
      console.error("Error al añadir excepción:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Eliminar excepción
  removeExcepcion: async (req, res) => {
    try {
      const { diaSemana, fecha } = req.params;

      const horario = await HorarioModel.findOne({
        diaSemana: diaSemana.toLowerCase(),
      });

      if (!horario) {
        return res
          .status(404)
          .json({ message: "Horario no encontrado para este día" });
      }

      const fechaObj = new Date(fecha);
      horario.excepciones = horario.excepciones.filter(
        (exc) => exc.fecha.toDateString() !== fechaObj.toDateString()
      );

      await horario.save();

      res.status(200).json({
        message: "Excepción eliminada exitosamente",
        horario,
      });
    } catch (error) {
      console.error("Error al eliminar excepción:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },

  // Activar/desactivar día
  toggleDia: async (req, res) => {
    try {
      const { diaSemana } = req.params;

      const horario = await HorarioModel.findOne({
        diaSemana: diaSemana.toLowerCase(),
      });

      if (!horario) {
        return res
          .status(404)
          .json({ message: "Horario no encontrado para este día" });
      }

      horario.activo = !horario.activo;
      await horario.save();

      res.status(200).json({
        message: `Día ${
          horario.activo ? "activado" : "desactivado"
        } exitosamente`,
        horario,
      });
    } catch (error) {
      console.error("Error al cambiar estado del día:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },
};

module.exports = horarioController;
