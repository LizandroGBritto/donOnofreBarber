const AgendaModel = require("../models/agenda.model");
const AgendaService = require("../services/agendaService");

module.exports = {
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
      const stats = await AgendaService.obtenerEstadisticas();
      res.status(200).json({ estadisticas: stats });
    } catch (err) {
      res
        .status(400)
        .json({ message: "Error obteniendo estadísticas", error: err });
    }
  },

  // Nuevo endpoint para generar turnos de un mes específico
  generarTurnosMes: async (req, res) => {
    try {
      const { año, mes } = req.body;
      const turnosGenerados = await AgendaService.generarTurnosMes(año, mes);
      res.status(201).json({
        message: `Turnos generados exitosamente`,
        cantidad: turnosGenerados,
      });
    } catch (err) {
      res.status(400).json({ message: "Error generando turnos", error: err });
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

      res
        .status(201)
        .json({
          message: "Agenda eliminada y nueva agenda creada",
          agenda: newlyCreatedAgenda,
        });
    } catch (err) {
      res.status(400).json({ message: "Algo salió mal", error: err });
    }
  },
};
