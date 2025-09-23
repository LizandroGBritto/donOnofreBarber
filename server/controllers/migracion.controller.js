const AgendaModel = require("../models/agenda.model");

// Controlador temporal para migrar datos del sistema antiguo al nuevo
const migracionController = {
  // Migrar turnos del sistema antiguo al nuevo
  migrarDatosAntiguos: async (req, res) => {
    try {
      console.log("🔄 Iniciando migración de datos del sistema antiguo...");

      // Buscar todos los turnos con el formato antiguo
      const turnosAntiguos = await AgendaModel.find({
        $or: [
          { Hora: { $exists: true } },
          { NombreCliente: { $exists: true } },
          { Fecha: { $exists: true } },
        ],
      });

      console.log(
        `📊 Encontrados ${turnosAntiguos.length} turnos con formato antiguo`
      );

      if (turnosAntiguos.length === 0) {
        return res.status(200).json({
          message: "No hay turnos que migrar",
          migrados: 0,
          errores: 0,
        });
      }

      let migrados = 0;
      let errores = 0;
      const detalles = [];

      for (const turnoAntiguo of turnosAntiguos) {
        try {
          // Mapear campos antiguos a nuevos
          const fechaTurno =
            turnoAntiguo.Fecha || turnoAntiguo.fecha || new Date();
          const horaTurno = turnoAntiguo.Hora || turnoAntiguo.hora || "09:00";

          // Calcular día de la semana
          const diasSemana = [
            "domingo",
            "lunes",
            "martes",
            "miercoles",
            "jueves",
            "viernes",
            "sabado",
          ];
          const diaSemana = diasSemana[fechaTurno.getDay()];

          const turnoNuevo = {
            fecha: fechaTurno,
            hora: horaTurno,
            diaSemana: diaSemana,
            nombreCliente:
              turnoAntiguo.NombreCliente || turnoAntiguo.nombreCliente || "",
            numeroCliente:
              turnoAntiguo.NumeroCliente || turnoAntiguo.numeroCliente || "",
            emailCliente: "",

            // Mapear servicios
            servicios: [],

            // Determinar estado basado en los datos existentes
            estado: "disponible",
            estadoPago: "pendiente",

            // Costos
            costoTotal: turnoAntiguo.Costo || turnoAntiguo.costoTotal || 0,
            costoServicios:
              turnoAntiguo.Costo || turnoAntiguo.costoServicios || 0,
            descuento: 0,

            // Metadata
            notas: "",
            creadoAutomaticamente: false,

            // Conservar timestamps
            createdAt: turnoAntiguo.createdAt,
            updatedAt: turnoAntiguo.updatedAt,
          };

          // Determinar estado basado en los datos existentes
          if (
            turnoNuevo.nombreCliente &&
            turnoNuevo.nombreCliente.trim() !== ""
          ) {
            turnoNuevo.estado = "reservado";
            turnoNuevo.fechaReserva = turnoAntiguo.createdAt || new Date();
          }

          // Mapear estado de pago
          if (turnoAntiguo.Estado) {
            switch (turnoAntiguo.Estado.toLowerCase()) {
              case "pagado":
                turnoNuevo.estadoPago = "pagado";
                turnoNuevo.estado = "completado";
                turnoNuevo.fechaCompletado =
                  turnoAntiguo.updatedAt || new Date();
                break;
              case "sin pagar":
                turnoNuevo.estadoPago = "pendiente";
                if (turnoNuevo.nombreCliente) {
                  turnoNuevo.estado = "confirmado";
                }
                break;
              default:
                turnoNuevo.estadoPago = "pendiente";
            }
          }

          // Mapear servicios antiguos
          if (turnoAntiguo.Servicios && Array.isArray(turnoAntiguo.Servicios)) {
            turnoNuevo.servicios = turnoAntiguo.Servicios.map((servicio) => ({
              servicioId: null, // Se asignará después
              nombre: servicio.name || servicio.nombre || "Servicio",
              precio: servicio.price || servicio.precio || 0,
              duracion: 30, // Duración por defecto
            }));
          }

          // Crear nuevo documento con el formato actualizado
          const nuevoTurno = new AgendaModel(turnoNuevo);

          // Eliminar campos antiguos antes de guardar
          delete nuevoTurno.Hora;
          delete nuevoTurno.NombreCliente;
          delete nuevoTurno.NumeroCliente;
          delete nuevoTurno.Dia;
          delete nuevoTurno.Fecha;
          delete nuevoTurno.UserId;
          delete nuevoTurno.Servicios;
          delete nuevoTurno.Costo;
          delete nuevoTurno.Estado;

          await nuevoTurno.save();

          // Eliminar el turno antiguo
          await AgendaModel.deleteOne({ _id: turnoAntiguo._id });

          migrados++;
          detalles.push({
            id: turnoAntiguo._id,
            fecha: turnoNuevo.fecha,
            hora: turnoNuevo.hora,
            cliente: turnoNuevo.nombreCliente,
            estado: "migrado exitosamente",
          });

          console.log(
            `✅ Migrado: ${turnoNuevo.fecha?.toDateString()} ${
              turnoNuevo.hora
            } - ${turnoNuevo.nombreCliente || "Disponible"}`
          );
        } catch (error) {
          console.error(
            `❌ Error migrando turno ${turnoAntiguo._id}:`,
            error.message
          );
          errores++;
          detalles.push({
            id: turnoAntiguo._id,
            error: error.message,
            estado: "error en migración",
          });
        }
      }

      console.log(
        `🎉 Migración completada: ${migrados} exitosos, ${errores} errores`
      );

      res.status(200).json({
        message: "Migración de datos completada",
        migrados,
        errores,
        total: turnosAntiguos.length,
        detalles: detalles.slice(0, 10), // Solo primeros 10 para no sobrecargar
      });
    } catch (error) {
      console.error("❌ Error en la migración:", error);
      res.status(500).json({
        message: "Error en la migración de datos",
        error: error.message,
      });
    }
  },

  // Crear servicios por defecto
  crearServiciosDefecto: async (req, res) => {
    try {
      const ServicioModel = require("../models/servicio.model");

      const serviciosDefecto = [
        {
          nombre: "Corte Clásico",
          descripcion: "Corte tradicional de cabello",
          precio: 15000,
          duracion: 30,
          categoria: "corte",
          color: "#3B82F6",
        },
        {
          nombre: "Corte + Barba",
          descripcion: "Corte de cabello y arreglo de barba",
          precio: 25000,
          duracion: 45,
          categoria: "combo",
          color: "#10B981",
        },
        {
          nombre: "Solo Barba",
          descripcion: "Arreglo y perfilado de barba",
          precio: 12000,
          duracion: 20,
          categoria: "barba",
          color: "#F59E0B",
        },
        {
          nombre: "Corte Infantil",
          descripcion: "Corte especial para niños",
          precio: 12000,
          duracion: 25,
          categoria: "corte",
          color: "#8B5CF6",
        },
        {
          nombre: "Peinado Especial",
          descripcion: "Peinado para eventos especiales",
          precio: 20000,
          duracion: 40,
          categoria: "especial",
          color: "#EF4444",
        },
      ];

      let creados = 0;
      let existentes = 0;

      for (const servicioData of serviciosDefecto) {
        const existeServicio = await ServicioModel.findOne({
          nombre: servicioData.nombre,
        });

        if (!existeServicio) {
          await ServicioModel.create(servicioData);
          creados++;
        } else {
          existentes++;
        }
      }

      res.status(200).json({
        message: "Servicios por defecto creados",
        creados,
        existentes,
        total: serviciosDefecto.length,
      });
    } catch (error) {
      console.error("Error creando servicios por defecto:", error);
      res.status(500).json({
        message: "Error creando servicios por defecto",
        error: error.message,
      });
    }
  },

  // Crear horarios por defecto
  crearHorariosDefecto: async (req, res) => {
    try {
      const HorarioModel = require("../models/horario.model");

      const horariosDefecto = [
        {
          diaSemana: "lunes",
          activo: true,
          horarios: [
            {
              horaInicio: "09:00",
              horaFin: "18:00",
              intervalos: 30,
              activo: true,
            },
          ],
        },
        {
          diaSemana: "martes",
          activo: true,
          horarios: [
            {
              horaInicio: "09:00",
              horaFin: "18:00",
              intervalos: 30,
              activo: true,
            },
          ],
        },
        {
          diaSemana: "miercoles",
          activo: true,
          horarios: [
            {
              horaInicio: "09:00",
              horaFin: "18:00",
              intervalos: 30,
              activo: true,
            },
          ],
        },
        {
          diaSemana: "jueves",
          activo: true,
          horarios: [
            {
              horaInicio: "09:00",
              horaFin: "18:00",
              intervalos: 30,
              activo: true,
            },
          ],
        },
        {
          diaSemana: "viernes",
          activo: true,
          horarios: [
            {
              horaInicio: "09:00",
              horaFin: "19:00",
              intervalos: 30,
              activo: true,
            },
          ],
        },
        {
          diaSemana: "sabado",
          activo: true,
          horarios: [
            {
              horaInicio: "08:00",
              horaFin: "17:00",
              intervalos: 30,
              activo: true,
            },
          ],
        },
        {
          diaSemana: "domingo",
          activo: false,
          horarios: [],
        },
      ];

      let creados = 0;
      let actualizados = 0;

      for (const horarioData of horariosDefecto) {
        const existeHorario = await HorarioModel.findOne({
          diaSemana: horarioData.diaSemana,
        });

        if (!existeHorario) {
          await HorarioModel.create(horarioData);
          creados++;
        } else {
          await HorarioModel.findByIdAndUpdate(existeHorario._id, horarioData);
          actualizados++;
        }
      }

      res.status(200).json({
        message: "Horarios por defecto configurados",
        creados,
        actualizados,
        total: horariosDefecto.length,
      });
    } catch (error) {
      console.error("Error creando horarios por defecto:", error);
      res.status(500).json({
        message: "Error creando horarios por defecto",
        error: error.message,
      });
    }
  },
};

module.exports = migracionController;
