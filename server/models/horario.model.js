const mongoose = require("mongoose");

const HorarioSchema = new mongoose.Schema(
  {
    diaSemana: {
      type: String,
      required: [true, "El día de la semana es requerido"],
      enum: [
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
        "domingo",
      ],
    },
    activo: {
      type: Boolean,
      default: true,
    },
    horarios: [
      {
        horaInicio: {
          type: String, // Formato "08:00"
          required: [true, "La hora de inicio es requerida"],
        },
        horaFin: {
          type: String, // Formato "18:00"
          required: [true, "La hora de fin es requerida"],
        },
        intervalos: {
          type: Number, // Intervalos en minutos (ej: 30)
          default: 30,
        },
        activo: {
          type: Boolean,
          default: true,
        },
      },
    ],
    // Excepciones para fechas específicas
    excepciones: [
      {
        fecha: {
          type: Date,
          required: true,
        },
        cerrado: {
          type: Boolean,
          default: false,
        },
        horariosEspeciales: [
          {
            horaInicio: String,
            horaFin: String,
            intervalos: {
              type: Number,
              default: 30,
            },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

// Método para generar slots de tiempo
HorarioSchema.methods.generarSlots = function (fecha = null) {
  const slots = [];

  // Si hay excepciones para la fecha específica
  if (fecha) {
    const excepcion = this.excepciones.find(
      (exc) => exc.fecha.toDateString() === fecha.toDateString()
    );

    if (excepcion) {
      if (excepcion.cerrado) return [];

      // Usar horarios especiales si existen
      if (excepcion.horariosEspeciales.length > 0) {
        excepcion.horariosEspeciales.forEach((horario) => {
          slots.push(...this.generarSlotsDeHorario(horario));
        });
        return slots;
      }
    }
  }

  // Usar horarios normales
  this.horarios.forEach((horario) => {
    if (horario.activo) {
      slots.push(...this.generarSlotsDeHorario(horario));
    }
  });

  return slots.sort();
};

HorarioSchema.methods.generarSlotsDeHorario = function (horario) {
  const slots = [];
  const [horaInicio, minutoInicio] = horario.horaInicio.split(":").map(Number);
  const [horaFin, minutoFin] = horario.horaFin.split(":").map(Number);

  const inicioEnMinutos = horaInicio * 60 + minutoInicio;
  const finEnMinutos = horaFin * 60 + minutoFin;

  for (
    let minutos = inicioEnMinutos;
    minutos < finEnMinutos;
    minutos += horario.intervalos
  ) {
    const hora = Math.floor(minutos / 60);
    const minuto = minutos % 60;
    slots.push(
      `${hora.toString().padStart(2, "0")}:${minuto
        .toString()
        .padStart(2, "0")}`
    );
  }

  return slots;
};

// Índices
HorarioSchema.index({ diaSemana: 1, activo: 1 });

module.exports = mongoose.model("Horario", HorarioSchema);
