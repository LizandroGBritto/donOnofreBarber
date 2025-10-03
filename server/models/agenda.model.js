const mongoose = require("mongoose");

const AgendaSchema = new mongoose.Schema(
  {
    fecha: {
      type: Date,
      required: [true, "La fecha es requerida"],
      index: true,
    },
    hora: {
      type: String,
      required: [true, "La hora es requerida"],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Formato de hora inválido (HH:MM)",
      ],
    },
    diaSemana: {
      type: String,
      enum: [
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
        "domingo",
      ],
      required: true,
    },

    // Información del cliente (solo cuando está reservado)
    nombreCliente: {
      type: String,
      default: "",
    },
    numeroCliente: {
      type: String,
      default: "",
    },
    emailCliente: {
      type: String,
      default: "",
    },

    // Barbero asignado al turno
    barbero: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barbero",
      default: null,
    },
    nombreBarbero: {
      type: String,
      default: "",
    },

    // Servicios seleccionados (referencia al modelo Servicio)
    servicios: [
      {
        servicioId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Servicio",
        },
        nombre: String, // Copia para histórico
        precio: Number, // Copia para histórico
        duracion: Number, // Copia para histórico
      },
    ],

    // Estados y gestión
    estado: {
      type: String,
      enum: [
        "disponible",
        "reservado",
        "confirmado",
        "en_proceso",
        "completado",
        "cancelado",
        "no_show",
      ],
      default: "disponible",
      index: true,
    },
    estadoPago: {
      type: String,
      enum: ["pendiente", "pagado", "reembolsado"],
      default: "pendiente",
    },

    // Costos
    costoTotal: {
      type: Number,
      default: 0,
    },
    costoServicios: {
      type: Number,
      default: 0,
    },
    descuento: {
      type: Number,
      default: 0,
    },

    // Metadata
    notas: {
      type: String,
      default: "",
    },
    creadoAutomaticamente: {
      type: Boolean,
      default: true, // true para turnos generados automáticamente
    },

    // Fechas importantes
    fechaReserva: Date,
    fechaConfirmacion: Date,
    fechaCompletado: Date,
    fechaCancelacion: Date,
  },
  { timestamps: true }
);

// Índices compuestos para optimizar consultas
AgendaSchema.index({ fecha: 1, hora: 1 }); // Para buscar turnos específicos
AgendaSchema.index({ fecha: 1, estado: 1 }); // Para filtrar por fecha y estado
AgendaSchema.index({ diaSemana: 1, estado: 1 }); // Para consultas por día de semana
AgendaSchema.index({ nombreCliente: 1, fecha: 1 }); // Para buscar por cliente
AgendaSchema.index({ fecha: 1, hora: 1, barbero: 1 }); // Para turnos por barbero y horario
AgendaSchema.index({ barbero: 1, fecha: 1, estado: 1 }); // Para consultas por barbero

// Métodos estáticos para consultas comunes
AgendaSchema.statics.getTurnosDisponibles = function (fecha) {
  return this.find({
    fecha: fecha,
    estado: "disponible",
  }).sort({ hora: 1 });
};

// Nuevo método: Obtener barberos disponibles para una fecha y hora específica
AgendaSchema.statics.getBarberosDisponibles = function (fecha, hora) {
  return this.find({
    fecha: fecha,
    hora: hora,
    estado: "disponible",
    barbero: null, // Turnos sin barbero asignado
  }).sort({ hora: 1 });
};

// Nuevo método: Verificar disponibilidad de un barbero específico
AgendaSchema.statics.isBarberoDisponible = function (fecha, hora, barberoId) {
  return this.findOne({
    fecha: fecha,
    hora: hora,
    barbero: barberoId,
    estado: { $in: ["reservado", "confirmado", "en_proceso"] },
  }).then((turno) => !turno); // Retorna true si NO encuentra turno ocupado
};

// Nuevo método: Obtener turnos disponibles con información de barberos
AgendaSchema.statics.getTurnosConBarberos = function (fecha) {
  return this.find({
    fecha: fecha,
  })
    .populate("barbero", "nombre foto")
    .sort({ hora: 1 });
};

AgendaSchema.statics.getTurnosHoy = function () {
  const hoy = new Date();
  const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
  const finDia = new Date(hoy.setHours(23, 59, 59, 999));

  return this.find({
    fecha: { $gte: inicioDia, $lte: finDia },
  }).sort({ hora: 1 });
};

AgendaSchema.statics.getTurnosSemana = function () {
  const hoy = new Date();
  const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
  const finSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + 6));
  finSemana.setHours(23, 59, 59, 999);

  return this.find({
    fecha: { $gte: inicioSemana, $lte: finSemana },
  }).sort({ fecha: 1, hora: 1 });
};

AgendaSchema.statics.getTurnosMes = function (año = null, mes = null) {
  const fecha = new Date();
  const añoActual = año || fecha.getFullYear();
  const mesActual = mes !== null ? mes : fecha.getMonth();

  const inicioMes = new Date(añoActual, mesActual, 1);
  const finMes = new Date(añoActual, mesActual + 1, 0, 23, 59, 59, 999);

  return this.find({
    fecha: { $gte: inicioMes, $lte: finMes },
  }).sort({ fecha: 1, hora: 1 });
};

// Método para calcular costo total
AgendaSchema.methods.calcularCostoTotal = function () {
  const costoServicios = this.servicios.reduce((total, servicio) => {
    return total + (servicio.precio || 0);
  }, 0);

  this.costoServicios = costoServicios;
  this.costoTotal = costoServicios - (this.descuento || 0);
  return this.costoTotal;
};

// Pre-save middleware para sincronizar día de la semana con fecha
AgendaSchema.pre("save", function (next) {
  if (this.fecha) {
    const diasSemana = [
      "domingo",
      "lunes",
      "martes",
      "miercoles",
      "jueves",
      "viernes",
      "sabado",
    ];
    this.diaSemana = diasSemana[this.fecha.getDay()];
  }

  // Calcular costo total si hay servicios
  if (this.servicios && this.servicios.length > 0) {
    console.log("=== PRE-SAVE MIDDLEWARE ===");
    console.log("Servicios:", this.servicios);
    console.log("Costo antes de calcular:", this.costoTotal);
    this.calcularCostoTotal();
    console.log("Costo después de calcular:", this.costoTotal);
    console.log("Costo servicios:", this.costoServicios);
  }

  next();
});

module.exports = mongoose.model("Agenda", AgendaSchema);
