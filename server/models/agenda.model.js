const mongoose = require('mongoose');

const AgendaSchema = new mongoose.Schema({
  Hora: {
    type: String,
    required: [true, "La hora de la cita es requerida"],
    minlength: [3, "La hora debe tener al menos 3 caracteres"]
  },
  NombreCliente: {
    type: String
  },
  NumeroCliente: {
    type: String
  },
  Dia: {
    type: String
  },
  UserId: {
    type: String
  },
  Servicios:  {
    type: [{
      name: { type: String, required: true },
      price: { type: Number, required: true }
    }]
  },
  Costo: {
    type: Number
  },
  Estado: {
    type: String,
    default: 'Sin Pagar'
  }
}, { timestamps: true });

module.exports = mongoose.model('Agenda', AgendaSchema);