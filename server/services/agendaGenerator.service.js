const AgendaModel = require("../models/agenda.model");
const HorarioModel = require("../models/horario.model");

class AgendaGeneratorService {
  constructor() {
    this.diasSemana = [
      "domingo",
      "lunes",
      "martes",
      "miercoles",
      "jueves",
      "viernes",
      "sabado",
    ];
  }

  // Generar turnos para un rango de fechas
  async generarTurnosRango(fechaInicio, fechaFin) {
    try {
      const resultados = {
        generados: 0,
        errores: 0,
        detalles: [],
      };

      const fechaActual = new Date(fechaInicio);
      const fechaFinal = new Date(fechaFin);

      while (fechaActual <= fechaFinal) {
        const resultado = await this.generarTurnosPorFecha(
          new Date(fechaActual)
        );
        resultados.generados += resultado.generados;
        resultados.errores += resultado.errores;
        resultados.detalles.push({
          fecha: fechaActual.toISOString().split("T")[0],
          ...resultado,
        });

        // Avanzar al siguiente día
        fechaActual.setDate(fechaActual.getDate() + 1);
      }

      return resultados;
    } catch (error) {
      console.error("Error al generar turnos por rango:", error);
      throw error;
    }
  }

  // Generar turnos para una fecha específica
  async generarTurnosPorFecha(fecha) {
    try {
      const diaSemana = this.diasSemana[fecha.getDay()];
      const resultados = {
        fecha: fecha.toISOString().split("T")[0],
        diaSemana,
        generados: 0,
        errores: 0,
        slots: [],
      };

      // Obtener configuración de horarios para este día
      const horario = await HorarioModel.findOne({
        diaSemana: diaSemana,
        activo: true,
      });

      if (!horario) {
        console.log(`No hay horarios configurados para ${diaSemana}`);
        return resultados;
      }

      // Generar slots de tiempo
      const slots = horario.generarSlots(fecha);

      if (slots.length === 0) {
        console.log(
          `No hay slots disponibles para ${diaSemana} - ${
            fecha.toISOString().split("T")[0]
          }`
        );
        return resultados;
      }

      // Verificar qué turnos ya existen para esta fecha (todo el día)
      const inicioDia = new Date(fecha);
      inicioDia.setHours(0, 0, 0, 0);
      const finDia = new Date(fecha);
      finDia.setHours(23, 59, 59, 999);

      const turnosExistentes = await AgendaModel.find({
        fecha: { $gte: inicioDia, $lte: finDia },
      });
      const horasExistentes = turnosExistentes.map((turno) => turno.hora);

      // Crear turnos para slots que no existen
      const fechaNormalizada = new Date(fecha);
      fechaNormalizada.setHours(12, 0, 0, 0); // Normalizar a mediodía para evitar problemas de timezone

      for (const slot of slots) {
        if (!horasExistentes.includes(slot)) {
          try {
            await AgendaModel.create({
              fecha: fechaNormalizada,
              hora: slot,
              diaSemana,
              estado: "disponible",
              creadoAutomaticamente: true,
            });

            resultados.generados++;
            resultados.slots.push({
              hora: slot,
              estado: "generado",
            });
          } catch (error) {
            console.error(`Error al crear turno ${slot} para ${fecha}:`, error);
            resultados.errores++;
            resultados.slots.push({
              hora: slot,
              estado: "error",
              error: error.message,
            });
          }
        } else {
          resultados.slots.push({
            hora: slot,
            estado: "existente",
          });
        }
      }

      return resultados;
    } catch (error) {
      console.error("Error al generar turnos por fecha:", error);
      throw error;
    }
  }

