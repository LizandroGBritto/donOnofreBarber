const Agenda = require("../models/agenda.model");
const HorarioModel = require("../models/horario.model");
const BarberoModel = require("../models/barbero.model");
const ParaguayDateUtil = require("../utils/paraguayDate");

class AgendaGeneratorService {
  /**
   * Genera turnos por fecha considerando TODOS los barberos activos
   * Crea UN turno por barbero por cada horario configurado
   */
  async generarTurnosPorFecha(fecha) {
    try {
      const fechaObj = ParaguayDateUtil.toParaguayTime(fecha).toDate();
      const diaSemana = ParaguayDateUtil.getDayOfWeek(fechaObj);

      // 1. Obtener barberos activos que estén incluidos en agenda
      const barberosActivos = await BarberoModel.find({
        activo: true,
        incluirEnAgenda: true,
      });

      if (barberosActivos.length === 0) {
        return {
          mensaje:
            "No hay barberos activos incluidos en agenda para generar turnos",
          turnosCreados: 0,
        };
      }

      // 2. Obtener horarios configurados para este día
      const horariosDelDia = await HorarioModel.find({
        dias: diaSemana,
        estado: "activo",
      });

      if (horariosDelDia.length === 0) {
        return {
          mensaje: `No hay horarios configurados para ${diaSemana}`,
          turnosCreados: 0,
        };
      }

      horariosDelDia.forEach((h) => console.log(`   - ${h.hora}`));

      // 3. Generar turnos: uno por barbero por cada horario
      const turnosACrear = [];

      for (const horario of horariosDelDia) {
        for (const barbero of barberosActivos) {
          // Verificar si ya existe este turno específico
          const turnoExistente = await Agenda.findOne({
            fecha: {
              $gte: ParaguayDateUtil.startOfDay(fechaObj).toDate(),
              $lte: ParaguayDateUtil.endOfDay(fechaObj).toDate(),
            },
            hora: horario.hora,
            barbero: barbero._id,
          });

          if (!turnoExistente) {
            turnosACrear.push({
              fecha: ParaguayDateUtil.startOfDay(fechaObj).toDate(),
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
      }

      // 4. Insertar turnos en la base de datos
      if (turnosACrear.length > 0) {
        await Agenda.insertMany(turnosACrear);
      }

      return {
        mensaje: "Turnos generados exitosamente",
        turnosCreados: turnosACrear.length,
        barberos: barberosActivos.length,
        horarios: horariosDelDia.length,
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
   * Obtener estadísticas de la agenda
   */
  async obtenerEstadisticas() {
    try {
      const hoy = ParaguayDateUtil.now().toDate();
      const inicioSemana = ParaguayDateUtil.now().startOf("week").toDate();
      const finSemana = ParaguayDateUtil.now().endOf("week").toDate();
      const inicioMes = ParaguayDateUtil.now().startOf("month").toDate();
      const finMes = ParaguayDateUtil.now().endOf("month").toDate();
      const inicioAño = ParaguayDateUtil.now().startOf("year").toDate();
      const finAño = ParaguayDateUtil.now().endOf("year").toDate();

      const [
        turnosAgendadosHoy,
        turnosDisponiblesHoy,
        turnosAgendadosSemana,
        turnosDisponiblesSemana,
        turnosAgendadosMes,
        turnosDisponiblesMes,
        turnosAgendadosAño,
        turnosDisponiblesAño,
      ] = await Promise.all([
        // Turnos agendados hoy
        Agenda.countDocuments({
          fecha: {
            $gte: ParaguayDateUtil.startOfDay(hoy).toDate(),
            $lte: ParaguayDateUtil.endOfDay(hoy).toDate(),
          },
          estado: { $ne: "disponible" },
        }),
        // Turnos disponibles hoy
        Agenda.countDocuments({
          fecha: {
            $gte: ParaguayDateUtil.startOfDay(hoy).toDate(),
            $lte: ParaguayDateUtil.endOfDay(hoy).toDate(),
          },
          estado: "disponible",
        }),
        // Turnos agendados esta semana
        Agenda.countDocuments({
          fecha: { $gte: inicioSemana, $lte: finSemana },
          estado: { $ne: "disponible" },
        }),
        // Turnos disponibles esta semana
        Agenda.countDocuments({
          fecha: { $gte: inicioSemana, $lte: finSemana },
          estado: "disponible",
        }),
        // Turnos agendados este mes
        Agenda.countDocuments({
          fecha: { $gte: inicioMes, $lte: finMes },
          estado: { $ne: "disponible" },
        }),
        // Turnos disponibles este mes
        Agenda.countDocuments({
          fecha: { $gte: inicioMes, $lte: finMes },
          estado: "disponible",
        }),
        // Turnos agendados este año
        Agenda.countDocuments({
          fecha: { $gte: inicioAño, $lte: finAño },
          estado: { $ne: "disponible" },
        }),
        // Turnos disponibles este año
        Agenda.countDocuments({
          fecha: { $gte: inicioAño, $lte: finAño },
          estado: "disponible",
        }),
      ]);

      // Consultas separadas para calcular ingresos generados (suma de costoTotal)
      const [
        ingresosPagadosHoy,
        ingresosPagadosSemana,
        ingresosPagadosMes,
        ingresosPagadosAño,
      ] = await Promise.all([
        // Ingresos generados hoy
        Agenda.aggregate([
          {
            $match: {
              fecha: {
                $gte: ParaguayDateUtil.startOfDay(hoy).toDate(),
                $lte: ParaguayDateUtil.endOfDay(hoy).toDate(),
              },
              estado: "pagado",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$costoTotal" },
            },
          },
        ]),
        // Ingresos generados esta semana
        Agenda.aggregate([
          {
            $match: {
              fecha: { $gte: inicioSemana, $lte: finSemana },
              estado: "pagado",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$costoTotal" },
            },
          },
        ]),
        // Ingresos generados este mes
        Agenda.aggregate([
          {
            $match: {
              fecha: { $gte: inicioMes, $lte: finMes },
              estado: "pagado",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$costoTotal" },
            },
          },
        ]),
        // Ingresos generados este año
        Agenda.aggregate([
          {
            $match: {
              fecha: { $gte: inicioAño, $lte: finAño },
              estado: "pagado",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$costoTotal" },
            },
          },
        ]),
      ]);

      return {
        hoy: {
          agendados: turnosAgendadosHoy,
          disponibles: turnosDisponiblesHoy,
          generado: ingresosPagadosHoy[0]?.total || 0,
        },
        semana: {
          agendados: turnosAgendadosSemana,
          disponibles: turnosDisponiblesSemana,
          generado: ingresosPagadosSemana[0]?.total || 0,
        },
        mes: {
          agendados: turnosAgendadosMes,
          disponibles: turnosDisponiblesMes,
          generado: ingresosPagadosMes[0]?.total || 0,
        },
        año: {
          agendados: turnosAgendadosAño,
          disponibles: turnosDisponiblesAño,
          generado: ingresosPagadosAño[0]?.total || 0,
        },
      };
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
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

      // Obtener barberos que NO están incluidos en agenda
      const barberosExcluidos = await BarberoModel.find({
        $or: [
          { incluirEnAgenda: false },
          { incluirEnAgenda: { $exists: false } },
        ],
      });

      let turnosEliminadosTotal = 0;

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
