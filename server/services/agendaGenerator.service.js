const mongoose = require("mongoose");
const Agenda = require("../models/agenda.model");
const HorarioModel = require("../models/horario.model");
const BarberoModel = require("../models/barbero.model");
const ParaguayDateUtil = require("../utils/paraguayDate");
const HorariosService = require("./horarios.service");

class AgendaGeneratorService {
  /**
   * Genera los turnos de una fecha, uno por barbero activo por cada horario
   * que le corresponda (los del local, o los suyos si personalizó).
   *
   * `opciones.soloBarberoId` acota la generación a un único barbero: lo usa
   * `regenerarAgendaDeBarbero` para no recorrer la agenda ajena.
   */
  async generarTurnosPorFecha(fecha, opciones = {}) {
    try {
      const fechaObj = ParaguayDateUtil.toParaguayTime(fecha).toDate();
      const diaSemana = ParaguayDateUtil.getDayOfWeek(fechaObj);

      // 1. Obtener barberos activos que estén incluidos en agenda
      const filtroBarberos = { activo: true, incluirEnAgenda: true };
      if (opciones.soloBarberoId) {
        filtroBarberos._id = opciones.soloBarberoId;
      }
      const barberosActivos = await BarberoModel.find(filtroBarberos);

      if (barberosActivos.length === 0) {
        return {
          mensaje:
            "No hay barberos activos incluidos en agenda para generar turnos",
          turnosCreados: 0,
        };
      }

      // 2. Cada barbero puede tener sus propios horarios: ya no se cruza un
      //    único set global por todos. HorariosService decide, para cada uno,
      //    si rigen los del local o los suyos.
      const inicioDia = ParaguayDateUtil.startOfDay(fechaObj).toDate();
      const finDia = ParaguayDateUtil.endOfDay(fechaObj).toDate();

      // Un solo query de los turnos ya existentes del día, en vez de un
      // findOne por cada combinación barbero×hora.
      const existentes = await Agenda.find({
        fecha: { $gte: inicioDia, $lte: finDia },
      })
        .select("hora barbero")
        .lean();

      const yaExiste = new Set(
        existentes.map((t) => `${String(t.barbero)}|${t.hora}`)
      );

      const turnosACrear = [];
      let horariosVistos = 0;

      for (const barbero of barberosActivos) {
        const horariosDelBarbero =
          await HorariosService.resolverHorariosDeBarbero(barbero, diaSemana);
        horariosVistos += horariosDelBarbero.length;

        for (const horario of horariosDelBarbero) {
          if (yaExiste.has(`${String(barbero._id)}|${horario.hora}`)) continue;

          turnosACrear.push({
            fecha: inicioDia,
            hora: horario.hora,
            diaSemana: diaSemana,
            barbero: barbero._id,
            nombreBarbero: barbero.nombre,
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
          });
        }
      }

      if (horariosVistos === 0) {
        return {
          mensaje: `No hay horarios configurados para ${diaSemana}`,
          turnosCreados: 0,
        };
      }

      // 3. Insertar turnos en la base de datos
      if (turnosACrear.length > 0) {
        await Agenda.insertMany(turnosACrear);
      }

      return {
        mensaje: "Turnos generados exitosamente",
        turnosCreados: turnosACrear.length,
        barberos: barberosActivos.length,
        horarios: horariosVistos,
      };
    } catch (error) {
      console.error("❌ Error generando turnos por fecha:", error);
      throw error;
    }
  }

  /**
   * Genera turnos para un rango de fechas
   */
  async generarTurnosRango(fechaInicio, fechaFin) {
    try {
      const inicio = ParaguayDateUtil.toParaguayTime(fechaInicio);
      const fin = ParaguayDateUtil.toParaguayTime(fechaFin);

      let totalTurnosCreados = 0;
      const fechaActual = inicio.clone();

      while (fechaActual.isSameOrBefore(fin, "day")) {
        const resultado = await this.generarTurnosPorFecha(
          fechaActual.toDate()
        );
        totalTurnosCreados += resultado.turnosCreados;
        fechaActual.add(1, "day");
      }

      return {
        mensaje: "Rango de turnos generado exitosamente",
        turnosCreados: totalTurnosCreados,
        fechaInicio: inicio.format("YYYY-MM-DD"),
        fechaFin: fin.format("YYYY-MM-DD"),
      };
    } catch (error) {
      console.error("❌ Error generando turnos en rango:", error);
      throw error;
    }
  }

