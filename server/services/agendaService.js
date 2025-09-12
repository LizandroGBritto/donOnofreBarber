const Agenda = require("../models/agenda.model");

class AgendaService {
  constructor() {
    this.horariosDisponibles = [
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
    ];
    this.diasLaborales = [1, 2, 3, 4, 5, 6]; // Lunes a Sábado
  }

  // Generar turnos disponibles para un mes
  async generarTurnosMes(año, mes) {
    try {
      const primerDia = new Date(año, mes, 1);
      const ultimoDia = new Date(año, mes + 1, 0);

      const turnosGenerados = [];

      for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const fecha = new Date(año, mes, dia);

        // Solo generar para días laborales
        if (this.diasLaborales.includes(fecha.getDay())) {
          for (const hora of this.horariosDisponibles) {
            // Verificar si ya existe un turno para esta fecha y hora
            const turnoExistente = await Agenda.findOne({
              Fecha: {
                $gte: new Date(fecha.setHours(0, 0, 0, 0)),
                $lte: new Date(fecha.setHours(23, 59, 59, 999)),
              },
              Hora: hora,
            });

            if (!turnoExistente) {
              turnosGenerados.push({
                Hora: hora,
                Fecha: new Date(año, mes, dia),
                Estado: "Disponible",
                NombreCliente: null,
                NumeroCliente: null,
                UserId: null,
                Servicios: [],
                Costo: 0,
              });
            }
          }
        }
      }

      if (turnosGenerados.length > 0) {
        await Agenda.insertMany(turnosGenerados);
        console.log(
          `✅ Generados ${turnosGenerados.length} turnos para ${mes + 1}/${año}`
        );
      }

      return turnosGenerados.length;
    } catch (error) {
      console.error("Error generando turnos:", error);
      throw error;
    }
  }

  // Obtener estadísticas para el dashboard
  async obtenerEstadisticas() {
    try {
      const [turnosHoy, turnosSemana, turnosMes] = await Promise.all([
        Agenda.getTurnosHoy(),
        Agenda.getTurnosSemana(),
        Agenda.getTurnosMes(),
      ]);

      const stats = {
        hoy: {
          agendados: turnosHoy.filter((t) => t.NombreCliente).length,
          disponibles: turnosHoy.length,
        },
        semana: {
          agendados: turnosSemana.filter((t) => t.NombreCliente).length,
          disponibles: turnosSemana.length,
        },
        mes: {
          agendados: turnosMes.filter((t) => t.NombreCliente).length,
          disponibles: turnosMes.length,
        },
      };

      return stats;
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      throw error;
    }
  }

  // Job para ejecutar automáticamente cada mes
  async jobMensual() {
    const ahora = new Date();
    const proximoMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

    console.log(
      `🔄 Ejecutando job mensual para ${
        proximoMes.getMonth() + 1
      }/${proximoMes.getFullYear()}`
    );

    await this.generarTurnosMes(
      proximoMes.getFullYear(),
      proximoMes.getMonth()
    );
  }

  // Inicializar turnos para el mes actual si no existen
  async inicializarSiEsNecesario() {
    const ahora = new Date();
    const turnosEsteMes = await Agenda.getTurnosMes();

    if (turnosEsteMes.length === 0) {
      console.log("📅 No hay turnos para este mes, generando...");
      await this.generarTurnosMes(ahora.getFullYear(), ahora.getMonth());
    }
  }
}

module.exports = new AgendaService();
