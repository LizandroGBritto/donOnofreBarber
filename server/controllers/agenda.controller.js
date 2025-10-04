const AgendaModel = require("../models/agenda.model");
const AgendaGeneratorService = require("../services/agendaGenerator.service");
const HorarioModel = require("../models/horario.model");
const ParaguayDateUtil = require("../utils/paraguayDate");

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
        if (agendasConCosto.length > 0) {
          console.log(
            "Ejemplos con costo:",
            agendasConCosto.slice(0, 3).map((a) => ({
              id: a._id,
              costoTotal: a.costoTotal,
              costoServicios: a.costoServicios,
              servicios: a.servicios?.length || 0,
            }))
          );
        }
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
      console.log("🚀 INICIANDO getTurnosLanding");

      // Obtener barberos activos para calcular disponibilidad
      const BarberoModel = require("../models/barbero.model");
      const barberosActivos = await BarberoModel.find({ activo: true });
      const totalBarberos = barberosActivos.length;

      console.log(`👥 Total barberos activos: ${totalBarberos}`);

      // Obtener todos los turnos
      const allTurnos = await AgendaModel.find({})
        .populate("barbero", "nombre foto")
        .sort({ fecha: 1, hora: 1 });

      console.log(`🔍 Total turnos encontrados en BD: ${allTurnos.length}`);

      // Log de primeros 5 turnos para análisis
      allTurnos.slice(0, 5).forEach((turno, index) => {
        const fechaString = new Date(turno.fecha).toISOString().split("T")[0];
        console.log(
          `📋 Turno ${index + 1}: ${fechaString} ${turno.hora} - Estado: ${
            turno.estado
          } - Cliente: "${turno.nombreCliente || "VACIO"}" - ID: ${turno._id}`
        );
      });

      // Agrupar turnos por fecha y hora usando un Map para mejor control
      const turnosPorFechaHora = new Map();

      allTurnos.forEach((turno, index) => {
        // Crear clave más robusta
        const fecha = new Date(turno.fecha);
        const fechaString = fecha.toISOString().split("T")[0]; // YYYY-MM-DD
        const key = `${fechaString}|${turno.hora}`;

        console.log(
          `🔑 Procesando turno ${index + 1}: Key="${key}" - Estado: ${
            turno.estado
          } - Cliente: "${turno.nombreCliente || "VACIO"}"`
        );

        if (!turnosPorFechaHora.has(key)) {
          console.log(`✨ CREANDO nuevo grupo para key: ${key}`);
          turnosPorFechaHora.set(key, {
            fecha: turno.fecha,
            hora: turno.hora,
            diaSemana: turno.diaSemana,
            disponibles: [],
            ocupados: [],
            usuarios: [], // Turnos con cliente asignado
          });
        } else {
          console.log(`📂 AGREGANDO a grupo existente: ${key}`);
        }

        const grupo = turnosPorFechaHora.get(key);

        if (turno.nombreCliente && turno.nombreCliente.trim() !== "") {
          grupo.usuarios.push(turno);
          console.log(
            `👤 -> Agregado a USUARIOS (${grupo.usuarios.length} total)`
          );
        } else if (turno.estado === "disponible") {
          grupo.disponibles.push(turno);
          console.log(
            `✅ -> Agregado a DISPONIBLES (${grupo.disponibles.length} total)`
          );
        } else {
          grupo.ocupados.push(turno);
          console.log(
            `❌ -> Agregado a OCUPADOS (${grupo.ocupados.length} total)`
          );
        }
      });

      console.log(`📊 RESUMEN AGRUPACIÓN:`);
      console.log(`   - Total grupos únicos: ${turnosPorFechaHora.size}`);

      // Log detallado de cada grupo
      turnosPorFechaHora.forEach((grupo, key) => {
        console.log(
          `🏷️  Grupo "${key}": Disponibles=${grupo.disponibles.length}, Ocupados=${grupo.ocupados.length}, Usuarios=${grupo.usuarios.length}`
        );
      });

      // Crear vista limpia: un turno por hora, considerando disponibilidad de barberos
      const turnosLimpios = [];

      turnosPorFechaHora.forEach((grupo, key) => {
        console.log(`🎯 PROCESANDO GRUPO: ${key}`);

        // Calcular barberos ocupados en esta hora
        const barberosOcupados =
          grupo.usuarios.length +
          grupo.ocupados.filter((t) => t.barbero).length;
        const hayDisponibilidadDeBarberos = barberosOcupados < totalBarberos;

        console.log(
          `   📊 Barberos ocupados: ${barberosOcupados}/${totalBarberos}`
        );
        console.log(
          `   🆓 Hay disponibilidad de barberos: ${hayDisponibilidadDeBarberos}`
        );

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
          console.log(
            `✅ SELECCIONADO: Disponible (hay barberos libres) - ID: ${grupo.disponibles[0]._id}`
          );
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
          console.log(
            `🚫 SELECCIONADO: Disponible pero TODOS los barberos ocupados - ID: ${grupo.disponibles[0]._id}`
          );
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
          console.log(
            `👤 SELECCIONADO: Usuario (sin disponibles) (${grupo.usuarios[0].nombreCliente}) - ID: ${grupo.usuarios[0]._id}`
          );
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
          console.log(
            `❌ SELECCIONADO: Ocupado (sin disponibles) - ID: ${grupo.ocupados[0]._id}`
          );
        } else {
          console.log(`⚠️  NO HAY TURNOS para agregar en grupo: ${key}`);
        }

        if (turnoRepresentativo) {
          turnosLimpios.push(turnoRepresentativo);
          console.log(
            `✅ AGREGADO AL RESULTADO FINAL: ${key} - Total turnos limpios: ${turnosLimpios.length}`
          );
        }
      });

      console.log(`🎯 RESULTADO FINAL:`);
      console.log(`   - Turnos limpios generados: ${turnosLimpios.length}`);
      console.log(
        `   - Debería ser igual a grupos únicos: ${turnosPorFechaHora.size}`
      );

      // Log de turnos finales para verificar duplicados
      const keysFinal = turnosLimpios.map((t) => {
        const fechaString = new Date(t.fecha).toISOString().split("T")[0];
        return `${fechaString}|${t.hora}`;
      });
      const keysUnicas = [...new Set(keysFinal)];

      console.log(`🔍 VERIFICACIÓN DUPLICADOS:`);
      console.log(`   - Keys en resultado: ${keysFinal.length}`);
      console.log(`   - Keys únicas: ${keysUnicas.length}`);

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

      console.log(
        `🏁 FINALIZANDO getTurnosLanding - Enviando ${turnosLimpios.length} turnos`
      );

      res.status(200).json({
        agendas: turnosLimpios,
        mensaje: "Vista optimizada para landing - un turno por hora",
        estadisticas: {
          totalTurnos: allTurnos.length,
          gruposUnicos: turnosPorFechaHora.size,
          turnosLimpios: turnosLimpios.length,
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

      // Si no se proporcionan fechas, usar desde hoy hasta 3 meses después
      const inicio = fechaInicio
        ? ParaguayDateUtil.toParaguayTime(fechaInicio)
        : ParaguayDateUtil.now();

      const fin = fechaFin
        ? ParaguayDateUtil.toParaguayTime(fechaFin)
        : ParaguayDateUtil.now().add(3, "months");

      console.log(
        `Regenerando agenda desde ${inicio.format(
          "YYYY-MM-DD"
        )} hasta ${fin.format("YYYY-MM-DD")}`
      );

      // Obtener todos los horarios activos
      const horariosActivos = await HorarioModel.find({ estado: "activo" });

      if (horariosActivos.length === 0) {
        return res.status(400).json({
          message: "No hay horarios activos configurados",
        });
      }

      let turnosCreados = 0;
      let turnosEliminados = 0;

      // Para cada día desde el inicio hasta el fin
      const fechaActual = inicio.clone();
      while (fechaActual.isSameOrBefore(fin, "day")) {
        const diaSemana = ParaguayDateUtil.getDayOfWeek(fechaActual.toDate());

        // Eliminar turnos existentes sin cliente para este día
        const eliminados = await AgendaModel.deleteMany({
          fecha: {
            $gte: ParaguayDateUtil.startOfDay(fechaActual.toDate()).toDate(),
            $lte: ParaguayDateUtil.endOfDay(fechaActual.toDate()).toDate(),
          },
          nombreCliente: { $in: ["", null] },
          estado: "disponible",
        });

        turnosEliminados += eliminados.deletedCount;

        // Crear nuevos turnos basados en horarios configurados
        for (const horario of horariosActivos) {
          // Verificar si este horario aplica para el día actual
          if (horario.dias.includes(diaSemana)) {
            const nuevoTurno = {
              fecha: ParaguayDateUtil.startOfDay(fechaActual.toDate()).toDate(),
              hora: horario.hora,
              diaSemana: diaSemana,
              nombreCliente: "",
              numeroCliente: "",
              emailCliente: "",
              estado: "disponible",
              estadoPago: "pendiente",
              costoTotal: 0,
              costoServicios: 0,
              descuento: 0,
              notas: "",
              creadoAutomaticamente: true,
              servicios: [],
            };

            await AgendaModel.create(nuevoTurno);
            turnosCreados++;
          }
        }

        fechaActual.add(1, "day");
      }

      res.status(200).json({
        message: "Agenda regenerada exitosamente",
        turnosCreados,
        turnosEliminados,
        horariosUtilizados: horariosActivos.length,
        fechaInicio: inicio.format("YYYY-MM-DD"),
        fechaFin: fin.format("YYYY-MM-DD"),
      });
    } catch (error) {
      console.error("Error al regenerar agenda por horarios:", error);
      res.status(500).json({
        message: "Error al regenerar agenda",
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
              ["reservado", "confirmado", "en_proceso"].includes(t.estado)
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

      // Verificar disponibilidad del barbero
      const turnoExistente = await AgendaModel.findOne({
        fecha: fechaObj,
        hora: hora,
        barbero: barberoId,
        estado: { $in: ["reservado", "confirmado", "en_proceso"] },
      });

      if (turnoExistente) {
        return res.status(409).json({
          message: "El barbero ya tiene un turno reservado en este horario",
        });
      }

      // Crear un nuevo turno específico para este barbero (no modificar turnos existentes)
      const nuevoTurno = new AgendaModel({
        fecha: fechaObj,
        hora: hora,
        diaSemana: ParaguayDateUtil.getDayOfWeek(fechaObj),
        estado: "reservado",
        barbero: barberoId,
        nombreBarbero: barbero.nombre,
        nombreCliente: nombreCliente,
        numeroCliente: numeroCliente,
        servicios: servicios,
        fechaReserva: new Date(),
        creadoAutomaticamente: false,
      });

      // Calcular costo total si hay servicios
      if (servicios.length > 0) {
        nuevoTurno.calcularCostoTotal();
      }

      await nuevoTurno.save();

      // Populate el barbero para la respuesta
      await nuevoTurno.populate("barbero", "nombre foto");

      res.status(200).json({
        message: "Turno reservado exitosamente",
        turno: nuevoTurno,
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
  getHorariosYSemanas: async (req, res) => {
    try {
      // Obtener horarios activos (corregir el campo estado)
      const horariosActivos = await HorarioModel.find({
        estado: "activo",
      }).lean();
      console.log("🔍 Horarios encontrados:", horariosActivos.length);

      // Mapear días de horarios activos
      const diasActivosSet = new Set();
      horariosActivos.forEach((horario) => {
        console.log(
          "📅 Procesando horario:",
          horario.hora,
          "días:",
          horario.dias
        );
        horario.dias?.forEach((dia) => diasActivosSet.add(dia));
      });

      const diasActivos = Array.from(diasActivosSet);
      console.log("📋 Días activos finales:", diasActivos);

      // Generar próximas 4 semanas
      const hoy = new Date();
      console.log(
        "📅 Fecha de hoy:",
        hoy.toISOString().split("T")[0],
        `(${hoy.toLocaleDateString("es-ES", { weekday: "long" })})`
      );
      const semanas = [];

      for (let i = 0; i < 4; i++) {
        // Calcular el lunes de la semana actual primero
        const fechaBase = new Date(hoy);
        const diaSemanaHoy = fechaBase.getDay();
        const diasHastaLunesActual = diaSemanaHoy === 0 ? -6 : 1 - diaSemanaHoy;
        fechaBase.setDate(fechaBase.getDate() + diasHastaLunesActual);
        console.log(
          `📍 Lunes de la semana actual: ${
            fechaBase.toISOString().split("T")[0]
          }`
        );

        // Ahora sumar las semanas completas
        const inicioSemana = new Date(fechaBase);
        inicioSemana.setDate(fechaBase.getDate() + i * 7);

        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);

        console.log(
          `📆 Semana ${i + 1}: ${inicioSemana.toISOString().split("T")[0]} - ${
            finSemana.toISOString().split("T")[0]
          }`
        );

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
};