  // Generar turnos para todo el año
  async generarTurnosAño(año = null) {
    try {
      const añoActual = año || new Date().getFullYear();
      const fechaInicio = new Date(añoActual, 0, 1); // 1 de enero
      const fechaFin = new Date(añoActual, 11, 31); // 31 de diciembre

      console.log(`🗓️ Generando turnos para todo el año ${añoActual}...`);

      const resultado = await this.generarTurnosRango(fechaInicio, fechaFin);

      console.log(`✅ Generación completada para ${añoActual}:`);
      console.log(`   - Turnos generados: ${resultado.generados}`);
      console.log(`   - Errores: ${resultado.errores}`);

      return {
        año: añoActual,
        fechaInicio: fechaInicio.toISOString().split("T")[0],
        fechaFin: fechaFin.toISOString().split("T")[0],
        ...resultado,
      };
    } catch (error) {
      console.error("Error al generar turnos del año:", error);
      throw error;
    }
  }

  // Generar turnos para el próximo mes
  async generarTurnosProximoMes() {
    try {
      const hoy = new Date();
      const proximoMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
      const finProximoMes = new Date(
        proximoMes.getFullYear(),
        proximoMes.getMonth() + 1,
        0
      );

      console.log(
        `📅 Generando turnos para ${proximoMes.toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        })}...`
      );

      return await this.generarTurnosRango(proximoMes, finProximoMes);
    } catch (error) {
      console.error("Error al generar turnos del próximo mes:", error);
      throw error;
    }
  }

  // Limpiar turnos antiguos (opcional)
  async limpiarTurnosAntiguos(diasAtras = 30) {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasAtras);

      const resultado = await AgendaModel.deleteMany({
        fecha: { $lt: fechaLimite },
        estado: "disponible",
        creadoAutomaticamente: true,
      });

      console.log(
        `🧹 Limpieza completada: ${resultado.deletedCount} turnos antiguos eliminados`
      );

      return {
        eliminados: resultado.deletedCount,
        fechaLimite: fechaLimite.toISOString().split("T")[0],
      };
    } catch (error) {
      console.error("Error al limpiar turnos antiguos:", error);
      throw error;
    }
  }

  // Obtener estadísticas de generación
  async obtenerEstadisticas(año = null) {
    try {
      const hoy = new Date();
      const inicioHoy = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate()
      );
      const finHoy = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate() + 1
      );

      // Estadísticas de HOY
      const turnosHoy = await AgendaModel.countDocuments({
        fecha: { $gte: inicioHoy, $lt: finHoy },
      });

      const disponiblesHoy = await AgendaModel.countDocuments({
        fecha: { $gte: inicioHoy, $lt: finHoy },
        estado: "disponible",
      });

      const agendadosHoy = turnosHoy - disponiblesHoy;

      // Estadísticas de SEMANA (lunes a domingo)
      const diaActual = hoy.getDay();
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(
        hoy.getDate() - diaActual + (diaActual === 0 ? -6 : 1)
      );
      inicioSemana.setHours(0, 0, 0, 0);

      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 7);

      const turnosSemana = await AgendaModel.countDocuments({
        fecha: { $gte: inicioSemana, $lt: finSemana },
      });

      const disponiblesSemana = await AgendaModel.countDocuments({
        fecha: { $gte: inicioSemana, $lt: finSemana },
        estado: "disponible",
      });

      const agendadosSemana = turnosSemana - disponiblesSemana;

      // Estadísticas de MES
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);

      const turnosMes = await AgendaModel.countDocuments({
        fecha: { $gte: inicioMes, $lt: finMes },
      });

      const disponiblesMes = await AgendaModel.countDocuments({
        fecha: { $gte: inicioMes, $lt: finMes },
        estado: "disponible",
      });

      const agendadosMes = turnosMes - disponiblesMes;

      return {
        hoy: {
          agendados: agendadosHoy,
          disponibles: disponiblesHoy,
          total: turnosHoy,
        },
        semana: {
          agendados: agendadosSemana,
          disponibles: disponiblesSemana,
          total: turnosSemana,
        },
        mes: {
          agendados: agendadosMes,
          disponibles: disponiblesMes,
          total: turnosMes,
        },
      };
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      throw error;
    }
  }
}

module.exports = new AgendaGeneratorService();
