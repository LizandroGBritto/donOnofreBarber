const mongoose = require("mongoose");

/**
 * Aviso push que pidió un cliente para SU turno ("te avisamos una hora antes").
 *
 * Va aparte de `Suscripcion` a propósito: esas son las del panel y reciben el
 * broadcast de nuevas reservas, que trae datos de otros clientes. Un cliente
 * solo recibe el aviso de su turno, y una sola vez.
 */
const RecordatorioPushSchema = new mongoose.Schema(
  {
    turno: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agenda",
      required: true,
      index: true,
    },
    // Hash del editToken de la reserva que lo pidió. Si el turno se libera y
    // otra persona lo reserva, el token cambia y este aviso se descarta: el
    // primero no se entera del turno del segundo.
    reserva: { type: String, required: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    // Cuánto antes del turno se avisa: 60, 40, 20 o 5 minutos.
    minutosAntes: { type: Number, required: true, enum: [60, 40, 20, 5] },
    estado: {
      type: String,
      enum: ["pendiente", "enviado", "descartado"],
      default: "pendiente",
      index: true,
    },
    motivo: String, // por qué se descartó
    intentos: { type: Number, default: 0 },
    enviadoEn: Date,
  },
  { timestamps: true }
);

// Un mismo dispositivo pide el aviso de un turno una sola vez.
RecordatorioPushSchema.index({ turno: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model("RecordatorioPush", RecordatorioPushSchema);
