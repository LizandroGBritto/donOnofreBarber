const mongoose = require("mongoose");

/**
 * Precio propio de un barbero para un servicio del catálogo global.
 *
 * Es un OVERRIDE, no un catálogo paralelo: si un barbero no tiene fila para un
 * servicio, cobra el precio global de `Servicio`. El catálogo (qué servicios
 * existen) lo sigue definiendo el admin; el barbero solo decide su precio y si
 * lo ofrece o no.
 *
 * Nadie debería leer esta colección directamente: la resolución
 * precio-global-vs-override vive en services/precios.service.js, que es el
 * único lugar del sistema que decide un precio.
 */
const PrecioBarberoSchema = new mongoose.Schema(
  {
    barbero: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barbero",
      required: true,
      index: true,
    },
    servicio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Servicio",
      required: true,
      index: true,
    },
    precio: {
      type: Number,
      required: [true, "El precio es requerido"],
      min: [0, "El precio no puede ser negativo"],
    },
    // false = este barbero NO ofrece este servicio, aunque exista en el
    // catálogo global. Reservarlo con él se rechaza.
    activo: {
      type: Boolean,
      default: true,
    },
    // Fotos propias de este barbero para este servicio: sus cortes, no los de
    // la foto genérica del catálogo. Vacío = se muestran las del local.
    //
    // Es reemplazo, no mezcla: si el barbero sube una sola foto, se ve esa y
    // no las del catálogo. Mezclarlas haría imposible saber cuál es un corte
    // suyo y cuál una foto de referencia del negocio.
    imagenes: [{ type: String }],
  },
  { timestamps: true }
);

// Un solo override por (barbero, servicio).
PrecioBarberoSchema.index({ barbero: 1, servicio: 1 }, { unique: true });

module.exports = mongoose.model("PrecioBarbero", PrecioBarberoSchema);
