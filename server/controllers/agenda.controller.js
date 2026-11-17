const crypto = require("crypto");
const mongoose = require("mongoose");
const AgendaModel = require("../models/agenda.model");
const AgendaGeneratorService = require("../services/agendaGenerator.service");
const HorarioModel = require("../models/horario.model");
const ParaguayDateUtil = require("../utils/paraguayDate");
const NotificationService = require("../services/notificationService");
const ServicioModel = require("../models/servicio.model");
const PreciosService = require("../services/precios.service");
const HorariosService = require("../services/horarios.service");
const Recordatorios = require("../services/recordatorios.service");
const { turnoAbiertoDelCelular } = Recordatorios;
const RecordatorioPush = require("../models/recordatorioPush.model");
const {
  celularValido,
  limpiarCelular,
  nombreValido,
} = require("../utils/celular");

// "HH:MM" de 00:00 a 23:59, el formato de los Horario.
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Choque contra el índice `turno_unico_por_barbero` (ese barbero ya tiene un
// turno ese día a esa hora).
const esTurnoDuplicado = (error) => error?.code === 11000;
const MENSAJE_TURNO_DUPLICADO =
  "Ese barbero ya tiene un turno ese día a esa hora";

module.exports = {
  // Endpoint para eliminar todos los turnos de hoy (usando hora de Paraguay)
  eliminarTurnosHoy: async (req, res) => {
    try {
      const { startOfDay, endOfDay } = ParaguayDateUtil.createDateRange();

      console.log(
        `Eliminando TODOS los turnos entre ${startOfDay.toISOString()} y ${endOfDay.toISOString()}`,
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
      const resultado =
        await AgendaGeneratorService.generarTurnosPorFecha(fechaObj);

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
          `Eliminados ${resultado.deletedCount} duplicados para ${grupo._id.fechaStr} ${grupo._id.hora}`,
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
          fechaFin ? new Date(fechaFin) : null,
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

  getAllAgendas: (req, res) => {
    // Un usuario con rol "barbero" solo ve SUS turnos. El filtro va acá y no
    // en el cliente: si lo hiciera el front, los datos de los otros barberos
    // (incluida la PII de sus clientes) igual viajarían en la respuesta.
    const filtro = {};
    if (req.user?.rol === "barbero") {
      if (!req.user.barbero) {
        // Usuario barbero sin barbero asignado: no le corresponde ningún turno.
        return res.status(200).json({ agendas: [] });
      }
      filtro.barbero = req.user.barbero;
    }

    AgendaModel.find(filtro)
      .populate("barbero", "nombre foto")
      .then((allAgendas) => {
        res.status(200).json({ agendas: allAgendas });
      })
      .catch((err) =>
        res.status(400).json({ message: "Algo salió mal", error: err }),
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
          (t) => t.estado !== "disponible" && t.barbero,
        );

        const barberosOcupados = turnosOcupados.length;
        const hayDisponibilidad = barberosOcupados < totalBarberos;

        // Si hay un turno de un cliente, mostrarlo sin exponer su PII ni
        // su editToken — este endpoint es público y no tiene forma de
        // verificar quién lo está consultando.
        const turnoUsuario = grupo.turnos.find(
          (t) => t.nombreCliente && t.nombreCliente !== "",
        );

        if (turnoUsuario) {
          turnosVirtuales.push({
            _id: turnoUsuario._id,
            fecha: turnoUsuario.fecha,
            hora: turnoUsuario.hora,
            diaSemana: turnoUsuario.diaSemana,
            estado: turnoUsuario.estado,
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
          });
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
          (t) => t.estado !== "disponible" && t.barbero,
        );
        // Endpoint público: nunca exponer PII del cliente ni el editToken
        // del turno, solo lo necesario para saber que el barbero está
        // ocupado a esta hora.
        const barberosOcupados = turnosOcupados.map((t) => ({
          barbero: t.barbero,
          turno: { _id: t._id, hora: t.hora, estado: t.estado },
        }));

        const barberosDisponibles = barberosActivos.filter(
          (barbero) =>
            !turnosOcupados.some(
              (turnoOcupado) =>
                turnoOcupado.barbero._id.toString() === barbero._id.toString(),
            ),
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
      const barberoIdFiltro = req.query.barberoId || null;

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

      // Con ?barberoId= se devuelven SOLO los turnos de ese barbero, un turno
      // real por hora. Sin el parámetro se mantiene la vista agregada de
      // siempre (un turno representativo por hora entre todos los barberos,
      // con los "turnos virtuales" que eso obliga a inventar) para no romper
      // la landing actual mientras el Sprint 4 migra el front.
      const filtroTurnos = { fecha: { $gte: hoy, $lte: treintaDiasDespues } };
      if (barberoIdFiltro) {
        filtroTurnos.barbero = barberoIdFiltro;
      }

      const allTurnos = await AgendaModel.find(filtroTurnos)
        .populate("barbero", "nombre foto")
        .sort({ fecha: 1, hora: 1 });

      // Con un barbero fijado no hace falta agregar nada: cada hora tiene a lo
      // sumo un turno suyo, así que se devuelven tal cual.
      if (barberoIdFiltro) {
        // El endpoint es público: se devuelve una lista CERRADA de campos.
        // Antes se borraban unos pocos (editToken, email, número) y todo lo
        // demás salía tal cual, incluido el `nombreCliente`, los servicios y
        // el costo de los turnos reservados por otras personas. Con una lista
        // cerrada, un campo nuevo en el modelo no se filtra por omisión.
        return res.status(200).json({
          agendas: allTurnos.map((t) => ({
            _id: t._id,
            fecha: t.fecha,
            hora: t.hora,
            diaSemana: t.diaSemana,
            estado: t.estado,
            barbero: t.barbero
              ? { _id: t.barbero._id, nombre: t.barbero.nombre }
              : null,
          })),
        });
      }

      console.log(`✅ getTurnosLanding OPTIMIZADO:`);
      console.log(
        `   - Rango: ${hoy.toISOString().split("T")[0]} a ${
          treintaDiasDespues.toISOString().split("T")[0]
        }`,
      );
      console.log(
        `   - Turnos encontrados: ${allTurnos.length} (antes: todos los turnos en BD)`,
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
        // Prioridad 3: Si NO hay disponibles pero hay usuarios...
        else if (grupo.usuarios.length > 0) {
          // 🆕 FIX: Si hay disponibilidad de barberos, mostrar como DISPONIBLE aunque este turno esté ocupado
          if (hayDisponibilidadDeBarberos) {
            console.log(
              `✨ Generando turno virtual disponible para ${grupo.fecha.toISOString()} ${grupo.hora} (Ocupados: ${barberosOcupados}/${totalBarberos})`,
            );
            turnoRepresentativo = {
              _id: `virt-${grupo.usuarios[0]._id}`, // ID virtual para evitar conflictos de key
              fecha: grupo.usuarios[0].fecha,
              hora: grupo.usuarios[0].hora,
              diaSemana: grupo.usuarios[0].diaSemana,
              estado: "disponible", // FORZAMOS DISPONIBLE
              cantidadDisponibles: 0, // No hay docs reales disponibles, es virtual
              cantidadOcupados: grupo.ocupados.length,
              cantidadUsuarios: grupo.usuarios.length,
              hayDisponibilidad: true,
              esUsuario: false,
              totalBarberos: totalBarberos,
              barberosOcupados: barberosOcupados,
              nombreBarbero: "", // Limpiar datos del turno base
              nombreCliente: "",
              numeroCliente: "",
              barbero: null,
            };
          } else {
            // Si NO hay disponibilidad de barberos, mostrar el turno del usuario
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
          (key, index) => keysFinal.indexOf(key) !== index,
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

      // Sanitizar PII y secretos antes de responder: este endpoint es
      // público y no debe exponer numeroCliente/emailCliente de terceros,
      // ni el editToken (que es el secreto que protege la edición del
      // turno) de NADIE, ni siquiera del propio dueño. Si el visitante
      // manda su propio número (?numero=...), se marca esMio y solo en
      // ese caso se conserva su nombre.
      const numeroSolicitante = req.query.numero;
      const turnosSanitizados = turnosLimpios.map((turno) => {
        const esMio = Boolean(
          numeroSolicitante && turno.numeroCliente === numeroSolicitante,
        );
        // eslint-disable-next-line no-unused-vars
        const {
          numeroCliente,
          emailCliente,
          nombreCliente,
          editToken,
          ...resto
        } = turno;
        return {
          ...resto,
          esMio,
          nombreCliente: esMio ? nombreCliente : "",
        };
      });

      res.status(200).json({
        agendas: turnosSanitizados,
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

  // Endpoint para las métricas de demanda del dashboard (días, horas,
  // servicios, barberos y clientes más solicitados). ?dias=90 limita la
  // ventana; sin el parámetro se calcula sobre todo el historial.
  getMetricas: async (req, res) => {
    try {
      const { dias } = req.query;
      const periodoDias = dias ? parseInt(dias, 10) : null;

      // Un barbero ve solo sus propias métricas; el admin, las del negocio.
      // El alcance se decide acá con req.user, nunca con un parámetro que
      // pueda mandar el cliente.
      const barberoId =
        req.user?.rol === "barbero" ? req.user.barbero : null;

      const metricas = await AgendaGeneratorService.obtenerMetricasDashboard(
        periodoDias,
        barberoId,
      );
      res.status(200).json({ metricas });
    } catch (err) {
      console.error("Error obteniendo métricas del dashboard:", err);
      res.status(500).json({
        message: "Error obteniendo métricas del dashboard",
        error: err.message,
      });
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
            new Date(fechaFin),
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
        res.status(200).json({ agenda: oneSingleAgenda }),
      )
      .catch((err) =>
        res.status(400).json({ message: "Algo salió mal", error: err }),
      );
  },

  // Admin: (re)generar el token de edición de un turno. Necesario para
  // turnos reservados antes de que existiera editToken, o si se quiere
  // invalidar un link ya compartido generando uno nuevo.
  generarTokenEdicion: async (req, res) => {
    try {
      const turno = await AgendaModel.findById(req.params.id);
      if (!turno) {
        return res.status(404).json({ message: "Turno no encontrado" });
      }

      turno.editToken = crypto.randomBytes(24).toString("hex");
      await turno.save();

      res.status(200).json({ editToken: turno.editToken });
    } catch (error) {
      console.error("Error al generar token de edición:", error);
      res
        .status(500)
        .json({ message: "Error al generar token", error: error.message });
    }
  },
  // Estos endpoints (createAgenda, updateOneAgendaById) requieren sesión de
  // admin. Aun así, se excluyen campos administrados por el propio sistema
  // para que nunca se puedan sobreescribir por accidente desde el cliente.
  createAgenda: (req, res) => {
    // eslint-disable-next-line no-unused-vars
    const { _id, createdAt, updatedAt, __v, editToken, ...datosPermitidos } =
      req.body;
    AgendaModel.create(datosPermitidos)
      .then((newlyCreatedAgenda) =>
        res.status(201).json({ agenda: newlyCreatedAgenda }),
      )
      .catch((err) =>
        esTurnoDuplicado(err)
          ? res.status(409).json({ message: MENSAJE_TURNO_DUPLICADO })
          : res.status(400).json({ message: "Algo salió mal", error: err }),
      );
  },
  updateOneAgendaById: async (req, res) => {
    try {
      // eslint-disable-next-line no-unused-vars
      const { _id, createdAt, updatedAt, __v, editToken, ...datosPermitidos } =
        req.body;

      // Obtener el turno anterior para comparar cambios
      const turnoAnterior = await AgendaModel.findById(req.params.id);

      if (!turnoAnterior) {
        return res.status(404).json({ message: "Turno no encontrado" });
      }

      // Si el admin toca los servicios, los precios se recalculan en el
      // servidor contra los del barbero de este turno. Aunque esta ruta sea
      // solo-admin, el precio se decide en un único lugar (precios.service) y
      // no se toma de lo que venga en el body.
      const idsServicios = req.body.servicioIds || req.body.servicios;
      if (idsServicios !== undefined) {
        const barberoDelTurno = datosPermitidos.barbero || turnoAnterior.barbero;
        try {
          const resuelto = await PreciosService.resolverServiciosParaReserva(
            barberoDelTurno,
            idsServicios || [],
          );
          datosPermitidos.servicios = resuelto.servicios;
          datosPermitidos.costoServicios = resuelto.costoTotal;
          datosPermitidos.costoTotal =
            resuelto.costoTotal - (datosPermitidos.descuento || 0);
        } catch (error) {
          if (error.name === "ErrorServicioInvalido") {
            return res
              .status(400)
              .json({ message: error.message, ...error.detalles });
          }
          throw error;
        }
      }
      delete datosPermitidos.servicioIds;

      const updatedAgenda = await AgendaModel.findOneAndUpdate(
        { _id: req.params.id },
        datosPermitidos,
        { new: true },
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
            notifError,
          );
        }
      } else if (fueEditado) {
        try {
          await NotificationService.notificarTurnoEditado(updatedAgenda);
        } catch (notifError) {
          console.error(
            "Error al enviar notificación de turno editado:",
            notifError,
          );
        }
      }

      res.status(200).json({ agenda: updatedAgenda });
    } catch (err) {
      if (esTurnoDuplicado(err)) {
        return res.status(409).json({ message: MENSAJE_TURNO_DUPLICADO });
      }
      res.status(400).json({ message: "Algo salió mal", error: err });
    }
  },
  deleteOneAgendaById: (req, res) => {
    AgendaModel.deleteOne({ _id: req.params.id })
      .then((result) => res.status(200).json({ result: result }))
      .catch((err) =>
        res.status(400).json({ message: "Algo salió mal", error: err }),
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
        fechaFin ? new Date(fechaFin) : null,
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
          fechaFin ? new Date(fechaFin) : null,
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
      const { startOfDay, endOfDay } = ParaguayDateUtil.createDateRange(fechaObj);

      // Obtener todos los barberos activos
      const barberos = await BarberoModel.find({ activo: true }).select(
        "_id nombre foto",
      );

      // Obtener todos los turnos para esta fecha. Se usa un rango del día
      // (no un match exacto de `fecha`) porque turnos generados por el
      // sistema antiguo pueden tener una hora del día ligeramente distinta
      // guardada en el campo `fecha` — con match exacto, esos turnos (y
      // cualquier reserva real que coincida solo por rango) quedaban
      // invisibles para este endpoint.
      const turnos = await AgendaModel.find({
        fecha: { $gte: startOfDay, $lte: endOfDay },
      }).populate("barbero", "nombre foto");

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
              ["reservado", "pagado", "en_proceso"].includes(t.estado),
          );

          if (turnoOcupado) {
            // Endpoint público: nunca exponer PII del cliente (nombre,
            // teléfono, email) ni el editToken del turno — el cliente solo
            // necesita saber que el barbero está ocupado a esta hora.
            disponibilidad[hora].barberosOcupados.push({
              barbero: barbero,
              turno: {
                _id: turnoOcupado._id,
                hora: turnoOcupado.hora,
                estado: turnoOcupado.estado,
              },
            });
            return;
          }

          // Solo se ofrece un barbero como disponible si existe un turno
          // real con estado "disponible" para él en este horario. No se
          // asume disponibilidad por la sola ausencia de un turno ocupado
          // (eso es lo que hacía que un barbero sin ningún turno generado
          // para este horario apareciera igual como seleccionable).
          const turnoDisponible = turnosHora.find(
            (t) =>
              t.barbero &&
              t.barbero._id.toString() === barbero._id.toString() &&
              t.estado === "disponible",
          );

          if (turnoDisponible) {
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
        servicioIds,
        servicios = [],
      } = req.body;

      const BarberoModel = require("../models/barbero.model");

      // Validaciones básicas (sin requerir email)
      if (!fecha || !hora || !barberoId || !nombreCliente) {
        return res.status(400).json({
          message: "Fecha, hora, barbero y nombre del cliente son requeridos",
        });
      }

      // El formato nuevo manda solo ids. Se sigue aceptando el viejo
      // (`servicios: [{servicioId, nombre, precio, ...}]`) por compatibilidad
      // durante un despliegue desfasado de client y server, pero SOLO se toman
      // los ids: nombre, precio y duración se resuelven contra la base.
      const idsSolicitados = servicioIds || servicios;

      // Entradas mal formadas: 400 claro en vez de un 500 por un CastError.
      if (!HORA_VALIDA.test(String(hora))) {
        return res.status(400).json({ message: "La hora no es válida" });
      }
      if (!mongoose.isValidObjectId(barberoId)) {
        return res.status(400).json({ message: "El barbero no es válido" });
      }
      const fechaParaguay = ParaguayDateUtil.toParaguayTime(fecha);
      if (!fechaParaguay.isValid()) {
        return res.status(400).json({ message: "La fecha no es válida" });
      }
      const fechaObj = fechaParaguay.toDate();

      // Solo turnos por delante: la fecha (día en Asunción) más su hora.
      const [horas, minutos] = String(hora).split(":").map(Number);
      const momentoTurno = ParaguayDateUtil.startOfDay(fechaObj)
        .hour(horas)
        .minute(minutos);
      if (!momentoTurno.isAfter(ParaguayDateUtil.now())) {
        return res.status(409).json({
          message: "Ese horario ya pasó. Elegí otro, por favor.",
        });
      }

      // Mismas reglas que el formulario (utils/celular.js): la API no acepta
      // lo que la pantalla no dejaría mandar.
      if (!celularValido(numeroCliente)) {
        return res.status(400).json({ message: "El número de celular no es válido" });
      }
      if (!nombreValido(nombreCliente)) {
        return res.status(400).json({
          message: "El nombre tiene que tener solo letras, entre 3 y 60",
        });
      }
      const celular = limpiarCelular(numeroCliente);

      // Un turno abierto por celular en las próximas 12 horas.
      const abierto = await turnoAbiertoDelCelular(celular);
      if (abierto) {
        return res.status(409).json({
          motivo: "turno_abierto",
          message: "Ya tenés un turno en las próximas 12 horas",
          turno: {
            fecha: ParaguayDateUtil.toParaguayTime(abierto.fecha).format("DD/MM/YYYY"),
            hora: abierto.hora,
            barbero: abierto.barbero?.nombre || abierto.nombreBarbero || "",
          },
        });
      }

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

      const rangoFecha = {
        $gte: ParaguayDateUtil.startOfDay(fechaObj).toDate(),
        $lte: ParaguayDateUtil.endOfDay(fechaObj).toDate(),
      };

      // Los precios se resuelven SIEMPRE en el servidor, contra el catálogo y
      // los overrides de ESTE barbero. Nunca se usa el precio que mande el
      // cliente: antes se sumaba `s.precio` del body y se podía reservar un
      // servicio de ₲80.000 por ₲0.
      let serviciosResueltos;
      let costoServicios;
      try {
        const resuelto = await PreciosService.resolverServiciosParaReserva(
          barberoId,
          idsSolicitados,
        );
        serviciosResueltos = resuelto.servicios;
        costoServicios = resuelto.costoTotal;
      } catch (error) {
        if (error.name === "ErrorServicioInvalido") {
          return res
            .status(400)
            .json({ message: error.message, ...error.detalles });
        }
        throw error;
      }

      const datosReserva = {
        estado: "reservado",
        nombreCliente: String(nombreCliente).trim(),
        numeroCliente: celular,
        servicios: serviciosResueltos,
        fechaReserva: new Date(),
        recordatorioEnviado: false,
        // Token secreto para poder editar/cancelar este turno desde el link
        // público sin login (ver /editar-mi-turno/:id y /liberar-mi-turno/:id).
        editToken: crypto.randomBytes(24).toString("hex"),
        costoServicios,
        costoTotal: costoServicios,
      };

      // Intento atómico: reclamar un turno "disponible" ya existente para
      // este barbero/fecha/hora. findOneAndUpdate es atómico a nivel de
      // documento en MongoDB, así que si dos clientes reservan el mismo
      // slot casi simultáneamente, solo uno de los dos matchea
      // estado:"disponible" (el otro llega tarde y no encuentra nada que
      // actualizar) — evita el doble booking por condición de carrera.
      let turnoAEditar = await AgendaModel.findOneAndUpdate(
        {
          fecha: rangoFecha,
          hora: hora,
          barbero: barberoId,
          estado: "disponible",
        },
        { $set: datosReserva },
        { new: true },
      );

      if (!turnoAEditar) {
        // Solo se reserva lo que la agenda ofrece. Antes, si el turno no
        // existía se creaba ya reservado, y con la API se podía reservar
        // cualquier hora: de madrugada, un día cerrado o un barbero sin ese
        // horario. Ahora el horario tiene que haber sido generado a partir de
        // los Horario vigentes.
        const existe = await AgendaModel.exists({
          fecha: rangoFecha,
          hora: hora,
          barbero: barberoId,
        });
        return res.status(409).json({
          message: existe
            ? "El barbero ya tiene un turno reservado en este horario"
            : "Ese horario no está en la agenda del barbero",
        });
      }

      // Populate el barbero para la respuesta
      await turnoAEditar.populate("barbero", "nombre foto");

      // Enviar notificación de nueva reserva
      try {
        await NotificationService.notificarNuevaReserva(turnoAEditar);

        // 🆕 WhatsApp: Enviar confirmación al cliente
        if (celular) {
          const WhatsappService = require("../services/whatsapp.service");
          // Obtener nombres de servicios
          // Los nombres salen del snapshot resuelto, no del body del cliente.
          const serviciosNombres =
            serviciosResueltos.length > 0
              ? serviciosResueltos.map((s) => s.nombre).join(", ")
              : "Corte de cabello";

          const diaNombre = ParaguayDateUtil.getDayOfWeek(fechaObj);
          const fechaFormateada = fechaObj.toLocaleDateString("es-PY");
          const enlaceEdicion = `${process.env.CLIENT_URL || "http://localhost:5173"}/editar-turno/${turnoAEditar._id}?t=${turnoAEditar.editToken}`;

          // Construir mensaje exactamente como pidió el usuario
          let mensaje =
            `¡Hola ${nombreCliente}! 👋\n\n` +
            `💈 Te escribimos desde Alonzo Style para recordarte tu cita programada para el ${diaNombre} ${fechaFormateada} a las ${hora} con el barbero ${barbero.nombre}.\n\n` +
            `💈 Servicios: ${serviciosNombres}\n\n` +
            `💈 Se recomienda llegar 10 minutos antes de la cita, en caso de no poder asistir, por favor avísanos con anticipación para poder reprogramar tu cita.\n\n` +
            `📍 Te esperamos aquí: Encarnación - Paraguay\n` +
            `🗺️ Ver ubicación: https://g.co/kgs/6UKZTmH\n\n` +
            `✏️ Si necesitas modificar tu cita, puedes hacerlo desde este enlace:\n${enlaceEdicion}\n\n` +
            `¡Te esperamos! 💈`;

          await WhatsappService.sendMessage(celular, mensaje);
        }
      } catch (notifError) {
        console.error(
          "Error al enviar notificaciones (Email/WhatsApp):",
          notifError,
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

  // Endpoint público (sin login) para que un cliente edite su propio turno
  // usando el link que recibió por WhatsApp. Requiere el editToken del
  // turno; sin él, se rechaza aunque se conozca el ID. Los precios se
  // recalculan siempre en el servidor a partir de ServicioModel, nunca se
  // confía en lo que mande el cliente.
  editarMiTurno: async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.query.t || req.body.t;
      const { nombreCliente, numeroCliente, servicios = [] } = req.body;

      if (!token) {
        return res
          .status(403)
          .json({ message: "Token de edición requerido" });
      }

      const turno = await AgendaModel.findById(id);
      if (!turno) {
        return res.status(404).json({ message: "Turno no encontrado" });
      }

      if (!turno.editToken || turno.editToken !== token) {
        return res.status(403).json({ message: "Token de edición inválido" });
      }

      if (!nombreCliente || !numeroCliente) {
        return res.status(400).json({
          message: "Nombre y número de teléfono son requeridos",
        });
      }

      // Los servicios se resuelven contra la base, nunca desde el cliente. Y
      // contra los precios DEL BARBERO DE ESTE TURNO: antes se usaba el precio
      // global, así que editar un turno le borraba el precio propio del barbero.
      let resuelto;
      try {
        resuelto = await PreciosService.resolverServiciosParaReserva(
          turno.barbero,
          servicios,
        );
      } catch (error) {
        if (error.name === "ErrorServicioInvalido") {
          return res
            .status(400)
            .json({ message: error.message, ...error.detalles });
        }
        throw error;
      }

      turno.nombreCliente = nombreCliente;
      turno.numeroCliente = numeroCliente;
      turno.servicios = resuelto.servicios;
      turno.calcularCostoTotal();

      await turno.save();
      await turno.populate("barbero", "nombre foto");

      res.status(200).json({
        message: "Turno actualizado exitosamente",
        agenda: turno,
      });
    } catch (error) {
      console.error("Error al editar turno público:", error);
      res
        .status(500)
        .json({ message: "Error al editar turno", error: error.message });
    }
  },

  // Endpoint público (sin login) para que un cliente libere su propio
  // turno usando el link que recibió por WhatsApp. Mismo chequeo de token
  // que editarMiTurno. El editToken se limpia al liberar: el link deja de
  // servir para evitar que alguien lo reutilice sobre un turno ya vacío.
  // Público con el editToken del turno (como editar-mi-turno): el cliente
  // pide que le avisemos por push antes de su turno. La anticipación la
  // decide el servidor según cuánto falta (60, 40, 20 o 5 minutos).
  registrarRecordatorioPush: async (req, res) => {
    try {
      const token = req.query.t || req.body.t;
      const { suscripcion } = req.body;

      if (!token) {
        return res.status(403).json({ message: "Token de edición requerido" });
      }
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ message: "Turno no encontrado" });
      }
      const turno = await AgendaModel.findById(req.params.id);
      if (!turno) {
        return res.status(404).json({ message: "Turno no encontrado" });
      }
      if (!turno.editToken || turno.editToken !== token) {
        return res.status(403).json({ message: "Token de edición inválido" });
      }
      if (!Recordatorios.ESTADOS_ABIERTOS.includes(turno.estado)) {
        return res.status(409).json({ message: "El turno ya no está reservado" });
      }

      const keys = suscripcion?.keys || {};
      const claveValida = (v) => typeof v === "string" && v.length > 0 && v.length <= 200;
      if (
        !Recordatorios.endpointPushValido(suscripcion?.endpoint) ||
        !claveValida(keys.p256dh) ||
        !claveValida(keys.auth)
      ) {
        return res.status(400).json({ message: "La suscripción no es válida" });
      }

      const restantes = Recordatorios.minutosHasta(
        Recordatorios.momentoDelTurno(turno),
        ParaguayDateUtil.now(),
      );
      const minutosAntes = Recordatorios.minutosDeAviso(restantes);
      if (!minutosAntes) {
        return res.status(409).json({
          message: "Tu turno es en menos de 5 minutos: ya no hace falta avisarte",
        });
      }

      const yaPedidos = await RecordatorioPush.countDocuments({
        turno: turno._id,
        endpoint: { $ne: suscripcion.endpoint },
      });
      if (yaPedidos >= Recordatorios.MAX_AVISOS_POR_TURNO) {
        return res.status(409).json({
          message: "Ya hay avisos activados en varios dispositivos para este turno",
        });
      }

      const aviso = await RecordatorioPush.findOneAndUpdate(
        { turno: turno._id, endpoint: suscripcion.endpoint },
        {
          $set: {
            keys: { p256dh: keys.p256dh, auth: keys.auth },
            reserva: Recordatorios.huellaDeReserva(turno.editToken),
            minutosAntes,
            estado: "pendiente",
            intentos: 0,
          },
          $unset: { motivo: 1, enviadoEn: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const avisoA = Recordatorios.momentoDelTurno(turno)
        .subtract(minutosAntes, "minutes")
        .toISOString();
      res.status(201).json({ minutosAntes, avisoA, id: aviso._id });
    } catch (error) {
      console.error("Error al registrar el aviso push:", error);
      res.status(500).json({ message: "No se pudo activar el aviso" });
    }
  },
  liberarMiTurno: async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.query.t || req.body.t;

      if (!token) {
        return res
          .status(403)
          .json({ message: "Token de edición requerido" });
      }

      const turno = await AgendaModel.findById(id);
      if (!turno) {
        return res.status(404).json({ message: "Turno no encontrado" });
      }

      if (!turno.editToken || turno.editToken !== token) {
        return res.status(403).json({ message: "Token de edición inválido" });
      }

      turno.estado = "disponible";
      turno.nombreCliente = "";
      turno.numeroCliente = "";
      turno.emailCliente = "";
      turno.servicios = [];
      turno.costoTotal = 0;
      turno.costoServicios = 0;
      turno.notas = "";
      turno.editToken = null;

      await turno.save();

      res.status(200).json({ message: "Turno liberado exitosamente" });
    } catch (error) {
      console.error("Error al liberar turno público:", error);
      res
        .status(500)
        .json({ message: "Error al liberar turno", error: error.message });
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

  // Días y semanas para armar la grilla de la landing.
  //
  // Con ?barberoId= devuelve los horarios de ESE barbero (los suyos si
  // personalizó, los del local si no). Sin el parámetro, la unión de todos los
  // barberos activos — así la grilla no deja afuera una hora que solo tiene
  // uno. Antes leía todos los Horario sin distinguir ámbito, lo que ahora
  // mezclaría los propios de cada barbero.
  getHorariosYSemanas: async (req, res) => {
    try {
      const { barberoId } = req.query;

      const horariosActivos = barberoId
        ? await HorariosService.resolverHorariosDeBarbero(barberoId)
        : await HorariosService.resolverHorariosDeTodos();

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
            `❌ ERROR: inicioSemana NO es lunes! Es día ${inicioSemana.getDay()}`,
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

      // Fecha + hora del turno, no el inicio del día: antes no veía los
      // turnos de hoy (ver services/recordatorios.service.js).
      const turnoExistente = await turnoAbiertoDelCelular(numeroCliente);

      if (turnoExistente) {
        // Formatear la fecha para mostrar
        const fechaFormateada = ParaguayDateUtil.toParaguayTime(
          turnoExistente.fecha,
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
