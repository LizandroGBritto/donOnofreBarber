const AgendaModel = require("../models/agenda.model");
const AgendaGeneratorService = require("../services/agendaGenerator.service");
const HorarioModel = require("../models/horario.model");

module.exports = {
  // Endpoint para eliminar todos los turnos de hoy (23 septiembre)
  eliminarTurnosHoy: async (req, res) => {
    try {
      const hoy = new Date();
      const inicioHoy = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate(),
        0,
        0,
        0,
        0
      );
      const finHoy = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate(),
        23,
        59,
        59,
        999
      );

      console.log(
        `Eliminando TODOS los turnos entre ${inicioHoy.toISOString()} y ${finHoy.toISOString()}`
      );

      const eliminados = await AgendaModel.deleteMany({
        fecha: { $gte: inicioHoy, $lte: finHoy },
      });

      console.log(`Eliminados ${eliminados.deletedCount} turnos`);

      res.status(200).json({
        message: "Turnos eliminados exitosamente",
        eliminados: eliminados.deletedCount,
        fechaInicio: inicioHoy.toISOString(),
        fechaFin: finHoy.toISOString(),
      });
    } catch (error) {
      console.error("Error al eliminar turnos:", error);
      res
        .status(500)
        .json({ message: "Error al eliminar turnos", error: error.message });
    }
  },

  // Endpoint para eliminar todos los turnos de una fecha y regenerarlos
  regenerarTurnosFecha: async (req, res) => {
    try {
      const { fecha } = req.body;
      if (!fecha) {
        return res.status(400).json({ message: "Fecha es requerida" });
      }

      const fechaObj = new Date(fecha);
      const inicioFecha = new Date(
        fechaObj.getFullYear(),
        fechaObj.getMonth(),
        fechaObj.getDate(),
        0,
        0,
        0,
        0
      );
      const finFecha = new Date(
        fechaObj.getFullYear(),
        fechaObj.getMonth(),
        fechaObj.getDate(),
        23,
        59,
        59,
        999
      );

      console.log(`Eliminando turnos para ${fecha}...`);

      // Eliminar todos los turnos de esta fecha
      const eliminados = await AgendaModel.deleteMany({
        fecha: { $gte: inicioFecha, $lte: finFecha },
      });

      console.log(`Eliminados ${eliminados.deletedCount} turnos`);

      // Regenerar turnos para esta fecha
      console.log(`Regenerando turnos para ${fecha}...`);
      const resultado = await AgendaGeneratorService.generarTurnosPorFecha(
        fechaObj
      );

      res.status(200).json({
        message: "Turnos regenerados exitosamente",
        fecha: fecha,
        eliminados: eliminados.deletedCount,
        regeneracion: resultado,
      });
    } catch (error) {
      console.error("Error al regenerar turnos:", error);
      res
        .status(500)
        .json({ message: "Error al regenerar turnos", error: error.message });
    }
  },

  // Endpoint para limpiar turnos duplicados
  limpiarTurnosDuplicados: async (req, res) => {
    try {
      console.log("Iniciando limpieza de turnos duplicados...");

      // Obtener todos los turnos agrupados por fecha y hora
      const pipeline = [
        {
          $match: {
            estado: "disponible",
            creadoAutomaticamente: true,
          },
        },
        {
          $group: {
            _id: {
              fechaStr: {
                $dateToString: { format: "%Y-%m-%d", date: "$fecha" },
              },
              hora: "$hora",
              diaSemana: "$diaSemana",
            },
            turnos: { $push: "$$ROOT" },
            count: { $sum: 1 },
          },
        },
        {
          $match: { count: { $gt: 1 } },
        },
      ];

      const duplicados = await AgendaModel.aggregate(pipeline);
      let eliminados = 0;

      // Eliminar duplicados, manteniendo solo el primero
      for (const grupo of duplicados) {
        const turnosAEliminar = grupo.turnos.slice(1); // Mantener el primero, eliminar el resto
        const ids = turnosAEliminar.map((t) => t._id);

        const resultado = await AgendaModel.deleteMany({ _id: { $in: ids } });
        eliminados += resultado.deletedCount;

        console.log(
          `Eliminados ${resultado.deletedCount} duplicados para ${grupo._id.fechaStr} ${grupo._id.hora}`
        );
      }

      res.status(200).json({
        message: "Limpieza completada",
        gruposDuplicados: duplicados.length,
        turnosEliminados: eliminados,
      });
    } catch (error) {
      console.error("Error al limpiar duplicados:", error);
      res
        .status(500)
        .json({ message: "Error en limpieza", error: error.message });
    }
  },

  // Endpoint de diagnóstico para verificar horarios y turnos
  diagnosticoHorarios: async (req, res) => {
    try {
      const hoy = new Date();
      const diaSemana = [
        "domingo",
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
      ][hoy.getDay()];

      // Obtener horarios configurados
      const horarios = await HorarioModel.find({}).lean();
      const horarioHoy = await HorarioModel.findOne({
        diaSemana,
        activo: true,
      });

      let slotsHoy = [];
      if (horarioHoy) {
        slotsHoy = horarioHoy.generarSlots(hoy);
      }

      // Contar turnos de hoy con rango correcto
      const inicioHoy = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate(),
        0,
        0,
        0,
        0
      );
      const finHoy = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate(),
        23,
        59,
        59,
        999
      );

      const turnosHoy = await AgendaModel.countDocuments({
        fecha: { $gte: inicioHoy, $lte: finHoy },
      });

      const turnosEjemplo = await AgendaModel.find({
        fecha: { $gte: inicioHoy, $lte: finHoy },
      })
        .limit(10)
        .lean();

      // Contar también por cada fecha específica
      const conteosPorFechaExacta = await AgendaModel.aggregate([
        {
          $match: { fecha: { $gte: inicioHoy, $lte: finHoy } },
        },
        {
          $group: {
            _id: "$fecha",
            count: { $sum: 1 },
            horas: { $addToSet: "$hora" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      res.status(200).json({
        fecha: hoy.toISOString().split("T")[0],
        diaSemana,
        horarios: horarios.map((h) => ({
          dia: h.diaSemana,
          activo: h.activo,
          configuraciones: h.horarios,
        })),
        horarioHoy: horarioHoy
          ? {
              dia: horarioHoy.diaSemana,
              activo: horarioHoy.activo,
              configuraciones: horarioHoy.horarios,
            }
          : null,
        slotsGenerados: slotsHoy.length,
        primerosSlots: slotsHoy.slice(0, 10),
        turnosEnBD: turnosHoy,
        conteosPorFechaExacta: conteosPorFechaExacta,
        ejemplosTurnos: turnosEjemplo.map((t) => ({
          hora: t.hora,
          estado: t.estado,
          fecha: t.fecha,
        })),
      });
    } catch (error) {
      console.error("Error en diagnóstico:", error);
      res
        .status(500)
        .json({ message: "Error en diagnóstico", error: error.message });
    }
  },

  getAllAgendas: (req, res) => {
    AgendaModel.find({})
      .then((allAgendas) => res.status(200).json({ agendas: allAgendas }))
      .catch((err) =>
        res.status(400).json({ message: "Algo salió mal", error: err })
      );
  },

  // Nuevo endpoint para obtener estadísticas del dashboard
  getEstadisticas: async (req, res) => {
    try {
      const stats = await AgendaGeneratorService.obtenerEstadisticas();
      res.status(200).json({ estadisticas: stats });
    } catch (err) {
      res
        .status(400)
        .json({ message: "Error obteniendo estadísticas", error: err });
    }
  },

  // Nuevo endpoint para generar turnos
  generarTurnosMes: async (req, res) => {
    try {
      const { tipo = "mes", año, fechaInicio, fechaFin } = req.body;

      let resultado;

      switch (tipo) {
        case "año":
          resultado = await AgendaGeneratorService.generarTurnosAño(año);
          break;
        case "proximoMes":
          resultado = await AgendaGeneratorService.generarTurnosProximoMes();
          break;
        case "rango":
          if (!fechaInicio || !fechaFin) {
            return res.status(400).json({
              message:
                "fechaInicio y fechaFin son requeridas para tipo 'rango'",
            });
          }
          resultado = await AgendaGeneratorService.generarTurnosRango(
            new Date(fechaInicio),
            new Date(fechaFin)
          );
          break;
        default:
          return res.status(400).json({
            message: "Tipo no válido. Use: 'año', 'proximoMes', o 'rango'",
          });
      }

      res.status(200).json({
        message: "Turnos generados exitosamente",
        ...resultado,
      });
    } catch (error) {
      console.error("Error al generar turnos:", error);
      res
        .status(500)
        .json({ message: "Error interno del servidor", error: error.message });
    }
  },
  getOneAgenda: (req, res) => {
    AgendaModel.findOne({ _id: req.params.id })
      .then((oneSingleAgenda) =>
        res.status(200).json({ agenda: oneSingleAgenda })
      )
      .catch((err) =>
        res.status(400).json({ message: "Algo salió mal", error: err })
      );
  },
  createAgenda: (req, res) => {
    AgendaModel.create(req.body)
      .then((newlyCreatedAgenda) =>
        res.status(201).json({ agenda: newlyCreatedAgenda })
      )
      .catch((err) =>
        res.status(400).json({ message: "Algo salió mal", error: err })
      );
  },
  updateOneAgendaById: (req, res) => {
    AgendaModel.findOneAndUpdate({ _id: req.params.id }, req.body, {
      new: true,
    })
      .then((updatedAgenda) => res.status(200).json({ agenda: updatedAgenda }))
      .catch((err) =>
        res.status(400).json({ message: "Algo salió mal", error: err })
      );
  },
  deleteOneAgendaById: (req, res) => {
    AgendaModel.deleteOne({ _id: req.params.id })
      .then((result) => res.status(200).json({ result: result }))
      .catch((err) =>
        res.status(400).json({ message: "Algo salió mal", error: err })
      );
  },
  deleteAndCreateNewAgenda: async (req, res) => {
    try {
      const agenda = await AgendaModel.findOne({ _id: req.params.id });
      if (!agenda) {
        return res.status(404).json({ message: "Agenda no encontrada" });
      }

      // Eliminar la agenda existente
      await AgendaModel.deleteOne({ _id: req.params.id });

      // Crear una nueva agenda con los mismos datos de día y hora
      const newAgenda = {
        Hora: agenda.Hora,
        NombreCliente: "",
        NumeroCliente: "",
        Dia: agenda.Dia,
        UserId: "",
        Servicios: [],
        Costo: 0,
        Estado: "Sin Pagar",
      };

      const newlyCreatedAgenda = await AgendaModel.create(newAgenda);

      res.status(201).json({
        message: "Agenda eliminada y nueva agenda creada",
        agenda: newlyCreatedAgenda,
      });
    } catch (err) {
      res.status(400).json({ message: "Algo salió mal", error: err });
    }
  },
};