  /**
   * Genera turnos para el próximo mes
   */
  async generarTurnosProximoMes() {
    const hoy = ParaguayDateUtil.now();
    const inicioProximoMes = hoy.clone().add(1, "month").startOf("month");
    const finProximoMes = inicioProximoMes.clone().endOf("month");

    return this.generarTurnosRango(
      inicioProximoMes.toDate(),
      finProximoMes.toDate()
    );
  }

  /**
   * Genera turnos para un año completo
   */
  async generarTurnosAño(año) {
    const inicioAño = ParaguayDateUtil.toParaguayTime(new Date(año, 0, 1));
    const finAño = ParaguayDateUtil.toParaguayTime(new Date(año, 11, 31));

    return this.generarTurnosRango(inicioAño.toDate(), finAño.toDate());
  }

  /**
   * Obtener métricas de demanda de la agenda: días, horas, servicios,
   * barberos y clientes más solicitados. No incluye ingresos.
   * @param {number|null} periodoDias - Ventana en días hacia atrás desde hoy
   *   (null = todo el historial).
   */
  /**
   * Métricas del dashboard.
   *
   * `barberoId` acota todo el cálculo a un solo barbero: lo usa el panel de un
   * usuario con rol "barbero", que solo debe ver lo suyo. Sin el parámetro, las
   * métricas son del negocio completo (vista de admin).
   */
  async obtenerMetricasDashboard(periodoDias = null, barberoId = null) {
    try {
      // "Solicitado" = todo turno que un cliente llegó a pedir, más allá de
      // cómo haya terminado (incluye no_show: igual fue una solicitud real).
      const estadosSolicitados = [
        "reservado",
        "pagado",
        "en_proceso",
        "completado",
        "no_show",
      ];

      const matchBase = { estado: { $in: estadosSolicitados } };
      if (barberoId) {
        matchBase.barbero = new mongoose.Types.ObjectId(String(barberoId));
      }
      let desde = null;
      if (periodoDias) {
        desde = ParaguayDateUtil.now()
          .subtract(periodoDias, "days")
          .startOf("day")
          .toDate();
        matchBase.fecha = { $gte: desde };
      }

      const [
        totalSolicitados,
        porDiaRaw,
        porHoraRaw,
        porServicioRaw,
        porBarberoRaw,
        porClienteRaw,
      ] = await Promise.all([
        Agenda.countDocuments(matchBase),
        Agenda.aggregate([
          { $match: matchBase },
          { $group: { _id: "$diaSemana", total: { $sum: 1 } } },
        ]),
        Agenda.aggregate([
          { $match: matchBase },
          { $group: { _id: "$hora", total: { $sum: 1 } } },
        ]),
        Agenda.aggregate([
          { $match: matchBase },
          { $unwind: "$servicios" },
          { $group: { _id: "$servicios.nombre", total: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: 8 },
        ]),
        Agenda.aggregate([
          { $match: { ...matchBase, nombreBarbero: { $nin: [null, ""] } } },
          { $group: { _id: "$nombreBarbero", total: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: 8 },
        ]),
        Agenda.aggregate([
          { $match: { ...matchBase, numeroCliente: { $nin: [null, ""] } } },
          { $sort: { createdAt: 1 } },
          {
            $group: {
              _id: "$numeroCliente",
              nombre: { $last: "$nombreCliente" },
              total: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
          { $limit: 10 },
        ]),
      ]);

      const ordenDias = [
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
        "domingo",
      ];
      const porDia = ordenDias.map((dia) => ({
        dia,
        total: porDiaRaw.find((d) => d._id === dia)?.total || 0,
      }));

      const minutosDeHora = (hora) => {
        const [hh, mm] = hora.split(":").map(Number);
        return hh * 60 + mm;
      };
      const porHora = porHoraRaw
        .map((h) => ({ hora: h._id, total: h.total }))
        .sort((a, b) => minutosDeHora(a.hora) - minutosDeHora(b.hora));

      const porServicio = porServicioRaw.map((s) => ({
        servicio: s._id,
        total: s.total,
      }));

      const porBarbero = porBarberoRaw.map((b) => ({
        barbero: b._id,
        total: b.total,
      }));

      const porCliente = porClienteRaw.map((c) => ({
        numero: c._id,
        nombre: c.nombre || c._id,
        total: c.total,
      }));

      return {
        periodo: { dias: periodoDias, desde: desde ? desde.toISOString() : null },
        totalSolicitados,
        porDia,
        porHora,
        porServicio,
        porBarbero,
        porCliente,
      };
    } catch (error) {
      console.error("Error obteniendo métricas del dashboard:", error);
      throw error;
    }
  }

  /**
   * Elimina turnos duplicados (misma fecha, hora y barbero)
   * Mantiene solo el turno más reciente o el que tenga cliente asignado
   */
  async eliminarDuplicados(fechaInicio, fechaFin) {
    try {
      const inicio = fechaInicio
        ? ParaguayDateUtil.toParaguayTime(fechaInicio)
        : ParaguayDateUtil.now();

      const fin = fechaFin
        ? ParaguayDateUtil.toParaguayTime(fechaFin)
        : ParaguayDateUtil.now().add(3, "months");

      console.log("🔍 Buscando turnos duplicados...");

      // Buscar duplicados usando agregación
      const duplicados = await Agenda.aggregate([
        {
          $match: {
            fecha: {
              $gte: inicio.toDate(),
              $lte: fin.toDate(),
            },
          },
        },
        {
          $group: {
            _id: {
              fecha: "$fecha",
              hora: "$hora",
              barbero: "$barbero",
            },
            turnos: { $push: "$$ROOT" },
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
      ]);

      let duplicadosEliminados = 0;

      for (const grupo of duplicados) {
        const turnos = grupo.turnos;

        // Ordenar turnos: primero los que tienen cliente, luego por fecha de creación
        turnos.sort((a, b) => {
          // Si uno tiene cliente y otro no, priorizar el que tiene cliente
          if (a.nombreCliente && !b.nombreCliente) return -1;
          if (!a.nombreCliente && b.nombreCliente) return 1;

          // Si ambos tienen o no tienen cliente, priorizar el más reciente
          return (
            new Date(b.createdAt || b._id.getTimestamp()) -
            new Date(a.createdAt || a._id.getTimestamp())
          );
        });

        // Mantener el primer turno (el más prioritario) y eliminar el resto
        const turnoAMantener = turnos[0];
        const turnosAEliminar = turnos.slice(1);

        console.log(
          `📅 ${ParaguayDateUtil.toParaguayTime(grupo._id.fecha).format(
            "DD/MM/YYYY"
          )} ${grupo._id.hora} - Barbero: ${turnoAMantener.nombreBarbero}`
        );
        console.log(
          `   ✅ Manteniendo: ${
            turnoAMantener.nombreCliente || "Disponible"
          } (${turnoAMantener.estado})`
        );

        for (const turno of turnosAEliminar) {
          console.log(
            `   ❌ Eliminando: ${turno.nombreCliente || "Disponible"} (${
              turno.estado
            })`
          );
          await Agenda.findByIdAndDelete(turno._id);
          duplicadosEliminados++;
        }
      }

      console.log(`🧹 Eliminados ${duplicadosEliminados} turnos duplicados`);
      return duplicadosEliminados;
    } catch (error) {
      console.error("❌ Error eliminando duplicados:", error);
      throw error;
    }
  }

  /**
   * Regenera SOLO los turnos de un barbero, y solo a futuro.
   *
   * Es la que hay que usar cuando un barbero cambia sus horarios.
   * `regenerarAgendaCompleta` borra y recrea los turnos disponibles de TODOS
   * los barberos en un rango de 3 meses: correrla cada vez que alguien toca
   * una hora es lento y arriesga la agenda ajena sin motivo.
   *
   * Nunca toca turnos con cliente ni fechas pasadas.
   */
  async regenerarAgendaDeBarbero(barberoId, fechaInicio, fechaFin) {
    try {
      // Desde hoy: los turnos pasados son historia, no se reescriben.
      const hoy = ParaguayDateUtil.now().startOf("day");
      const inicioPedido = fechaInicio
        ? ParaguayDateUtil.toParaguayTime(fechaInicio).startOf("day")
        : hoy.clone();
      const inicio = inicioPedido.isBefore(hoy) ? hoy.clone() : inicioPedido;

      const fin = fechaFin
        ? ParaguayDateUtil.toParaguayTime(fechaFin).endOf("day")
        : ParaguayDateUtil.now().add(3, "months").endOf("day");

      const barbero = await BarberoModel.findById(barberoId).lean();
      if (!barbero) {
        throw new Error(`Barbero ${barberoId} no encontrado`);
      }

      // Solo los libres y autogenerados de ESTE barbero.
      const eliminados = await Agenda.deleteMany({
        barbero: barberoId,
        fecha: { $gte: inicio.toDate(), $lte: fin.toDate() },
        estado: "disponible",
        creadoAutomaticamente: true,
      });

      let turnosCreados = 0;
      const activo = barbero.activo && barbero.incluirEnAgenda;

      // Un barbero inactivo o excluido no debe recuperar sus turnos.
      if (activo) {
        const fechaActual = inicio.clone();
        while (fechaActual.isSameOrBefore(fin, "day")) {
          const resultado = await this.generarTurnosPorFecha(
            fechaActual.toDate(),
            { soloBarberoId: barberoId }
          );
          turnosCreados += resultado.turnosCreados;
          fechaActual.add(1, "day");
        }
      }

      return {
        mensaje: `Agenda de ${barbero.nombre} regenerada`,
        barbero: barbero.nombre,
        turnosEliminados: eliminados.deletedCount,
        turnosCreados,
        desde: inicio.format("YYYY-MM-DD"),
        hasta: fin.format("YYYY-MM-DD"),
      };
    } catch (error) {
      console.error("❌ Error regenerando agenda del barbero:", error);
      throw error;
    }
  }

  /**
   * Regenerar agenda completa eliminando turnos disponibles y recreándolos
   */
  async regenerarAgendaCompleta(fechaInicio, fechaFin) {
    try {
      const inicio = fechaInicio
        ? ParaguayDateUtil.toParaguayTime(fechaInicio)
        : ParaguayDateUtil.now();

      const fin = fechaFin
        ? ParaguayDateUtil.toParaguayTime(fechaFin)
        : ParaguayDateUtil.now().add(3, "months");

      // 1. PRIMERO: Eliminar duplicados existentes en un rango más amplio
      // Si no se especificaron fechas, buscar duplicados desde 1 mes atrás hasta el final del rango
      const inicioLimpieza = fechaInicio
        ? inicio.toDate()
        : ParaguayDateUtil.now().subtract(1, "month").toDate();

      console.log(
        `🧹 Limpiando duplicados desde ${ParaguayDateUtil.toParaguayTime(
          inicioLimpieza
        ).format("DD/MM/YYYY")} hasta ${fin.format("DD/MM/YYYY")}`
      );

      const duplicadosEliminados = await this.eliminarDuplicados(
        inicioLimpieza,
        fin.toDate()
      );

      // Obtener barberos que NO están incluidos en agenda
      const barberosExcluidos = await BarberoModel.find({
        $or: [
          { incluirEnAgenda: false },
          { incluirEnAgenda: { $exists: false } },
        ],
      });

      let turnosEliminadosTotal = duplicadosEliminados;

      // Eliminar SOLO turnos disponibles en el rango
      const eliminadosDisponibles = await Agenda.deleteMany({
        fecha: {
          $gte: inicio.toDate(),
          $lte: fin.toDate(),
        },
        estado: "disponible",
        creadoAutomaticamente: true,
      });

      turnosEliminadosTotal += eliminadosDisponibles.deletedCount;
      console.log(
        `🗑️  Eliminados ${eliminadosDisponibles.deletedCount} turnos disponibles`
      );

      // Eliminar turnos disponibles de barberos excluidos
      if (barberosExcluidos.length > 0) {
        const idsExcluidos = barberosExcluidos.map((b) => b._id);
        const eliminadosExcluidos = await Agenda.deleteMany({
          fecha: {
            $gte: inicio.toDate(),
            $lte: fin.toDate(),
          },
          barbero: { $in: idsExcluidos },
          estado: "disponible",
          creadoAutomaticamente: true,
        });

        turnosEliminadosTotal += eliminadosExcluidos.deletedCount;
        console.log(
          `🗑️  Eliminados ${eliminadosExcluidos.deletedCount} turnos de barberos excluidos de agenda`
        );
      }

      // Regenerar turnos
      const resultado = await this.generarTurnosRango(
        inicio.toDate(),
        fin.toDate()
      );

      return {
        mensaje: "Agenda regenerada exitosamente",
        duplicadosEliminados: duplicadosEliminados,
        turnosEliminados: turnosEliminadosTotal,
        ...resultado,
      };
    } catch (error) {
      console.error("❌ Error regenerando agenda:", error);
      throw error;
    }
  }

  /**
   * Limpiar turnos duplicados manteniendo solo uno por barbero/hora
   */
  async limpiarDuplicadosPorBarbero() {
    try {
      console.log("🧹 Iniciando limpieza de turnos duplicados por barbero...");

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
              fecha: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } },
              hora: "$hora",
              barbero: "$barbero",
            },
            turnos: { $push: "$$ROOT" },
            count: { $sum: 1 },
          },
        },
        {
          $match: { count: { $gt: 1 } },
        },
      ];

      const duplicados = await Agenda.aggregate(pipeline);
      let eliminados = 0;

      for (const grupo of duplicados) {
        // Mantener el primero, eliminar el resto
        const turnosAEliminar = grupo.turnos.slice(1);
        const ids = turnosAEliminar.map((t) => t._id);

        const resultado = await Agenda.deleteMany({ _id: { $in: ids } });
        eliminados += resultado.deletedCount;

        console.log(
          `   Eliminados ${resultado.deletedCount} duplicados para ${grupo._id.fecha} ${grupo._id.hora} - Barbero: ${grupo._id.barbero}`
        );
      }

      console.log(`✅ Limpieza completada. ${eliminados} turnos eliminados.`);

      return {
        mensaje: "Limpieza completada",
        gruposDuplicados: duplicados.length,
        turnosEliminados: eliminados,
      };
    } catch (error) {
      console.error("❌ Error limpiando duplicados:", error);
      throw error;
    }
  }

