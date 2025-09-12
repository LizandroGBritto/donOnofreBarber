const mongoose = require("mongoose");

const AgendaSchema = new mongoose.Schema(
  {
    Hora: {
      type: String,
      required: [true, "La hora de la cita es requerida"],
      minlength: [3, "La hora debe tener al menos 3 caracteres"],
    },
    NombreCliente: {
      type: String,
    },
    NumeroCliente: {
      type: String,
    },
    Dia: {
      type: String, // Día de la semana (ej: "Lunes", "Martes")
    },
    Fecha: {
      type: Date,
      required: [true, "La fecha es requerida"],
      index: true, // Para optimizar consultas por fecha
    },
    UserId: {
      type: String,
    },
    Servicios: {
      type: [
        {
          name: { type: String, required: true },
          price: { type: Number, required: true },
        },
      ],
    },
    Costo: {
      type: Number,
    },
    Estado: {
      type: String,
      default: "Sin Pagar",
    },
    // Nuevos campos para mejor gestión
    EsRecurrente: {
      type: Boolean,
      default: false,
    },
    TipoRecurrencia: {
      type: String,
      enum: ["semanal", "quincenal", "mensual"],
      default: null,
    },
  },
  { timestamps: true }
);

// Métodos estáticos para consultas comunes
AgendaSchema.statics.getTurnosHoy = function () {
  const hoy = new Date();
  const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
  const finDia = new Date(hoy.setHours(23, 59, 59, 999));

  return this.find({
    Fecha: { $gte: inicioDia, $lte: finDia },
  });
};

AgendaSchema.statics.getTurnosSemana = function () {
  const hoy = new Date();
  const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
  const finSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + 6));
  finSemana.setHours(23, 59, 59, 999);

  return this.find({
    Fecha: { $gte: inicioSemana, $lte: finSemana },
  });
};

AgendaSchema.statics.getTurnosMes = function (año = null, mes = null) {
  const fecha = new Date();
  const añoActual = año || fecha.getFullYear();
  const mesActual = mes !== null ? mes : fecha.getMonth();

  const inicioMes = new Date(añoActual, mesActual, 1);
  const finMes = new Date(añoActual, mesActual + 1, 0, 23, 59, 59, 999);

  return this.find({
    Fecha: { $gte: inicioMes, $lte: finMes },
  });
};

// Método para sincronizar día de la semana con fecha
AgendaSchema.pre("save", function (next) {
  if (this.Fecha) {
    const diasSemana = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    this.Dia = diasSemana[this.Fecha.getDay()];
  }
  next();
});

module.exports = mongoose.model("Agenda", AgendaSchema);
