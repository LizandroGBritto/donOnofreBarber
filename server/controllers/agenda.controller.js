const AgendaModel = require("../models/agenda.model");
const AgendaGeneratorService = require("../services/agendaGenerator.service");
const HorarioModel = require("../models/horario.model");
const ParaguayDateUtil = require("../utils/paraguayDate");
const NotificationService = require("../services/notificationService");

module.exports = {
  // Endpoint para eliminar todos los turnos de hoy (usando hora de Paraguay)
  eliminarTurnosHoy: async (req, res) => {
    try {
      const { startOfDay, endOfDay } = ParaguayDateUtil.createDateRange();

      console.log(
        `Eliminando TODOS los turnos entre ${startOfDay.toISOString()} y ${endOfDay.toISOString()}`
      );

      const eliminados = await AgendaModel.deleteMany({
        fecha: { $gte: startOfDay, $lte: endOfDay },
      });

      console.log(`Eliminados ${eliminados.deletedCount} turnos`);

      res.status(200).json({
        message: "Turnos eliminados exitosamente",
        eliminados: eliminados.deletedCount,
        fechaInicio: startOfDay.toISOString(),
        fechaFin: endOfDay.toISOString(),
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

      const fechaObj = ParaguayDateUtil.toParaguayTime(fecha).toDate();
      const { startOfDay, endOfDay } =
        ParaguayDateUtil.createDateRange(fechaObj);

      console.log(`Eliminando turnos para ${fecha}...`);

      // Eliminar todos los turnos de esta fecha
      const eliminados = await AgendaModel.deleteMany({
        fecha: { $gte: startOfDay, $lte: endOfDay },
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

  // Nuevo endpoint para limpiar turnos de barberos excluidos
  limpiarTurnosBarberosExcluidos: async (req, res) => {
    try {
      const { fechaInicio, fechaFin } = req.body;

      const resultado =
        await AgendaGeneratorService.limpiarTurnosBarberosExcluidos(
          fechaInicio ? new Date(fechaInicio) : null,
          fechaFin ? new Date(fechaFin) : null
        );

      res.status(200).json(resultado);
    } catch (error) {
      console.error("Error al limpiar turnos de barberos excluidos:", error);
      res.status(500).json({
        message: "Error al limpiar turnos de barberos excluidos",
        error: error.message,
      });
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
      .populate("barbero", "nombre foto")
      .then((allAgendas) => {
        const agendasConCosto = allAgendas.filter(
          (a) => a.costoTotal > 0 || a.costoServicios > 0
        );
        res.status(200).json({ agendas: allAgendas });
      })
      .catch((err) =>
        res.status(400).json({ message: "Algo salió mal", error: err })
      );
  },

  // Nuevo endpoint: Obtener turnos con disponibilidad por barberos
  getTurnosConDisponibilidad: async (req, res) => {
    try {
      const BarberoModel = require("../models/barbero.model");

      // Obtener todos los barberos activos
      const barberosActivos = await BarberoModel.find({ activo: true });
      const totalBarberos = barberosActivos.length;

      if (totalBarberos === 0) {
        return res.status(200).json({ agendas: [] });
      }

      // Obtener todos los turnos
      const allTurnos = await AgendaModel.find({})
        .populate("barbero", "nombre foto")
        .sort({ fecha: 1, hora: 1 });

      // Agrupar turnos por fecha y hora
      const turnosPorFechaHora = {};
      allTurnos.forEach((turno) => {
        const fechaKey = ParaguayDateUtil.getDateOnly(turno.fecha);
        const horaKey = turno.hora;
        const key = `${fechaKey}-${horaKey}`;

        if (!turnosPorFechaHora[key]) {
          turnosPorFechaHora[key] = {
            fecha: turno.fecha,
            hora: turno.hora,
            diaSemana: turno.diaSemana,
            turnos: [],
          };
        }
        turnosPorFechaHora[key].turnos.push(turno);
      });

      // Crear turnos virtuales con estado de disponibilidad basado en barberos
      const turnosVirtuales = [];

      Object.values(turnosPorFechaHora).forEach((grupo) => {
        const turnosOcupados = grupo.turnos.filter(
          (t) => t.estado !== "disponible" && t.barbero
        );

        const barberosOcupados = turnosOcupados.length;
        const hayDisponibilidad = barberosOcupados < totalBarberos;

        // Si hay un turno del usuario, mostrarlo
        const turnoUsuario = grupo.turnos.find(
          (t) => t.nombreCliente && t.nombreCliente !== ""
        );

        if (turnoUsuario) {
          turnosVirtuales.push(turnoUsuario);
        } else {
          // Crear un turno virtual que represente la disponibilidad general
          const turnoVirtual = {
            _id: `virtual-${grupo.fecha.getTime()}-${grupo.hora}`,
            fecha: grupo.fecha,
            hora: grupo.hora,
            diaSemana: grupo.diaSemana,
            estado: hayDisponibilidad ? "disponible" : "reservado",
            nombreCliente: "",
            numeroCliente: "",
            emailCliente: "",
            barbero: null,
            nombreBarbero: "",
            servicios: [],
            costoTotal: 0,
            costoServicios: 0,
            barberosDisponibles: totalBarberos - barberosOcupados,
            totalBarberos: totalBarberos,
          };
          turnosVirtuales.push(turnoVirtual);
        }
      });

      res.status(200).json({ agendas: turnosVirtuales });
    } catch (error) {
      console.error("Error al obtener turnos con disponibilidad:", error);
      res.status(500).json({
        message: "Error al obtener turnos",
        error: error.message,
      });
    }
  },

  // Endpoint: Obtener disponibilidad de barberos por fecha específica
  getDisponibilidadPorFecha: async (req, res) => {
    try {
      const { fecha } = req.params;
      const BarberoModel = require("../models/barbero.model");

      // Obtener todos los barberos activos
      const barberosActivos = await BarberoModel.find({ activo: true });

      // Buscar todos los turnos para esa fecha
      const fechaInicio = new Date(fecha);
      fechaInicio.setHours(0, 0, 0, 0);

      const fechaFin = new Date(fecha);
      fechaFin.setHours(23, 59, 59, 999);

      const turnosFecha = await AgendaModel.find({
        fecha: {
          $gte: fechaInicio,
          $lte: fechaFin,
        },
      }).populate("barbero", "nombre foto");

      // Agrupar por hora
      const disponibilidadPorHora = {};

      // Inicializar todas las horas con todos los barberos disponibles
      const horasDisponibles = [...new Set(turnosFecha.map((t) => t.hora))];

      horasDisponibles.forEach((hora) => {
        const turnosHora = turnosFecha.filter((t) => t.hora === hora);
        const turnosOcupados = turnosHora.filter(
          (t) => t.estado !== "disponible" && t.barbero
        );
        const barberosOcupados = turnosOcupados.map((t) => ({
          barbero: t.barbero,
          turno: t,
        }));

        const barberosDisponibles = barberosActivos.filter(
          (barbero) =>
            !turnosOcupados.some(
              (turnoOcupado) =>
                turnoOcupado.barbero._id.toString() === barbero._id.toString()
            )
        );

        disponibilidadPorHora[hora] = {
          barberosDisponibles,
          barberosOcupados,
          totalDisponibles: barberosDisponibles.length,
          totalOcupados: barberosOcupados.length,
        };
      });

      res.status(200).json({
        disponibilidad: disponibilidadPorHora,
        totalBarberos: barberosActivos.length,
      });
    } catch (error) {
      console.error("Error al obtener disponibilidad por fecha:", error);
      res.status(500).json({
        message: "Error al obtener disponibilidad",
        error: error.message,
      });
    }
  },

  // Endpoint específico para la landing - Vista limpia con un turno por hora
  getTurnosLanding: async (req, res) => {
    try {
      // Obtener barberos activos para calcular disponibilidad
      const BarberoModel = require("../models/barbero.model");
      const barberosActivos = await BarberoModel.find({ activo: true });
      const totalBarberos = barberosActivos.length;

      // ✅ OPTIMIZACIÓN: Solo obtener turnos de los próximos 30 días
      const hoy = ParaguayDateUtil.now().startOf("day").toDate();
      const treintaDiasDespues = ParaguayDateUtil.now()
        .add(30, "days")
        .endOf("day")
        .toDate();

      // Obtener solo los turnos del rango de fechas
      const allTurnos = await AgendaModel.find({
        fecha: { $gte: hoy, $lte: treintaDiasDespues },
      })
        .populate("barbero", "nombre foto")
        .sort({ fecha: 1, hora: 1 });

      console.log(`✅ getTurnosLanding OPTIMIZADO:`);
      console.log(
        `   - Rango: ${hoy.toISOString().split("T")[0]} a ${
          treintaDiasDespues.toISOString().split("T")[0]
        }`
      );
      console.log(
        `   - Turnos encontrados: ${allTurnos.length} (antes: todos los turnos en BD)`
      );

      // Agrupar turnos por fecha y hora usando un Map para mejor control
      const turnosPorFechaHora = new Map();

      allTurnos.forEach((turno, index) => {
        // Crear clave más robusta
        const fecha = new Date(turno.fecha);
        const fechaString = fecha.toISOString().split("T")[0]; // YYYY-MM-DD
        const key = `${fechaString}|${turno.hora}`;

        if (!turnosPorFechaHora.has(key)) {
          turnosPorFechaHora.set(key, {
            fecha: turno.fecha,
            hora: turno.hora,
            diaSemana: turno.diaSemana,
            disponibles: [],
            ocupados: [],
            usuarios: [], // Turnos con cliente asignado
          });
        }
        const grupo = turnosPorFechaHora.get(key);

        if (turno.nombreCliente && turno.nombreCliente.trim() !== "") {
          grupo.usuarios.push(turno);
        } else if (turno.estado === "disponible") {
          grupo.disponibles.push(turno);
        } else {
          grupo.ocupados.push(turno);
        }
      });

      // Crear vista limpia: un turno por hora, considerando disponibilidad de barberos
      const turnosLimpios = [];

      turnosPorFechaHora.forEach((grupo, key) => {
        // Calcular barberos ocupados en esta hora
        const barberosOcupados =
          grupo.usuarios.length +
          grupo.ocupados.filter((t) => t.barbero).length;
        const hayDisponibilidadDeBarberos = barberosOcupados < totalBarberos;

        let turnoRepresentativo;

        // Prioridad 1: Si hay turnos disponibles Y hay barberos disponibles, mostrar disponible
        if (grupo.disponibles.length > 0 && hayDisponibilidadDeBarberos) {
          turnoRepresentativo = {
            ...grupo.disponibles[0]._doc,
            cantidadDisponibles: grupo.disponibles.length,
            cantidadOcupados: grupo.ocupados.length,
            cantidadUsuarios: grupo.usuarios.length,
            hayDisponibilidad: true,
            esUsuario: false,
            totalBarberos: totalBarberos,
            barberosOcupados: barberosOcupados,
            // Mantener estado original del turno disponible
            estado: "disponible",
          };
        }
        // Prioridad 2: Si hay turnos disponibles pero NO hay barberos disponibles, mostrar como reservado
        else if (grupo.disponibles.length > 0 && !hayDisponibilidadDeBarberos) {
          turnoRepresentativo = {
            ...grupo.disponibles[0]._doc,
            cantidadDisponibles: grupo.disponibles.length,
            cantidadOcupados: grupo.ocupados.length,
            cantidadUsuarios: grupo.usuarios.length,
            hayDisponibilidad: false,
            esUsuario: false,
            totalBarberos: totalBarberos,
            barberosOcupados: barberosOcupados,
            // Cambiar estado a reservado porque no hay barberos disponibles
            estado: "reservado",
          };
        }
        // Prioridad 3: Si NO hay disponibles pero hay usuarios, mostrar el primero
        else if (grupo.usuarios.length > 0) {
          turnoRepresentativo = {
            ...grupo.usuarios[0]._doc,
            cantidadDisponibles: 0,
            cantidadOcupados: grupo.ocupados.length,
            cantidadUsuarios: grupo.usuarios.length,
            hayDisponibilidad: false,
            esUsuario: true,
            totalBarberos: totalBarberos,
            barberosOcupados: barberosOcupados,
          };
        }
        // Prioridad 4: Si NO hay disponibles ni usuarios, mostrar ocupado
        else if (grupo.ocupados.length > 0) {
          turnoRepresentativo = {
            ...grupo.ocupados[0]._doc,
            cantidadDisponibles: 0,
            cantidadOcupados: grupo.ocupados.length,
            cantidadUsuarios: grupo.usuarios.length,
            hayDisponibilidad: false,
            esUsuario: false,
            totalBarberos: totalBarberos,
            barberosOcupados: barberosOcupados,
          };
        } else {
          console.log(`⚠️  NO HAY TURNOS para agregar en grupo: ${key}`);
        }

        if (turnoRepresentativo) {
          turnosLimpios.push(turnoRepresentativo);
        }
      });

      // Log de turnos finales para verificar duplicados
      const keysFinal = turnosLimpios.map((t) => {
        const fechaString = new Date(t.fecha).toISOString().split("T")[0];
        return `${fechaString}|${t.hora}`;
      });
      const keysUnicas = [...new Set(keysFinal)];

      if (keysFinal.length !== keysUnicas.length) {
        console.log(`❗ DUPLICADOS DETECTADOS:`);
        const duplicados = keysFinal.filter(
          (key, index) => keysFinal.indexOf(key) !== index
        );
        duplicados.forEach((key) => {
          console.log(`   - Key duplicada: ${key}`);
        });
      }

      // Ordenar por fecha y hora
      turnosLimpios.sort((a, b) => {
        const fechaA = new Date(a.fecha);
        const fechaB = new Date(b.fecha);
        if (fechaA.getTime() !== fechaB.getTime()) {
          return fechaA - fechaB;
        }
        const horaA = parseInt(a.hora.replace(":", ""), 10);
        const horaB = parseInt(b.hora.replace(":", ""), 10);
        return horaA - horaB;
      });

      res.status(200).json({
        agendas: turnosLimpios,
        mensaje:
          "Vista optimizada para landing - próximos 30 días, un turno por hora",
        estadisticas: {
          totalTurnos: allTurnos.length,
          gruposUnicos: turnosPorFechaHora.size,
          turnosLimpios: turnosLimpios.length,
          rangoFechas: {
            desde: hoy.toISOString().split("T")[0],
            hasta: treintaDiasDespues.toISOString().split("T")[0],
          },
        },
      });
    } catch (error) {
      console.error("❌ ERROR en getTurnosLanding:", error);
      res.status(500).json({
        message: "Error al obtener turnos para landing",
        error: error.message,
      });
    }
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
      .populate("barbero", "nombre foto")
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
  updateOneAgendaById: async (req, res) => {
    try {
      // Obtener el turno anterior para comparar cambios
      const turnoAnterior = await AgendaModel.findById(req.params.id);

      const updatedAgenda = await AgendaModel.findOneAndUpdate(
        { _id: req.params.id },
        req.body,
        { new: true }
      ).populate("barbero", "nombre foto");

      // Detectar si el turno fue liberado (cambió a disponible)
      const fueLibrado =
        turnoAnterior.estado !== "disponible" &&
        req.body.estado === "disponible";

      // Detectar si el turno fue editado (cambió información del cliente)
      const fueEditado =
        turnoAnterior.nombreCliente &&
        req.body.nombreCliente &&
        turnoAnterior.nombreCliente !== req.body.nombreCliente;

      // Enviar notificaciones según el tipo de cambio
      if (fueLibrado) {
        try {
          await NotificationService.notificarTurnoLiberado(updatedAgenda);
        } catch (notifError) {
          console.error(
            "Error al enviar notificación de turno liberado:",
            notifError
          );
        }
      } else if (fueEditado) {
        try {
          await NotificationService.notificarTurnoEditado(updatedAgenda);
        } catch (notifError) {
          console.error(
            "Error al enviar notificación de turno editado:",
            notifError
          );
        }
      }

      res.status(200).json({ agenda: updatedAgenda });
    } catch (err) {
      res.status(400).json({ message: "Algo salió mal", error: err });
    }
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
        hora: agenda.hora,
        nombreCliente: "",
        numeroCliente: "",
        emailCliente: "",
        fecha: agenda.fecha,
        diaSemana: agenda.diaSemana,
        servicios: [],
        costoTotal: 0,
        costoServicios: 0,
        descuento: 0,
        estado: "disponible",
        estadoPago: "pendiente",
        notas: "",
        creadoAutomaticamente: true,
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

  // Regenerar agenda basada en horarios configurados
  regenerarAgendaPorHorarios: async (req, res) => {
    try {
      const { fechaInicio, fechaFin } = req.body;

      // Usar el nuevo método del servicio que genera UN turno por barbero
      const resultado = await AgendaGeneratorService.regenerarAgendaCompleta(
        fechaInicio ? new Date(fechaInicio) : null,
        fechaFin ? new Date(fechaFin) : null
      );

      res.status(200).json(resultado);
    } catch (error) {
      console.error("Error al regenerar agenda por horarios:", error);
      res.status(500).json({
        message: "Error al regenerar agenda",
        error: error.message,
      });
    }
  },

  // Endpoint para limpiar turnos duplicados solamente
  limpiarDuplicados: async (req, res) => {
    try {
      const { fechaInicio, fechaFin } = req.body;

      const duplicadosEliminados =
        await AgendaGeneratorService.eliminarDuplicados(
          fechaInicio ? new Date(fechaInicio) : null,
          fechaFin ? new Date(fechaFin) : null
        );

      res.status(200).json({
        mensaje: "Duplicados eliminados exitosamente",
        duplicadosEliminados: duplicadosEliminados,
      });
    } catch (error) {
      console.error("Error al limpiar duplicados:", error);
      res.status(500).json({
        message: "Error al limpiar duplicados",
        error: error.message,
      });
    }
  },

  // Nuevo endpoint: Obtener disponibilidad por barbero para una fecha específica
  getDisponibilidadPorBarbero: async (req, res) => {
    try {
      const { fecha } = req.params;
      const BarberoModel = require("../models/barbero.model");

      if (!fecha) {
        return res.status(400).json({ message: "Fecha es requerida" });
      }

      const fechaObj = ParaguayDateUtil.toParaguayTime(fecha).toDate();

      // Obtener todos los barberos activos
      const barberos = await BarberoModel.find({ activo: true }).select(
        "_id nombre foto"
      );

      // Obtener todos los turnos para esta fecha
      const turnos = await AgendaModel.find({ fecha: fechaObj }).populate(
        "barbero",
        "nombre foto"
      );

      // Organizar turnos por hora
      const turnosPorHora = {};
      turnos.forEach((turno) => {
        if (!turnosPorHora[turno.hora]) {
          turnosPorHora[turno.hora] = [];
        }
        turnosPorHora[turno.hora].push(turno);
      });

      // Crear estructura de disponibilidad
      const disponibilidad = {};
      Object.keys(turnosPorHora).forEach((hora) => {
        const turnosHora = turnosPorHora[hora];
        disponibilidad[hora] = {
          barberosDisponibles: [],
          barberosOcupados: [],
          completamenteOcupado: false,
        };

        // Verificar qué barberos están disponibles
        barberos.forEach((barbero) => {
          const turnoOcupado = turnosHora.find(
            (t) =>
              t.barbero &&
              t.barbero._id.toString() === barbero._id.toString() &&
              ["reservado", "pagado", "en_proceso"].includes(t.estado)
          );

          if (turnoOcupado) {
            disponibilidad[hora].barberosOcupados.push({
              barbero: barbero,
              turno: turnoOcupado,
            });
          } else {
            disponibilidad[hora].barberosDisponibles.push(barbero);
          }
        });

        // Si no hay barberos disponibles, marcar como completamente ocupado
        disponibilidad[hora].completamenteOcupado =
          disponibilidad[hora].barberosDisponibles.length === 0;
      });

      res.status(200).json({
        fecha: fecha,
        barberos: barberos,
        disponibilidad: disponibilidad,
      });
    } catch (error) {
      console.error("Error al obtener disponibilidad por barbero:", error);
      res.status(500).json({
        message: "Error al obtener disponibilidad",
        error: error.message,
      });
    }
  },

  // Nuevo endpoint: Reservar turno con barbero específico
  reservarTurnoConBarbero: async (req, res) => {
    try {
      const {
        fecha,
        hora,
        barberoId,
        nombreCliente,
        numeroCliente,
        servicios = [],
      } = req.body;

      const BarberoModel = require("../models/barbero.model");

      // Validaciones básicas (sin requerir email)
      if (!fecha || !hora || !barberoId || !nombreCliente) {
        return res.status(400).json({
          message: "Fecha, hora, barbero y nombre del cliente son requeridos",
        });
      }

      const fechaObj = ParaguayDateUtil.toParaguayTime(fecha).toDate();

      // Verificar que el barbero existe y está activo
      const barbero = await BarberoModel.findOne({
        _id: barberoId,
        activo: true,
      });
      if (!barbero) {
        return res
          .status(404)
          .json({ message: "Barbero no encontrado o inactivo" });
      }

      // Buscar turno disponible del barbero en esa fecha/hora
      let turnoAEditar = await AgendaModel.findOne({
        fecha: {
          $gte: ParaguayDateUtil.startOfDay(fechaObj).toDate(),
          $lte: ParaguayDateUtil.endOfDay(fechaObj).toDate(),
        },
        hora: hora,
        barbero: barberoId,
        estado: "disponible",
      });

      // Si no existe turno disponible, verificar si hay conflicto
      if (!turnoAEditar) {
        const turnoOcupado = await AgendaModel.findOne({
          fecha: {
            $gte: ParaguayDateUtil.startOfDay(fechaObj).toDate(),
            $lte: ParaguayDateUtil.endOfDay(fechaObj).toDate(),
          },
          hora: hora,
          barbero: barberoId,
          estado: { $in: ["reservado", "pagado", "en_proceso"] },
        });

        if (turnoOcupado) {
          return res.status(409).json({
            message: "El barbero ya tiene un turno reservado en este horario",
          });
        }

        // Crear nuevo turno si no existe ninguno
        turnoAEditar = new AgendaModel({
          fecha: ParaguayDateUtil.startOfDay(fechaObj).toDate(),
          hora: hora,
          diaSemana: ParaguayDateUtil.getDayOfWeek(fechaObj),
          barbero: barberoId,
          nombreBarbero: barbero.nombre,
          estado: "disponible",
          creadoAutomaticamente: false,
        });
      }

      // Antes de editar, eliminar otros turnos duplicados en la misma fecha/hora
      await AgendaModel.deleteMany({
        fecha: {
          $gte: ParaguayDateUtil.startOfDay(fechaObj).toDate(),
          $lte: ParaguayDateUtil.endOfDay(fechaObj).toDate(),
        },
        hora: hora,
        _id: { $ne: turnoAEditar._id }, // Excluir el turno que vamos a editar
        estado: "disponible",
        $or: [
          { nombreCliente: "" },
          { nombreCliente: { $exists: false } },
          { numeroCliente: "" },
          { numeroCliente: { $exists: false } },
        ],
      });

      // Editar el turno encontrado con los datos de la reserva
      turnoAEditar.estado = "reservado";
      turnoAEditar.nombreCliente = nombreCliente;
      turnoAEditar.numeroCliente = numeroCliente;
      turnoAEditar.servicios = servicios;
      turnoAEditar.fechaReserva = new Date();

      // Calcular costo total si hay servicios
      if (servicios.length > 0) {
        turnoAEditar.calcularCostoTotal();
      }

      await turnoAEditar.save();

      // Populate el barbero para la respuesta
      await turnoAEditar.populate("barbero", "nombre foto");

      // Enviar notificación de nueva reserva
      try {
        await NotificationService.notificarNuevaReserva(turnoAEditar);
      } catch (notifError) {
        console.error(
          "Error al enviar notificación de nueva reserva:",
          notifError
        );
        // No fallar la reserva por error de notificación
      }

      res.status(200).json({
        message: "Turno reservado exitosamente",
        turno: turnoAEditar,
      });
    } catch (error) {
      console.error("Error al reservar turno con barbero:", error);
      res.status(500).json({
        message: "Error al reservar turno",
        error: error.message,
      });
    }
  },

  // Migrar agenda al nuevo sistema multi-barbero
  migrarAgendaMultiBarbero: async (req, res) => {
    try {
      const AgendaGeneratorService = require("../services/agendaGenerator.service");
      const generatorService = new AgendaGeneratorService();

      const resultado = await generatorService.migrarAgendaMultiBarbero();

      res.status(200).json({
        message: "Migración completada exitosamente",
        ...resultado,
      });
    } catch (error) {
      console.error("Error en migración:", error);
      res.status(500).json({
        message: "Error durante la migración",
        error: error.message,
      });
    }
  },

  // Endpoint para obtener información de horarios y semanas para el frontend
  // Endpoint para obtener información de horarios y semanas para el frontend
  getHorariosYSemanas: async (req, res) => {
    try {
      // Obtener horarios activos
      const horariosActivos = await HorarioModel.find({
        estado: "activo",
      }).lean();

      // Mapear días de horarios activos
      const diasActivosSet = new Set();
      horariosActivos.forEach((horario) => {
        horario.dias?.forEach((dia) => diasActivosSet.add(dia));
      });

      const diasActivos = Array.from(diasActivosSet);

      // Generar próximas 4 semanas
      const hoy = new Date();

      const semanas = [];

      for (let i = 0; i < 4; i++) {
        // 🔧 CORRECCIÓN: Calcular el lunes correctamente
        const fechaBase = new Date();
        const diaSemanaHoy = fechaBase.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado

        // Calcular días hasta el lunes más cercano
        // Si es domingo (0), retroceder 6 días
        // Si es lunes (1), no mover
        // Si es martes (2), retroceder 1 día
        // etc.
        let diasHastaLunes;
        if (diaSemanaHoy === 0) {
          diasHastaLunes = -6; // Domingo: ir al lunes anterior
        } else {
          diasHastaLunes = 1 - diaSemanaHoy; // Otros días: calcular diferencia
        }

        // Obtener el lunes de la semana actual
        const lunesActual = new Date(fechaBase);
        lunesActual.setDate(fechaBase.getDate() + diasHastaLunes);
        lunesActual.setHours(0, 0, 0, 0); // Reset tiempo a medianoche

        // Ahora sumar las semanas completas
        const inicioSemana = new Date(lunesActual);
        inicioSemana.setDate(lunesActual.getDate() + i * 7);
        inicioSemana.setHours(0, 0, 0, 0);

        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        finSemana.setHours(23, 59, 59, 999);

        const diaSemanaInicio = inicioSemana.toLocaleDateString("es-ES", {
          weekday: "long",
        });
        const diaSemanaFin = finSemana.toLocaleDateString("es-ES", {
          weekday: "long",
        });

        // Verificar que inicioSemana sea lunes
        if (inicioSemana.getDay() !== 1) {
          console.error(
            `❌ ERROR: inicioSemana NO es lunes! Es día ${inicioSemana.getDay()}`
          );
        }

        semanas.push({
          numero: i + 1,
          inicioSemana: inicioSemana.toISOString().split("T")[0],
          finSemana: finSemana.toISOString().split("T")[0],
          label: `Semana del ${inicioSemana
            .getDate()
            .toString()
            .padStart(2, "0")}/${(inicioSemana.getMonth() + 1)
            .toString()
            .padStart(2, "0")} - ${finSemana
            .getDate()
            .toString()
            .padStart(2, "0")}/${(finSemana.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`,
        });
      }

      res.status(200).json({
        diasActivos,
        semanas,
        horariosActivos: horariosActivos.map((h) => ({
          hora: h.hora,
          dias: h.dias || [],
        })),
      });
    } catch (error) {
      console.error("Error al obtener horarios y semanas:", error);
      res.status(500).json({
        message: "Error al obtener horarios y semanas",
        error: error.message,
      });
    }
  },

  // Verificar si un número de teléfono ya tiene un turno abierto (reservado o confirmado)
  verificarTurnoExistente: async (req, res) => {
    try {
      const { numeroCliente } = req.params;

      if (!numeroCliente) {
        return res.status(400).json({
          message: "Número de cliente es requerido",
        });
      }

      // ✅ Calcular límite de 12 horas desde ahora
      const ahora = ParaguayDateUtil.now().toDate();
      const docehoras = ParaguayDateUtil.now().add(12, "hours").toDate();

      // Buscar turnos que estén en estados activos (no disponible ni pagado)
      // Y que estén dentro de las próximas 12 horas
      const turnoExistente = await AgendaModel.findOne({
        numeroCliente: numeroCliente,
        estado: { $in: ["reservado", "confirmado"] },
        fecha: { $gte: ahora, $lte: docehoras },
      }).populate("barbero", "nombre");

      if (turnoExistente) {
        // Formatear la fecha para mostrar
        const fechaFormateada = ParaguayDateUtil.toParaguayTime(
          turnoExistente.fecha
        ).format("DD/MM/YYYY");

        const nombreBarbero =
          turnoExistente.barbero?.nombre ||
          turnoExistente.nombreBarbero ||
          "Sin barbero asignado";

        res.status(200).json({
          tieneTurno: true,
          turno: {
            fecha: fechaFormateada,
            hora: turnoExistente.hora,
            barbero: nombreBarbero,
            estado: turnoExistente.estado,
          },
          mensaje:
            "Ya tienes un turno reservado dentro de las próximas 12 horas",
        });
      } else {
        res.status(200).json({
          tieneTurno: false,
          turno: null,
          mensaje: "No tienes turnos reservados en las próximas 12 horas",
        });
      }
    } catch (error) {
      console.error("Error al verificar turno existente:", error);
      res.status(500).json({
        message: "Error al verificar turno existente",
        error: error.message,
      });
    }
  },
};