  /**
   * Limpiar turnos de barberos excluidos de la agenda
   * CUIDADO: Esta función elimina TODOS los turnos (incluidos los agendados) de barberos excluidos
   */
  async limpiarTurnosBarberosExcluidos(fechaInicio, fechaFin) {
    try {
      console.log("🧹 Iniciando limpieza de turnos de barberos excluidos...");

      const inicio = fechaInicio
        ? ParaguayDateUtil.toParaguayTime(fechaInicio)
        : ParaguayDateUtil.now();

      const fin = fechaFin
        ? ParaguayDateUtil.toParaguayTime(fechaFin)
        : ParaguayDateUtil.now().add(3, "months");

      // Obtener barberos que NO están incluidos en agenda
      const barberosExcluidos = await BarberoModel.find({
        $or: [
          { incluirEnAgenda: false },
          { incluirEnAgenda: { $exists: false } },
        ],
      });

      if (barberosExcluidos.length === 0) {
        return {
          mensaje: "No hay barberos excluidos de la agenda",
          turnosEliminados: 0,
        };
      }

      const idsExcluidos = barberosExcluidos.map((b) => b._id);

      // Contar turnos que se van a eliminar
      const turnosAEliminar = await Agenda.countDocuments({
        fecha: {
          $gte: inicio.toDate(),
          $lte: fin.toDate(),
        },
        barbero: { $in: idsExcluidos },
      });

      // Contar turnos agendados que se perderán
      const turnosAgendados = await Agenda.countDocuments({
        fecha: {
          $gte: inicio.toDate(),
          $lte: fin.toDate(),
        },
        barbero: { $in: idsExcluidos },
        estado: { $ne: "disponible" },
      });

      console.log(`⚠️  Se eliminarán ${turnosAEliminar} turnos en total`);
      console.log(
        `⚠️  De estos, ${turnosAgendados} están agendados con clientes`
      );

      // Eliminar turnos
      const resultado = await Agenda.deleteMany({
        fecha: {
          $gte: inicio.toDate(),
          $lte: fin.toDate(),
        },
        barbero: { $in: idsExcluidos },
      });

      console.log(
        `✅ Eliminados ${resultado.deletedCount} turnos de barberos excluidos`
      );

      return {
        mensaje: "Limpieza de barberos excluidos completada",
        barberosExcluidos: barberosExcluidos.length,
        turnosEliminados: resultado.deletedCount,
        turnosAgendadosPerdidos: turnosAgendados,
        barberos: barberosExcluidos.map((b) => b.nombre),
      };
    } catch (error) {
      console.error("❌ Error limpiando turnos de barberos excluidos:", error);
      throw error;
    }
  }
}

module.exports = new AgendaGeneratorService();
